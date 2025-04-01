const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { Salon, Display } = require('../models');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');

class DisplayService {

  generateUniqueShortId(existingIds = []) {
    let newId;
    do {
      newId = crypto.randomBytes(4).toString('hex');
    } while (existingIds.includes(newId));
  
    return newId;
  }
  
  async createDisplay(name, salon_id) {
    let deviceId;
    let isUnique = false;

    while (!isUnique) {
      deviceId = crypto.randomBytes(4).toString('hex');
      
      // 해당 device_id가 존재하는지 단 한 번만 확인
      const existingDevice = await Display.findOne({
        where: { device_id: deviceId },
        attributes: ['id']
      });

      if (!existingDevice) {
        isUnique = true;
      }
    }

    const display = await Display.create({
      name,
      salon_id,
      device_id: deviceId,
      access_token: crypto.randomBytes(4).toString('hex'),
      status: 'inactive'
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
  };

  // 디스플레이 접근 권한 조회
  async checkDisplayOwnership(user_id, device_id) {
    const display = await Display.findOne({
      where: { device_id },
      include: {
        model: Salon,
        as: 'salon', // 소문자 'salon'으로 as 지정
        where: { owner_id: user_id }
      }
    });
    
    return display;
  }

  // 디스플레이 삭제
  async deleteDisplay(display_id) {
    const display = await Display.findByPk(display_id);
    await display.destroy();
  }

}

module.exports = new DisplayService();