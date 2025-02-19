'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ad_locations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ad_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ads',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      target_type: {
        type: Sequelize.ENUM('nationwide', 'administrative', 'radius'),
        allowNull: false,
        comment: '전국/행정구역/반경 설정'
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '시/도 (행정구역 타겟팅시 사용)'
      },
      district: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '구/군 (행정구역 타겟팅시 사용)'
      },
      radius: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '반경 (미터 단위, 반경 타겟팅시 사용)'
      },
      center_latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
        comment: '중심점 위도 (반경 타겟팅시 사용)'
      },
      center_longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
        comment: '중심점 경도 (반경 타겟팅시 사용)'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // 인덱스 추가
    await queryInterface.addIndex('ad_locations', ['target_type']);
    await queryInterface.addIndex('ad_locations', ['city', 'district']);
    await queryInterface.addIndex('ad_locations', ['center_latitude', 'center_longitude']);
  },

  async down(queryInterface, Sequelize) {
    // 인덱스 제거
    await queryInterface.removeIndex('ad_locations', ['target_type']);
    await queryInterface.removeIndex('ad_locations', ['city', 'district']);
    await queryInterface.removeIndex('ad_locations', ['center_latitude', 'center_longitude']);
    
    // ENUM 타입 제거
    await queryInterface.sequelize.query('DROP TYPE enum_ad_locations_target_type;');
    
    // 테이블 제거
    await queryInterface.dropTable('ad_locations');
  }
};