// src/controllers/profileController.js
const profileService = require('../services/profileService');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const { User } = require('../models');

class ProfileController {
  // 현재 사용자 프로필 정보 조회
  async getProfile(req, res) {
    const logContext = {
      requestId: req.id,
      userId: req.user.id,
      path: req.path
    };

    try {
      const profile = await profileService.getProfile(req.user.id);
      
      res.json({
        success: true,
        profile
      });
    } catch (error) {
      logger.error('프로필 정보 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));

      res.status(500).json({
        success: false,
        message: '프로필 정보를 조회하는 중 오류가 발생했습니다.'
      });
    }
  }

  // 프로필 정보 수정
  async updateProfile(req, res) {
    const logContext = {
      requestId: req.id,
      userId: req.user.id,
      path: req.path,
      hasFile: !!req.file,
      body: sanitizeData(req.body)
    };

    try {
      // 요청 데이터 검증
      if (!req.body.name || req.body.name.trim() === '') {
        logger.warn('이름 필드 누락', sanitizeData(logContext));
        return res.status(400).json({
          success: false,
          message: '이름은 필수 항목입니다.'
        });
      }

      const profileData = {
        name: req.body.name.trim(),
        profileImage: req.file,
        removeProfileImage: req.body.removeProfileImage === 'true'
      };

      await profileService.updateProfile(req.user.id, profileData);

      // 사용자 정보 조회
      const user = await User.findOne({ 
        where: { id: req.user.id },
        attributes: ['id', 'email', 'name', 'role', 'provider', 'profileImage', 'lastLogin'] 
      });

      logger.info('프로필 정보 업데이트 성공', sanitizeData({
        ...logContext,
        updatedProfileId: user.id
      }));

      res.json({
        success: true,
        message: '프로필 정보가 성공적으로 업데이트되었습니다.',
        user: user
      });
    } catch (error) {
      logger.error('프로필 정보 업데이트 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));

      res.status(500).json({
        success: false,
        message: '프로필 정보를 업데이트하는 중 오류가 발생했습니다.'
      });
    }
  }

  // 비밀번호 변경
  async updatePassword(req, res) {
    const logContext = {
      requestId: req.id,
      userId: req.user.id,
      path: req.path
    };

    try {
      // 요청 데이터 검증
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        logger.warn('비밀번호 변경 필수 필드 누락', sanitizeData(logContext));
        return res.status(400).json({
          success: false,
          message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: '비밀번호는 최소 8자 이상이어야 합니다.'
        });
      }

      // local 사용자인지 확인
      if (req.user.provider !== 'local') {
        logger.warn('비로컬 사용자의 비밀번호 변경 시도', sanitizeData({
          ...logContext,
          provider: req.user.provider
        }));
        return res.status(400).json({
          success: false,
          message: '소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.'
        });
      }

      await profileService.updatePassword(
        req.user.id, 
        currentPassword, 
        newPassword
      );

      logger.info('비밀번호 변경 성공', sanitizeData(logContext));

      res.json({
        success: true,
        message: '비밀번호가 성공적으로 변경되었습니다.'
      });
    } catch (error) {
      // 현재 비밀번호가 일치하지 않는 경우
      if (error.message === 'INVALID_CURRENT_PASSWORD') {
        return res.status(400).json({
          success: false,
          message: '현재 비밀번호가 일치하지 않습니다.'
        });
      }

      logger.error('비밀번호 변경 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));

      res.status(500).json({
        success: false,
        message: '비밀번호를 변경하는 중 오류가 발생했습니다.'
      });
    }
  }
}

module.exports = new ProfileController();