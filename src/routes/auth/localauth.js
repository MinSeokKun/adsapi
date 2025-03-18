const express = require('express');
const router = express.Router();
const userService = require('../../services/userService');
const { User } = require('../../models');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');
const { setCookies, clearCookies } = require('../../middleware/cookieHandler');
const jwt = require('jsonwebtoken');
const tokenHandler = require('../../middleware/tokenHandler');
const activityService = require('../../services/userActivityService');
const { ACTIVITY_TYPES } = require('../../middleware/activityMiddleware');

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
    // 쿠키 설정 추가
    setCookies(res, tokens.accessToken, tokens.refreshToken);
    
    // 활동 기록
    await activityService.recordActivity(user.id, ACTIVITY_TYPES.USER_LOGIN, {
      provider: 'local',
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // 토큰을 응답 본문에 포함시킴
    res.json({ 
      message: '로그인 성공',
      user
    });
  } catch (error) {
    res.status(error.message.includes('이메일 또는 비밀번호') ? 401 : 500)
        .json({ message: error.message || '서버 오류' });
  }
});

// 토큰 갱신 엔드포인트
router.post('/auth/refresh-token', async (req, res) => {
  const logContext = {
    requestId: req.id,
    ip: req.ip,
    path: req.path
  };

  try {
    // 쿠키에서 refreshToken 가져오기
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      logger.warn('리프레시 토큰 없음', sanitizeData(logContext));
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    // 토큰 검증
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findOne({ 
      where: { id: decoded.id, refreshToken }
    });
    
    if (!user) {
      logger.warn('유효하지 않은 리프레시 토큰', sanitizeData(logContext));
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    // 새 토큰 생성
    const newAccessToken = tokenHandler.generateAccessToken(user);
    const newRefreshToken = tokenHandler.generateRefreshToken(user);
    
    // 이전 리프레시 토큰 무효화
    await user.update({ refreshToken: newRefreshToken });
    
    // 쿠키에 새 토큰 설정
    setCookies(res, newAccessToken, newRefreshToken);
    
    logger.info('토큰 갱신 성공', sanitizeData({
      ...logContext,
      userId: user.id
    }));
    
    res.json({
      message: '토큰이 갱신되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('토큰 갱신 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    
    // 토큰 오류 시 쿠키 제거
    clearCookies(res);
    res.status(401).json({ message: '토큰이 유효하지 않습니다.' });
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