const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Display = sequelize.define('Display', {
  device_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '디스플레이 식별용 이름 (예: 입구, 대기실)'
  },
  access_token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
    defaultValue: 'active'
  },
  last_ping: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '디스플레이 상태 모니터링용'
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '화면 방향, 밝기 등 디스플레이 설정'
  }
}, {
  tableName: 'displays',
  timestamps: true,
  underscored: true
});

module.exports = Display;