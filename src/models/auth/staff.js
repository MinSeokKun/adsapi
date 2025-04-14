const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Staff = sequelize.define('Staff', {
    name: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    position: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    career_years: {
        type: DataTypes.DATE,
        allowNull: false
    }
},
{
    tableName: 'staffs'
});

module.exports = Staff;