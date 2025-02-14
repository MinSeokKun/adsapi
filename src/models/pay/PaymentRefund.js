const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const PaymentRefund = sequelize.define('PaymentRefund', {
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'rejected'),
    defaultValue: 'pending'
  },
  refund_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  admin_memo: {  // 관리자 메모
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'payment_refunds',
  timestamps: true,
  underscored: true
});

module.exports = PaymentRefund;