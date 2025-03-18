// routes/activityRoutes.js
const express = require('express');
const router = express.Router();
const activityService = require('../../services/userActivityService');
const { verifyToken, isAdmin } = require('../../middleware/auth');

// 최근 활동 목록 조회 (관리자 대시보드용)
router.get('/api/activities/recent', 
  verifyToken, isAdmin,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const activities = await activityService.getRecentActivities(limit);
      
      // 프론트엔드 표시용 포맷 변환
      const formattedActivities = activities.map(activity => {
        const activityData = activity.get({ plain: true });
        return {
          id: activityData.id,
          user: activityData.user ? {
            name: activityData.user.name,
            email: activityData.user.email
          } : { name: '알 수 없음', email: '' },
          message: getActivityMessage(activityData),
          timestamp: activityData.createdAt
        };
      });
      
      res.json({
        success: true,
        data: formattedActivities
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: '활동 정보를 가져오는데 실패했습니다.'
      });
    }
  }
);

// 활동 메시지 생성 헬퍼 함수
function getActivityMessage(activity) {
  const username = activity.user?.name || '사용자';
  
  switch(activity.activityType) {
    case 'login':
      return `${username}님이 로그인했습니다.`;
    case 'subscription_update':
      return `${username}님이 구독을 ${activity.details?.plan || ''}(으)로 업데이트했습니다.`;
    case 'profile_update':
      return `${username}님이 프로필을 업데이트했습니다.`;
    case 'payment':
      return `${username}님이 결제를 완료했습니다.`;
    default:
      return `${username}님이 ${activity.activityType} 활동을 했습니다.`;
  }
}

module.exports = router;