const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const staffController = require('../../controllers/staffController');


// 스태프 추가
router.post('/api/staff/:id', verifyToken, staffController.createStaff);

// 스태프 목록 조회
router.get('/api/staff/:id', staffController.getAllStaff);

// 스태프 수정
router.put('/api/staff/:salonId/:staffId', verifyToken, staffController.updateStaff);

// 스태프 삭제
router.delete('/api/staff/:salonId/:staffId', verifyToken, staffController.deleteStaff);

module.exports = router;