const express = require('express');
const router = express.Router();
const sequelize = require('../../config/database');
const { Ad, AdMedia, AdSchedule } = require('../../models');
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const { sponsorAdUpload, handleUploadError } = require('../../middleware/uploadMiddleware');
const { processSponsorAdMedia, updateAdMedia, updateAdSchedules, getAdDetails, formatAdResponse, parseSchedules } = require('../../utils/adUtils');
const { storage } = require('../../config/storage')
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');

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
      logger.info('광고 조회 시작', sanitizeData(logContext));
      const { time } = req.query;
  
      const queryOptions = {
        include: [{
          model: AdMedia,
          as: 'media',
          attributes: ['url', 'type', 'duration', 'size', 'is_primary']
        }, {
          model: AdSchedule,
          required: false,
          attributes: ['time']
        }],
        where: {
          is_active: true
        },
      };
  
      if (time) {
        queryOptions.include[1].where = { time: time + ':00:00' };
        queryOptions.include[1].required = true;
      }
  
      const ads = await Ad.findAll(queryOptions);
  
      logger.info('광고 조회 완료', sanitizeData({
        ...logContext,
        adCount: ads.length,
        hasTimeFilter: !!time
      }));
  
      res.json({ 
        ads: ads.map(ad => ({
          id: ad.id,
          title: ad.title,
          type: ad.type,
          media: ad.media.map(media => ({
            url: media.url,
            type: media.type,
            duration: media.duration,
            size: media.size,
            is_primary: media.is_primary
          })),
          schedules: ad.AdSchedules ? 
            ad.AdSchedules.map(schedule => parseInt(schedule.time.split(':')[0])).sort((a, b) => a - b) 
            : null
        }))
      });
  
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
      logger.info('광고 목록 조회 시작', sanitizeData(logContext));
  
      const ads = await Ad.findAll({
        include: [{
          model: AdMedia,
          as: 'media',
          attributes: ['url', 'type', 'duration', 'size', 'is_primary']
        }],
        where: {
          is_active: true
        }
      });
  
      logger.info('광고 목록 조회 완료', sanitizeData({
        ...logContext,
        adCount: ads.length
      }));
  
      res.json({ 
        ads: ads.map(ad => ({
          id: ad.id,
          title: ad.title,
          type: ad.type,
          media: ad.media.map(media => ({
            url: media.url,
            type: media.type,
            duration: media.duration,
            size: media.size,
            is_primary: media.is_primary
          }))
        }))
      });
  
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
    let transaction;
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path,
    requestData: sanitizeData(req.body),
    fileInfo: req.files ? {
      count: req.files.length,
      totalSize: req.files.reduce((acc, file) => acc + file.size, 0)
    } : null
  };

  try {
    logger.info('광고 등록 시작', sanitizeData(logContext));
    
    transaction = await sequelize.transaction();
    const { title, schedules } = req.body;

    logger.info('광고 미디어 처리 시작', sanitizeData({
      ...logContext,
      mediaCount: req.files?.length || 0
    }));

    const ad = await Ad.create({
      title,
      is_active: true,
      type: 'sponsor'
    }, { transaction });

    await processSponsorAdMedia(req.files, ad.id, transaction);
    const parsedSchedules = await updateAdSchedules(ad.id, schedules, transaction);

    await transaction.commit();
    const createdAd = await getAdDetails(ad.id);

    logger.info('광고 등록 완료', sanitizeData({
      ...logContext,
      adId: ad.id,
      mediaCount: req.files?.length || 0,
      scheduleCount: parsedSchedules?.length || 0
    }));
    
    res.status(201).json({ 
      message: '광고가 성공적으로 저장되었습니다',
      ad: formatAdResponse({ ...createdAd.toJSON(), schedules: parsedSchedules })
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    
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
  sponsorAdUpload,
  handleUploadError,
  async (req, res) => {

  let transaction;
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
    logger.info('광고 수정 시작', sanitizeData(logContext));
    
    transaction = await sequelize.transaction();
    const { id } = req.params;
    const { title, is_active, schedules } = req.body;

    const ad = await Ad.findByPk(id);
    if (!ad) {
      logger.warn('존재하지 않는 광고 수정 시도', sanitizeData(logContext));
      return res.status(404).json({ error: '광고를 찾을 수 없습니다' });
    }

    logger.info('광고 기본 정보 수정', sanitizeData({
      ...logContext,
      updateFields: { title, is_active }
    }));

    await ad.update({ title, is_active }, { transaction });

    if (req.files && (req.files.maxFiles || req.files.minFiles)) {
      logger.info('광고 미디어 수정 시작', sanitizeData({
        ...logContext,
        mediaFiles: {
          maxFiles: req.files.maxFiles?.length || 0,
          minFiles: req.files.minFiles?.length || 0
        }
      }));

      await updateAdMedia({
        adId: id,
        files: req.files,
        transaction,
        type: 'sponsor'
      });
    }

    let parsedSchedules = [];
    if (schedules) {
      logger.info('광고 스케줄 수정 시작', sanitizeData({
        ...logContext,
        scheduleCount: schedules.length
      }));
      parsedSchedules = await updateAdSchedules(id, schedules, transaction);
    }

    await transaction.commit();
    const updatedAd = await getAdDetails(id);

    logger.info('광고 수정 완료', sanitizeData({
      ...logContext,
      mediaUpdated: !!req.files,
      scheduleUpdated: !!schedules,
      scheduleCount: parsedSchedules.length
    }));
    
    res.json({ 
      message: '광고가 성공적으로 수정되었습니다',
      ad: formatAdResponse({
        ...updatedAd.toJSON(),
        schedules: parsedSchedules
      })
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    
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
    let transaction;
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    adId: req.params.id,
    path: req.path
  };

  try {
    logger.info('광고 삭제 시작', sanitizeData(logContext));
    
    transaction = await sequelize.transaction();
    const { id } = req.params;

    const ad = await Ad.findByPk(id, {
      include: [{
        model: AdMedia,
        as: 'media',
        attributes: ['url']
      }]
    });

    if (!ad) {
      logger.warn('존재하지 않는 광고 삭제 시도', sanitizeData(logContext));
      return res.status(404).json({ error: '광고를 찾을 수 없습니다' });
    }

    logger.info('광고 관련 데이터 삭제 시작', sanitizeData({
      ...logContext,
      mediaCount: ad.media.length
    }));

    await Promise.all([
      AdMedia.destroy({ where: { ad_id: id }, transaction }),
      AdSchedule.destroy({ where: { ad_id: id }, transaction }),
      ad.destroy({ transaction })
    ]);

    for (const media of ad.media) {
      await storage.deleteFile(media.url);
    }

    await transaction.commit();

    logger.info('광고 삭제 완료', sanitizeData({
      ...logContext,
      deletedMedia: ad.media.length
    }));

    res.json({ message: '광고가 성공적으로 삭제되었습니다' });

  } catch (error) {
    if (transaction) await transaction.rollback();
    
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
    let transaction;
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      requestData: sanitizeData(req.body)
    };
  
    try {
      logger.info('광고 스케줄 저장 시작', sanitizeData(logContext));
      
      const scheduleData = req.body;
      if (!Array.isArray(scheduleData)) {
        logger.warn('잘못된 스케줄 데이터 형식', sanitizeData({
          ...logContext,
          dataType: typeof scheduleData
        }));
        return res.status(400).json({ error: '올바른 형식의 데이터가 아닙니다' });
      }
  
      transaction = await sequelize.transaction();
      const adIds = scheduleData.map(item => item.ad_id);
  
      logger.info('광고 스케줄 처리 중', sanitizeData({
        ...logContext,
        adCount: adIds.length,
        scheduleCount: scheduleData.reduce((acc, item) => acc + item.time.length, 0)
      }));
  
      const schedulePromises = scheduleData.flatMap(item => {
        const { ad_id, time } = item;
        return [
          AdSchedule.destroy({ where: { ad_id }, transaction }),
          ...time.map(hour => 
            AdSchedule.create({
              ad_id,
              time: `${hour}:00:00`
            }, { transaction })
          )
        ];
      });
  
      await Promise.all(schedulePromises);
      await transaction.commit();
  
      const updatedAds = await Ad.findAll({
        where: { id: adIds },
        include: [
          {
            model: AdMedia,
            as: 'media',
            attributes: ['url', 'type', 'duration', 'size', 'is_primary']
          },
          {
            model: AdSchedule,
            required: false,
            attributes: ['time']
          }
        ]
      });
  
      const formattedAds = updatedAds.map(ad => ({
        id: ad.id,
        title: ad.title,
        media: ad.media.map(m => ({
          url: m.url,
          type: m.type,
          duration: m.duration,
          size: m.size,
          is_primary: m.is_primary
        })),
        schedules: ad.AdSchedules.map(schedule => 
          parseInt(schedule.time.split(':')[0])
        ).sort((a, b) => a - b)
      }));
  
      logger.info('광고 스케줄 저장 완료', sanitizeData({
        ...logContext,
        adCount: adIds.length,
        totalSchedules: formattedAds.reduce((acc, ad) => acc + ad.schedules.length, 0)
      }));
      
      res.status(200).json({ 
        message: '광고 스케줄이 성공적으로 저장되었습니다',
        ads: formattedAds
      });
  
    } catch (error) {
      if (transaction) await transaction.rollback();
      
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

module.exports = router;