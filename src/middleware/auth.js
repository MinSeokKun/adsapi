const jwt = require('jsonwebtoken');
const { User } = require('../models');
const tokenHandler = require('./tokenHandler');

// JWT 토큰 검증 미들웨어
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return res.status(401).json({ message: '유저를 찾을 수 없습니다.' });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: '토큰이 만료되었습니다.',
          code: 'TOKEN_EXPIRED'  // 클라이언트가 이 코드를 보고 토큰 갱신 요청을 보낼 수 있음
        });
      }
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
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