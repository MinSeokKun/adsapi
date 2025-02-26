const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const { sponsorAdUpload, handleUploadError } = require('../../middleware/uploadMiddleware');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');
const adService = require('../../services/adService');
const displayAuth = require('../../middleware/displayAuth');
const mediaService = require('../../services/mediaService');

// 광고 조회
router.get('/api/ads', 
  // verifyToken,
  async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      queryParams: sanitizeData(req.query)
    };
  
    try {
      const { time } = req.query;
      const ads = await adService.getAdsByTime(time);
  
      logger.info('광고 조회 완료', sanitizeData({
        ...logContext,
        adCount: ads.length,
        hasTimeFilter: !!time
      }));
  
      res.json({ ads });
  
    } catch (error) {
      logger.error('광고 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      res.status(500).json({
        error: '서버 오류',
        details: error.message
      });
    }
});

// 디스플레이 용 광고 조회
router.get('/api/display/ads', 
  displayAuth,
  async (req, res) => {
    const logContext = {
      requestId: req.id,
      displayId: req.display?.device_id, // userId 대신 displayId로 변경
      path: req.path,
      queryParams: sanitizeData(req.query)
    };
  
    try {
      const { time } = req.query;
      // display의 salon_id를 기반으로 광고를 필터링
      const ads = await adService.getAdsByTimeAndLocation(time, req.display.salon_id);
      // const ads = await adService.getAdsForSalonId(req.display.salon_id);
  
      logger.info('디스플레이 광고 조회 완료', sanitizeData({
        ...logContext,
        adCount: ads.length,
        hasTimeFilter: !!time
      }));
  
      res.json({ ads });
  
    } catch (error) {
      logger.error('디스플레이 광고 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      res.status(500).json({
        error: '서버 오류',
        details: error.message
      });
    }
});

// id로 광고 조회
router.get('/api/ads/:id', verifyToken, async (req, res) => {
  const logContext = {
    requestId: req.id,
      userId: req.user?.id,
      path: req.path
  };

  try {
    const ad = await adService.getAdForId(req.params.id);

    res.json({ ad });
  } catch (error) {
    logger.error('광고 조회 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    res.status(500).json({ error: '서버 오류' });
  }
})

// 광고 전체 목록 조회 (삭제 할지도)
router.get('/api/ads/list',
  // verifyToken,
  async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path
    };
    try {
      const ads = await adService.getAllActiveAds();
  
      logger.info('광고 목록 조회 완료', sanitizeData({
        ...logContext,
        adCount: ads.length
      }));
  
      res.json({ ads });
    } catch (error) {
      logger.error('광고 목록 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      res.status(500).json({ error: '서버 오류' });
    }
});

// 광고 등록
router.post('/api/ads', 
  // verifyToken, 
  // isAdmin, 
  sponsorAdUpload,
  handleUploadError,
  async (req, res) => {

    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      adId: req.params.id,
      path: req.path,
      requestData: sanitizeData(req.body),
      fileInfo: req.files ? {
        count: Object.values(req.files).reduce((acc, files) => acc + files.length, 0),
        totalSize: Object.values(req.files).reduce((acc, files) => 
          acc + files.reduce((sum, file) => sum + file.size, 0), 0)
      } : null
    };

  try {
    const { title, schedules } = req.body;
    const ad = await adService.createAd(title, schedules, req.files);


    logger.info('광고 등록 완료', sanitizeData({
      ...logContext,
      adId: ad.id,
      mediaCount: ad.media?.length || 0,
      scheduleCount: schedules.length || 0
    }));
    
    res.status(201).json({ 
      message: '광고가 성공적으로 저장되었습니다',
      ad: ad
    });

  } catch (error) {
    logger.error('광고 등록 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    res.status(500).json({ 
      error: '광고 저장 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 광고 수정
router.put('/api/ads/:id', 
  // verifyToken, 
  // isAdmin, 
  async (req, res) => {

  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    adId: req.params.id,
    path: req.path,
    requestData: sanitizeData(req.body)
  };

  try {
    const { id } = req.params;
    const { title, is_active, schedules, media, targetLocations } = req.body;
    
    const updatedAd = await adService.updateAd(id, {
      title,
      is_active,
      schedules,
      media,
      targetLocations
    }, logContext);

    res.json({ 
      message: '광고가 성공적으로 수정되었습니다',
      ad: updatedAd
    });

  } catch (error) {
    logger.error('광고 수정 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    
    res.status(500).json({ 
      error: '광고 수정 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 광고 삭제
router.delete('/api/ads/:id', 
  verifyToken, 
  isAdmin, 
  async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    adId: req.params.id,
    path: req.path
  };

  try {
    const { id } = req.params;

    await adService.deleteAd(id, logContext);

    logger.info('광고 삭제 완료', sanitizeData(logContext));

    res.json({ message: '광고가 성공적으로 삭제되었습니다' });

  } catch (error) {
    
    logger.error('광고 삭제 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    res.status(500).json({ 
      error: '광고 삭제 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 광고 스케줄 등록 및 수정
router.post('/api/ads/schedule', 
  // verifyToken, 
  // isAdmin, 
  async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      requestData: sanitizeData(req.body)
    };
  
    try {
      const scheduleData = req.body;
      const updatedAds = await adService.updateSchedules(scheduleData);
      
      res.status(200).json({ 
        message: '광고 스케줄이 성공적으로 저장되었습니다',
        ads: updatedAds
      });
  
    } catch (error) {
      logger.error('광고 스케줄 저장 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      
      res.status(500).json({ 
        error: '광고 스케줄 저장 중 오류가 발생했습니다',
        details: error.message 
      });
    }
});

// 새 광고 미디어 추가
router.post('/api/ads/:id/media', sponsorAdUpload, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    adId: req.params.id,
    path: req.path,
    fileInfo: req.files ? {
      count: Object.values(req.files).reduce((acc, files) => acc + files.length, 0),
      totalSize: Object.values(req.files).reduce((acc, files) => 
        acc + files.reduce((sum, file) => sum + file.size, 0), 0)
    } : null
  };

  try {
    const newMedia = await mediaService.createNewMedia(req.params.id, req.files);

    logger.info('광고 미디어 등록 완료', sanitizeData(logContext));

    res.status(201).json({
      message: '광고 미디어가 성공적으로 저장되었습니다.',
      media: newMedia
    });
  } catch (error) {
    logger.error('광고 등록 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    res.status(500).json({ 
      error: '광고 미디어 저장 중 오류가 발생했습니다',
      details: error.message 
    });
  }
})

module.exports = router;