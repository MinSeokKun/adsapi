// routes/api/adRouter.js
const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const { sponsorAdUpload, handleUploadError } = require('../../middleware/uploadMiddleware');
const displayAuth = require('../../middleware/displayAuth');
const adController = require('../../controllers/adController');

// 광고 조회
router.get('/api/ads', adController.getAds);

// 디스플레이용 광고 조회
router.get('/api/display/ads', displayAuth, adController.getDisplayAds);

// 광고 검색
router.get('/api/ads/search', verifyToken, isAdmin, adController.searchAds);

// 광고 검색
router.get('/api/public/ads', adController.getPublicAds);

// 광고 전체 목록 조회
router.get('/api/ads/list', adController.getAllActiveAds);

// 광고 등록
router.post(
  '/api/ads', 
  verifyToken, 
  sponsorAdUpload,
  handleUploadError,
  adController.createAd
);

// id로 광고 조회
router.get('/api/ads/:id', verifyToken, adController.getAdById);

// 광고 수정
router.put('/api/ads/:id', verifyToken, adController.updateAd);

// 광고 삭제
router.delete(
  '/api/ads/:id', 
  verifyToken, 
  isAdmin, 
  adController.deleteAd
);

// 광고 스케줄 등록 및 수정
router.post('/api/ads/schedule', adController.updateSchedules);

// 새 광고 미디어 추가
router.post(
  '/api/ads/:id/media', 
  sponsorAdUpload, 
  adController.addMediaToAd
);

// 광고 캠페인 생성/업데이트
router.post(
  '/api/ads/:id/campaign', 
  verifyToken, 
  adController.createOrUpdateCampaign
);

// 광고 캠페인 삭제
router.delete(
  '/api/ads/:id/campaign', 
  verifyToken, 
  adController.deleteCampaign
);

// 활성 캠페인 목록 조회
router.get(
  '/api/ads/campaigns/active', 
  verifyToken, 
  adController.getActiveCampaigns
);

// 광고 상태 수동 변경 API
router.patch(
  '/api/ads/:id/status',
  verifyToken,
  isAdmin,
  async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      adId: req.params.id,
      status: req.body.status,
      path: req.path
    };

    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // 유효한 상태 검증
      const validStatuses = ['active', 'pending', 'paused', 'inactive'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: '유효하지 않은 상태입니다',
          validStatuses
        });
      }
      
      const updatedAd = await adStatusService.manuallyUpdateAdStatus(id, status);
      
      // 활동 기록
      await activityService.recordActivity(req.user.id, 'ad_status_update', {
        adId: id,
        ip: req.ip,
        adTitle: updatedAd.title,
        oldStatus: updatedAd.previous('status'),
        newStatus: status
      });
      
      res.json({
        message: '광고 상태가 성공적으로 업데이트되었습니다',
        ad: {
          id: updatedAd.id,
          title: updatedAd.title,
          status: updatedAd.status
        }
      });
    } catch (error) {
      logger.error('광고 상태 업데이트 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      
      res.status(500).json({
        error: '광고 상태 업데이트 중 오류가 발생했습니다',
        details: error.message
      });
    }
  }
);

module.exports = router;