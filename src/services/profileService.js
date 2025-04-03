// src/services/profileService.js
const sequelize = require('../config/database');
const { User } = require('../models');
const { storage, STORAGE_PATHS } = require('../config/storage');
const bcrypt = require('bcrypt');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');

class ProfileService {
  // 사용자 프로필 정보 조회
  async getProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: [
        'id', 
        'email', 
        'name', 
        'role', 
        'provider', 
        'profileImage',
        'lastLogin', 
        'createdAt'
      ]
    });

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  // 프로필 정보 업데이트 (이름, 프로필 이미지 등)
  async updateProfile(userId, profileData) {
    const { name, profileImage, removeProfileImage } = profileData;
    
    let transaction;
    try {
      transaction = await sequelize.transaction();
      
      const user = await User.findByPk(userId, { transaction });
      
      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }
      
      // 이름 업데이트
      user.name = name;
      
      // 프로필 이미지 업로드 처리
      if (profileImage) {
        // 기존 이미지가 있으면 삭제
        if (user.profileImage) {
          try {
            await storage.deleteFile(user.profileImage);
          } catch (error) {
            logger.warn('기존 프로필 이미지 삭제 실패', sanitizeData({
              userId,
              imageUrl: user.profileImage,
              error: {
                name: error.name,
                message: error.message
              }
            }));
            // 이미지 삭제 실패해도 계속 진행
          }
        }
        
        // 새 이미지 업로드
        const imageUrl = await storage.uploadFile(
          profileImage,
          STORAGE_PATHS.PROFILES,
          userId.toString()
        );
        
        user.profileImage = imageUrl;
      } else if (removeProfileImage) {
        // 이미지 제거 요청이 있는 경우
        if (user.profileImage) {
          try {
            await storage.deleteFile(user.profileImage);
          } catch (error) {
            logger.warn('프로필 이미지 삭제 실패', sanitizeData({
              userId,
              imageUrl: user.profileImage,
              error: {
                name: error.name,
                message: error.message
              }
            }));
            // 이미지 삭제 실패해도 계속 진행
          }
        }
        user.profileImage = null;
      }
      
      await user.save({ transaction });
      await transaction.commit();
      
      // 응답으로 보낼 사용자 정보
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
        profileImage: user.profileImage,
        lastLogin: user.lastLogin
      };
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  // 비밀번호 변경 (로컬 사용자만 해당)
  async updatePassword(userId, currentPassword, newPassword) {
    let transaction;
    try {
      transaction = await sequelize.transaction();
      
      const user = await User.findByPk(userId, { transaction });
      
      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }
      
      // local 사용자인지 확인
      if (user.provider !== 'local') {
        throw new Error('소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.');
      }
      
      // 현재 비밀번호 확인
      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        throw new Error('INVALID_CURRENT_PASSWORD');
      }
      
      // 새 비밀번호로 업데이트
      user.password = newPassword;
      await user.save({ transaction });
      
      await transaction.commit();
      return true;
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new ProfileService();