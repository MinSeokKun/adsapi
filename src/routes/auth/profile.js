// src/routes/auth/profile.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const profileController = require('../../controllers/profileController');
const { profileImageUpload, handleUploadError } = require('../../middleware/uploadMiddleware');
const { logActivity, ACTIVITY_TYPES } = require('../../middleware/activityMiddleware');

// 현재 사용자 프로필 정보 조회
router.get(
  '/api/profile',
  verifyToken,
  profileController.getProfile
);

// 프로필 정보 수정 (이름, 프로필 이미지 등)
router.put(
  '/api/profile',
  verifyToken,
  profileImageUpload, // 통합된 미들웨어 사용
  handleUploadError, // 업로드 오류 처리
  logActivity(ACTIVITY_TYPES.USER_PROFILE_UPDATE, (req) => ({
    name: req.body.name,
    has_profile_image: !!req.file
  })),
  profileController.updateProfile
);

// 비밀번호 변경 (로컬 사용자만 해당)
router.put(
  '/api/profile/password',
  verifyToken,
  logActivity(ACTIVITY_TYPES.USER_PASSWORD_CHANGE, () => ({})),
  profileController.updatePassword
);

module.exports = router;