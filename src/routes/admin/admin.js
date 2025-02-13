const express = require('express');
const router = express.Router();
const { User, Salon, Ad, AdMedia, AdSchedule } = require('../../models');
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');

// 관리자 대시보드
router.get('/api/admin/dashboard', verifyToken, isSuperAdmin, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path
  };
  try {
    logger.info('관리자 대시보드 조회 시도', sanitizeData(logContext));
    
    const [
      totalUsers,
      totalAds,
      totalSalons,
      recentUsers,
      recentAds,
      recentSalons
    ] = await Promise.all([
      // 전체 통계
      User.count(),
      Ad.count({ where: { is_active: true } }),
      Salon.count(),
      
      // 최근 가입한 사용자 (최근 10명)
      User.findAll({
        attributes: ['id', 'name', 'email', 'provider', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 10
      }),
      
      // 최근 등록된 광고 (최근 10개)
      Ad.findAll({
        attributes: ['id', 'title', 'type', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 10
      }),
      
      // 최근 등록된 미용실 (최근 10개)
      Salon.findAll({
        attributes: ['id', 'name', 'address', 'createdAt'],
        include: [{
          model: User,
          attributes: ['name'],
          as: 'owner'
        }],
        order: [['createdAt', 'DESC']],
        limit: 10
      })
    ]);

    logger.info('관리자 대시보드 조회 성공', sanitizeData(logContext))
    // 응답 데이터 구성
    res.json({
      stats: {
        totalUsers,
        totalAds,
        totalSalons
      },
      recentUsers: recentUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        createdAt: user.createdAt
      })),
      recentAds: recentAds.map(ad => ({
        id: ad.id,
        title: ad.title,
        type: ad.type,
        createdAt: ad.createdAt
      })),
      recentSalons: recentSalons.map(salon => ({
        id: salon.id,
        name: salon.name,
        address: salon.address,
        ownerName: salon.owner?.name,
        createdAt: salon.createdAt
      }))
    });

  } catch (error) {
    logger.error('관리자 대시보드 조회 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }))
    res.status(500).json({ 
      error: '대시보드 데이터 조회 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 전체 회원 조회
router.get('/api/admin/users', verifyToken, isSuperAdmin, async(req, res) => {

});

// 전체 광고 조회
router.get('/api/admin/ads', verifyToken, isSuperAdmin, async (req, res) => {
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

module.exports = router;