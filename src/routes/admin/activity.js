const express = require('express');
const router = express.Router();
const userActivityController = require('../../controllers/userActivityController');
const { verifyToken, isAdmin } = require('../../middleware/auth');

// 활동 검색 엔드포인트
router.get('/api/activity', 
  verifyToken, isAdmin,
  userActivityController.searchActivities
);

/**
 * @route   GET /api/activity/recent
 * @desc    최근 활동 목록 조회 (관리자 대시보드용)
 * @access  관리자만 접근 가능
 */
router.get('/api/activity/recent', verifyToken, isAdmin, userActivityController.getRecentActivities);

/**
 * @route   GET /api/activity/user/:userId
 * @desc    특정 사용자의 활동 조회
 * @access  해당 사용자 또는 관리자만 접근 가능
 */
router.get('/api/activity/user/:userId', verifyToken, userActivityController.getUserActivities);

/**
 * @route   GET /api/activity/stats
 * @desc    활동 통계 조회
 * @access  관리자만 접근 가능
 */
router.get('/api/activity/stats', verifyToken, isAdmin, userActivityController.getActivityStats);

/**
 * @route   GET /api/activity/types
 * @desc    모든 활동 유형 목록 조회
 * @access  관리자만 접근 가능
 */
router.get('/api/activity/types', verifyToken, isAdmin, userActivityController.getAllActivityTypes);

/**
 * @route   GET /api/activity/type/:type
 * @desc    특정 유형의 활동 조회
 * @access  관리자만 접근 가능
 */
router.get('/api/activity/type/:type', verifyToken, isAdmin, userActivityController.getActivitiesByType);

/**
 * @route   GET /api/activity/salon/:salonId
 * @desc    특정 살롱 관련 활동 조회
 * @access  살롱 소유자 또는 관리자만 접근 가능
 */
router.get('/api/activity/salon/:salonId', verifyToken, userActivityController.getSalonActivities);

/**
 * @route   GET /api/activity/search
 * @desc    활동 검색
 * @access  관리자만 접근 가능
 */
router.get('/api/activity/search', verifyToken, isAdmin, userActivityController.searchActivities);

/**
 * @route   GET /api/activity/report/weekly
 * @desc    주간 활동 리포트 생성
 * @access  관리자만 접근 가능
 */
router.get('/api/activity/report/weekly', verifyToken, isAdmin, userActivityController.generateWeeklyReport);

module.exports = router;