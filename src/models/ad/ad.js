const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Ad = sequelize.define('Ad', {
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('image', 'video'),
    allowNull: false
  },
  url: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER,
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