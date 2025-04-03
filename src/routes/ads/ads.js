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

module.exports = router;