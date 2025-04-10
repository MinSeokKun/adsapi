const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Ad = sequelize.define('Ad', {
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('sponsor', 'salon'),
    allowNull: false
  },
  salon_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'pending', 'paused', 'inactive'),
    allowNull: false,
    defaultValue: 'inactive'
  }
}, {
  tableName: 'ads',
  timestamps: true,
  underscored: true
});

module.exports = Ad;