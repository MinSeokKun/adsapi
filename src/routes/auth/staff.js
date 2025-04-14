const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const staffController = require('../../controllers/staffController');

// 스태프 목록 조회
router.get('/api/staff/:id', verifyToken, staffController.getAllStaff);

module.exports = router;