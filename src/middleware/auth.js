const jwt = require('jsonwebtoken');
const { User } = require('../models');
const tokenHandler = require('./tokenHandler');
const logger = require('../config/winston');

exports.optionalVerifyToken = async (req, res, next) => {
  try {
    // 쿠키에서 토큰 추출
    const accessToken = req.cookies.accessToken;
    
    if (!accessToken) {
      req.user = null;
      return next();
    }

    try {
      // access token 검증
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (user) {
        req.user = user;
      }
    } catch (error) {
      // 토큰 만료 시 리프레시 시도
      if (error.name === 'TokenExpiredError') {
        try {
          const refreshToken = req.cookies.refreshToken;
          if (refreshToken) {
            return refreshAndRetry(req, res, next);
          }
        } catch (refreshError) {
          logger.error('토큰 리프레시 실패', {
            requestId: req.id,
            error: refreshError.name
          });
        }
      }
      
      req.user = null;
    }
    next();
  } catch (error) {
    logger.error('미들웨어 전체 오류:', {
      requestId: req.id,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    });
    req.user = null;
    next();
  }
};

// JWT 토큰 검증 미들웨어
exports.verifyToken = async (req, res, next) => {
  try {
    // 쿠키에서 토큰 추출
    const accessToken = req.cookies.accessToken;
    
    // access token이 없는 경우
    if (!accessToken) {
      logger.warn('액세스 토큰 없음', {
        requestId: req.id,
        path: req.path
      });
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    try {
      // access token 검증
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        logger.warn('존재하지 않는 사용자', {
          requestId: req.id,
          decodedUserId: decoded.id
        });
        return res.status(401).json({ message: '유저를 찾을 수 없습니다.' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      // 토큰 만료 시 리프레시 시도
      if (error.name === 'TokenExpiredError') {
        return refreshAndRetry(req, res, next);
      }

      logger.warn('토큰 검증 실패', {
        requestId: req.id,
        error: error.name
      });
      return res.status(401).json({ 
        message: '유효하지 않은 토큰입니다.', 
        expired: error.name === 'TokenExpiredError' 
      });
    }
  } catch (error) {
    logger.error('인증 미들웨어 오류', {
      requestId: req.id,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    });
    return res.status(500).json({ message: '서버 오류' });
  }
};

// 토큰 리프레시 함수 추가
const refreshAndRetry = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: '리프레시 토큰이 없습니다.' });
    }

    const tokens = await tokenHandler.refreshTokens(refreshToken);
    
    // 새 토큰 쿠키에 설정
    setCookies(res, tokens.accessToken, tokens.refreshToken);
    
    // 다시 원래 요청 처리
    const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: '유저를 찾을 수 없습니다.' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    logger.error('토큰 리프레시 실패', {
      requestId: req.id,
      error: error.name
    });
    return res.status(401).json({ message: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' });
  }
};

// 관리자 권한 체크 미들웨어
exports.isAdmin = async (req, res, next) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    logger.warn('관리자 권한 없음', {
      requestId: req.id,
      userId: req.user?.id,
      userRole: req.user?.role,
      path: req.path
    });
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
  next();
};

// 슈퍼관리자 권한 체크 미들웨어
exports.isSuperAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    logger.warn('슈퍼관리자 권한 없음', {
      requestId: req.id,
      userId: req.user?.id,
      userRole: req.user?.role,
      path: req.path
    });
    return res.status(403).json({ message: '슈퍼관리자 권한이 필요합니다.' });
  }
  next();
};