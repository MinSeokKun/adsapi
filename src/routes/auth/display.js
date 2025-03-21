// routes/api/display.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const displayController = require('../../controllers/displayController');
const { logActivity, ACTIVITY_TYPES } = require('../../middleware/activityMiddleware');

// 새 디스플레이 등록 (미용실 관리자만 접근 가능)
router.post(
  '/api/displays',
  verifyToken,
  logActivity(ACTIVITY_TYPES.DISPLAY_ADDED, (req) => ({
    display_name: req.body.name,
    salon_id: req.body.salon_id,
    user_id: req.user.id
  })),
  displayController.createDisplay,
);

// 디스플레이 활성화 (디바이스에서 호출)
router.post(
  '/api/displays/activate',
  displayController.activateDisplay
);

// 살롱별 디스플레이 목록 조회
router.get(
  '/api/displays/:id',
  verifyToken,
  displayController.getDisplaysBySalon
);

router.delete(
  '/api/displays/:id',
  verifyToken,
  logActivity(ACTIVITY_TYPES.DISPLAY_REMOVED, (req) => ({
    display_id: req.params.id,
    user_id: req.user.id
  })),
  displayController.deleteDisplay
)

module.exports = router;