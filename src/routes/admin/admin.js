const express = require('express');
const router = express.Router();
const { User, Salon, Ad, AdMedia, AdSchedule } = require('../../models');
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');
const { Op } = require('sequelize');

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
    logger.info('회원 목록 조회 시작', sanitizeData(logContext));
    
    // 페이지네이션 파라미터
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    // 검색 및 필터링 파라미터
    const {
      search,           // 검색어 (이름, 이메일)
      role,            // 권한 (user, admin, superadmin)
      provider,        // 로그인 제공자 (google, kakao, local)
      startDate,       // 가입일 범위 시작
      endDate,         // 가입일 범위 끝
      sortBy = 'id',   // 정렬 기준
      sortDir = 'DESC' // 정렬 방향
    } = req.query;

    // WHERE 절 생성
    const whereClause = {};
    
    // 검색 조건
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // 필터링 조건
    if (role) {
      whereClause.role = role;
    }

    if (provider) {
      whereClause.provider = provider;
    }

    // 날짜 범위 필터
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // 정렬 옵션
    const order = [];
    if (['id', 'name', 'email', 'createdAt', 'lastLogin'].includes(sortBy)) {
      order.push([sortBy, sortDir]);
    }
    // ID는 항상 마지막 정렬 조건으로 추가 (중복 방지)
    if (sortBy !== 'id') {
      order.push(['id', 'DESC']);
    }

    const users = await User.findAll({
      where: whereClause,
      limit,
      offset,
      order,
      attributes: [
        'id',
        'email',
        'name',
        'role',
        'provider',
        'lastLogin',
        'createdAt',
        'updatedAt'
      ]
    });

    // 다음 페이지 정보
    const totalUsers = await User.count({ where: whereClause });
    const totalPages = Math.ceil(totalUsers / limit);
    const hasNextPage = page < totalPages;

    logger.info('회원 목록 조회 성공', sanitizeData(logContext));
    
    res.json({
      users,
      pageInfo: {
        totalUsers,
        totalPages,
        currentPage: page,
        hasNextPage,
        limit
      },
      filters: {
        search,
        role,
        provider,
        startDate,
        endDate,
        sortBy,
        sortDir
      }
    });

  } catch (error) {
    console.error(error);
    logger.error('회원 목록 조회 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }))
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