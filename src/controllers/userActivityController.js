const activityService = require('../services/userActivityService');
const { User, Salon } = require('../models');
const logger = require('../config/winston');

// 사용자 활동 컨트롤러
const userActivityController = {
  // 최근 활동 조회 (관리자 대시보드용)
  async getRecentActivities(req, res) {
    try {
      const { limit = 20 } = req.query;
      const activities = await activityService.getRecentActivities(parseInt(limit));
      
      res.json({ success: true, activities });
    } catch (error) {
      logger.error('최근 활동 조회 실패', { error });
      res.status(500).json({ success: false, message: '최근 활동을 조회하는데 실패했습니다.' });
    }
  },

  // 특정 사용자의 활동 조회
  async getUserActivities(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20 } = req.query;
      
      // 권한 확인 (관리자 또는 본인만 조회 가능)
      if (req.user.id !== parseInt(userId) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: '접근 권한이 없습니다. 본인 또는 관리자만 조회할 수 있습니다.' 
        });
      }
      
      const activities = await activityService.getUserActivities(userId, parseInt(limit));
      
      res.json({ success: true, activities });
    } catch (error) {
      logger.error('사용자 활동 조회 실패', { userId: req.params.userId, error });
      res.status(500).json({ success: false, message: '사용자 활동을 조회하는데 실패했습니다.' });
    }
  },

  // 활동 통계 조회 (관리자용)
  async getActivityStats(req, res) {
    try {
      const { period = '30' } = req.query; // 기본값: 30일
      
      // 시작 날짜 계산
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));
      
      const stats = await activityService.getActivityStats(startDate);
      
      res.json({ success: true, stats });
    } catch (error) {
      logger.error('활동 통계 조회 실패', { error });
      res.status(500).json({ success: false, message: '활동 통계를 조회하는데 실패했습니다.' });
    }
  },

  // 활동 유형별 조회
  async getActivitiesByType(req, res) {
    try {
      const { type } = req.params;
      const { limit = 50 } = req.query;
      
      const activities = await activityService.getActivitiesByType(type, parseInt(limit));
      
      res.json({ success: true, activities });
    } catch (error) {
      logger.error('활동 유형별 조회 실패', { type: req.params.type, error });
      res.status(500).json({ success: false, message: '활동 유형별 조회에 실패했습니다.' });
    }
  },

  // 특정 살롱 관련 활동 조회
  async getSalonActivities(req, res) {
    try {
      const { salonId } = req.params;
      const { limit = 50 } = req.query;
      
      // 해당 살롱이 존재하는지 확인
      const salon = await Salon.findByPk(salonId);
      if (!salon) {
        return res.status(404).json({ success: false, message: '해당 살롱을 찾을 수 없습니다.' });
      }
      
      // 권한 확인 (살롱 소유자 또는 관리자만 조회 가능)
      if (salon.owner_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: '접근 권한이 없습니다. 살롱 소유자 또는 관리자만 조회할 수 있습니다.' 
        });
      }
      
      const activities = await activityService.getSalonActivities(salonId, parseInt(limit));
      
      res.json({ success: true, activities });
    } catch (error) {
      logger.error('살롱 활동 조회 실패', { salonId: req.params.salonId, error });
      res.status(500).json({ success: false, message: '살롱 활동을 조회하는데 실패했습니다.' });
    }
  },

  // 모든 활동 유형 목록 조회
  async getAllActivityTypes(req, res) {
    try {
      const types = await activityService.getAllActivityTypes();
      
      res.json({ success: true, types });
    } catch (error) {
      logger.error('활동 유형 목록 조회 실패', { error });
      res.status(500).json({ success: false, message: '활동 유형 목록을 조회하는데 실패했습니다.' });
    }
  },

  // 활동 검색
  async searchActivities(req, res) {
    try {
      const { 
        userId, 
        activityType, 
        startDate, 
        endDate, 
        keyword, 
        limit = 50, 
        page = 1 
      } = req.query;
      
      // 검색 파라미터 객체 생성
      const searchParams = {
        userId: userId ? parseInt(userId) : undefined,
        activityType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        keyword,
        limit: parseInt(limit),
        page: parseInt(page)
      };
      
      const result = await activityService.searchActivities(searchParams);
      
      res.json({ 
        success: true, 
        activities: result.activities,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      logger.error('활동 검색 실패', { query: req.query, error });
      res.status(500).json({ success: false, message: '활동 검색에 실패했습니다.' });
    }
  },

  // 주간 활동 리포트 생성
  async generateWeeklyReport(req, res) {
    try {
      const report = await activityService.generateWeeklyReport();
      
      res.json({ success: true, report });
    } catch (error) {
      logger.error('주간 리포트 생성 실패', { error });
      res.status(500).json({ success: false, message: '주간 리포트 생성에 실패했습니다.' });
    }
  }
};

module.exports = userActivityController;