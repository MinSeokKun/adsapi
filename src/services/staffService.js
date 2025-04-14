const sequelize = require('../config/database');
const { Staff, Salon, Location, Display, User } = require('../models');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const addressService = require('../utils/address');
const { Op, where } = require('sequelize');

class StaffService {
    async getAllStaffs(id) {
        return Staff.findAll({
            where: { salon_id : id }
        });
    };
}