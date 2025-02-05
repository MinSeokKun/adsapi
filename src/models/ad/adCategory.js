const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const AdCategory = sequelize.define('AdCategory', {
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'ad_categories',
  timestamps: true,
  underscored: true
});

module.exports = AdCategory;