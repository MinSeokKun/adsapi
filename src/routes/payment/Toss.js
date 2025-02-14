// routers/payment/Toss.js
const express = require('express');
const router = express.Router();
const TossController = require('../../controllers/payment/TossController');

// 결제 승인 요청
router.post('/confirm', TossController.confirmPayment.bind(TossController));

// 결제 성공 콜백
router.get('/success', TossController.handleSuccess.bind(TossController));

// 결제 실패 콜백
router.get('/fail', TossController.handleFail.bind(TossController));

module.exports = router;