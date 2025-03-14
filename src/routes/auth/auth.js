const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const { verifyToken, isAdmin, isSuperAdmin, optionalVerifyToken } = require('../../middleware/auth');
const tokenHandler = require('../../middleware/tokenHandler');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');
const activityService = require('../../services/activityService');

// Google OAuth 로그인
router.get('/auth/google',
  (req, res, next) => {
    const logContext = {
      requestId: req.id,
      provider: 'google',
      ip: req.ip,
      path: req.path,
      state: req.query.state
    };
    
    next();
  },
  (req, res, next) => {
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      state: req.query.state
    })(req, res, next);
  }
);

// Google OAuth 콜백
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    const logContext = {
      requestId: req.id,
      provider: 'google',
      userId: req.user?.id,
      path: req.path,
      state: req.query.state
    };

    let redirectUrl = process.env.FRONTEND_URL; // 기본값
    let returnPath = '/dashboard'; // 기본 경로

    try {
      // state 파라미터에서 정보 추출
      if (req.query.state) {
        const stateData = JSON.parse(decodeURIComponent(req.query.state));
        if (stateData.redirectUrl) {
          redirectUrl = stateData.redirectUrl;
        }
        if (stateData.returnUrl) {
          returnPath = stateData.returnUrl; // 상대 경로를 저장
        }
      }
    } catch (e) {
      logger.error('State 파싱 실패', { error: e });
    }

    try {
      // req.user 객체에서 사용자 ID 확인
      if (!req.user || !req.user.id) {
        throw new Error('사용자 정보를 찾을 수 없습니다');
      }
      
      const userId = req.user.id; // 사용자 ID를 변수에 할당
      
      const accessToken = tokenHandler.generateAccessToken(req.user);
      const refreshToken = tokenHandler.generateRefreshToken(req.user);
      
      await User.update(
        { 
          refreshToken,
          lastLogin: new Date()
        },
        { where: { id: req.user.id } }
      );

      // 토큰을 URL 파라미터로 전달 (보안상 좋은 방법은 아니지만 서드파티 쿠키 문제를 우회)
      const finalPath = returnPath.includes('?') ? 
        `${returnPath}&accessToken=${accessToken}&refreshToken=${refreshToken}` : 
        `${returnPath}?accessToken=${accessToken}&refreshToken=${refreshToken}`;

      // 최종 리다이렉트 URL 조합 (마지막 슬래시 처리 주의)
      const finalRedirectUrl = redirectUrl.endsWith('/') 
        ? `${redirectUrl}${finalPath.startsWith('/') ? finalPath.slice(1) : finalPath}`
        : `${redirectUrl}${finalPath.startsWith('/') ? finalPath : `/${finalPath}`}`;

      logger.info('OAuth 인증 성공 - 리다이렉트 예정', sanitizeData({
        ...logContext,
        finalRedirectUrl
      }));

      // 활동 기록 - 올바른 userId 사용
      await activityService.recordActivity(userId, 'login', {
        provider: 'google',
        timestamp: new Date()
      });
      
      res.redirect(finalRedirectUrl);
    } catch (error) {
      logger.error('OAuth 콜백 처리 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      res.redirect('/login');
    }
  }
);

// Kakao OAuth 로그인 (Google과 유사하게 수정)
router.get('/auth/kakao',
  (req, res, next) => {
    const logContext = {
      requestId: req.id,
      provider: 'kakao',
      ip: req.ip,
      path: req.path
    };
    
    next();
  },
  passport.authenticate('kakao', {
    scope: ['profile_nickname', 'account_email']
  })
);

// Kakao OAuth 콜백 (Google과 유사하게 수정)
router.get('/auth/kakao/callback',
  passport.authenticate('kakao', { failureRedirect: '/login' }),
  async (req, res) => {
    const logContext = {
      requestId: req.id,
      provider: 'kakao',
      userId: req.user?.id,
      path: req.path
    };

    let redirectUrl = process.env.FRONTEND_URL; // 기본값
    let returnPath = '/dashboard'; // 기본 경로

    try {
      // state 파라미터에서 정보 추출
      if (req.query.state) {
        const stateData = JSON.parse(decodeURIComponent(req.query.state));
        if (stateData.redirectUrl) {
          redirectUrl = stateData.redirectUrl;
        }
        if (stateData.returnUrl) {
          returnPath = stateData.returnUrl; // 상대 경로를 저장
        }
      }
    } catch (e) {
      logger.error('State 파싱 실패', { error: e });
    }

    try {
      // req.user 객체에서 사용자 ID 확인
      if (!req.user || !req.user.id) {
        throw new Error('사용자 정보를 찾을 수 없습니다');
      }
      
      const userId = req.user.id; // 사용자 ID를 변수에 할당

      const accessToken = tokenHandler.generateAccessToken(req.user);
      const refreshToken = tokenHandler.generateRefreshToken(req.user);
      
      await User.update(
        { 
          refreshToken,
          lastLogin: new Date()
        },
        { where: { id: req.user.id } }
      );

      // 토큰을 URL 파라미터로 전달
      const finalPath = returnPath.includes('?') ? 
        `${returnPath}&accessToken=${accessToken}&refreshToken=${refreshToken}` : 
        `${returnPath}?accessToken=${accessToken}&refreshToken=${refreshToken}`;

      // 최종 리다이렉트 URL 조합 (마지막 슬래시 처리 주의)
      const finalRedirectUrl = redirectUrl.endsWith('/') 
        ? `${redirectUrl}${finalPath.startsWith('/') ? finalPath.slice(1) : finalPath}`
        : `${redirectUrl}${finalPath.startsWith('/') ? finalPath : `/${finalPath}`}`;

      logger.info('OAuth 인증 성공 - 리다이렉트 예정', sanitizeData({
        ...logContext,
        finalRedirectUrl
      }));

      // 활동 기록 - 올바른 userId 사용
      await activityService.recordActivity(userId, 'login', {
        provider: 'kakao',
        timestamp: new Date()
      });
      
      res.redirect(finalRedirectUrl);
    } catch (error) {
      logger.error('OAuth 콜백 처리 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      res.redirect('/login');
    }
  }
);

// 로그아웃
router.post('/auth/logout', verifyToken, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path
  };

  try {
    if (req.user?.id) {
      await tokenHandler.invalidateTokens(req.user.id);
      logger.info('토큰 무효화 성공', sanitizeData(logContext));
    }

    res.json({ message: '로그아웃 되었습니다.' });
  } catch (error) {
    logger.error('로그아웃 처리 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    
    res.status(500).json({ message: '로그아웃 중 오류가 발생했습니다.' });
  }
});

// 사용자 권한 업데이트
router.patch('/api/users/:userId/role', verifyToken, isSuperAdmin, async (req, res) => {
  const logContext = {
    requestId: req.id,
    adminId: req.user?.id,
    targetUserId: req.params.userId,
    path: req.path,
    newRole: req.body.role
  };

  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'superadmin'].includes(role)) {
      logger.warn('잘못된 권한 요청', sanitizeData({
        ...logContext,
        invalidRole: role
      }));
      return res.status(400).json({ message: '잘못된 권한입니다.' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn('존재하지 않는 사용자 권한 업데이트 시도', sanitizeData(logContext));
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    const oldRole = user.role;
    await user.update({ role });

    logger.info('사용자 권한 업데이트 성공', sanitizeData({
      ...logContext,
      oldRole,
      newRole: role
    }));
    
    res.json({ 
      message: '권한이 업데이트되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('사용자 권한 업데이트 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    res.status(500).json({ message: '서버 오류' });
  }
});

router.get('/auth/me', optionalVerifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
    };

    if (!userId) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    // 사용자 정보 조회
    const user = await User.findOne({ 
      where: { id: userId },
      attributes: ['id', 'email', 'name', 'role', 'provider', 'profileImage', 'lastLogin'] 
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 클라이언트에 필요한 정보만 반환
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
        profileImage: user.profileImage,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    logger.error('사용자 정보 조회 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    console.error('사용자 정보 조회 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;