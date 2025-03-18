// controllers/salonController.js
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const salonService = require('../services/salonService');
const userActivityService = require('../services/userActivityService');
const { ACTIVITY_TYPES } = require('../middleware/activityMiddleware');

/**
 * 살롱 컨트롤러
 * 살롱과 관련된 요청 핸들링 함수들
 */
const salonController = {
  /**
   * 사용자의 모든 살롱 조회
   */
  getAllSalons: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path
    };

    try {
      const salons = await salonService.getAllSalonsByOwnerId(req.user.id);

      logger.info('미용실 목록 조회 성공', sanitizeData({
        ...logContext,
        count: salons.length
      }));
      
      res.json({ salons });
    } catch (error) {
      logger.error('미용실 목록 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      res.status(500).json({ message: '서버 오류' });
    }
  },

  /**
   * 새 살롱 생성
   */
  createSalon: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path
    };

    try {
      const { 
        salon: salonData, 
        address,
        addressDetail,
      } = req.body;
      
      // 유효성 검사
      if (!address) {
        return res.status(400).json({ message: "주소를 입력해주세요." });
      }
      
      if (!salonData.name || !salonData.business_hours || !salonData.business_number) {
        return res.status(400).json({ message: "필수 정보를 모두 입력해주세요." });
      }

      const result = await salonService.createSalon(
        salonData, 
        address,
        addressDetail,
        req.user.id
      );

      logger.info('미용실 등록 성공', sanitizeData({
        ...logContext,
        salonId: result.salon.id
      }));

      // 활동 로깅
      await userActivityService.recordActivity(req.user.id, ACTIVITY_TYPES.SALON_CREATE, {
        salon_id: result.salon.id,
        ip: req.ip,
        salon_name: result.salon.name,
        location: address
      });

      res.status(201).json({ 
        message: "미용실이 등록되었습니다.",
        salon: result.salon,
        location: result.location
      });
    } catch (error) {
      let statusCode = 500;
      let message = '서버 오류';

      if (error.name === 'ValidationError') {
        statusCode = 400;
        message = error.message;
      } else if (error.name === 'AddressError') {
        statusCode = 400;
        message = '주소를 확인해주세요.';
      }

      logger.error('미용실 등록 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));

      res.status(statusCode).json({ message });
    }
  },

  /**
   * 살롱 검색
   */
  searchSalons: async (req, res) => {
    const logContext = {
      requestId: req.id,
      path: req.path,
      query: sanitizeData(req.query)
    };
    
    try {
      const {
        city,
        district,
        keyword,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;
      
      // Parse options
      const parsedOptions = {
        city,
        district,
        keyword,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        sortBy: sortBy || 'created_at',
        sortOrder: (sortOrder || 'DESC').toUpperCase()
      };
      
      const result = await salonService.searchSalons(parsedOptions);
      
      logger.info('미용실 위치 기반 검색 성공', sanitizeData({
        ...logContext,
        resultCount: result.data.length,
        totalItems: result.pagination.totalItems
      }));
      
      return res.status(200).json({
        status: 'success',
        ...result
      });
    } catch (error) {
      logger.error('미용실 위치 기반 검색 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      
      return res.status(500).json({
        status: 'error',
        message: '위치 기반 검색 중 오류가 발생했습니다',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * 도시 목록 조회
   */
  getCities: async (req, res) => {
    const logContext = {
      requestId: req.id,
      path: req.path
    };
    
    try {
      const cities = await salonService.getCities();
      
      logger.info('도시 목록 조회 성공', sanitizeData({
        ...logContext,
        count: cities.length
      }));
      
      return res.status(200).json({
        status: 'success',
        data: cities
      });
    } catch (error) {
      logger.error('도시 목록 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      
      return res.status(500).json({
        status: 'error',
        message: '도시 목록을 가져오는 중 오류가 발생했습니다',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * 구/군 목록 조회
   */
  getDistricts: async (req, res) => {
    const logContext = {
      requestId: req.id,
      path: req.path,
      city: req.params.city
    };
    
    try {
      const { city } = req.params;
      
      if (!city) {
        logger.warn('구/군 목록 조회 실패: 도시 파라미터 누락', sanitizeData(logContext));
        return res.status(400).json({
          status: 'error',
          message: '도시 파라미터가 필요합니다'
        });
      }
      
      const districts = await salonService.getDistricts(city);
      
      logger.info('구/군 목록 조회 성공', sanitizeData({
        ...logContext,
        count: districts.length
      }));
      
      return res.status(200).json({
        status: 'success',
        data: districts
      });
    } catch (error) {
      logger.error('구/군 목록 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      
      return res.status(500).json({
        status: 'error',
        message: '구/군 목록을 가져오는 중 오류가 발생했습니다',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * 인기 도시 목록 조회
   */
  getPopularCities: async (req, res) => {
    const logContext = {
      requestId: req.id,
      path: req.path,
      limit: req.query.limit
    };
    
    try {
      const { limit } = req.query;
      const parsedLimit = limit ? parseInt(limit, 10) : 10;
      
      const popularCities = await salonService.getPopularCities(parsedLimit);
      
      logger.info('인기 도시 목록 조회 성공', sanitizeData({
        ...logContext,
        count: popularCities.length,
        limit: parsedLimit
      }));
      
      return res.status(200).json({
        status: 'success',
        data: popularCities
      });
    } catch (error) {
      logger.error('인기 도시 목록 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      
      return res.status(500).json({
        status: 'error',
        message: '인기 도시 목록을 가져오는 중 오류가 발생했습니다',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * 살롱 상세 정보 조회
   */
  getSalonById: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      salonId: req.params.salonId,
      path: req.path
    };

    try {
      const salon = await salonService.getSalonById(req.params.salonId, req.user.id);

      if (!salon) {
        logger.warn('존재하지 않는 미용실 조회', sanitizeData(logContext));
        return res.status(404).json({ message: '미용실을 찾을 수 없습니다.' });
      }

      logger.info('미용실 상세 조회 성공', sanitizeData(logContext));

      res.json({ salon });
    } catch (error) {
      logger.error('미용실 상세 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      res.status(500).json({ message: '서버 오류' });
    }
  },

  /**
   * 살롱 정보 업데이트
   */
  updateSalon: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      salonId: req.params.salonId,
      path: req.path,
      updateFields: Object.keys(req.body)
    };

    try {
      // Adjust this to handle the current request body structure
      const locationData = req.body.location;
      const salonData = {...req.body};
      delete salonData.location;
      delete salonData.owner;
      delete salonData.displays;
      
      // 시스템 필드 제외
      delete salonData.id;
      delete salonData.createdAt;
      delete salonData.updatedAt;
      delete salonData.created_at;
      delete salonData.updated_at;
      
      // 변경 전 미용실 데이터 조회
      const originalSalon = await salonService.getSalonById(req.params.salonId, req.user.id, logContext);
      
      if (!originalSalon) {
        logger.warn('존재하지 않는 미용실 수정 시도', sanitizeData(logContext));
        return res.status(404).json({ message: '미용실을 찾을 수 없습니다.' });
      }
      
      const updatedSalon = await salonService.updateSalon(
        req.params.salonId, 
        req.user.id, 
        salonData, 
        locationData
      );

      // 변경된 필드 추적
      const changedFields = [];
      const previousValues = {};
      
      // 제외해야 할 필드 목록
      const excludeFields = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'owner', 'displays'];
      
      // salon 객체 변경사항 추적
      if (salonData) {
        Object.keys(salonData).forEach(key => {
          if (excludeFields.includes(key)) return;
          
          if (originalSalon[key] !== salonData[key]) {
            changedFields.push(key);
            previousValues[key] = originalSalon[key];
          }
        });
      }
      
      // location 객체 제외 필드
      const excludeLocationFields = ['id', 'createdAt', 'updatedAt', 'salon_id'];
      
      // location 객체 변경사항 추적
      if (locationData && originalSalon.location) {
        Object.keys(locationData).forEach(key => {
          if (excludeLocationFields.includes(key)) return;
          
          if (originalSalon.location[key] !== locationData[key]) {
            changedFields.push(`location_${key}`);
            previousValues[`location_${key}`] = originalSalon.location[key];
          }
        });
      }

      logger.info('미용실 정보 수정 성공', sanitizeData({
        ...logContext,
        changedFields
      }));

      // 활동 로깅
      await userActivityService.recordActivity(req.user.id, ACTIVITY_TYPES.SALON_UPDATE, {
        salon_id: req.params.salonId,
        ip: req.ip,
        salon_name: updatedSalon.name,
        changed_fields: changedFields,
        previous_values: previousValues
      });

      res.json({ 
        message: '미용실이 수정되었습니다.',
        salon: updatedSalon
      });
    } catch (error) {
      if (error.message === 'Salon not found') {
        logger.warn('존재하지 않는 미용실 수정 시도', sanitizeData(logContext));
        return res.status(404).json({ message: '미용실을 찾을 수 없습니다.' });
      }

      logger.error('미용실 정보 수정 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      res.status(500).json({ message: '서버 오류' });
    }
  },

  /**
   * 살롱 삭제
   */
  deleteSalon: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      salonId: req.params.salonId,
      path: req.path
    };

    try {
      // 삭제 전 살롱 정보 조회 (활동 로깅용)
      const salon = await salonService.getSalonById(req.params.salonId, req.user.id);
      
      if (!salon) {
        logger.warn('존재하지 않는 미용실 삭제 시도', sanitizeData(logContext));
        return res.status(404).json({ message: '미용실을 찾을 수 없습니다.' });
      }
      
      await salonService.deleteSalon(req.params.salonId, req.user.id);

      logger.info('미용실 삭제 성공', sanitizeData(logContext));

      // 활동 로깅
      await userActivityService.recordActivity(req.user.id, ACTIVITY_TYPES.SALON_DELETE, {
        salon_id: req.params.salonId,
        ip: req.ip,
        salon_name: salon.name
      });

      res.json({ message: '미용실이 삭제되었습니다.' });
    } catch (error) {
      if (error.message === 'Salon not found') {
        logger.warn('존재하지 않는 미용실 삭제 시도', sanitizeData(logContext));
        return res.status(404).json({ message: '미용실을 찾을 수 없습니다.' });
      }

      logger.error('미용실 삭제 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      res.status(500).json({ message: '서버 오류' });
    }
  }
};

module.exports = salonController;