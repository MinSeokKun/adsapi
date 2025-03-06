const sequelize = require('../config/database');
const { Salon, Location, Display, User } = require('../models');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const addressService = require('../utils/address');
const { Op } = require('sequelize');

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
      },
      {
        model: Display,
        as: 'displays'
      },
      {
        model: User,
        as: 'owner'
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
      },
      {
        model: Display,
        as: 'displays'
      },
      {
        model: User,
        as: 'owner'
      }]
    });

    return salon;
  }

  async getSalonName(salonId) {
    const salonName = await Salon.findOne({
      where: {
        id: salonId
      },
      attributes: ['name']
    });
    
    if (!salonName) {
      throw new Error('미용실을 찾을 수 없습니다.');
    }

    return salonName.name; // salonName은 객체이므로 name 속성에 접근해야 합니다.
  }
  

  async adminGetSalonById(salonId) {
    const salon = await Salon.findOne({
      where: { 
        id: salonId,
      },
      include: [{
        model: Location,
        as: 'location'
      },{
        model: User,
        as: 'owner'
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
          phone: salonData.phone,
          description: salonData.description,
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
  
  /**
   * Search for salons by city and district with pagination
   * 
   * @param {Object} options - Search options
   * @param {string} options.city - City name
   * @param {string} options.district - District name
   * @param {string} options.keyword - Keyword for name search
   * @param {number} options.page - Page number (starts from 1)
   * @param {number} options.limit - Number of items per page
   * @param {string} options.sortBy - Sort field (e.g., 'name', 'created_at')
   * @param {string} options.sortOrder - Sort order ('ASC' or 'DESC')
   * @returns {Object} - Paginated salon data with location info
   */
  async searchSalons(options) {
    const {
      city,
      district,
      keyword = '',
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    // Validate page and limit
    const validatedPage = Math.max(1, parseInt(page, 10));
    const validatedLimit = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const offset = (validatedPage - 1) * validatedLimit;

    // Base query options
    const queryOptions = {
      include: [
        {
          model: Location,
          as: 'location',
          required: true
        },
        {
          model: User,
          as: 'owner',
          attributes: ['name']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: validatedLimit,
      offset: offset,
      distinct: true
    };

    // Build where conditions
    const whereConditions = {};
    const locationWhereConditions = {};

    // Add keyword search to where conditions
    if (keyword && keyword.trim() !== '') {
      whereConditions.name = {
        [Op.like]: `%${keyword.trim()}%`
      };
    }

    // Add location filtering
    if (city) {
      locationWhereConditions.city = city;
    }
    
    if (district) {
      locationWhereConditions.district = district;
    }

    // Apply where conditions
    if (Object.keys(locationWhereConditions).length > 0) {
      queryOptions.include[0].where = locationWhereConditions;
    }

    if (Object.keys(whereConditions).length > 0) {
      queryOptions.where = whereConditions;
    }

    // Get paginated data
    const { count, rows } = await Salon.findAndCountAll(queryOptions);

    // Calculate pagination metadata
    const totalItems = count;
    const totalPages = Math.ceil(totalItems / validatedLimit);
    const hasNext = validatedPage < totalPages;
    const hasPrevious = validatedPage > 1;

    return {
      data: rows,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        totalItems,
        totalPages,
        hasNext,
        hasPrevious
      }
    };
  }

  /**
   * Get list of all available cities
   * 
   * @returns {Array} - Array of unique cities
   */
  async getCities() {
    const cities = await Location.findAll({
      attributes: [
        'city',
        [sequelize.fn('COUNT', sequelize.col('salon_id')), 'salonCount']
      ],
      group: ['city'],
      order: [['city', 'ASC']]
    });
    
    return cities;
  }

  /**
   * Get districts for a specific city
   * 
   * @param {string} city - City name
   * @returns {Array} - Array of districts in the city
   */
  async getDistricts(city) {
    const districts = await Location.findAll({
      attributes: [
        'district',
        [sequelize.fn('COUNT', sequelize.col('salon_id')), 'salonCount']
      ],
      where: {
        city
      },
      group: ['district'],
      order: [['district', 'ASC']]
    });
    
    return districts;
  }
  
  /**
   * Get popular cities with salon counts
   * 
   * @param {number} limit - Maximum number of results to return
   * @returns {Array} - Array of cities with salon counts
   */
  async getPopularCities(limit = 10) {
    const popularCities = await Location.findAll({
      attributes: [
        'city',
        [sequelize.fn('COUNT', sequelize.col('salon_id')), 'salonCount']
      ],
      group: ['city'],
      order: [[sequelize.literal('salonCount'), 'DESC']],
      limit
    });
    
    return popularCities;
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