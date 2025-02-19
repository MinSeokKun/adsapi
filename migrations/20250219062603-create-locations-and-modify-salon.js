'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // locations 테이블 생성
    await queryInterface.createTable('locations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      salon_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'salons',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      address_line1: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: '기본 주소'
      },
      address_line2: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '상세 주소'
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '시/도'
      },
      district: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '구/군'
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false,
        defaultValue: 0
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: new Date()
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: new Date()
      }
    });

    // 2. 기존 salons 테이블에 business_number 컬럼 추가
    await queryInterface.addColumn('salons', 'business_number', {
      type: Sequelize.STRING(10),
      allowNull: true, // 기존 데이터가 있을 수 있으므로 initially true
      unique: true
    });
    
    // 3. salons 테이블에서 기존 컬럼 제거
    await queryInterface.removeColumn('salons', 'address');
    await queryInterface.removeColumn('salons', 'region_code');
    
  },

  async down(queryInterface, Sequelize) {
    
    await queryInterface.removeColumn('salons', 'business_number');
    // 1. 주소 관련 컬럼 복원
    await queryInterface.addColumn('salons', 'address', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('salons', 'region_code', {
      type: Sequelize.STRING(10),
      allowNull: true
    });
    // locations 테이블 삭제
    await queryInterface.dropTable('locations');
  }
};