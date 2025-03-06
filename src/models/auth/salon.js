const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Salon = sequelize.define('Salon', {
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    business_hours: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    business_number: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
        validate: {
            is: /^[0-9]{10}$/,  // 10자리 숫자만 허용
        },
        comment: '사업자등록번호 (10자리)'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: '미용실 연락처'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '미용실 소개 및 설명'
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
    timestamps: true,
    underscored: true
});

module.exports = Salon;