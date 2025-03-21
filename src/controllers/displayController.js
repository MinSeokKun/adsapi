// controllers/displayController.js
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const salonService = require('../services/salonService');
const displayService = require('../services/displayService');
const userActivityService = require('../services/userActivityService');
const { ACTIVITY_TYPES } = require('../middleware/activityMiddleware');

/**
 * 디스플레이 컨트롤러
 * 디스플레이와 관련된 요청 핸들링 함수들
 */
const displayController = {
  /**
   * 새 디스플레이 등록
   */
  createDisplay: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      requestData: sanitizeData(req.body)
    };

    try {
      const addData = req.body;
      // salon_id에 대한 권한 확인 로직
      if (!await salonService.checkSalonOwnership(req.user.id, addData.salon_id)) {
        logger.warn('미용실 접근 권한이 없습니다.', sanitizeData(logContext));
        return res.status(403).json({ message: '권한이 없습니다' });
      }

      // 디스플레이 생성
      const display = await displayService.createDisplay(addData.name, addData.salon_id);
      
      logger.info('새 디스플레이 등록', sanitizeData(logContext));

      // 활동 로깅
      // await userActivityService.recordActivity(req.user.id, ACTIVITY_TYPES.DISPLAY_ADDED, {
      //   display_id: display.id,
      //   display_name: display.name,
      //   ip: req.ip,
      //   salon_id: addData.salon_id,
      //   salon_name: await salonService.getSalonName(addData.salon_id),
      //   device_id: display.device_id
      // });

      // 민감한 정보만 응답
      res.status(201).json({
        device_id: display.device_id,
        access_token: display.access_token,
        name: display.name
      });
    } catch (error) {
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
  },

  /**
   * 디스플레이 활성화 (디바이스에서 호출)
   */
  activateDisplay: async (req, res) => {
    const logContext = {
      requestId: req.id,
      path: req.path,
      requestData: sanitizeData(req.body)
    };

    try {
      const { device_id, access_token } = req.body;
      
      await displayService.activeDisplay(device_id, access_token, logContext);

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
  },

  /**
   * 살롱별 디스플레이 목록 조회
   */
  getDisplaysBySalon: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      salonId: req.params.id
    };

    try {
      // salon_id에 대한 권한 확인 로직
      if (!await salonService.checkSalonOwnership(req.user.id, req.params.id)) {
        logger.warn('미용실 접근 권한이 없습니다.', sanitizeData(logContext));
        return res.status(403).json({ message: '권한이 없습니다' });
      }
      
      const displays = await displayService.getDisplaysBySalon(req.params.id);

      logger.info('디스플레이 조회 완료', sanitizeData(logContext));
      
      res.json({
        ...displays,
        message: '디스플레이 조회 완료'
      });
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
  },

  /**
   * 디스플레이 삭제
   */
  deleteDisplay: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      displayId: req.params.id
    };
    try {
      // Display.device_id에 대한 권한 확인 로직
      const display = await displayService.checkDisplayOwnership(req.user.id, req.params.id);
      if (!display) {
        logger.warn('디스플레이 접근 권한이 없습니다.', sanitizeData(logContext));
        return res.status(403).json({ message: '권한이 없습니다' });
      }

      await displayService.deleteDisplay(display.id);

      logger.info('디스플레이 삭제 완료', sanitizeData(logContext));

      res.json({ message: '디스플레이 삭제 완료' });
    } catch (error) {
      console.log(error)
      logger.error('디스플레이 삭제 에러', sanitizeData({
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
  }
};

module.exports = displayController;