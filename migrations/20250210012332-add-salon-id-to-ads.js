'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // type 컬럼 추가
    await queryInterface.addColumn('ads', 'type', {
      type: Sequelize.ENUM('sponsor', 'salon'),
      allowNull: false,
      defaultValue: 'sponsor' // 기존 데이터를 위한 기본값 설정
    });

    // salon_id 컬럼 추가
    await queryInterface.addColumn('ads', 'salon_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'salons',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    // salon_id 컬럼 제거
    await queryInterface.removeColumn('ads', 'salon_id');
    
    // type 컬럼 제거
    await queryInterface.removeColumn('ads', 'type');
    
    // ENUM 타입 제거
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_ads_type;');
  }
};