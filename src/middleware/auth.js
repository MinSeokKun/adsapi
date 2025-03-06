const jwt = require('jsonwebtoken');
const { User } = require('../models');
const tokenHandler = require('./tokenHandler');
const logger = require('../config/winston');

exports.optionalVerifyToken = async (req, res, next) => {
  try {
    const accessToken = req.cookies.jwt;

    if (!accessToken) {
      return next();
    }

    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (user) {
        req.user = user;
      }

    } catch (error) {
      
    }
    next();
  } catch (error) {
    next();
  }
};

// JWT 토큰 검증 미들웨어
exports.verifyToken = async (req, res, next) => {
  try {
    const accessToken = req.cookies.jwt;
    const refreshToken = req.cookies.refreshToken;

    // logger.info('토큰 검증 시작', {
    //   requestId: req.id,
    //   hasAccessToken: !!accessToken,
    //   hasRefreshToken: !!refreshToken
    // });
    
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

      // logger.info('토큰 검증 성공', {
      //   requestId: req.id,
      //   userId: user.id,
      //   userRole: user.role
      // });
      
      req.user = user;
      next();
    } catch (error) {
      // access token이 만료된 경우
      if (error.name === 'TokenExpiredError' && refreshToken) {
        logger.info('액세스 토큰 만료, 리프레시 토큰으로 갱신 시도', {
          requestId: req.id
        });
        try {
          // refresh token 검증
          const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
          const user = await User.findByPk(decoded.id);

          if (!user) {
            logger.warn('리프레시 토큰 검증 실패: 존재하지 않는 사용자', {
              requestId: req.id,
              decodedUserId: decoded.id
            });
            return res.status(401).json({ message: '유저를 찾을 수 없습니다.' });
          }

          // DB에 저장된 refresh token과 비교
          if (user.refreshToken !== refreshToken) {
            logger.warn('유효하지 않은 리프레시 토큰', {
              requestId: req.id,
              userId: user.id
            });
            return res.status(401).json({ message: '유효하지 않은 Refresh Token입니다.' });
          }

          // 새로운 토큰 발급
          const newAccessToken = tokenHandler.generateAccessToken(user);
          const newRefreshToken = tokenHandler.generateRefreshToken(user);

          logger.info('새로운 토큰 발급 성공', {
            requestId: req.id,
            userId: user.id
          });
          
          // refresh token 업데이트
          await user.update({ refreshToken: newRefreshToken });

          // 새로운 토큰을 쿠키에 설정
          res.cookie('jwt', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24시간
          });

          res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            // path: '/auth/refresh-token',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
          });

          req.user = user;
          next();
        } catch (refreshError) {
          logger.warn('리프레시 토큰 검증 실패', {
            requestId: req.id,
            error: refreshError.name
          });
          // refresh token도 만료된 경우
          return res.status(401).json({ message: '재로그인이 필요합니다.' });
        }
      } else {
        logger.warn('토큰 검증 실패', {
          requestId: req.id,
          error: error.name
        });
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
      }
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