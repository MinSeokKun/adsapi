const jwt = require('jsonwebtoken');
const { User } = require('../models');
const tokenHandler = require('./tokenHandler');

// JWT 토큰 검증 미들웨어
exports.verifyToken = async (req, res, next) => {
  try {
    const accessToken = req.cookies.jwt;
    const refreshToken = req.cookies.refreshToken;

    // access token이 없는 경우
    if (!accessToken) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    try {
      // access token 검증
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return res.status(401).json({ message: '유저를 찾을 수 없습니다.' });
      }

      req.user = user;
      next();
    } catch (error) {
      // access token이 만료된 경우
      if (error.name === 'TokenExpiredError' && refreshToken) {
        try {
          // refresh token 검증
          const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
          const user = await User.findByPk(decoded.id);

          if (!user) {
            return res.status(401).json({ message: '유저를 찾을 수 없습니다.' });
          }

          // DB에 저장된 refresh token과 비교
          if (user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: '유효하지 않은 Refresh Token입니다.' });
          }

          // 새로운 토큰 발급
          const newAccessToken = tokenHandler.generateAccessToken(user);
          const newRefreshToken = tokenHandler.generateRefreshToken(user);

          // refresh token 업데이트
          await user.update({ refreshToken: newRefreshToken });

          // 새로운 토큰을 쿠키에 설정
          res.cookie('jwt', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1시간
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
          // refresh token도 만료된 경우
          return res.status(401).json({ message: '재로그인이 필요합니다.' });
        }
      } else {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
      }
    }
  } catch (error) {
    console.error('인증 미들웨어 에러:', error);
    return res.status(500).json({ message: '서버 오류' });
  }
};

// 관리자 권한 체크 미들웨어
exports.isAdmin = async (req, res, next) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
  next();
};

// 슈퍼관리자 권한 체크 미들웨어
exports.isSuperAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ message: '슈퍼관리자 권한이 필요합니다.' });
  }
  next();
};