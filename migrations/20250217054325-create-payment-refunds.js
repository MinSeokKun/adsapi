'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payment_refunds', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'payments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      reason: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'rejected'),
        defaultValue: 'pending'
      },
      refund_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      admin_memo: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.addIndex('payment_refunds', ['payment_id']);
    await queryInterface.addIndex('payment_refunds', ['status']);
    await queryInterface.addIndex('payment_refunds', ['refund_date']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payment_refunds');
  }
};