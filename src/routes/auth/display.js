const express = require('express');
const router = express.Router();
const SalonService = require('../../services/salonService');
const DisplayService = require('../../services/displayService');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');
const { verifyToken } = require('../../middleware/auth');
const activityService = require('../../services/userActivityService');

// 새 디스플레이 등록 (미용실 관리자만 접근 가능)
router.post('/api/displays', verifyToken, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path,
    requestData: sanitizeData(req.body)
  }
  try {
    const { name, salon_id } = req.body;
    
    // salon_id에 대한 권한 확인 로직 필요
    if (!await SalonService.checkSalonOwnership(req.user.id, salon_id)) {
      logger.warn('미용실 접근 권한이 없습니다.', sanitizeData(logContext));
      return res.status(403).json({ message: '권한이 없습니다' });
    }

    // 디스플레이 생성
    const display = await DisplayService.createDisplay(name, salon_id);
    logger.info('새 디스플레이 등록', sanitizeData(logContext));

    await activityService.recordActivity(req.user.id, 'display_create', {
      displayId: display.id,
      displayName: display.name,
      salonId: salon_id,
      salonName: await SalonService.getSalonName(salon_id),  // 미용실 이름이 있다면 유용함
      deviceId: display.device_id  // 참조용 ID 저장
    });

    // 민감한 정보만 응답
    res.status(201).json({
      device_id: display.device_id,
      access_token: display.access_token,
      name: display.name
    });

  } catch (error) {
    console.log(error);
    logger.error('디스플레이 등록 에러', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    res.status(500).json({ message: '서버 에러가 발생했습니다' });
  }
});

// 디스플레이 활성화 (디바이스에서 호출)
router.post('/api/displays/activate', async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path,
    requestData: sanitizeData(req.body)
  }
  try {
    const { device_id, access_token } = req.body;
    
    await DisplayService.activeDisplay(device_id, access_token, logContext);

    res.json({ message: '디스플레이가 활성화되었습니다' });
  } catch (error) {
    logger.error('디스플레이 활성화 에러', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    res.status(500).json({ message: '서버 에러가 발생했습니다' });
  }
});

router.get('/api/displays/:id', verifyToken, async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path,
    salonId: req.params.id
  }
  try {
    // salon_id에 대한 권한 확인 로직 필요
    if (!await SalonService.checkSalonOwnership(req.user.id, req.params.id)) {
      logger.warn('미용실 접근 권한이 없습니다.', sanitizeData(logContext));
      return res.status(403).json({ message: '권한이 없습니다' });
    }
    const displays = await DisplayService.getDisplaysBySalon(req.params.id);

    logger.info('디스플레이 조회 완료', sanitizeData(logContext));
    res.status(201).json({
      ...displays,
      message: '디스플레이 조회 완료'
    })
  } catch (error) {
    logger.error('디스플레이 조회 에러', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));
    res.status(500).json({ message: '서버 에러가 발생했습니다' });
  }
});

module.exports = router;