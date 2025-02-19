const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Location = sequelize.define('Location', {
    address_line1: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '기본 주소'
    },
    address_line2: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '상세 주소'
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '시/도'
    },
    district: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '구/군'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
        validate: {
            min: -90,
            max: 90
        }
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false,
        validate: {
            min: -180,
            max: 180
        }
    }
}, {
    tableName: 'locations',
    timestamps: true,
    underscored: true
});

module.exports = Location;