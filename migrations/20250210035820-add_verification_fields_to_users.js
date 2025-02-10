'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'is_email_verified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: 'last_login'
    });

    await queryInterface.addColumn('users', 'verification_token', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'is_email_verified'
    });

    await queryInterface.addColumn('users', 'verification_token_expires', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'verification_token'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'verification_token_expires');
    await queryInterface.removeColumn('users', 'verification_token');
    await queryInterface.removeColumn('users', 'is_email_verified');
  }
};