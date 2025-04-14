const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const StaffService = require('../services/staffService');
const userActivityService = require('../services/userActivityService');
const { ACTIVITY_TYPES } = require('../middleware/activityMiddleware');

const staffController = {
  getAllStaff: async (req, res) => {
    const logContext  = {
      request: req.id,
      userId: req.user?.id,
      path: req.path
    };

    try {
      const staffs = await StaffService.getAllStaffs(req.id);

      logger.info('스태프프 목록 조회 성공', sanitizeData({
          ...logContext,
          count: staffs.length
        }));

      res.json({ staffs });
    } catch (error) {
      logger.error('스태프프 목록 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      res.status(500).json({ message: '서버 오류' });
    }
  },

  
};

module.exports = staffController;