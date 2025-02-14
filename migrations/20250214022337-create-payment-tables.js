'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. subscription_plans 테이블 생성
    await queryInterface.createTable('subscription_plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('basic_sponsor', 'premium_sponsor'),
        allowNull: false
      },
      price: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      duration_months: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      features: {
        type: Sequelize.JSON,
        allowNull: false
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

    // 2. subscriptions 테이블 생성
    await queryInterface.createTable('subscriptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subscription_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      status: {
        type: Sequelize.ENUM('active', 'expired', 'cancelled'),
        defaultValue: 'active'
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      auto_renewal: {
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

    // 3. payments 테이블 생성
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subscriptions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'KRW'
      },
      payment_method: {
        type: Sequelize.ENUM('card', 'bank_transfer', 'virtual_account'),
        allowNull: false
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        defaultValue: 'pending'
      },
      payment_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      merchant_uid: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      pg_provider: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      receipt_url: {
        type: Sequelize.STRING(255),
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

    // 4. payment_refunds 테이블 생성
    await queryInterface.createTable('payment_refunds', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
    await queryInterface.addIndex('subscriptions', ['user_id']);
    await queryInterface.addIndex('subscriptions', ['plan_id']);
    await queryInterface.addIndex('subscriptions', ['status']);
    await queryInterface.addIndex('payments', ['user_id']);
    await queryInterface.addIndex('payments', ['subscription_id']);
    await queryInterface.addIndex('payments', ['payment_status']);
    await queryInterface.addIndex('payment_refunds', ['payment_id']);
    await queryInterface.addIndex('payment_refunds', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    // 테이블 삭제 (생성의 역순)
    await queryInterface.dropTable('payment_refunds');
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('subscriptions');
    await queryInterface.dropTable('subscription_plans');
  }
};