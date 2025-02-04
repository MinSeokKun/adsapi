const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { verifyToken, isAdmin, isSuperAdmin } = require('../middleware/auth');

// JWT 토큰 생성 함수
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

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
      const token = generateToken(req.user);
      
      // refreshToken 업데이트
      await User.update(
        { 
          refreshToken: req.user.refreshToken,
          lastLogin: new Date()
        },
        { where: { id: req.user.id } }
      );

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
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
      const token = generateToken(req.user);
      
      await User.update(
        { 
          refreshToken: req.user.refreshToken,
          lastLogin: new Date()
        },
        { where: { id: req.user.id } }
      );

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
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
  req.logout();
  res.clearCookie('jwt');
  res.redirect('/');
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