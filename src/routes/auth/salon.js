const express = require('express');
const router = express.Router();
const { Salon } = require('../../models');
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');

// 개인 미용실 조회
router.get('/api/salons', verifyToken, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path
  };

  try {
    logger.info('미용실 목록 조회 시도', sanitizeData(logContext));

    const salons = await Salon.findAll({
      where: { owner_id: req.user.id }
    });

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
    path: req.path,
    salonName: req.body.name,
    regionCode: req.body.region_code
  };

  try {
    logger.info('미용실 등록 시도', sanitizeData(logContext));

    const { name, address, region_code, business_hours } = req.body;

    const salon = await Salon.create({
      owner_id: req.user.id,
      name,
      address,
      region_code,
      business_hours,
      created_at: new Date(),
      updated_at: new Date()
    });

    logger.info('미용실 등록 성공', sanitizeData({
      ...logContext,
      salonId: salon.id
    }));

    res.status(201).json({ 
      message: "미용실이 등록되었습니다.",
      salon 
    });
  } catch (error) {
    logger.error('미용실 등록 실패', sanitizeData({
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

// 미용실 상세 조회
router.get('/api/salons/:salonId', verifyToken, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    salonId: req.params.salonId,
    path: req.path
  };

  try {
    logger.info('미용실 상세 조회 시도', sanitizeData(logContext));

    const salon = await Salon.findOne({
      where: { 
        id: req.params.salonId,
        owner_id: req.user.id
      }
    });

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
    logger.info('미용실 정보 수정 시도', sanitizeData(logContext));

    const { name, address, region_code, business_hours } = req.body;
    
    const updateFields = {};
    if (name) updateFields.name = name;
    if (address) updateFields.address = address;
    if (region_code) updateFields.region_code = region_code;
    if (business_hours) updateFields.business_hours = business_hours;

    const salon = await Salon.findOne({
      where: {
        id: req.params.salonId,
        owner_id: req.user.id
      }
    });

    if (!salon) {
      logger.warn('존재하지 않는 미용실 수정 시도', sanitizeData(logContext));
      return res.status(404).json({ message: '미용실을 찾을 수 없습니다.' });
    }

    await salon.update(updateFields);

    logger.info('미용실 정보 수정 성공', sanitizeData({
      ...logContext,
      updatedFields: Object.keys(updateFields)
    }));

    res.json({ 
      message: '미용실이 수정되었습니다.',
      salon
    });
  } catch (error) {
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
    logger.info('미용실 삭제 시도', sanitizeData(logContext));

    const salon = await Salon.findOne({
      where: {
        id: req.params.salonId,
        owner_id: req.user.id
      }
    });

    if (!salon) {
      logger.warn('존재하지 않는 미용실 삭제 시도', sanitizeData(logContext));
      return res.status(404).json({ message: '미용실을 찾을 수 없습니다.' });
    }

    await salon.destroy();

    logger.info('미용실 삭제 성공', sanitizeData(logContext));

    res.json({ message: '미용실이 삭제되었습니다.' });
  } catch (error) {
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