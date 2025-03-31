'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 트랜잭션 시작
    return queryInterface.sequelize.transaction(async (transaction) => {
      try {
        // 1. 기존 ENUM 타입에서 반경('radius') 제거하기 위한 단계
        
        // 1.1. 임시 열 추가
        await queryInterface.addColumn(
          'ad_locations',
          'target_type_new',
          {
            type: Sequelize.ENUM('nationwide', 'administrative'),
            allowNull: true
          },
          { transaction }
        );
        
        // 1.2. 데이터 마이그레이션 (반경 타입은 행정구역으로 변환)
        await queryInterface.sequelize.query(
          `UPDATE ad_locations 
           SET target_type_new = CASE 
             WHEN target_type = 'radius' THEN 'administrative' 
             ELSE target_type 
           END`,
          { transaction }
        );
        
        // 1.3. 기존 열 삭제
        await queryInterface.removeColumn('ad_locations', 'target_type', { transaction });
        
        // 1.4. 임시 열 이름 변경
        await queryInterface.renameColumn('ad_locations', 'target_type_new', 'target_type', { transaction });
        
        // 2. 반경 관련 열 삭제
        await queryInterface.removeColumn('ad_locations', 'radius', { transaction });
        await queryInterface.removeColumn('ad_locations', 'center_latitude', { transaction });
        await queryInterface.removeColumn('ad_locations', 'center_longitude', { transaction });
        
        // 3. 새로운 제약 조건 추가 (필요한 경우)
        await queryInterface.changeColumn(
          'ad_locations',
          'target_type',
          {
            type: Sequelize.ENUM('nationwide', 'administrative'),
            allowNull: false
          },
          { transaction }
        );
        
        console.log('Migration successfully completed');
      } catch (error) {
        console.error('Migration failed:', error);
        throw error; // 트랜잭션 롤백
      }
    });
  },

  async down(queryInterface, Sequelize) {
    // 롤백 시 반경 타입과 관련 필드 복원
    return queryInterface.sequelize.transaction(async (transaction) => {
      try {
        // 1. 기존 ENUM 타입에 반경('radius') 추가하기 위한 단계
        
        // 1.1. 임시 열 추가
        await queryInterface.addColumn(
          'ad_locations',
          'target_type_new',
          {
            type: Sequelize.ENUM('nationwide', 'administrative', 'radius'),
            allowNull: true
          },
          { transaction }
        );
        
        // 1.2. 데이터 복사
        await queryInterface.sequelize.query(
          `UPDATE ad_locations SET target_type_new = target_type`,
          { transaction }
        );
        
        // 1.3. 기존 열 삭제
        await queryInterface.removeColumn('ad_locations', 'target_type', { transaction });
        
        // 1.4. 임시 열 이름 변경
        await queryInterface.renameColumn('ad_locations', 'target_type_new', 'target_type', { transaction });
        
        // 2. 반경 관련 열 추가
        await queryInterface.addColumn(
          'ad_locations',
          'radius',
          {
            type: Sequelize.INTEGER,
            allowNull: true
          },
          { transaction }
        );
        
        await queryInterface.addColumn(
          'ad_locations',
          'center_latitude',
          {
            type: Sequelize.DECIMAL(10, 8),
            allowNull: true
          },
          { transaction }
        );
        
        await queryInterface.addColumn(
          'ad_locations',
          'center_longitude',
          {
            type: Sequelize.DECIMAL(11, 8),
            allowNull: true
          },
          { transaction }
        );
        
        console.log('Rollback successfully completed');
      } catch (error) {
        console.error('Rollback failed:', error);
        throw error; // 트랜잭션 롤백
      }
    });
  }
};