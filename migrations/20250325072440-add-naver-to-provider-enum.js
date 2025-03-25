'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // MySQL approach to update ENUM value
    await queryInterface.changeColumn('users', 'provider', {
      type: Sequelize.ENUM('local', 'google', 'kakao', 'naver'),
      allowNull: false,
      defaultValue: 'local'
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to original ENUM without 'naver'
    await queryInterface.changeColumn('users', 'provider', {
      type: Sequelize.ENUM('local', 'google', 'kakao'),
      allowNull: false,
      defaultValue: 'local'
    });
  }
};