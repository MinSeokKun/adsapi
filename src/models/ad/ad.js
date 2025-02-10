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
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'ads',
  timestamps: true,
  underscored: true
});

module.exports = Ad;