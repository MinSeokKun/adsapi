const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const AdCampaign = sequelize.define('AdCampaign', {
  ad_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'ads', key: 'id' }
  },
  budget: { 
    type: DataTypes.DECIMAL(10,2), 
    allowNull: false 
  },
  daily_budget: { 
    type: DataTypes.DECIMAL(10,2), 
    allowNull: true 
  },
  start_date: { 
    type: DataTypes.DATE, 
    allowNull: false 
  },
  end_date: { 
    type: DataTypes.DATE, 
    allowNull: false 
  },
  created_at: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  }
}, { 
  tableName: 'ad_campaigns', 
  timestamps: false, 
  underscored: true 
});

module.exports = AdCampaign;