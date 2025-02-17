const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Payment = sequelize.define('Payment', {
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'KRW'
  },
  payment_method: {
    type: DataTypes.STRING(20),  // ENUM 대신 STRING으로 변경
    allowNull: false
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  merchant_uid: {  // PG사 결제 고유 ID
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  pg_provider: {  // PG사 구분 (예: 'inicis', 'toss')
    type: DataTypes.STRING(50),
    allowNull: false
  },
  receipt_url: {  // 영수증 URL
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'payments',
  timestamps: true,
  underscored: true
});

module.exports = Payment;