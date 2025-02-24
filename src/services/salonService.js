const sequelize = require('../config/database');
const { Salon, Location, Display } = require('../models');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const addressService = require('../utils/address');

class SalonService {
  async getAllSalons() {
    return Salon.findAll({
      include: [{
        model: Location,
        as: 'location'
      },
      {
        model: Display,
        as: 'displays'
      }]
    });
  }
  
  async getAllSalonsByOwnerId(ownerId) {
    const salons = await Salon.findAll({
      where: { owner_id: ownerId },
      include: [{
        model: Location,
        as: 'location'
      }]
    });
    
    return salons;
  }

  async getSalonById(salonId, ownerId, logContext) {
    const salon = await Salon.findOne({
      where: { 
        id: salonId,
        owner_id: ownerId
      },
      include: [{
        model: Location,
        as: 'location'
      }]
    });

    return salon;
  }

  async createSalon(salonData, address, addressDetail, ownerId) {
    const result = await sequelize.transaction(async (t) => {
      try {
        // 주소 변환
        const locationData = await addressService.convertAddress(address);
        
        // 상세주소 추가
        locationData.address_line2 = addressDetail || '';
        
        const salon = await Salon.create({
          owner_id: ownerId,
          name: salonData.name,
          business_hours: salonData.business_hours,
          business_number: salonData.business_number,
          created_at: new Date(),
          updated_at: new Date()
        }, { transaction: t });
  
        const location = await Location.create({
          salon_id: salon.id,
          ...locationData
        }, { transaction: t });
  
        return { salon, location };
      } catch (error) {
        // 주소 변환 실패시 AddressError로 래핑
        if (error.message.includes('주소')) {
          throw new AddressError(error.message);
        }
        throw error;
      }
    });
  
    return result;
  }
  
  
  async updateSalon(salonId, ownerId, salonData, locationData) {
    let transaction;
    
    try {
      transaction = await sequelize.transaction();
      const salon = await Salon.findOne({
        where: {
          id: salonId,
          owner_id: ownerId
        },
        include: [{
          model: Location,
          as: 'location'
        }],
        transaction
      });
      
      if (!salon) {
        const error = new Error('Salon not found');
        error.statusCode = 404;
        throw error;
      }
  
      if (salonData) {
        await salon.update(salonData, { transaction });
      }
      
      if (locationData) {
        await salon.location.update(locationData, { transaction });
      }
      
      await transaction.commit();
      
      const updatedSalon = await this.getSalonById(salonId, ownerId);
      return updatedSalon;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  async deleteSalon(salonId, ownerId) {
    let transaction;
    
    try {
      transaction = await sequelize.transaction();
      const salon = await Salon.findOne({
        where: {
          id: salonId,
          owner_id: ownerId
        },
        transaction
      });
      
      if (!salon) {
        const error = new Error('Salon not found');
        error.statusCode = 404;
        throw error;
      }
      
      await salon.destroy({ transaction });
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async checkSalonOwnership(ownerId, salonId) {
    const salon = await Salon.findOne({
      where: {
        id: salonId,
        owner_id: ownerId
      }
    })
    return salon;
  }
  
}
// 커스텀 에러 클래스
class AddressError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AddressError';
  }
}

module.exports = new SalonService();