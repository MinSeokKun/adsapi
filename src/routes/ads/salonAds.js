const express = require('express');
const router = express.Router();
const sequelize = require('../../config/database');
const { Ad, AdMedia, Salon, AdSchedule } = require('../../models');
const { verifyToken } = require('../../middleware/auth');
const { salonAdUpload, handleUploadError } = require('../../middleware/uploadMiddleware');
const { processSalonAdMedia, updateAdMedia, updateAdSchedules, getAdDetails, formatAdResponse, parseSchedules } = require('../../utils/adUtils');
const storage = require('../../config/storage');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');
const salonAdService = require('../../services/salonAdService');

// 미용실 개인 광고 조회
router.get('/api/ads/salon', verifyToken, async (req, res) => {
  const owner_id = req.user.id;
  const logContext = {
    requestId: req.id,
    userId: owner_id,
    path: req.path
  };
  try {
    logger.info('미용실 광고 목록 조회 시작', sanitizeData(logContext));
    const salons = await salonAdService.findAllSalonAds(owner_id, logContext);

    logger.info('미용실 광고 목록 조회 완료', sanitizeData({
      ...logContext,
      salonCount: salons.length
    }));

    
    res.json({ salons: salons });
    
  } catch (error) {
    logger.error('미용실 광고 목록 조회 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    res.status(500).json({ 
      error: '미용실 광고 조회 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 미용실 개인 광고 등록
router.post('/api/ads/salon',
  verifyToken,
  salonAdUpload,
  handleUploadError,
  async (req, res) => {
    const owner_id = req.user.id;

    const logContext = {
      requestId: req.id,
      userId: owner_id,
      path: req.path,
      requestData: sanitizeData(req.body),
      ileInfo: req.files ? {
        count: Object.values(req.files).reduce((acc, files) => acc + files.length, 0),
        totalSize: Object.values(req.files).reduce((acc, files) => 
          acc + files.reduce((sum, file) => sum + file.size, 0), 0)
      } : null
    };

    try {
      logger.info('미용실 광고 등록 시작', sanitizeData(logContext));

      const { title, salon_id, schedules } = req.body;

      const createdAd = await salonAdService.createSalonAd(title, salon_id, schedules, req.files, owner_id, logContext);

      logger.info('미용실 광고 등록 완료', sanitizeData({
        ...logContext,
        adId: createdAd.id
      }));

      res.status(201).json({ 
        message: '광고가 성공적으로 저장되었습니다',
        ad: formatAdResponse(createdAd)
      });
      
    } catch (error) {
      logger.error('미용실 광고 등록 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      res.status(500).json({ 
        error: '미용실 광고 등록 중 오류가 발생했습니다',
        details: error.message 
      });
    }
  }
);

// 미용실 개인 광고 수정
router.put('/api/ads/salon/:id',
  verifyToken,
  salonAdUpload,
  handleUploadError,
  async (req, res) => {
    const { id } = req.params;
    const { title, is_active, schedules } = req.body;
    const owner_id = req.user.id;

    const logContext = {
      requestId: req.id,
      userId: owner_id,
      adId: id,
      requestData: sanitizeData(req.body),
      path: req.path,
      fileInfo: req.files ? {
        count: Object.values(req.files).reduce((acc, files) => acc + files.length, 0),
        totalSize: Object.values(req.files).reduce((acc, files) => 
          acc + files.reduce((sum, file) => sum + file.size, 0), 0)
      } : null
    };
    try {
      const updateAd = await salonAdService.updateSalonAd(id, {
        title,
        is_active,
        schedules,
        files: req.files
      },
      owner_id,
      logContext);

      logger.info('미용실 광고 수정 완료', sanitizeData(logContext));
      
      res.json({
        message: '광고가 성공적으로 수정되었습니다',
        ad: formatAdResponse(updateAd)});
    } catch (error) {
      logger.error('미용실 광고 수정 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));

      res.status(500).json({
        error: '미용실 광고 수정 중 오류가 발생했습니다',
        details: error.message
      });
    }
});

// 미용실 개인 광고 삭제
router.delete('/api/ads/salon/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const owner_id = req.user.id;

  const logContext = {
    requestId: req.id,
    owner_id: owner_id,
    adId: id,
    path: req.path
  };
  try {
    await salonAdService.deleteSalonAd(id, owner_id, logContext);

    logger.info('미용실 광고 삭제 완료', sanitizeData(logContext));

    res.json({ message: '광고가 성공적으로 삭제되었습니다' });

  } catch (error) {
    logger.error('미용실 광고 삭제 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));

    res.status(500).json({
      error: '미용실 광고 삭제 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

module.exports = router;