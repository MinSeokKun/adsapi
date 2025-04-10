// controllers/adController.js
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const adService = require('../services/adService');
const mediaService = require('../services/mediaService');
const activityService = require('../services/userActivityService');

/**
   * 스케줄 비교 유틸리티 함수
   * @private
   */
function compareSchedules (originalSchedules, newSchedules) {
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
  
  // 객체 배열 처리
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

/**
 * 광고 컨트롤러
 * 광고와 관련된 요청 핸들링 함수들
 */
const adController = {
  /**
   * 광고 조회
   */
  getAds: async (req, res) => {
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
  },

  /**
   * 디스플레이용 광고 조회
   */
  getDisplayAds: async (req, res) => {
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
  },

  /**
   * 광고 조회 페이징
   * @param {*} req 
   * @param {*} res 
   */
  searchAds: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      query: sanitizeData(req.query)
    };

    try {
      const searchResult = await adService.searchAds({
        title: req.query.title,
        type: req.query.type,
        status: req.query.status,
        salonId: req.query.salonId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: req.query.page,
        limit: req.query.limit,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      });

      console.log('query', req.query);
  
      logger.info('광고 검색 완료', sanitizeData({
        ...logContext,
        totalItems: searchResult.pagination.totalItems
      }));
  
      res.json(searchResult);
    } catch (error) {
      logger.error('광고 검색 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      
      res.status(500).json({
        error: '광고 검색 중 오류가 발생했습니다',
        details: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  },

  getPublicAds: async (req, res) => {
    const logContext = {
      requestId: req.id,
      path: req.path,
      query: sanitizeData(req.query)
    };
  
    try {
      const searchResult = await adService.getPublicAds({
        title: req.query.title,
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'DESC'
      });
  
      logger.info('공개 광고 목록 조회 완료', sanitizeData({
        ...logContext,
        totalItems: searchResult.pagination.totalItems
      }));
  
      res.json(searchResult);
    } catch (error) {
      logger.error('공개 광고 목록 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      
      res.status(500).json({
        error: '광고 목록 조회 중 오류가 발생했습니다',
        details: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  },
  
  /**
   * ID로 광고 조회
   */
  getAdById: async (req, res) => {
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
  },

  /**
   * 광고 전체 목록 조회
   */
  getAllActiveAds: async (req, res) => {
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
  },

  /**
   * 광고 등록
   */
  createAd: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      requestData: sanitizeData(req.body),
      fileInfo: req.files ? {
        count: Object.values(req.files).reduce((acc, files) => acc + files.length, 0),
        totalSize: Object.values(req.files).reduce((acc, files) => 
          acc + files.reduce((sum, file) => sum + file.size, 0), 0)
      } : null
    };

    try {
      const ad = await adService.createAd(req.body);

      logger.info('광고 등록 완료', sanitizeData({
        ...logContext,
        adId: ad.id,
        mediaCount: ad.media?.length || 0,
        scheduleCount: ad.adSchedules?.length || 0
      }));

      await activityService.recordActivity(req.user?.id, 'ad_create', {
        adId: ad.id,
        ip: req.ip,
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
  },

  /**
   * 광고 수정
   */
  updateAd: async (req, res) => {
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
          ip: req.ip,
          adTitle: updatedAd.title,
          changedFieldTypes, // 어떤 유형의 필드가 변경되었는지
          changeDetails: changes // 상세 변경 내역
        });
      }
      
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
  },

  /**
   * 광고 삭제
   */
  deleteAd: async (req, res) => {
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
        adId: id,
        ip: req.ip,
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
  },

  /**
   * 광고 스케줄 업데이트
   */
  updateSchedules: async (req, res) => {
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
  },

  /**
   * 광고에 새 미디어 추가
   */
  addMediaToAd: async (req, res) => {
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
      logger.error('광고 미디어 등록 실패', sanitizeData({
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
  },

  /**
   * 광고 캠페인 생성 또는 업데이트
   */
  createOrUpdateCampaign: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      adId: req.params.id,
      path: req.path,
      requestData: sanitizeData(req.body)
    };

    try {
      const { id } = req.params;
      const campaign = req.body;
      
      // 광고 존재 확인
      const ad = await Ad.findByPk(id);
      if (!ad) {
        logger.warn('존재하지 않는 광고에 캠페인 생성 시도', sanitizeData(logContext));
        return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });
      }
      
      const result = await adService.createOrUpdateCampaign(id, campaign);
      
      // 활동 기록
      await activityService.recordActivity(req.user.id, 'ad_campaign_update', {
        adId: id,
        ip: req.ip,
        adTitle: ad.title,
        campaignId: result.id,
        budget: result.budget,
        startDate: result.start_date,
        endDate: result.end_date
      });
      
      res.json({
        message: '광고 캠페인이 성공적으로 저장되었습니다',
        campaign: result
      });
    } catch (error) {
      logger.error('광고 캠페인 저장 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      
      res.status(500).json({
        error: '광고 캠페인 저장 중 오류가 발생했습니다',
        details: error.message
      });
    }
  },

  /**
   * 광고 캠페인 삭제
   */
  deleteCampaign: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      adId: req.params.id,
      path: req.path
    };

    try {
      const { id } = req.params;
      
      // 광고 존재 확인
      const ad = await Ad.findByPk(id);
      if (!ad) {
        logger.warn('존재하지 않는 광고의 캠페인 삭제 시도', sanitizeData(logContext));
        return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });
      }
      
      // 캠페인 존재 확인
      const campaign = await adService.getCampaign(id);
      if (!campaign) {
        logger.warn('존재하지 않는 캠페인 삭제 시도', sanitizeData(logContext));
        return res.status(404).json({ message: '해당 광고에 캠페인이 존재하지 않습니다.' });
      }
      
      await adService.deleteCampaign(id);
      
      // 활동 기록
      await activityService.recordActivity(req.user.id, 'ad_campaign_delete', {
        adId: id,
        ip: req.ip,
        adTitle: ad.title
      });
      
      res.json({ message: '광고 캠페인이 성공적으로 삭제되었습니다' });
    } catch (error) {
      logger.error('광고 캠페인 삭제 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      
      res.status(500).json({
        error: '광고 캠페인 삭제 중 오류가 발생했습니다',
        details: error.message
      });
    }
  },

  /**
   * 활성 캠페인 목록 조회
   */
  getActiveCampaigns: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path
    };

    try {
      const campaigns = await adService.getActiveCampaigns();
      
      logger.info('활성 캠페인 목록 조회', sanitizeData({
        ...logContext,
        campaignsCount: campaigns.length
      }));
      
      res.json({ campaigns });
    } catch (error) {
      logger.error('활성 캠페인 목록 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      
      res.status(500).json({
        error: '활성 캠페인 목록 조회 중 오류가 발생했습니다',
        details: error.message
      });
    }
  }
  
};

module.exports = adController;