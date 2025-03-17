const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const { sponsorAdUpload, handleUploadError } = require('../../middleware/uploadMiddleware');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');
const adService = require('../../services/adService');
const displayAuth = require('../../middleware/displayAuth');
const mediaService = require('../../services/mediaService');
const activityService = require('../../services/activityService');

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
    const ad = await adService.getAdById(req.params.id);

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
  verifyToken, 
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
    // const { title, schedules } = req.body;
    const ad = await adService.createAd(req.body);


    logger.info('광고 등록 완료', sanitizeData({
      ...logContext,
      adId: ad.id,
      mediaCount: ad.media?.length || 0,
      scheduleCount: ad.adSchedules?.length || 0
    }));

    await activityService.recordActivity(req.user?.id, 'ad_create', {
      adId: ad.id,
      adTitle: ad.title,
      adType: ad.type
    });
    
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

router.put('/api/ads/:id', verifyToken, async (req, res) => {
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
    
    // 변경 전 광고 데이터 조회
    const originalAd = await adService.getAdById(id);
    
    if (!originalAd) {
      logger.warn('존재하지 않는 광고 수정 시도', sanitizeData(logContext));
      return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });
    }

    const updatedAd = await adService.updateAd(id, {
      title,
      is_active,
      schedules,
      media,
      targetLocations
    }, logContext);

    // 변경 내역 추적을 위한 객체 생성
    const changes = {};
    const changedFieldTypes = [];

    // 1. 기본 정보 변경 확인
    if (title !== undefined && originalAd.title !== title) {
      changes.title = { 
        from: originalAd.title, 
        to: title 
      };
      changedFieldTypes.push('basic_info');
    }

    if (is_active !== undefined && originalAd.is_active !== is_active) {
      changes.is_active = { 
        from: originalAd.is_active, 
        to: is_active 
      };
      changedFieldTypes.push('status');
    }

    // 2. 미디어 변경 확인
    if (media !== undefined) {
      const originalMediaIds = originalAd.media.map(m => m.id);
      const newMediaIds = media.map(m => m.id || m);
      
      // ID 기준으로 추가/제거된 미디어 확인
      const addedMedia = newMediaIds.filter(id => !originalMediaIds.includes(id));
      const removedMedia = originalMediaIds.filter(id => !newMediaIds.includes(id));
      
      if (addedMedia.length > 0 || removedMedia.length > 0) {
        changes.media = {
          added: addedMedia.length,
          removed: removedMedia.length
        };
        changedFieldTypes.push('media');
      }
    }

    // 3. 스케줄 변경 확인
    if (schedules !== undefined) {
      const scheduleDiff = compareSchedules(originalAd.schedules, schedules);
      if (scheduleDiff.changed) {
        changes.schedules = scheduleDiff;
        changedFieldTypes.push('schedules');
      }
    }

    // 4. 타겟 위치 변경 확인
    if (targetLocations !== undefined) {
      // originalAd.targetLocations가 존재하는지 확인
      if (originalAd.targetLocations) {
        const originalLocationIds = originalAd.targetLocations.map(loc => loc.id);
        const newLocationIds = targetLocations.map(loc => loc.id || loc);
        
        const addedLocations = newLocationIds.filter(id => !originalLocationIds.includes(id));
        const removedLocations = originalLocationIds.filter(id => !newLocationIds.includes(id));
        
        if (addedLocations.length > 0 || removedLocations.length > 0) {
          changes.targetLocations = {
            added: addedLocations.length,
            removed: removedLocations.length
          };
          changedFieldTypes.push('target_locations');
        }
      } else {
        // targetLocations가 존재하고 originalAd.targetLocations가 없는 경우
        // 모든 타겟 위치를 새로 추가된 것으로 처리
        changes.targetLocations = {
          added: targetLocations.length,
          removed: 0
        };
        changedFieldTypes.push('target_locations');
      }
    }

    // 활동 기록 (실제 변경이 있을 경우만)
    if (changedFieldTypes.length > 0) {
      await activityService.recordActivity(req.user.id, 'ad_update', {
        adId: updatedAd.id,
        adTitle: updatedAd.title,
        changedFieldTypes, // 어떤 유형의 필드가 변경되었는지
        changeDetails: changes // 상세 변경 내역
      });
    }
    console.log(updatedAd.media);
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

// 스케줄 비교 헬퍼 함수
function compareSchedules(originalSchedules, newSchedules) {
  // 입력 유효성 검사
  if (!originalSchedules || !newSchedules) {
    return { changed: false, added: 0, removed: 0, modified: 0 };
  }
  
  // newSchedules가 문자열 배열인 경우
  if (newSchedules.length > 0 && typeof newSchedules[0] === 'string') {
    // 원본 스케줄에서 시간만 추출
    const originalTimes = originalSchedules.map(s => s.time);
    
    // 추가/제거된 시간 계산
    const added = newSchedules.filter(time => !originalTimes.includes(time)).length;
    const removed = originalTimes.filter(time => !newSchedules.includes(time)).length;
    
    return {
      changed: added > 0 || removed > 0,
      added,
      removed,
      modified: 0  // 시간만 비교하면 수정 여부를 판단하기 어려움
    };
  }
  
  // 원래 코드 (객체 배열 처리)
  const originalIds = originalSchedules.map(s => s.id).filter(id => id);
  const newIds = newSchedules.map(s => s.id).filter(id => id);
  
  const added = newSchedules.filter(s => !s.id || !originalIds.includes(s.id)).length;
  const removed = originalSchedules.filter(s => newIds.length === 0 || !newIds.includes(s.id)).length;
  const modified = newSchedules.filter(newS => {
    if (!newS.id) return false;
    
    const origS = originalSchedules.find(o => o.id === newS.id);
    if (!origS) return false;
    
    // 스케줄의 시작/종료 시간 또는 요일 변경 확인
    return newS.start_time !== origS.start_time || 
            newS.end_time !== origS.end_time ||
            newS.days_of_week !== origS.days_of_week;
  }).length;
  
  return {
    changed: added > 0 || removed > 0 || modified > 0,
    added,
    removed,
    modified
  };
}

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

    await activityService.recordActivity(req.user.id, 'ad_delete', {
      adId: id
    });

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