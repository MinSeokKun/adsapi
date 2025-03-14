const jwt = require('jsonwebtoken');
const { User } = require('../models');
const tokenHandler = require('./tokenHandler');
const logger = require('../config/winston');

exports.optionalVerifyToken = async (req, res, next) => {
  try {
    // 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const accessToken = authHeader.split(' ')[1];
    
    // console.log('accessToken : ', accessToken);
    
    if (!accessToken) {
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
      logger.error('토큰 검증 실패', {
        requestId: req.id,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      });
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
    next();
  }
};

// JWT 토큰 검증 미들웨어
exports.verifyToken = async (req, res, next) => {
  try {
    // 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    
    // access token이 없는 경우
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('액세스 토큰 없음', {
        requestId: req.id,
        path: req.path
      });
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const accessToken = authHeader.split(' ')[1];

    // logger.info('토큰 검증 시작', {
    //   requestId: req.id,
    //   hasAccessToken: !!accessToken,
    // });
    
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

      // logger.info('토큰 검증 성공', {
      //   requestId: req.id,
      //   userId: user.id,
      //   userRole: user.role
      // });
      
      req.user = user;
      next();
    } catch (error) {
      logger.warn('토큰 검증 실패', {
        requestId: req.id,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
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

// 관리자 권한 체크 미들웨어
exports.isAdmin = async (req, res, next) => {
  // logger.info('관리자 권한 확인', {
  //   requestId: req.id,
  //   userId: req.user?.id,
  //   userRole: req.user?.role,
  //   path: req.path
  // });
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
  // logger.info('슈퍼관리자 권한 확인', {
  //   requestId: req.id,
  //   userId: req.user?.id,
  //   userRole: req.user?.role,
  //   path: req.path
  // });
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