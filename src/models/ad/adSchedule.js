const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const AdSchedule = sequelize.define('AdSchedule', {
  time: {
    type: DataTypes.TIME,
    allowNull: false
  }
}, {
  tableName: 'ad_schedules',
  timestamps: true,
  underscored: true
});

module.exports = AdSchedule;