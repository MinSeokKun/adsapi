// services/activityService.js
const { UserActivity, User } = require('../models');
const logger = require('../config/winston');

// 활동 기록
exports.recordActivity = async (userId, activityType, details = {}) => {
  try {
    return await UserActivity.create({
      user_id: userId,
      activity_type: activityType,
      details
    });
  } catch (error) {
    console.log(error);
    logger.error('활동 기록 저장 실패', { userId, activityType, error });
    throw error;
  }
};

// 최근 활동 조회 (관리자 대시보드용)
exports.getRecentActivities = async (limit = 10) => {
  try {
    return await UserActivity.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit
    });
  } catch (error) {
    logger.error('최근 활동 조회 실패', { error });
    throw error;
  }
};

// 특정 사용자의 활동 조회
exports.getUserActivities = async (userId, limit = 20) => {
  try {
    return await UserActivity.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
  } catch (error) {
    logger.error('사용자 활동 조회 실패', { userId, error });
    throw error;
  }
};