'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 기존 payment_method ENUM 타입을 VARCHAR로 변경
    await queryInterface.changeColumn('payments', 'payment_method', {
      type: Sequelize.STRING(20),
      allowNull: false
    });

    // fail_reason 컬럼 추가
    await queryInterface.addColumn('payments', 'fail_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'receipt_url' // receipt_url 컬럼 다음에 추가
    });
  },

  async down(queryInterface, Sequelize) {
    // fail_reason 컬럼 제거
    await queryInterface.removeColumn('payments', 'fail_reason');

    // payment_method를 다시 ENUM으로 변경
    await queryInterface.changeColumn('payments', 'payment_method', {
      type: Sequelize.ENUM('card', 'bank_transfer', 'virtual_account'),
      allowNull: false
    });
  }
};