const sequelize = require('../config/database');
const { Ad, AdMedia, AdSchedule, Salon, AdLocation } = require('../models');
const { processSponsorAdMedia, updateAdMedia, updateAdSchedules, getAdDetails, formatAdResponse } = require('../utils/adUtils');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const { storage } = require('../config/storage')
const { Op } = require('sequelize');

class MediaService {
  // 새로운 광고 미디어 생성
  async createNewMedia(adId, files) {
    let transaction;
    try {
      transaction = await sequelize.transaction();
      const newMedia = await processSponsorAdMedia(files, adId, transaction);
      await transaction.commit();
      return newMedia;
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }


}

module.exports = new MediaService();