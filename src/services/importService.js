// src/services/importService.js
const { User, Salon, Location } = require('../models');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');
const addressService = require('../utils/address');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const { ACTIVITY_TYPES } = require('../middleware/activityMiddleware');
const userActivityService = require('./userActivityService');

class ImportService {
  /**
   * CSV 데이터로부터 사용자 가져오기
   * @param {Array} records - CSV 파일에서 파싱된 레코드 배열
   * @param {number} adminId - 작업을 수행하는 관리자 ID
   * @returns {Object} 가져오기 결과
   */
  async importUsers(records, adminId) {
    let successCount = 0;
    let errorCount = 0;
    const details = [];
    const transaction = await sequelize.transaction();

    try {
      for (const record of records) {
        try {
          // 필수 필드 검증
          if (!record.email || !record.password || !record.name) {
            details.push({
              email: record.email || '(이메일 없음)',
              status: 'error',
              message: '필수 필드가 누락되었습니다 (email, password, name)'
            });
            errorCount++;
            continue;
          }

          // 이메일 형식 검증
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(record.email)) {
            details.push({
              email: record.email,
              status: 'error',
              message: '유효하지 않은 이메일 형식입니다'
            });
            errorCount++;
            continue;
          }

          // 이미 존재하는 이메일인지 확인
          const existingUser = await User.findOne({
            where: { email: record.email },
            transaction
          });

          if (existingUser) {
            details.push({
              email: record.email,
              status: 'skip',
              message: '이미 존재하는 이메일입니다'
            });
            // 스킵은 에러로 카운트하지 않음
            continue;
          }

          // role 필드 유효성 검사
          const role = record.role || 'user';
          if (!['user', 'admin'].includes(role)) {
            details.push({
              email: record.email,
              status: 'error',
              message: "유효하지 않은 역할입니다. 'user' 또는 'admin'을 사용하세요."
            });
            errorCount++;
            continue;
          }

          // 비밀번호 해싱
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(record.password, salt);

          // 사용자 생성
          const user = await User.create({
            email: record.email,
            password: hashedPassword,
            name: record.name,
            provider: 'local',
            role: role,
            created_at: new Date(),
            updated_at: new Date()
          }, { transaction });

          // 성공 기록
          successCount++;
          details.push({
            email: record.email,
            status: 'success',
            message: '사용자가 성공적으로 생성되었습니다'
          });

          // 활동 로깅
          await userActivityService.recordActivity(adminId, ACTIVITY_TYPES.USER_REGISTER, {
            created_user_id: user.id,
            created_user_email: user.email,
            source: 'csv_import'
          });
        } catch (error) {
          errorCount++;
          details.push({
            email: record.email || '(알 수 없음)',
            status: 'error',
            message: error.message
          });
          logger.error(`사용자 생성 중 오류: ${error.message}`, {
            email: record.email,
            error: sanitizeData(error)
          });
        }
      }

      // 트랜잭션 커밋
      await transaction.commit();

      return {
        successCount,
        errorCount,
        details
      };
    } catch (error) {
      // 오류 발생 시 롤백
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * CSV 데이터로부터 미용실 가져오기
   * @param {Array} records - CSV 파일에서 파싱된 레코드 배열
   * @param {number} adminId - 작업을 수행하는 관리자 ID
   * @returns {Object} 가져오기 결과
   */
  async importSalons(records, adminId) {
    let successCount = 0;
    let errorCount = 0;
    const details = [];

    for (const record of records) {
      // 각 미용실마다 별도의 트랜잭션 사용
      const transaction = await sequelize.transaction();

      try {
        // 필수 필드 검증
        const requiredFields = ['owner_email', 'name', 'business_hours', 'business_number', 'phone', 'address'];
        const missingFields = requiredFields.filter(field => !record[field]);
        
        if (missingFields.length > 0) {
          details.push({
            name: record.name || '(이름 없음)',
            status: 'error',
            message: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`
          });
          errorCount++;
          await transaction.rollback();
          continue;
        }

        // 사업자등록번호 형식 검증
        const businessNumberRegex = /^\d{10}$/;
        if (!businessNumberRegex.test(record.business_number)) {
          details.push({
            name: record.name,
            status: 'error',
            message: '사업자등록번호는 10자리 숫자여야 합니다'
          });
          errorCount++;
          await transaction.rollback();
          continue;
        }

        // 소유자 찾기
        const owner = await User.findOne({
          where: { email: record.owner_email },
          transaction
        });

        if (!owner) {
          details.push({
            name: record.name,
            status: 'error',
            message: `소유자 이메일 ${record.owner_email}을(를) 찾을 수 없습니다`
          });
          errorCount++;
          await transaction.rollback();
          continue;
        }

        // 사업자등록번호 중복 확인
        const existingSalon = await Salon.findOne({
          where: { business_number: record.business_number },
          transaction
        });

        if (existingSalon) {
          details.push({
            name: record.name,
            status: 'error',
            message: '이미 등록된 사업자등록번호입니다'
          });
          errorCount++;
          await transaction.rollback();
          continue;
        }

        // 주소 변환 (Kakao API 사용)
        let locationData;
        try {
          locationData = await addressService.convertAddress(record.address);
          locationData.address_line2 = record.address_detail || '';
        } catch (addressError) {
          logger.warn(`주소 변환 오류 (${record.address}): ${addressError.message}`);
          
          // 주소 변환 실패 시 더미 값 사용
          locationData = {
            address_line1: record.address,
            address_line2: record.address_detail || '',
            city: '서울',  // 기본값
            district: '강남구',  // 기본값
            latitude: 37.5024,  // 더미 좌표 (서울)
            longitude: 127.0248
          };
        }

        // 미용실 생성
        const salon = await Salon.create({
          owner_id: owner.id,
          name: record.name,
          business_hours: record.business_hours,
          business_number: record.business_number,
          phone: record.phone,
          description: record.description || '',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        }, { transaction });

        // 위치 정보 생성
        await Location.create({
          salon_id: salon.id,
          ...locationData
        }, { transaction });

        // 성공 기록
        successCount++;
        details.push({
          name: record.name,
          status: 'success',
          message: '미용실이 성공적으로 등록되었습니다'
        });

        // 활동 로깅
        await userActivityService.recordActivity(adminId, ACTIVITY_TYPES.SALON_CREATE, {
          salon_id: salon.id,
          salon_name: salon.name,
          owner_id: owner.id,
          source: 'csv_import'
        });

        // 트랜잭션 커밋
        await transaction.commit();
      } catch (error) {
        // 오류 발생 시 롤백
        await transaction.rollback();
        errorCount++;
        details.push({
          name: record.name || '(알 수 없음)',
          status: 'error',
          message: error.message
        });
        logger.error(`미용실 등록 중 오류: ${error.message}`, {
          name: record.name,
          error: sanitizeData(error)
        });
      }
    }

    return {
      successCount,
      errorCount,
      details
    };
  }
}

module.exports = new ImportService();