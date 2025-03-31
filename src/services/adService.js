// src/services/adService.js
const sequelize = require('../config/database');
const { Ad, AdMedia, AdSchedule, Salon, AdLocation } = require('../models');
const { processSponsorAdMedia, updateAdMedia, updateAdSchedules, getAdDetails, formatAdResponse } = require('../utils/adUtils');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const { storage } = require('../config/storage')
const { Op } = require('sequelize');

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
    return ads;
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
    return ads;
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

    return ads;
  }

  async getAdsForSalonId(salonId) {
    const salon = Salon.findOne({
      where: { salon_id: salonId },
      include: [{
        model: Location,
        as: 'location'
      }]
    });
  
    if (!salon || !salon.location) {
      throw new Error('Salon or location not found');
    }
  
    const salonLocation = salon.location;
  
    // 광고 조회 (반경 검색 관련 코드 제거)
    const ads = await Ad.findAll({
      where: { is_active: true },
      include: [
        {
          model: AdMedia,
          as: 'media'
        },
        {
          model: AdSchedule,
          required: false,
          attributes: ['time']
        },
        {
          model: AdLocation,
          as: 'targetLocations', // as 속성 활성화 권장
          required: true,
          where: {
            [Op.or]: [
              // 전국 광고
              { target_type: 'nationwide' },
              
              // 행정구역 기반 광고
              {
                target_type: 'administrative',
                city: salonLocation.city,
                [Op.or]: [
                  { district: salonLocation.district },
                  { district: null } // 구/군 미지정인 경우 (시/도 단위 타겟팅)
                ]
              }
            ]
          }
        }
      ],
      group: ['Ad.id']
    });
    
    return ads;
  }
  
  /**
   * 새로운 광고 등록
   */
  async createAd(adData, logContext = {}) {
    let transaction;
  
    try {
      transaction = await sequelize.transaction();
      
      // 1. 광고 기본 정보 생성
      const ad = await Ad.create({
        title: adData.title,
        is_active: adData.is_active || true,
        type: adData.type || 'sponsor'
      }, { transaction });
      
      // 2. 스케줄 동기화
      if (adData.schedules) {
        await this.syncAdSchedules(ad.id, adData.schedules, transaction, logContext);
      }
      
      // 3. 타겟 위치 동기화
      if (adData.targetLocations) {
        await this.syncAdLocations(ad.id, adData.targetLocations, transaction, logContext);
      }
      
      await transaction.commit();
      transaction = null;
      
      // 생성된 광고 정보 조회
      const createdAd = await getAdDetails(ad.id);
      return createdAd;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  /**
   * 광고 수정
   */
  async updateAd(id, { title, is_active, schedules, media, targetLocations }, logContext = {}) {
    let transaction;

    try {
      transaction = await sequelize.transaction();
      const ad = await Ad.findByPk(id);
      if (!ad) {
        logger.warn('존재하지 않는 광고 수정 시도', sanitizeData(logContext));
        throw new Error('광고를 찾을 수 없습니다');
      }
      
      // 1. 광고 기본 정보 업데이트
      logger.info('광고 기본 정보 수정', sanitizeData({
        ...logContext,
        updateFields: { title, is_active }
      }));
      await ad.update({ title, is_active }, { transaction });

      // 2. 미디어 관계 동기화
      if (media !== undefined) {
        await this.syncAdMedia(id, media, transaction, logContext);
      }

      // 3. 스케줄 업데이트
      if (schedules !== undefined) {
        await this.syncAdSchedules(id, schedules, transaction, logContext);
      }

      // 4. 타겟 위치 동기화
      if (targetLocations !== undefined) {
        await this.syncAdLocations(id, targetLocations, transaction, logContext);
      }

      await transaction.commit();
      transaction = null;

      // 업데이트된 광고 정보 조회
      const updatedAd = await getAdDetails(id);
      return updatedAd;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      logger.error('광고 수정 오류', sanitizeData({
        ...logContext,
        error: {
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      throw error;
    }
  }

/**
 * 광고 미디어 동기화
 */
async syncAdMedia(adId, mediaData, transaction) {
  // mediaData가 ID 배열인지 객체 배열인지 확인
  const mediaIds = mediaData.map(media => typeof media === 'object' ? media.id : media);
  
  // 현재 광고에 연결된 미디어 가져오기
  const existingMedia = await AdMedia.findAll({
    where: { ad_id: adId },
    attributes: ['id'],
    transaction
  });
  
  const existingMediaIds = existingMedia.map(m => m.id);
  
  // 삭제할 미디어
  const mediaToDelete = existingMediaIds.filter(id => !mediaIds.includes(id));
  
  // 추가할 미디어
  const mediaToAdd = mediaIds.filter(id => !existingMediaIds.includes(id));
  
  // 미디어 삭제
  if (mediaToDelete.length > 0) {
    await AdMedia.destroy({
      where: { 
        id: mediaToDelete,
        ad_id: adId
      },
      transaction
    });
  }
  
  // 새 미디어 추가
  for (const mediaId of mediaToAdd) {
    await AdMedia.create({
      ad_id: adId,
      id: mediaId
    }, { transaction });
  }
  
  return true;
}

/**
 * 광고 스케줄 동기화
 */
async syncAdSchedules(adId, schedules, transaction) {
  
  // 기존 스케줄 삭제
  await AdSchedule.destroy({
    where: { ad_id: adId },
    transaction
  });
  
  // 새 스케줄 생성
  if (schedules && schedules.length > 0) {
    await Promise.all(schedules.map(schedule => 
      AdSchedule.create({
        ad_id: adId,
        time: schedule,
      }, { transaction })
    ));
  }
  
  return true;
}

/**
 * 광고 타겟 위치 동기화
 */
async syncAdLocations(adId, targetLocations, transaction) {
  
  // 기존 타겟 위치 삭제
  await AdLocation.destroy({
    where: { ad_id: adId },
    transaction
  });
  
  // 새 타겟 위치 생성
  if (targetLocations && targetLocations.length > 0) {
    // 각 위치 데이터에서 반경 관련 필드 제거 및 검증
    const cleanedLocations = targetLocations.map(location => {
      // 반경 관련 필드 제거 (필요한 경우)
      const { radius, center_latitude, center_longitude, ...rest } = location;
      
      // 행정구역 타입이면서 city가 없으면 오류
      if (rest.target_type === 'administrative' && !rest.city) {
        throw new Error('City is required for administrative targeting');
      }
      
      return {
        ...rest,
        ad_id: adId
      };
    });
    
    await Promise.all(cleanedLocations.map(location => 
      AdLocation.create(location, { transaction })
    ));
  }
  
  return true;
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
          },
          {
            model: AdSchedule,
            required: false,
            attributes: ['time']
          }
        ]
      });

      logger.info('광고 스케줄 저장 완료', sanitizeData({
        ...logContext,
        adCount: adIds.length,
        totalSchedules: formattedAds.reduce((acc, ad) => acc + ad.schedules.length, 0)
      }));

      return updatedAds;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  // ID로 광고 조회
  async getAdById(id) {
    try {
      const ad = Ad.findOne({
        where: { id },
        include: [{
          model: AdMedia,
          as: 'media'
        }, {
          model: AdSchedule,
          required: false,
          attributes: ['id', 'time']
        }, {
          model: AdLocation
        }]
      })

      return ad;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AdService();