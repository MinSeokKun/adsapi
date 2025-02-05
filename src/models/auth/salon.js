const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Salon = sequelize.define('Salon', {
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    address: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    region_code: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    business_hours: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false
    }
},
{
    tableName: 'salons',
    timestamps: false,
    underscored: true
});

module.exports = Salon;