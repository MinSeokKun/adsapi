const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const tokenHandler = require('../../middleware/tokenHandler');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');

// Google OAuth 로그인
router.get('/auth/google',
  (req, res, next) => {
    const logContext = {
      requestId: req.id,
      provider: 'google',
      ip: req.ip,
      path: req.path
    };
    
    logger.info('OAuth 인증 시도', sanitizeData(logContext));
    next();
  },
  passport.authenticate('google', { 
    scope: ['profile', 'email']
  })
);

// Google OAuth 콜백
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    const logContext = {
      requestId: req.id,
      provider: 'google',
      userId: req.user?.id,
      path: req.path
    };

    try {
      logger.info('OAuth 콜백 처리 시작', sanitizeData(logContext));

      const accessToken = tokenHandler.generateAccessToken(req.user);
      const refreshToken = tokenHandler.generateRefreshToken(req.user);
      
      await User.update(
        { 
          refreshToken,
          lastLogin: new Date()
        },
        { where: { id: req.user.id } }
      );

      // Access Token 쿠키 설정
      res.cookie('jwt', accessToken, {
        httpOnly: true,
        secure: true,  // ngrok은 https를 사용하므로 필요
        sameSite: 'None',  // cross-site 쿠키 허용
        maxAge: 24 * 3600000
      });

      // Refresh Token 쿠키 설정
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,  // ngrok은 https를 사용하므로 필요
        sameSite: 'None',  // cross-site 쿠키 허용
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      logger.info('OAuth 인증 성공', sanitizeData(logContext));
      
      res.redirect('/');
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

// Kakao OAuth 로그인
router.get('/auth/kakao',
  (req, res, next) => {
    const logContext = {
      requestId: req.id,
      provider: 'kakao',
      ip: req.ip,
      path: req.path
    };
    
    logger.info('OAuth 인증 시도', sanitizeData(logContext));
    next();
  },
  passport.authenticate('kakao', {
    scope: ['profile_nickname', 'account_email']
  })
);

// Kakao OAuth 콜백
router.get('/auth/kakao/callback',
  passport.authenticate('kakao', { failureRedirect: '/login' }),
  async (req, res) => {
    const logContext = {
      requestId: req.id,
      provider: 'kakao',
      userId: req.user?.id,
      path: req.path
    };

    try {
      logger.info('OAuth 콜백 처리 시작', sanitizeData(logContext));

      const accessToken = tokenHandler.generateAccessToken(req.user);
      const refreshToken = tokenHandler.generateRefreshToken(req.user);
      
      await User.update(
        { 
          refreshToken,
          lastLogin: new Date()
        },
        { where: { id: req.user.id } }
      );

      // res.cookie('jwt', accessToken, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === 'production',
      //   sameSite: 'strict',
      //   maxAge: 24 * 60 * 60 * 1000
      // });
      
      // res.cookie('refreshToken', refreshToken, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === 'production',
      //   sameSite: 'strict',
      //   path: '/auth/refresh-token',
      //   maxAge: 7 * 24 * 60 * 60 * 1000
      // });

      // Access Token 쿠키 설정
      res.cookie('jwt', accessToken, {
        httpOnly: true,
        secure: true,  // ngrok은 https를 사용하므로 필요
        sameSite: 'None',  // cross-site 쿠키 허용
        maxAge: 24 * 3600000
      });

      // Refresh Token 쿠키 설정
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,  // ngrok은 https를 사용하므로 필요
        sameSite: 'None',  // cross-site 쿠키 허용
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      

      logger.info('OAuth 인증 성공', sanitizeData(logContext));
      
      res.redirect('/');
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
router.get('/auth/logout', (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path
  };

  logger.info('로그아웃 시도', sanitizeData(logContext));

  req.logout((error) => {
    if (error) {
      logger.error('로그아웃 처리 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      return res.status(500).json({ message: '로그아웃 중 오류가 발생했습니다.' });
    }

    res.clearCookie('jwt', {
      httpOnly: true,
      secure: true,  // ngrok 사용시 필요
      sameSite: 'None'  // cross-site 상황이므로 None으로 설정
    });
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      // path: '/auth/refresh-token'
    });

    if (req.user?.id) {
      tokenHandler.invalidateTokens(req.user.id)
        .then(() => {
          logger.info('토큰 무효화 성공', sanitizeData(logContext));
        })
        .catch(error => {
          logger.error('토큰 무효화 실패', sanitizeData({
            ...logContext,
            error: {
              name: error.name,
              message: error.message,
              stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
            }
          }));
        });
    }

    logger.info('로그아웃 성공', sanitizeData(logContext));
    res.redirect('/');
  });
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

    logger.info('사용자 권한 업데이트 시도', sanitizeData(logContext));
    
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

router.get('/auth/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
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
    console.error('사용자 정보 조회 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;