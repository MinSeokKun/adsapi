const Database = require('../../config/database');
const { DataTypes } = require('sequelize');

const AdMedia = Database.define('AdMedia', {
  url: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('image', 'video'),
    allowNull: false
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  size: {
    type: DataTypes.ENUM("min", "max"),
    allowNull: false
  }
}, {
  tableName: 'ad_medias',
  timestamps: true,
  underscored: true
});

module.exports = AdMedia;