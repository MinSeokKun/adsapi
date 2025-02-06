const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Ad = sequelize.define('Ad', {
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
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