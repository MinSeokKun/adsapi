const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const StaffService = require('../services/staffService');
const userActivityService = require('../services/userActivityService');
const { ACTIVITY_TYPES } = require('../middleware/activityMiddleware');
const salonService = require('../services/salonService');

/**
 * 스태프 컨트롤러
 * 스태프와 관련된 요청 핸들링 함수들
 */
const staffController = {
  /**
   * 특정 살롱의 스태프 조회
   */
  getAllStaff: async (req, res) => {
    const logContext  = {
      request: req.id,
      userId: req.user?.id,
      path: req.path
    };

    try {
      const staffs = await StaffService.getAllStaffs(req.params.id);

      logger.info('스태프 목록 조회 성공', sanitizeData({
          ...logContext,
          count: staffs.length
        }));

      res.json({ staffs });
    } catch (error) {
      logger.error('스태프 목록 조회 실패', sanitizeData({
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

  /**
   * 특정 살롱의 스태프 추가
   */
  createStaff: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path
    };

    try {
      const { name, position, career_years } = req.body;
      const salonId = req.params.id;
      // 유효성 검사
      if (!name || !position || !career_years) {
        return res.status(400).json({ message: "이름, 직책, 경력을 모두 입력해주세요." });
      }

      if (!await salonService.checkSalonOwnership(req.user.id, salonId)) {
        logger.warn('미용실 접근 권한이 없습니다.', sanitizeData(logContext));
        return res.status(403).json({ message: '권한이 없습니다' });
      }

      // 스태프 생성
      const newStaff = await StaffService.createStaff(
        name,
        position,
        career_years,
        salonId
      );

      logger.info('스태프 등록 성공', sanitizeData({
        ...logContext,
        staffId: newStaff.id
      }));

      // 활동 로깅
      await userActivityService.recordActivity(req.user?.id, ACTIVITY_TYPES.STAFF_CREATED, {
        staff_id: newStaff.id,
        staff_name: newStaff.name,
        ip: req.ip
      }); 
      
      res.status(201).json({
        message: "스태프가 등록되었습니다.",
        staff: newStaff
      });
  
    } catch(error) {
      let statusCode =  500;
      let  message = '서버오류';

      // todo  : Validation Check
      logger.error('스태프 등록 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));

      res.status(statusCode).json({ message });
    }
  },

  /**
   * 특정 살롱의 스태프 업데이트
   */
  updateStaff: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path
    };

    try {
      // const { id } = req.params;
      const { name, position, career_years } = req.body;
      const salonId = req.params.salonId;
      const staffId = req.params.staffId;

      // to do, 유효성 검사
      if (!name && !position && !career_years) {
        return res.status(400).json({ message: "업데이트 정보 입력" });
      }

      // 인증 체크
      if (!await salonService.checkSalonOwnership(req.user.id, salonId)) {
        logger.warn('미용실 접근 권한이 없습니다.', sanitizeData(logContext));
        return res.status(403).json({ message: '권한이 없습니다' });
      }

      const updatedStaff = await StaffService.updateStaff(staffId, {
        ...(name && { name }),
        ...(position && { position }),
        ...(career_years && { career_years })
      });

      logger.info('스태프 정보 수정 성공', sanitizeData({
        ...logContext,
        staffId: updatedStaff.id
      }));

      // 활동 로깅
      await userActivityService.recordActivity(req.user.id, ACTIVITY_TYPES.STAFF_UPDATED, {
        staff_id: updatedStaff.id,
        ip: req.ip
      });
  
      res.status(200).json({
        message: "스태프 정보가 수정되었습니다.",
        staff: updatedStaff
      });
    } catch(error) {
      let statusCode =  500;
      let message = '서버오류';

      // todo  : Validation Check

      logger.error('스태프 정보 수정 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));

      res.status(error.message === "스태프를 찾을 수 없습니다." ? 404 : 500).json({ message: error.message });
    }

  },

  // 스태프 정보 삭제
  /**
   * 특정 살롱의 스태프 정보 삭제
   */
  deleteStaff: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path
    };

    try {
      // const { id } = req.params;
      const salonId = req.params.salonId;
      const staffId = req.params.staffId;

      // 인증 체크
      if (!await salonService.checkSalonOwnership(req.user.id, salonId)) {
        logger.warn('미용실 접근 권한이 없습니다.', sanitizeData(logContext));
        return res.status(403).json({ message: '권한이 없습니다' });
      }
    
      const deletedStaff = await StaffService.deleteStaff(staffId);

      logger.info('스태프 삭제 성공', sanitizeData({
        ...logContext,
        staffId: staffId
      }));

      await userActivityService.recordActivity(req.user.id, ACTIVITY_TYPES.STAFF_DELETED, {
        staff_id: deletedStaff.id,
        staff_name: deletedStaff.name,
        ip: req.ip
      });
  
      res.status(200).json({
        message: "스태프가 삭제되었습니다."
      });

    } catch (error) {
      logger.error('스태프 정보 삭제 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));

    res.status(error.message === "스태프를 찾을 수 없습니다." ? 404 : 500).json({ message: error.message });
    }
  }
  
};

module.exports = staffController;