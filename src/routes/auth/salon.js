const express = require('express');
const router = express.Router();
const { Salon } = require('../../models');
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');
const salonService = require('../../services/salonService');

// 개인 미용실 조회
router.get('/api/salons', verifyToken, async (req, res) => {
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
});

// 미용실 등록
router.post('/api/salons', verifyToken, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path
  };

  try {
    const { 
      salon: salonData, 
      address,        // 기본 주소 문자열
      addressDetail,  // 상세 주소 (직접 입력받은 값)
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

    res.status(201).json({ 
      message: "미용실이 등록되었습니다.",
      salon: result.salon,
      location: result.location
    });
  } catch (error) {
    let statusCode = 500;
    let message = '서버 오류';

    // 에러 타입에 따른 응답 처리
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
});


router.get('/api/salons/search', async (req, res) => {
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
});

router.get('/api/salons/cities', async (req, res) => {
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
});

router.get('/api/salons/cities/:city/districts', async (req, res) => {
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
});

router.get('/api/salons/popular-cities', async (req, res) => {
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
});

// 미용실 상세 조회
router.get('/api/salons/:salonId', verifyToken, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    salonId: req.params.salonId,
    path: req.path
  };

  try {
    const salon = await salonService.getSalonById(req.params.salonId, req.user.id);

    if (!salon) {
      console.log('경로 확인', req.path)
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
});

// 미용실 수정
router.put('/api/salons/:salonId', verifyToken, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    salonId: req.params.salonId,
    path: req.path,
    updateFields: Object.keys(req.body)
  };

  try {
    const { salon: salonData, location: locationData } = req.body;
    
    const updatedSalon = await salonService.updateSalon(
      req.params.salonId, 
      req.user.id, 
      salonData, 
      locationData
    );

    logger.info('미용실 정보 수정 성공', sanitizeData({
      ...logContext,
      updatedFields: Object.keys(req.body)
    }));

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
});

// 미용실 삭제
router.delete('/api/salons/:salonId', verifyToken, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    salonId: req.params.salonId,
    path: req.path
  };

  try {
    await salonService.deleteSalon(req.params.salonId, req.user.id);

    logger.info('미용실 삭제 성공', sanitizeData(logContext));

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
});

module.exports = router;