const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const tokenHandler = require('../../middleware/tokenHandler');

// Google OAuth 로그인
router.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email']
  })
);

// Google OAuth 콜백
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Access Token과 Refresh Token 생성
      const accessToken = tokenHandler.generateAccessToken(req.user);
      const refreshToken = tokenHandler.generateRefreshToken(req.user);
      
      // refreshToken과 마지막 로그인 시간 업데이트
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 3600000  // 24시간
      });
      
      // Refresh Token 쿠키 설정
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        // path: '/auth/refresh-token',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
      });
      
      res.redirect('/');
    } catch (error) {
      console.error('OAuth 콜백 처리 실패:', error);
      res.redirect('/login');
    }
  }
);

// Kakao OAuth 로그인
router.get('/auth/kakao',
  passport.authenticate('kakao', {
    scope: ['profile_nickname', 'account_email']
  })
);

// Kakao OAuth 콜백
router.get('/auth/kakao/callback',
  passport.authenticate('kakao', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Access Token과 Refresh Token 생성
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24시간
      });
      
      // Refresh Token 쿠키 설정
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/auth/refresh-token',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
      });
      
      res.redirect('/');
    } catch (error) {
      console.error('OAuth 콜백 처리 실패:', error);
      res.redirect('/login');
    }
  }
);

// 로그아웃
router.get('/auth/logout', (req, res) => {
  // Passport 세션 정리
  req.logout((err) => {
    if (err) {
      console.error('로그아웃 실패:', err);
      return res.status(500).json({ message: '로그아웃 중 오류가 발생했습니다.' });
    }

    // JWT 토큰 쿠키 제거
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    // Refresh 토큰 쿠키 제거
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh-token'
    });

    // DB에서 Refresh Token 제거 시도
    // 에러가 발생하더라도 로그아웃은 계속 진행
    if (req.user) {
      tokenHandler.invalidateTokens(req.user.id)
        .catch(error => console.error('Refresh 토큰 제거 실패:', error));
    }

    res.redirect('/');
  });
});

// 사용자 권한 업데이트
router.patch('/api/users/:userId/role', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: '잘못된 권한입니다.' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    await user.update({ role });
    
    res.json({ 
      message: '권한이 업데이트되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('권한 업데이트 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;