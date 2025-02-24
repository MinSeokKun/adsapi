'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('displays', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      device_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '디스플레이 식별용 이름 (예: 입구, 대기실)'
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
      access_token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'maintenance'),
        defaultValue: 'active'
      },
      last_ping: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '디스플레이 상태 모니터링용'
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '화면 방향, 밝기 등 디스플레이 설정'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 인덱스 생성
    await queryInterface.addIndex('displays', ['salon_id']);
    await queryInterface.addIndex('displays', ['device_id']);
    await queryInterface.addIndex('displays', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('displays');
  }
};