// services/activityService.js
const { UserActivity, User, Salon } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../config/winston');

/**
 * UserActivity 서비스
 * 활동 로그를 생성하고 관리하는 함수들을 포함
 */
const userActivityService = {
  /**
   * 새로운 사용자 활동 로그를 생성합니다
   * @param {number} userId - 사용자 ID
   * @param {string} activityType - 활동 유형
   * @param {object} details - 활동 상세 정보 (JSON)
   * @returns {Promise<Object>} 생성된 활동 로그
   */
  recordActivity: async (userId, activityType, details = {}) => {
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
  },

  recordDailyActivity: async (userId, activityType, details = {}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 오늘 날짜의 시작 시간으로 설정
  
  // 오늘 이미 로그인 활동이 있는지 확인
  const existingActivity = await UserActivity.findOne({
    where: {
      user_id: userId,
      activity_type: activityType,
      created_at: {
        [Op.gte]: today
      }
    }
  });
  
  // 현재 시간을 details에 last_login_time으로 추가
  const updatedDetails = {
    ...details,
    last_login_time: new Date().toISOString()
  };
  
  // 오늘 활동이 없으면 새로 생성
  if (!existingActivity) {
    return await UserActivity.create({
      user_id: userId,
      activity_type: activityType,
      details: updatedDetails
    });
  } else {
    // 기존 details와 새로운 details 병합
    const mergedDetails = {
      ...existingActivity.details,
      last_login_time: new Date().toISOString()
    };
    
    // login_count가 없으면 2로 설정(첫 로그인 + 현재 로그인), 있으면 1 증가
    if (mergedDetails.login_count === undefined) {
      mergedDetails.login_count = 2;
    } else {
      mergedDetails.login_count += 1;
    }
    
    // first_login_time이 없으면 추가
    if (mergedDetails.first_login_time === undefined) {
      mergedDetails.first_login_time = existingActivity.created_at.toISOString();
    }
    
    // 오늘 활동이 있으면 details만 업데이트
    return await existingActivity.update({
      details: mergedDetails
    });
  }
},

  /**
   * 최근 활동을 조회합니다 (관리자 대시보드용)
   * @param {number} limit - 가져올 활동 수
   * @returns {Promise<Array>} 최근 활동 목록
   */
  getRecentActivities: async (limit = 10) => {
    try {
      return await UserActivity.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit
      });
    } catch (error) {
      logger.error('최근 활동 조회 실패', { error });
      throw error;
    }
  },


  /**
   * 특정 사용자의 활동을 조회합니다
   * @param {number} userId - 사용자 ID
   * @param {number} limit - 가져올 활동 수
   * @returns {Promise<Array>} 사용자 활동 목록
   */
  getUserActivities: async (userId, limit = 20) => {
    try {
      return await UserActivity.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit
      });
    } catch (error) {
      logger.error('사용자 활동 조회 실패', { userId, error });
      throw error;
    }
  },

  /**
   * 특정 유형의 활동을 조회합니다
   * @param {string} activityType - 활동 유형
   * @param {number} limit - 가져올 활동 수
   * @returns {Promise<Array>} 활동 목록
   */
  getActivitiesByType: async (activityType, limit = 50) => {
    try {
      return await UserActivity.findAll({
        where: { activity_type: activityType },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit
      });
    } catch (error) {
      logger.error('활동 유형별 조회 실패', { activityType, error });
      throw error;
    }
  },

  /**
   * 특정 기간 내의 활동을 조회합니다
   * @param {Date} startDate - 시작 날짜
   * @param {Date} endDate - 종료 날짜
   * @param {number} limit - 가져올 활동 수
   * @returns {Promise<Array>} 활동 목록
   */
  getActivitiesByDateRange: async (startDate, endDate, limit = 100) => {
    try {
      return await UserActivity.findAll({
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit
      });
    } catch (error) {
      logger.error('기간별 활동 조회 실패', { startDate, endDate, error });
      throw error;
    }
  },

  /**
   * 활동 통계를 가져옵니다
   * @param {Date} startDate - 시작 날짜 (기본값: 30일 전)
   * @returns {Promise<Object>} 활동 통계 정보
   */
  getActivityStats: async (startDate = null) => {
    try {
      // 기본값: 30일 전부터
      if (!startDate) {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      // 유형별 활동 수
      const activityByType = await UserActivity.findAll({
        attributes: [
          'activity_type',
          [fn('COUNT', col('UserActivity.id')), 'count'] // 테이블명 명시
        ],
        where: {
          created_at: {
            [Op.gte]: startDate
          }
        },
        group: ['activity_type'],
        order: [[literal('count'), 'DESC']]
      });

      // 일별 활동 수
      const dailyActivity = await UserActivity.findAll({
        attributes: [
          [fn('DATE', col('UserActivity.created_at')), 'date'], // 테이블명 명시
          [fn('COUNT', col('UserActivity.id')), 'count'] // 테이블명 명시
        ],
        where: {
          created_at: {
            [Op.gte]: startDate
          }
        },
        group: [fn('DATE', col('UserActivity.created_at'))], // 테이블명 명시
        order: [[fn('DATE', col('UserActivity.created_at')), 'ASC']] // 테이블명 명시
      });

      // 가장 활동적인 사용자
      const mostActiveUsers = await UserActivity.findAll({
        attributes: [
          'user_id',
          [fn('COUNT', col('UserActivity.id')), 'count'] // 테이블명 명시
        ],
        where: {
          created_at: {
            [Op.gte]: startDate
          }
        },
        group: ['user_id'],
        order: [[literal('count'), 'DESC']],
        limit: 5,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }
        ]
      });

      return {
        activityByType,
        dailyActivity,
        mostActiveUsers
      };
    } catch (error) {
      logger.error('활동 통계 조회 실패', { error });
      throw error;
    }
  },

  /**
   * 특정 살롱과 관련된 활동을 조회합니다
   * @param {number} salonId - 살롱 ID
   * @param {number} limit - 가져올 활동 수
   * @returns {Promise<Array>} 살롱 관련 활동 목록
   */
  getSalonActivities: async (salonId, limit = 50) => {
    try {
      // 모든 활동 가져오기
      const allActivities = await UserActivity.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['created_at', 'DESC']]
      });
      
      // 살롱 ID 관련 활동 필터링 (JSON 필드 검색)
      const salonActivities = allActivities.filter(activity => {
        if (!activity.details) return false;
        
        return (
          activity.details.salon_id === parseInt(salonId) ||
          activity.details.salon_id === salonId ||
          activity.details.salonId === parseInt(salonId) ||
          activity.details.salonId === salonId
        );
      });
      
      // 제한된 수의 결과 반환
      return salonActivities.slice(0, limit);
    } catch (error) {
      logger.error('살롱 활동 조회 실패', { salonId, error });
      throw error;
    }
  },

  /**
   * 사용된 모든 활동 유형을 조회합니다
   * @returns {Promise<Array>} 활동 유형 목록
   */
  getAllActivityTypes: async () => {
    try {
      const types = await UserActivity.findAll({
        attributes: [
          [fn('DISTINCT', col('activity_type')), 'type']
        ]
      });
      
      return types.map(type => type.getDataValue('type'));
    } catch (error) {
      logger.error('활동 유형 조회 실패', { error });
      throw error;
    }
  },

  /**
   * 활동 로그 검색 기능
   * @param {Object} params - 검색 파라미터
   * @param {number} params.userId - 사용자 ID (선택)
   * @param {string} params.activityType - 활동 유형 (선택)
   * @param {Date} params.startDate - 시작 날짜 (선택)
   * @param {Date} params.endDate - 종료 날짜 (선택)
   * @param {string} params.keyword - 키워드 검색 (선택)
   * @param {number} params.limit - 결과 제한 수
   * @param {number} params.page - 페이지 번호
   * @returns {Promise<Object>} 검색 결과 및 페이지네이션 정보
   */
  searchActivities: async ({ userId, activityType, startDate, endDate, keyword, limit = 50, page = 1 }) => {
    try {
      const whereClause = {};
      const offset = (page - 1) * limit;
      
      // 필터 적용
      if (userId) {
        whereClause.user_id = userId;
      }
      
      if (activityType) {
        whereClause.activity_type = activityType;
      }
      
      if (startDate && endDate) {
        whereClause.created_at = {
          [Op.between]: [startDate, endDate]
        };
      } else if (startDate) {
        whereClause.created_at = {
          [Op.gte]: startDate
        };
      } else if (endDate) {
        whereClause.created_at = {
          [Op.lte]: endDate
        };
      }
      
      // 키워드 검색 (JSON 필드에 대한 검색은 DB별로 다른 방식 필요)
      if (keyword) {
        try {
          whereClause[Op.or] = [
            literal(`details::text ILIKE '%${keyword}%'`) // PostgreSQL용
            // MySQL 등 다른 DB는 별도 처리 필요
          ];
        } catch (error) {
          logger.warn('키워드 검색 SQL 생성 실패, 키워드 검색 무시', { keyword, error });
          // 키워드 검색 실패시에도 다른 필터는 적용
        }
      }
      
      const activities = await UserActivity.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      return {
        activities: activities.rows,
        total: activities.count,
        page: parseInt(page),
        totalPages: Math.ceil(activities.count / limit)
      };
    } catch (error) {
      logger.error('활동 검색 실패', { error });
      throw error;
    }
  },

  /**
   * 주간 활동 리포트를 생성합니다
   * @returns {Promise<Object>} 주간 활동 리포트
   */
  generateWeeklyReport: async () => {
    try {
      // 기간 설정
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      
      // 일주일간 활동 데이터
      const weeklyActivity = await UserActivity.findAll({
        attributes: [
          [fn('DATE', col('created_at')), 'date'],
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: [fn('DATE', col('created_at'))],
        order: [[fn('DATE', col('created_at')), 'ASC']]
      });
      
      // 활동 유형별 데이터
      const activityByType = await UserActivity.findAll({
        attributes: [
          'activity_type',
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: ['activity_type'],
        order: [[literal('count'), 'DESC']]
      });
      
      // 가장 활동적인 사용자
      const topUsers = await UserActivity.findAll({
        attributes: [
          'user_id',
          [fn('COUNT', col('UserActivity.id')), 'count'] // 테이블명 명시
        ],
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: ['user_id'],
        order: [[literal('count'), 'DESC']],
        limit: 5,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }
        ]
      });
      
      // 전주 대비 활동량 변화
      const previousWeekStart = new Date(startDate);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      
      const previousWeekCount = await UserActivity.count({
        where: {
          created_at: {
            [Op.between]: [previousWeekStart, startDate]
          }
        }
      });
      
      const currentWeekCount = await UserActivity.count({
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        }
      });
      
      const changePercentage = previousWeekCount === 0 
        ? 100 
        : ((currentWeekCount - previousWeekCount) / previousWeekCount * 100).toFixed(2);
      
      return {
        period: {
          start: startDate,
          end: endDate
        },
        weeklyActivity,
        activityByType,
        topUsers,
        activityChange: {
          previousWeek: previousWeekCount,
          currentWeek: currentWeekCount,
          changePercentage
        }
      };
    } catch (error) {
      logger.error('주간 리포트 생성 실패', { error });
      throw error;
    }
  }
};

module.exports = userActivityService;