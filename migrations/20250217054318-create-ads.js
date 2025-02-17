'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ads', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('sponsor', 'salon'),
        allowNull: false
      },
      salon_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'salons',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    // 인덱스 추가
    await queryInterface.addIndex('ads', ['salon_id']);
    await queryInterface.addIndex('ads', ['type']);
    await queryInterface.addIndex('ads', ['is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ads');
  }
};