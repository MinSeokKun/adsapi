const express = require('express');
const router = express.Router();
const { User } = require('../../models');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const tokenHandler = require('../../middleware/tokenHandler');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');
// const nodemailer = require('nodemailer');
const userService = require('../../services/userService');

// 이메일 전송 설정
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD
//   }
// });

router.post('/auth/signup', async (req, res) => {
  const logContext = {
    requestId: req.id,
    email: req.body.email,
    name: req.body.name
  };

  try {
    const user = await userService.signup(req.body, logContext);
    res.status(201).json({ 
      message: '회원가입이 완료되었습니다.',
      user 
    });
  } catch (error) {
    res.status(error.message.includes('이미 사용 중') ? 400 : 500)
        .json({ message: error.message || '서버 오류' });
  }
});

router.post('/auth/login', async (req, res) => {
  const logContext = {
    requestId: req.id,
    email: req.body.email,
    ip: req.ip
  };

  try {
    const { user, tokens } = await userService.login(req.body, logContext);
    
    // Access Token 쿠키 설정
    res.cookie('jwt', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 24 * 3600000
    });

    // Refresh Token 쿠키 설정
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ 
      message: '로그인 성공',
      user
    });
  } catch (error) {
    res.status(error.message.includes('이메일 또는 비밀번호') ? 401 : 500)
        .json({ message: error.message || '서버 오류' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const logContext = {
    requestId: req.id,
    email: req.body.email,
    ip: req.ip
  };

  try {
    const { resetToken } = await userService.requestPasswordReset(req.body.email, logContext);
    
    // 이메일 발송 로직은 여기서 처리
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // await sendResetEmail(req.body.email, resetUrl);

    res.json({ message: '비밀번호 재설정 이메일이 발송되었습니다.' });
  } catch (error) {
    res.status(error.message.includes('찾을 수 없습니다') ? 404 : 500)
        .json({ message: error.message || '서버 오류' });
  }
});

router.post('/reset-password', async (req, res) => {
  const logContext = {
    requestId: req.id,
    token: req.body.token,
    ip: req.ip
  };

  try {
    await userService.resetPassword(req.body.token, req.body.password, logContext);
    res.json({ message: '비밀번호가 성공적으로 재설정되었습니다.' });
  } catch (error) {
    res.status(error.message.includes('유효하지 않거나 만료된') ? 400 : 500)
        .json({ message: error.message || '서버 오류' });
  }
});

module.exports = router;