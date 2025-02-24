const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { Salon, Display } = require('../models');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');

class DisplayService {
  // 디스플레이 생성
  async createDisplay(name, salon_id) {
    const display = await Display.create({
      name,
      salon_id,
      device_id: uuidv4(),
      access_token: crypto.randomBytes(32).toString('hex'),
      status: 'inactive' // 초기 상태
    });
    return display;
  }

  // 디스플레이 활성화
  async activeDisplay(device_id, access_token, logContext) {
    let transaction;
    try {
      transaction = await sequelize.transaction();

      const display = await Display.findOne({
        where: {
          device_id,
          access_token,
          status: 'inactive'
        }
      });

      if (!display) {
        const error = new Error('Display not found');
        error.statusCode = 404;
        logger.warn('디스플레이를 찾을 수 없습니다.', sanitizeData(logContext));
        throw error;
      };

      await display.update({
        status: 'active',
        last_ping: new Date()
      }, { transaction });

      transaction.commit();

      return display;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  // 미용실이 가지고 있는 디스플레이 조회
  async getDisplaysBySalon(salon_id) {
    const displays = Display.findAll({
      where: salon_id
    });

    return displays;
  }

}

module.exports = new DisplayService();