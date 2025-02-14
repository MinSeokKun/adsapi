const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('basic_sponsor', 'premium_sponsor'),
    allowNull: false
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  duration_months: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  features: {
    type: DataTypes.JSON,
    allowNull: false,
    // 예: {
    //   max_ads: 5,
    //   max_media_per_ad: 3,
    //   allowed_ad_types: ['image', 'video']
    // }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'subscription_plans',
  timestamps: true,
  underscored: true
});

module.exports = SubscriptionPlan;