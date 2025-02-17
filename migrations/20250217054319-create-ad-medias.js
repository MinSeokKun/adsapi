'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ad_medias', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      url: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('image', 'video'),
        allowNull: false
      },
      order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      size: {
        type: Sequelize.ENUM('min', 'max'),
        allowNull: false
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
    await queryInterface.addIndex('ad_medias', ['ad_id']);
    await queryInterface.addIndex('ad_medias', ['type']);
    await queryInterface.addIndex('ad_medias', ['order']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ad_medias');
  }
};