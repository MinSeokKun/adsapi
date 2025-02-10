const express = require('express');
const router = express.Router();
const sequelize = require('../../config/database');
const { Ad, AdMedia, Salon } = require('../../models');
const { verifyToken } = require('../../middleware/auth');
const { salonAdUpload, handleUploadError } = require('../../middleware/uploadMiddleware');
const { processSalonAdMedia, formatAdResponse } = require('../../utils/adUtils');

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
router.post('/api/ads/salon',
  verifyToken,
  salonAdUpload,
  handleUploadError,
  async (req, res) => {
    const transaction = await sequelize.transaction();
    const owner_id = req.user.id;

    try {
      const { title, salon_id } = req.body;

      if (!title || !salon_id) {
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

      // 미디어 파일 처리
      await processSalonAdMedia(req.files, ad.id, salon_id, transaction);
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
        ad: formatAdResponse(createdAd.toJSON())
      });
      
    } catch (error) {
      await transaction.rollback();
      console.error('미용실 광고 등록 실패:', error);
      res.status(500).json({ 
        error: '미용실 광고 등록 중 오류가 발생했습니다',
        details: error.message 
      });
    }
  }
);

module.exports = router;