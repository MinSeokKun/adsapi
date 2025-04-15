const sequelize = require('../config/database');
const { Staff, Salon, Location, Display, User } = require('../models');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const addressService = require('../utils/address');
const { Op, where } = require('sequelize');

class StaffService {
  // 스태프 조회
  async getAllStaffs(id) {
    return Staff.findAll({
      where: { salon_id : id }
    });
  };

  // 스태프 추가
  async createStaff(name, position, career_years, salon_id) {
    return Staff.create({
      name,
      position,
      career_years,
      salon_id
      });
  };

  // 스태프 수정
  async updateStaff(id, updateData){
    const staff = await Staff.findByPk(id);
    if(!staff) {
      throw new Error("스태프를 찾을 수 없습니다.");
    }

    await staff.update(updateData);
    return staff;
  }

  // 스태프 삭제
  async deleteStaff(id) {
    let transaction;

    try {
      transaction = await sequelize.transaction();

      const staff = await Staff.findByPk(id);
      if(!staff) {
        throw new Error("스태프를 찾을 수 없습니다.");
      }
  
      await staff.destroy({ transaction });
      await transaction.commit();
      
      // 삭제된 스태프 반환
      return staff;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new StaffService();