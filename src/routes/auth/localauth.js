const express = require('express');
const router = express.Router();
const { User } = require('../../models');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const tokenHandler = require('../../middleware/tokenHandler');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');
// const nodemailer = require('nodemailer');

// 이메일 전송 설정
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD
//   }
// });

router.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // 공통으로 사용될 로그 컨텍스트
    const logContext = {
      requestId: req.id,
      email,
      name
    };
    
    logger.info('회원가입 시도', sanitizeData(logContext));

    // 이메일 중복 체크
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      logger.warn('회원가입 실패 - 이메일 중복', sanitizeData(logContext));
      return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    // 이메일 인증 토큰 생성
    // const verificationToken = crypto.randomBytes(32).toString('hex');
    // const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 유효
    
    // logger.info('이메일 인증 토큰 생성', sanitizeData({
    //   ...logContext,
    //   tokenExpiry: verificationTokenExpires
    // }));

    // 사용자 생성
    const user = await User.create({
      email,
      password,
      name,
      provider: 'local',
      // verificationToken,
      // verificationTokenExpires
    });

    // 업데이트된 로그 컨텍스트
    const updatedLogContext = {
      ...logContext,
      userId: user.id
    };

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
    
    // logger.info('인증 이메일 발송 완료', sanitizeData(updatedLogContext));

    logger.info('회원가입 완료', sanitizeData(updatedLogContext));

    res.status(201).json({ 
      message: '회원가입이 완료되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    // 에러 로그
    logger.error('회원가입 처리 실패', sanitizeData({
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

// 이메일 인증
router.get('/auth/verify-email', async (req, res) => {
  const { token } = req.query;
  
  // 초기 로그 컨텍스트
  const logContext = {
    requestId: req.id,
    token // sanitizeData가 객체 내의 'token' 필드를 자동으로 필터링할 것임
  };

  try {
    logger.info('이메일 인증 시도', sanitizeData(logContext));
    
    const user = await User.findOne({ 
      where: { 
        verificationToken: token,
        verificationTokenExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      logger.warn('이메일 인증 실패 - 유효하지 않은 토큰', sanitizeData(logContext));
      return res.status(400).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
    }

    await user.update({
      isEmailVerified: true,
      verificationToken: null,
      verificationTokenExpires: null
    });

    // 사용자 정보가 포함된 업데이트된 로그 컨텍스트
    const updatedLogContext = {
      ...logContext,
      userId: user.id,
      email: user.email
    };

    logger.info('이메일 인증 완료', sanitizeData(updatedLogContext));

    res.json({ message: '이메일이 성공적으로 인증되었습니다.' });
  } catch (error) {
    logger.error('이메일 인증 처리 실패', sanitizeData({
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

// 일반 로그인
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const logContext = {
      requestId: req.id,
      email,
      ip: req.ip
    };
    
    logger.info('로그인 시도', sanitizeData(logContext));

    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.warn('로그인 실패 - 사용자 없음', sanitizeData(logContext));
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const updatedLogContext = {
      ...logContext,
      userId: user.id,
      provider: user.provider
    };

    // local 계정이 아닌 경우
    if (user.provider !== 'local') {
      logger.warn('로그인 실패 - 잘못된 인증 제공자', sanitizeData(updatedLogContext));
      return res.status(400).json({ 
        message: `${user.provider} 계정으로 가입된 이메일입니다. ${user.provider} 로그인을 이용해주세요.`
      });
    }

    // 비밀번호 검증
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      logger.warn('로그인 실패 - 잘못된 비밀번호', sanitizeData(updatedLogContext));
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 이메일 인증 확인
    // if (!user.isEmailVerified) {
    //   logger.warn('로그인 실패 - 이메일 미인증', sanitizeData(updatedLogContext));
    //   return res.status(403).json({ message: '이메일 인증이 필요합니다.' });
    // }

    // JWT 토큰 생성
    const accessToken = tokenHandler.generateAccessToken(user);
    const refreshToken = tokenHandler.generateRefreshToken(user);

    // 로그인 시간 업데이트
    await user.update({
      refreshToken,
      lastLogin: new Date()
    });
    
    // Access Token 쿠키 설정
    res.cookie('jwt', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 3600000
    });

    // Refresh Token 쿠키 설정
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logger.info('로그인 성공', sanitizeData(updatedLogContext));

    res.json({ 
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('로그인 처리 실패', sanitizeData({
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

// 비밀번호 재설정 요청
router.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  // 초기 로그 컨텍스트
  const logContext = {
    requestId: req.id,
    email,
    ip: req.ip
  };

  try {
    logger.info('비밀번호 재설정 요청', sanitizeData(logContext));
    
    const user = await User.findOne({ where: { email, provider: 'local' } });
    if (!user) {
      logger.warn('비밀번호 재설정 실패 - 사용자 없음', sanitizeData(logContext));
      return res.status(404).json({ message: '해당 이메일로 가입된 계정을 찾을 수 없습니다.' });
    }

    // 토큰 관련 정보
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1시간 유효

    // 사용자 정보 업데이트
    await user.update({
      verificationToken: resetToken,
      verificationTokenExpires: resetTokenExpires
    });

    // 업데이트된 로그 컨텍스트에 토큰 만료 시간과 사용자 ID 추가
    const updatedLogContext = {
      ...logContext,
      userId: user.id,
      tokenExpiry: resetTokenExpires,
      verificationToken: resetToken // sanitizeData가 자동으로 필터링할 것임
    };

    logger.info('비밀번호 재설정 토큰 생성', sanitizeData(updatedLogContext));

    // 이메일 발송
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

    logger.info('비밀번호 재설정 이메일 발송 완료', sanitizeData(updatedLogContext));

    res.json({ message: '비밀번호 재설정 이메일이 발송되었습니다.' });
  } catch (error) {
    logger.error('비밀번호 재설정 요청 처리 실패', sanitizeData({
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

// 비밀번호 재설정
router.post('/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  
  // 초기 로그 컨텍스트
  const logContext = {
    requestId: req.id,
    token,        // sanitizeData가 자동으로 필터링할 것임
    ip: req.ip    // IP 정보 추가
  };
  
  try {
    logger.info('비밀번호 재설정 시도', sanitizeData(logContext));
    
    const user = await User.findOne({ 
      where: { 
        verificationToken: token,
        verificationTokenExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      logger.warn('비밀번호 재설정 실패 - 유효하지 않은 토큰', sanitizeData(logContext));
      return res.status(400).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
    }

    // 비밀번호 업데이트 전 로그
    const updatedLogContext = {
      ...logContext,
      userId: user.id,
      email: user.email
    };

    logger.info('비밀번호 재설정 진행', sanitizeData(updatedLogContext));

    // 비밀번호 업데이트 및 토큰 초기화
    await user.update({
      password,
      verificationToken: null,
      verificationTokenExpires: null
    });

    logger.info('비밀번호 재설정 완료', sanitizeData(updatedLogContext));

    res.json({ message: '비밀번호가 성공적으로 재설정되었습니다.' });
  } catch (error) {
    logger.error('비밀번호 재설정 처리 실패', sanitizeData({
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

module.exports = router;