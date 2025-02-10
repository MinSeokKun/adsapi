const express = require('express');
const router = express.Router();
const sequelize = require('../../config/database');
const multer = require('multer');
const { storage, STORAGE_PATHS } = require('../../config/nCloudStorage');
const { Ad, AdMedia, Salon } = require('../../models');
const { verifyToken } = require('../../middleware/auth');

// 메모리에 임시 저장하는 multer 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024 // 30MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'), false);
    }
  }
});

// 여러 파일을 처리하기 위한 필드 설정
const uploadFields = upload.fields([
  { name: 'files', maxCount: 10 },  // max size 이미지/비디오
]);

// 미용실 개인 광고 조회
router.get('/api/ads/salon', verifyToken, async (req, res) => {
  const owner_id = req.user.id; // 올바른 구조분해할당
  
  try {
    // 미용실과 광고 정보를 한 번에 조회
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
    console.error('미용실 광고 조회 실패:', error);
    res.status(500).json({ 
      error: '미용실 광고 조회 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 미용실 개인 광고 등록
router.post('/api/ads/salon', verifyToken, uploadFields, async (req, res) => {
  const transaction = await sequelize.transaction();
  const owner_id = req.user.id;

  try {
    const { title, salon_id } = req.body;

    // 입력값 검증
    if (!title || !salon_id) {
      return res.status(400).json({
        error: '필수 입력값이 누락되었습니다',
        details: '제목과 미용실 ID는 필수입니다'
      });
    }

    // 미용실 소유권 확인
    const salon = await Salon.findOne({
      where: {
        id: salon_id,
        owner_id
      }
    });

    if (!salon) {
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

    // 파일 업로드 및 미디어 정보 저장
    const mediaPromises = [];
    if (req.files && req.files.files) {  // 'files' 필드의 파일들에 접근
      for (const file of req.files.files) {
        try {
          const fileUrl = await storage.uploadFile(
            file, 
            STORAGE_PATHS.ADS, 
            `salon_${salon_id}`
          );
          
          mediaPromises.push(
            AdMedia.create({
              ad_id: ad.id,
              url: fileUrl,
              type: file.mimetype.startsWith('image/') ? 'image' : 'video',
              duration: 30,
              size: 'min',
              is_primary: mediaPromises.length === 0
            }, { transaction })
          );
        } catch (uploadError) {
          await transaction.rollback();
          return res.status(500).json({
            error: '파일 업로드 중 오류가 발생했습니다',
            details: uploadError.message
          });
        }
      }
    }

    await Promise.all(mediaPromises);
    await transaction.commit();

    // 생성된 광고 정보 조회
    const createdAd = await Ad.findByPk(ad.id, {
      include: [{
        model: AdMedia,
        as: 'media',
        attributes: ['url', 'type', 'duration', 'size', 'is_primary']
      }]
    });

    res.status(201).json({ 
      message: '광고가 성공적으로 저장되었습니다',
      ad: {
        id: createdAd.id,
        title: createdAd.title,
        type: createdAd.type,
        salon_id: createdAd.salon_id,
        media: createdAd.media.map(m => ({
          url: m.url,
          type: m.type,
          duration: m.duration,
          size: m.size,
          is_primary: m.is_primary
        }))
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('미용실 광고 등록 실패:', error);

    res.status(500).json({ 
      error: '미용실 광고 등록 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

module.exports = router;