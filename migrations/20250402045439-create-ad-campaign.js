'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ad_campaigns', {
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
      budget: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      daily_budget: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint to ensure one campaign per ad
    await queryInterface.addConstraint('ad_campaigns', {
      fields: ['ad_id'],
      type: 'unique',
      name: 'unique_ad_campaign'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ad_campaigns');
  }
};