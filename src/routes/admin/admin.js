const express = require('express');
const router = express.Router();
const { User, Salon, Ad, AdMedia, AdSchedule, Location } = require('../../models');
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');
const { Op } = require('sequelize');
const userService = require('../../services/userService');

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
      
      // 최근 가입한 사용자 (최근 5개)
      User.findAll({
        attributes: ['id', 'name', 'email', 'provider', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      
      // 최근 등록된 광고 (최근 5개)
      Ad.findAll({
        attributes: ['id', 'title', 'type', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      
      // 최근 등록된 미용실 (최근 5개)
      Salon.findAll({
        attributes: ['id', 'name', 'createdAt'],
        include: [{
          model: User,
          attributes: ['name'],
          as: 'owner'
        },{
          model: Location,
          attributes: ['address_line1', 'address_line2'],
          as: 'location'
        }],
        order: [['createdAt', 'DESC']],
        limit: 5
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
      recentSalons: recentSalons
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
    }));
    res.status(500).json({ 
      error: '대시보드 데이터 조회 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 전체 회원 조회
router.get('/api/admin/users', verifyToken, isSuperAdmin, async(req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path
  };

  try {
    const result = await userService.getUsers({
      limit: parseInt(req.query.limit),
      page: parseInt(req.query.page),
      search: req.query.search,
      role: req.query.role,
      provider: req.query.provider,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sortBy: req.query.sortBy,
      sortDir: req.query.sortDir
    }, logContext);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: '서버 오류',
      details: error.message
    });
  }
});

// 전체 광고 조회
router.get('/api/admin/ads', verifyToken, isSuperAdmin, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path
  };

});

module.exports = router;