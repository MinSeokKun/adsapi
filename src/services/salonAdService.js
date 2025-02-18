const sequelize = require('../config/database');
const { Ad, AdMedia, AdSchedule, Salon } = require('../models');
const { processSponsorAdMedia, updateAdMedia, updateAdSchedules, getAdDetails, formatAdResponse, processSalonAdMedia } = require('../utils/adUtils');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const { storage } = require('../config/storage');
const { updateAd } = require('./adService');

class SalonAdService {
  /*
  * 개인 미용실 광고 조회
  */
  async findAllSalonAds(owner_id, logContext) {
    const salons = await Salon.findAll({
      where: { owner_id },
      include: [{
        model: Ad,
        include: [{
          model: AdMedia,
          as: 'media',
          attributes: ['url', 'type', 'duration', 'size', 'is_primary']
        }, {
          model: AdSchedule,
          required: false,
          attributes: ['time']
        }]
      }]
    });

    return salons.map(salon => ({
      id: salon.id,
      name: salon.name,
      address: salon.address,
      business_hours: salon.business_hours,
      ads: salon.Ads.map(ad => formatAdResponse(ad))
    }))
  }

  /*
  * 미용실 개인 광고 등록
  */
  async createSalonAd(title, salon_id, schedule, files, owner_id, logContext) {
    let transaction;

    try {
      transaction = await sequelize.transaction();
      if (!title || !salon_id) {
        logger.warn('필수 입력값 누락', sanitizeData(logContext));
        throw new Error('필수 입력값이 누락되었습니다.');
      }

      const salon = await Salon.findOne({
        where: { id: salon_id, owner_id}
      });

      if (!salon) {
        logger.warn('미용실 광고 접근 권한 없음', sanitizeData(logContext));
        throw new Error('해당 미용실의 소유자가 아닙니다.');
      }

      const ad = await Ad.create({
        title,
        type: 'salon',
        salon_id,
        is_active: true
      }, { transaction });

      await updateAdSchedules(ad.id, schedule, transaction);
      await processSalonAdMedia(files, ad.id, salon_id, transaction);
      await transaction.commit();
      const createdAd = await getAdDetails(ad.id);

      return createdAd;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error
    } 
  }

  /**
   * 미용실 개인 광고 수정
   */
  async updateSalonAd(id, {title, is_active, schedules, files}, owner_id, logContext) {
    let transaction;
    
    try {
      transaction = await sequelize.transaction();
      // 미용실 광고 존재 확인
      const ad = await Ad.findByPk(id);
      if (!ad) {
        logger.warn('미용실 광고를 찾을 수 없음', sanitizeData(logContext));
        throw new Error('미용실 광고를 찾을 수 없음');
      };

      // 미용실 소유권 확인
      const salon = await Salon.findOne({
        where: { id: ad.salon_id, owner_id }
      });
      if (!salon) {
        logger.warn('미용실 광고 접근 권한 없음', sanitizeData({
          ...logContext, salonId: ad.salon_id
        }));
        throw new Error('해당 미용실의 소유자가 아닙니다.');
      };

      // 광고 기본 정보 업데이트
      await ad.update({ 
        title, 
        is_active 
      }, { transaction });

      // 파일이 있는 경우에만 미디어 업데이트
      if (files && Object.keys(files).length > 0) {
        await updateAdMedia({
          adId: id,
          files: files,
          transaction,
          type: 'salon',
          salonId: salon.id
        });
      };

      await updateAdSchedules(id, schedules, transaction);
      await transaction.commit();
      const updatedAd = await getAdDetails(id);
      
      return updatedAd;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error
    }
  }

  /**
   * 미용실 광고 삭제
   */
  async deleteSalonAd(id, owner_id, logContext) {
    let transaction;
    try {
      transaction = await sequelize.transaction();
      // 미용실 광고 존재 확인
      const ad = await Ad.findByPk(id, {
        include: [{
          model: AdMedia,
          as: 'media',
          attributes: ['url']
        }],
        transaction
      });
      
      if (!ad) {
        logger.warn('미용실 광고를 찾을 수 없음', sanitizeData(logContext));
        throw new Error('미용실 광고를 찾을 수 없음');
      }

      // 미용실 소유권 확인
    const salon = await Salon.findOne({
      where: { id: ad.salon_id, owner_id },
      transaction
    });

    if (!salon) {
      logger.warn('미용실 광고 접근 권한 없음', sanitizeData({
        ...logContext,
        salonId: ad.salon_id
      }));
      throw new Error('해당 미용실의 소유자가 아닙니다');
    }
    
    await Promise.all([
      AdMedia.destroy({ where: { ad_id: id }, transaction }),
      AdSchedule.destroy({ where: { ad_id: id }, transaction }),
      ad.destroy({ transaction })
    ]);

    // 스토리지에서 파일 삭제
    try {
      await Promise.all(
        ad.media.map(media => storage.deleteFile(media.url))
      );
    } catch (storageError) {
      console.error('파일 삭제 실패:', storageError);
      // 파일 삭제 실패를 로깅하고 계속 진행
    }
    await transaction.commit();
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error
    }
  }

}

module.exports = new SalonAdService();