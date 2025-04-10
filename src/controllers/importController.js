// src/controllers/importController.js
const { parse } = require('csv-parse/sync');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const importService = require('../services/importService');

/**
 * 데이터 가져오기 컨트롤러
 * CSV 파일을 통한 사용자 및 미용실 데이터 가져오기 관련 기능
 */
const importController = {
  /**
   * CSV 파일로부터 사용자 데이터 가져오기
   */
  importUsers: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path
    };

    try {
      if (!req.file) {
        logger.warn('CSV 파일이 제공되지 않음', sanitizeData(logContext));
        return res.status(400).json({ 
          success: false, 
          message: 'CSV 파일을 제공해주세요.' 
        });
      }

      // CSV 파일 파싱
      const csvData = req.file.buffer.toString('utf8');
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      logger.info('사용자 CSV 파싱 완료', sanitizeData({
        ...logContext,
        recordCount: records.length
      }));

      // 서비스 호출하여 사용자 가져오기 
      const result = await importService.importUsers(records, req.user.id);

      logger.info('사용자 데이터 가져오기 완료', sanitizeData({
        ...logContext,
        successCount: result.successCount,
        errorCount: result.errorCount
      }));

      res.json({
        success: true,
        message: `총 ${result.successCount}개의 사용자 데이터가 성공적으로 가져와졌습니다.`,
        result: {
          total: records.length,
          success: result.successCount,
          error: result.errorCount,
          details: result.details
        }
      });
    } catch (error) {
      logger.error('사용자 데이터 가져오기 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));

      res.status(500).json({
        success: false,
        message: '사용자 데이터 가져오기 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  },

  /**
   * CSV 파일로부터 미용실 데이터 가져오기
   */
  importSalons: async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path
    };

    try {
      if (!req.file) {
        logger.warn('CSV 파일이 제공되지 않음', sanitizeData(logContext));
        return res.status(400).json({ 
          success: false, 
          message: 'CSV 파일을 제공해주세요.' 
        });
      }

      // CSV 파일 파싱
      const csvData = req.file.buffer.toString('utf8');
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      logger.info('미용실 CSV 파싱 완료', sanitizeData({
        ...logContext,
        recordCount: records.length
      }));

      // 서비스 호출하여 미용실 가져오기
      const result = await importService.importSalons(records, req.user.id);

      logger.info('미용실 데이터 가져오기 완료', sanitizeData({
        ...logContext,
        successCount: result.successCount,
        errorCount: result.errorCount
      }));

      res.json({
        success: true,
        message: `총 ${result.successCount}개의 미용실 데이터가 성공적으로 가져와졌습니다.`,
        result: {
          total: records.length,
          success: result.successCount,
          error: result.errorCount,
          details: result.details
        }
      });
    } catch (error) {
      logger.error('미용실 데이터 가져오기 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));

      res.status(500).json({
        success: false,
        message: '미용실 데이터 가져오기 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  },

  /**
   * CSV 형식 가이드라인 제공
   */
  getCsvGuide: async (req, res) => {
    const { dataType } = req.params;

    if (dataType === 'users') {
      res.json({
        success: true,
        guide: {
          format: "CSV (쉼표로 구분된 값)",
          requiredColumns: ["email", "password", "name", "role"],
          optionalColumns: [],
          example: "email,password,name,role\nuser1@example.com,password123,홍길동,user\nuser2@example.com,secure456,김철수,user",
          notes: [
            "첫 번째 행은 열 헤더여야 합니다.",
            "role은 'user', 'admin' 중 하나여야 합니다.",
            "이미 존재하는 이메일은 건너뜁니다."
          ]
        }
      });
    } else if (dataType === 'salons') {
      res.json({
        success: true,
        guide: {
          format: "CSV (쉼표로 구분된 값)",
          requiredColumns: ["owner_email", "name", "business_hours", "business_number", "phone", "address"],
          optionalColumns: ["description", "address_detail"],
          example: "owner_email,name,business_hours,business_number,phone,description,address,address_detail\nuser1@example.com,김미용헤어샵,09:00-18:00,1234567890,02-123-4567,편안한 분위기의 미용실입니다.,서울특별시 강남구 테헤란로 123,4층",
          notes: [
            "첫 번째 행은 열 헤더여야 합니다.",
            "owner_email 필드는 이미 등록된 사용자의 이메일이어야 합니다.",
            "business_number는 10자리 숫자여야 합니다.",
            "주소는 최대한 상세하게 입력해야 정확한 위치 변환이 가능합니다."
          ]
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: "지원되지 않는 데이터 유형입니다. 'users' 또는 'salons'를 사용하세요."
      });
    }
  }
};

module.exports = importController;