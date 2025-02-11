const express = require('express');
const router = express.Router();
const sequelize = require('../../config/database');
const { Ad, AdMedia, Salon, AdSchedule } = require('../../models');
const { verifyToken } = require('../../middleware/auth');
const { salonAdUpload, handleUploadError } = require('../../middleware/uploadMiddleware');
const { processSalonAdMedia, updateAdMedia, updateAdSchedules, getAdDetails, formatAdResponse, parseSchedules } = require('../../utils/adUtils');
const storage = require('../../config/storage');
const logger = require('../../config/winston');
const sanitizeData = require('../../utils/sanitizer');

// 미용실 개인 광고 조회
router.get('/api/ads/salon', verifyToken, async (req, res) => {
  const owner_id = req.user.id; // 올바른 구조분해할당
  const logContext = {
    requestId: req.id,
    userId: owner_id,
    path: req.path
  };
  try {
    logger.info('미용실 광고 목록 조회 시작', sanitizeData(logContext));

    const salons = await Salon.findAll({
      where: { owner_id },
      include: [{
        model: Ad,
        include: [{
          model: AdMedia,
          as: 'media',
          attributes: ['url', 'type', 'duration', 'size', 'is_primary']
        }]
      }]
    });

    logger.info('미용실 광고 목록 조회 완료', sanitizeData({
      ...logContext,
      salonCount: salons.length
    }));

    // 응답 데이터 구조화
    const response = salons.map(salon => ({
      id: salon.id,
      name: salon.name,
      address: salon.address,
      business_hours: salon.business_hours,
      ads: salon.Ads.map(ad => ({
        id: ad.id,
        title: ad.title,
        media: ad.media.map(media => ({
          url: media.url,
          type: media.type,
          duration: media.duration,
          size: media.size,
          is_primary: media.is_primary
        }))
      }))
    }));
    
    res.json({ salons: response });
    
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
    let transaction;
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
      transaction = await sequelize.transaction();
      logger.info('미용실 광고 등록 시작', sanitizeData(logContext));

      const { title, salon_id, schedules } = req.body;

      if (!title || !salon_id) {
        logger.warn('필수 입력값 누락', sanitizeData(logContext));
        return res.status(400).json({
          error: '필수 입력값이 누락되었습니다',
          details: '제목과 미용실 ID는 필수입니다'
        });
      }

      // 미용실 소유권 확인
      const salon = await Salon.findOne({
        where: { id: salon_id, owner_id }
      });

      if (!salon) {
        logger.warn('미용실 광고 접근 권한 없음', sanitizeData(logContext));
        return res.status(403).json({
          error: '권한이 없습니다',
          details: '해당 미용실의 소유자가 아닙니다'
        });
      }

      // 광고 생성
      const ad = await Ad.create({
        title,
        type: 'salon',
        salon_id,
        is_active: true
      }, { transaction });

      // 스케줄 생성
      const parsedSchedules = await updateAdSchedules(id, schedules, transaction);

      await Promise.all(schedulePromises);

      // 미디어 파일 처리
      await processSalonAdMedia(req.files, ad.id, salon_id, transaction);
      await transaction.commit();

      // 생성된 광고 정보 조회
      const createdAd = await getAdDetails(ad.id);

      logger.info('미용실 광고 등록 완료', sanitizeData({
        ...logContext,
        adId: ad.id
      }));

      res.status(201).json({ 
        message: '광고가 성공적으로 저장되었습니다',
        ad: formatAdResponse({
          ...createdAd.toJSON(),
          schedules: parsedSchedules
        })
      });
      
    } catch (error) {
      await transaction.rollback();
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
    let transaction;
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
      logger.info('미용실 광고 수정 시작', sanitizeData(logContext));
      transaction = await sequelize.transaction();



      // 미용실 광고 존재 확인
      const ad = await Ad.findByPk(id);
      if (!ad) {
        logger.warn('미용실 광고를 찾을 수 없음', sanitizeData(logContext));
        return res.status(404).json({ error: '광고를 찾을 수 없습니다' });
      }

      // 미용실 소유권 확인
      const salon = await Salon.findOne({
        where: { id: ad.salon_id, owner_id }
      });
      if (!salon) {
        logger.warn('미용실 광고 접근 권한 없음', sanitizeData({
          ...logContext, salonId: ad.salon_id
        }));
        return res.status(403).json({ 
          error: "권한이 없습니다", 
          details: "해당 미용실의 소유자가 아닙니다" 
        });
      }

      // 광고 기본 정보 업데이트
      await ad.update({ 
        title, 
        is_active 
      }, { transaction });

      // 파일이 있는 경우에만 미디어 업데이트
      if (req.files && Object.keys(req.files).length > 0) {
        await updateAdMedia({
          adId: id,
          files: req.files,
          transaction,
          type: 'salon',
          salonId: salon.id
        });
      }

      // 4. 스케줄 업데이트
      const parsedSchedules = await updateAdSchedules(id, schedules, transaction);

      await transaction.commit();

      // 업데이트된 광고 정보 조회
      const updatedAd = await getAdDetails(id);

      logger.info('미용실 광고 수정 완료', sanitizeData(logContext));
      
      res.json({
        message: '광고가 성공적으로 수정되었습니다',
        ad: formatAdResponse({
          ...updatedAd.toJSON(),
          schedules: parsedSchedules})
      });

    } catch (error) {
      await transaction.rollback();
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
router.get('/api/ads/salon/:id', verifyToken, async (req, res) => {
  let transaction;
  const { id } = req.params;
  const owner_id = req.user.id;

  const logContext = {
    requestId: req.id,
    owner_id: owner_id,
    adId: id,
    path: req.path
  };
  try {
    transaction = await sequelize.transaction();
    

    logger.info('미용실 광고 삭제 시작', sanitizeData(logContext));
    
    // 미용실 광고 존재 확인
    const ad = await Ad.findByPk(id, {
      include: [{
        model: AdMedia,
        as: 'media',
        attributes: ['url']
      }],
      transaction
    });

    if (!ad) {
      logger.warn('미용실 광고를 찾을 수 없음', sanitizeData(logContext));
      return res.status(404).json({ error: '광고를 찾을 수 없습니다' });
    }

    // 미용실 소유권 확인
    const salon = await Salon.findOne({
      where: { id: ad.salon_id, owner_id },
      transaction
    });

    if (!salon) {
      logger.warn('미용실 광고 접근 권한 없음', sanitizeData({
        ...logContext,
        salonId: ad.salon_id
      }));
      return res.status(403).json({ 
        error: "권한이 없습니다", 
        details: "해당 미용실의 소유자가 아닙니다" 
      });
    }

    // DB에서 데이터 삭제
    await Promise.all([
      AdMedia.destroy({ where: { ad_id: id }, transaction }),
      AdSchedule.destroy({ where: { ad_id: id }, transaction }),
      ad.destroy({ transaction })
    ]);

    // 스토리지에서 파일 삭제
    try {
      await Promise.all(
        ad.media.map(media => storage.deleteFile(media.url))
      );
    } catch (storageError) {
      console.error('파일 삭제 실패:', storageError);
      // 파일 삭제 실패를 로깅하고 계속 진행
    }

    await transaction.commit();

    logger.info('미용실 광고 삭제 완료', sanitizeData(logContext));

    res.json({ message: '광고가 성공적으로 삭제되었습니다' });

  } catch (error) {
    if (transaction) await transaction.rollback();
    
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