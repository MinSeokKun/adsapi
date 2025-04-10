'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. status 컬럼 추가
    await queryInterface.addColumn('ads', 'status', {
      type: Sequelize.ENUM('active', 'pending', 'paused', 'inactive'),
      allowNull: true // 기존 데이터 마이그레이션을 위해 일시적으로 null 허용
    });

    // 2. 기존 is_active 값을 기반으로 status 값 설정
    await queryInterface.sequelize.query(`
      UPDATE ads 
      SET status = CASE 
        WHEN is_active = true THEN 'active'
        ELSE 'inactive'
      END
    `);

    // 3. status 필드 not null로 변경
    await queryInterface.changeColumn('ads', 'status', {
      type: Sequelize.ENUM('active', 'pending', 'paused', 'inactive'),
      allowNull: false,
      defaultValue: 'inactive'
    });

    // 4. 이전 is_active 컬럼 제거
    await queryInterface.removeColumn('ads', 'is_active');
  },

  down: async (queryInterface, Sequelize) => {
    // 롤백 시 is_active 컬럼 복원
    await queryInterface.addColumn('ads', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    // status 값을 기반으로 is_active 복원
    await queryInterface.sequelize.query(`
      UPDATE ads 
      SET is_active = CASE 
        WHEN status = 'active' OR status = 'pending' THEN true
        ELSE false
      END
    `);

    // status 컬럼 제거
    await queryInterface.removeColumn('ads', 'status');
    
    // ENUM 타입 제거
    await queryInterface.sequelize.query('DROP TYPE enum_ads_status;');
  }
};