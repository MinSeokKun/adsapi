const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const UserActivity = sequelize.define('UserActivity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  activity_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_activities',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,  // updatedAt 필드는 필요 없음
  underscored: true,
  indexes: [
    {
      name: 'idx_user_id',
      fields: ['user_id']
    },
    {
      name: 'idx_created_at',
      fields: ['created_at']
    }
  ]
});

// User 모델과의 관계 설정
UserActivity.associate = (models) => {
  UserActivity.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

module.exports = UserActivity;