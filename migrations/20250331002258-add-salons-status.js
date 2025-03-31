'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. ENUM 타입 추가 및 status 컬럼 추가
    await queryInterface.addColumn('salons', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: true, // 임시로 null 허용 (기존 데이터 업데이트를 위해)
      comment: '승인 상태 (승인 대기, 승인 완료, 반려)'
    });

    // 2. 모든 기존 데이터를 'pending' 상태로 업데이트
    await queryInterface.sequelize.query(`
      UPDATE salons 
      SET status = 'pending' 
      WHERE status IS NULL
    `);

    // 3. status 컬럼을 NOT NULL로 변경하고 기본값 설정
    await queryInterface.changeColumn('salons', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '승인 상태 (승인 대기, 승인 완료, 반려)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // status 컬럼 제거
    await queryInterface.removeColumn('salons', 'status');
    
    // ENUM 타입 제거
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_salons_status";');
  }
};