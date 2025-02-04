const express = require('express');
const router = express.Router();
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// const nodemailer = require('nodemailer');

// 이메일 전송 설정
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD
//   }
// });

// 일반 회원가입
router.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // 이메일 중복 체크
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    // 이메일 인증 토큰 생성
    // const verificationToken = crypto.randomBytes(32).toString('hex');
    // const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 유효

    // 사용자 생성
    const user = await User.create({
      email,
      password,
      name,
      provider: 'local',
      // verificationToken,
      // verificationTokenExpires
    });

    // 인증 이메일 발송
    // const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    // await transporter.sendMail({
    //   to: email,
    //   subject: '이메일 인증',
    //   html: `
    //     <h1>이메일 인증</h1>
    //     <p>아래 링크를 클릭하여 이메일을 인증해주세요:</p>
    //     <a href="${verificationUrl}">이메일 인증하기</a>
    //     <p>이 링크는 24시간 동안 유효합니다.</p>
    //   `
    // });

    res.status(201).json({ 
      message: '회원가입이 완료되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('회원가입 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 이메일 인증
// router.get('/auth/verify-email', async (req, res) => {
//   try {
//     const { token } = req.query;
    
//     const user = await User.findOne({ 
//       where: { 
//         verificationToken: token,
//         verificationTokenExpires: { [Op.gt]: new Date() }
//       }
//     });

//     if (!user) {
//       return res.status(400).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
//     }

//     await user.update({
//       isEmailVerified: true,
//       verificationToken: null,
//       verificationTokenExpires: null
//     });

//     res.json({ message: '이메일이 성공적으로 인증되었습니다.' });
//   } catch (error) {
//     console.error('이메일 인증 실패:', error);
//     res.status(500).json({ message: '서버 오류' });
//   }
// });

// 일반 로그인
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // local 계정이 아닌 경우
    if (user.provider !== 'local') {
      return res.status(400).json({ 
        message: `${user.provider} 계정으로 가입된 이메일입니다. ${user.provider} 로그인을 이용해주세요.`
      });
    }

    // 비밀번호 검증
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 이메일 인증 확인
    // if (!user.isEmailVerified) {
    //   return res.status(403).json({ message: '이메일 인증이 필요합니다.' });
    // }

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 로그인 시간 업데이트
    await user.update({ lastLogin: new Date() });

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    res.json({ 
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('로그인 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 비밀번호 재설정 요청
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ where: { email, provider: 'local' } });
    if (!user) {
      return res.status(404).json({ message: '해당 이메일로 가입된 계정을 찾을 수 없습니다.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1시간 유효

    await user.update({
      verificationToken: resetToken,
      verificationTokenExpires: resetTokenExpires
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      to: email,
      subject: '비밀번호 재설정',
      html: `
        <h1>비밀번호 재설정</h1>
        <p>아래 링크를 클릭하여 비밀번호를 재설정해주세요:</p>
        <a href="${resetUrl}">비밀번호 재설정하기</a>
        <p>이 링크는 1시간 동안 유효합니다.</p>
      `
    });

    res.json({ message: '비밀번호 재설정 이메일이 발송되었습니다.' });
  } catch (error) {
    console.error('비밀번호 재설정 요청 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 비밀번호 재설정
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const user = await User.findOne({ 
      where: { 
        verificationToken: token,
        verificationTokenExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
    }

    await user.update({
      password,
      verificationToken: null,
      verificationTokenExpires: null
    });

    res.json({ message: '비밀번호가 성공적으로 재설정되었습니다.' });
  } catch (error) {
    console.error('비밀번호 재설정 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;