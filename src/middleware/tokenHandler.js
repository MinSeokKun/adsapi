const jwt = require('jsonwebtoken');
const { User } = require('../models');

const tokenHandler = {
  // Access Token 생성
  generateAccessToken: (user) => {
    return jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },

  // Refresh Token 생성
  generateRefreshToken: (user) => {
    return jwt.sign(
      { id: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );
  },

  // Token 갱신 처리
  refreshTokens: async (refreshToken) => {
    try {
      // Refresh Token 검증
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      
      // DB에서 사용자 조회
      const user = await User.findOne({ 
        where: { 
          id: decoded.id,
          refreshToken: refreshToken
        }
      });

      if (!user) {
        throw new Error('Invalid refresh token');
      }

      // 새로운 토큰 쌍 생성
      const newAccessToken = tokenHandler.generateAccessToken(user);
      const newRefreshToken = tokenHandler.generateRefreshToken(user);

      // DB에 새로운 Refresh Token 저장
      await user.update({ refreshToken: newRefreshToken });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error('Failed to refresh token');
    }
  },

  // Token 무효화 (로그아웃)
  invalidateTokens: async (userId) => {
    await User.update(
      { refreshToken: null },
      { where: { id: userId } }
    );
  }
};

module.exports = tokenHandler;