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

module.exports = router;module.exports = router;