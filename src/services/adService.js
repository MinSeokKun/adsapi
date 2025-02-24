// src/services/adService.js
const sequelize = require('../config/database');
const { Ad, AdMedia, AdSchedule } = require('../models');
const { processSponsorAdMedia, updateAdMedia, updateAdSchedules, getAdDetails, formatAdResponse } = require('../utils/adUtils');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const { storage } = require('../config/storage')

class AdService {
  /**
   * 시간대별 광고 목록 조회
   */
  async getAdsByTime(time) {
    const queryOptions = {
      include: [{
        model: AdMedia,
        as: 'media',
        attributes: ['url', 'type', 'duration', 'size', 'is_primary']
      }, {
        model: AdSchedule,
        required: false,
        attributes: ['time']
      }],
      where: {
        is_active: true
      }
    };

    if (time) {
      queryOptions.include[1].where = { time: time + ':00:00' };
      queryOptions.include[1].required = true;
    }

    const ads = await Ad.findAll(queryOptions);
    return ads.map(ad => formatAdResponse(ad));
  }

  /**
   * 디스플레이 용 광고 조회 (salon_id로 추적한 광고 목록)
   */
  async getAdsByTimeAndLocation(time, salonId) {
    const queryOptions = {
      include: [{
        model: AdMedia,
        as: 'media',
        attributes: ['url', 'type', 'duration', 'size', 'is_primary']
      }, {
        model: AdSchedule,
        required: false,
        attributes: ['time']
      }],
      where: {
        is_active: true
      }
    };

    if (time) {
      queryOptions.include[1].where = { time: time + ':00:00' };
      queryOptions.include[1].required = true;
    }

    const ads = await Ad.findAll(queryOptions);
    return ads.map(ad => formatAdResponse(ad));
  }

  /**
   * 모든 활성 광고 목록 조회
   */
  async getAllActiveAds() {
    const ads = await Ad.findAll({
      include: [{
        model: AdMedia,
        as: 'media',
        attributes: ['url', 'type', 'duration', 'size', 'is_primary']
      }],
      where: {
        is_active: true
      }
    });

    return ads.map(ad => formatAdResponse(ad));
  }

  /**
   * 새로운 광고 등록
   */
  async createAd(title, schedules, files) {
    let transaction;

    try {
      transaction = await sequelize.transaction();
      const ad = await Ad.create({
        title,
        is_active: true,
        type: 'sponsor'
      }, { transaction });

      await processSponsorAdMedia(files, ad.id, transaction);
      
      const parsedSchedules = await updateAdSchedules(ad.id, schedules, transaction);

      await transaction.commit();

      const createdAd = await Ad.findByPk(ad.id, {
        include: [{
          model: AdMedia,
          as: 'media',
          attributes: ['url', 'type', 'duration', 'size', 'is_primary']
        }]
      });

      return formatAdResponse(createdAd);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 광고 수정
   */
  async updateAd(id, { title, is_active, schedules, files }, logContext = {}) {
    let transaction;

    try {
      transaction = await sequelize.transaction();
      const ad = await Ad.findByPk(id);
      if (!ad) {
        logger.warn('존재하지 않는 광고 수정 시도', sanitizeData(logContext));
        throw new Error('광고를 찾을 수 없습니다');
      }
      
      logger.info('광고 기본 정보 수정', sanitizeData({
        ...logContext,
        updateFields: { title, is_active }
      }));

      await ad.update({ title, is_active }, { transaction });

      if (files?.maxFiles || files?.minFiles) {
        await updateAdMedia({
          adId: id,
          files: files,
          transaction,
          type: 'sponsor'
        });
      }

      const parsedSchedules = await updateAdSchedules(id, schedules, transaction);
      await transaction.commit();

      const updatedAd = await getAdDetails(id);
      return formatAdResponse(updatedAd);
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error;
    }
  }


  /**
   * 광고 삭제
   */
  async deleteAd(id, logContext) {
    let transaction;
    
    try {
      transaction = await sequelize.transaction();
      const ad = await Ad.findByPk(id, {
        include: [{
          model: AdMedia,
          as: 'media',
          attributes: ['url']
        }]
      });
      if (!ad) {
        logger.warn('존재하지 않는 광고 삭제 시도', sanitizeData(logContext));
        throw new Error('광고를 찾을 수 없습니다');
      }
      
      // DB에서 관련 데이터 삭제
      await Promise.all([
        AdMedia.destroy({ where: { ad_id: id }, transaction }),
        AdSchedule.destroy({ where: { ad_id: id }, transaction }),
        ad.destroy({ transaction })
      ]);
      
      // 스토리지에서 미디어 파일 삭제
      const deleteFilePromises = ad.media.map(media => 
        storage.deleteFile(media.url)
      );
      await Promise.all(deleteFilePromises);
      
      await transaction.commit();
      return true;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  /**
   * 광고 스케줄 일괄 수정
   */
  async updateSchedules(scheduleData, logContext) {
    if (!Array.isArray(scheduleData)) {
      logger.warn('올바르지 않은 데이터 형식', sanitizeData(logContext));
      throw new Error('올바른 형식의 데이터가 아닙니다');
    }

    let transaction;
    try {
      transaction = await sequelize.transaction();
      const adIds = scheduleData.map(item => item.ad_id);

      const schedulePromises = scheduleData.flatMap(item => {
        const { ad_id, time } = item;
        
        return [
          AdSchedule.destroy({ where: { ad_id }, transaction }),
          ...time.map(hour => 
            AdSchedule.create({
              ad_id,
              time: `${hour}:00:00`
            }, { transaction })
          )
        ];
      });

      await Promise.all(schedulePromises);
      await transaction.commit();

      const updatedAds = await Ad.findAll({
        where: { id: adIds },
        include: [
          {
            model: AdMedia,
            as: 'media',
            attributes: ['url', 'type', 'duration', 'size', 'is_primary']
          },
          {
            model: AdSchedule,
            required: false,
            attributes: ['time']
          }
        ]
      });

      const formattedAds = updatedAds.map(ad => ({
        id: ad.id,
        title: ad.title,
        media: ad.media.map(m => ({
          url: m.url,
          type: m.type,
          duration: m.duration,
          size: m.size,
          is_primary: m.is_primary
        })),
        schedules: ad.AdSchedules.map(schedule => 
          parseInt(schedule.time.split(':')[0])
        ).sort((a, b) => a - b)
      }));

      logger.info('광고 스케줄 저장 완료', sanitizeData({
        ...logContext,
        adCount: adIds.length,
        totalSchedules: formattedAds.reduce((acc, ad) => acc + ad.schedules.length, 0)
      }));

      return formattedAds;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error;
    }
  }
}

module.exports = new AdService();