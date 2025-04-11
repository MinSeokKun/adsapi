// src/services/adService.js
const sequelize = require('../config/database');
const { Ad, AdMedia, AdSchedule, Salon, AdLocation, Location, AdCampaign } = require('../models');
const { processSponsorAdMedia, updateAdMedia, updateAdSchedules, formatPublicAdResponse, getAdDetails, formatAdResponse } = require('../utils/adUtils');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const { storage } = require('../config/storage')
const { Op } = require('sequelize');
const adStatusService = require('./adStatusService');

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
        status: 'active',
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
    try {
      // 1. 미용실 위치 정보 조회
      const salonLocation = await Location.findOne({
        where: { salon_id: salonId }
      });
  
      if (!salonLocation) {
        throw new Error('Salon location not found');
      }
  
      // 2. 쿼리 옵션 기본 설정
      const queryOptions = {
        include: [
          {
            model: AdMedia,
            as: 'media',
            attributes: ['url', 'type', 'duration', 'size', 'is_primary']
          }, 
          {
            model: AdLocation,
            required: true,
            where: {
              [Op.or]: [
                // 전국 광고 포함
                { target_type: 'nationwide' },
                // 행정구역 매칭 광고
                {
                  target_type: 'administrative',
                  city: salonLocation.city,
                  [Op.or]: [
                    { district: salonLocation.district },
                    { district: null } // 시/도 단위 타겟팅 (구/군 미지정)
                  ]
                }
              ]
            }
          }
        ],
        where: {
          status: 'active'
        }
      };
  
      // 3. 시간 조건 추가 (있을 경우)
      if (time) {
        queryOptions.include[1].where = { time: time + ':00:00' };
        queryOptions.include[1].required = true;
      }
  
      // 4. 광고 조회 실행
      const ads = await Ad.findAll(queryOptions);
      return ads;
      
    } catch (error) {
      console.error('Error fetching ads by time and location:', error);
      throw error;
    }
  }

  /**
   * 광고에 타겟팅된 미용실 수를 계산합니다
   * @param {number} adId - 광고 ID
   * @returns {Promise<number>} 타겟팅된 미용실 수
   */
  async getTargetedSalonCount(adId) {
    try {
      // 광고의 타겟 지역 설정 가져오기
      const adLocations = await AdLocation.findAll({
        where: { ad_id: adId }
      });

      // 타겟 지역이 없으면 0 반환
      if (!adLocations || adLocations.length === 0) {
        return 0;
      }

      let salonCount = 0;

      // 전국 타겟팅이 있는지 확인
      const hasNationwide = adLocations.some(loc => loc.target_type === 'nationwide');
      
      // 전국 타겟팅이 있으면 모든 미용실 수를 반환
      if (hasNationwide) {
        salonCount = await Salon.count({
          where: { status: 'approved' } // 승인된 미용실만 카운트
        });
        return salonCount;
      }

      // 행정구역 타겟팅 처리
      const administrativeLocations = adLocations.filter(loc => 
        loc.target_type === 'administrative'
      );

      if (administrativeLocations.length > 0) {
        // 행정구역 기반 조건 구성
        const whereConditions = [];
        
        for (const loc of administrativeLocations) {
          const locationCondition = {
            city: loc.city
          };
          
          // 구/군이 지정된 경우에만 조건에 추가
          if (loc.district) {
            locationCondition.district = loc.district;
          }
          
          whereConditions.push(locationCondition);
        }
        
        // 모든 대상 미용실 카운트
        salonCount = await Salon.count({
          where: { status: 'approved' },
          include: [{
            model: Location,
            as: 'location',
            required: true,
            where: {
              [Op.or]: whereConditions
            }
          }]
        });
      }

      return salonCount;
    } catch (error) {
      logger.error('타겟팅된 미용실 수 계산 오류', {
        adId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      return 0; // 오류 시 기본값 반환
    }
  }

  /**
   * 모든 광고에 대한 타겟팅 통계 조회
   * @returns {Promise<Array>} 각 광고별 타겟팅 통계
   */
  async getAllAdTargetingStats() {
    try {
      // 활성화된 모든 광고 조회
      const ads = await Ad.findAll({
        where: { status: 'active' },
        include: [{
          model: AdLocation,
          required: false
        }]
      });

      const stats = [];
      
      for (const ad of ads) {
        const targetedSalonCount = await getTargetedSalonCount(ad.id);
        
        stats.push({
          adId: ad.id,
          title: ad.title,
          targetedSalonCount: targetedSalonCount,
          // 타겟팅 유형(전국/지역) 정보 추가
          targetType: ad.AdLocations && ad.AdLocations.length > 0 
            ? ad.AdLocations.map(loc => ({
                type: loc.target_type,
                city: loc.city,
                district: loc.district
              }))
            : []
        });
      }

      return stats;
    } catch (error) {
      console.error('Error getting ad targeting stats:', error);
      throw error;
    }
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
        status: 'active'
      }
    });

    return ads;
  }

  /**
   * 광고 검색 기능 (페이지네이션 포함)
   * @param {Object} options - 검색 옵션
   * @param {string} options.title - 제목 검색어
   * @param {string} options.type - 광고 타입 (sponsor/salon)
   * @param {string} options.status - 광고 상태 (active/inactive)
   * @param {number} options.salonId - 미용실 ID로 필터링
   * @param {Date} options.startDate - 검색 시작 날짜
   * @param {Date} options.endDate - 검색 종료 날짜
   * @param {number} options.page - 페이지 번호
   * @param {number} options.limit - 페이지당 항목 수
   * @param {string} options.sortBy - 정렬 기준 필드
   * @param {string} options.sortOrder - 정렬 방향 (ASC/DESC)
   * @returns {Promise<Object>} - 페이지네이션 정보가 포함된 광고 목록
   */
  async searchAds(options) {
    const {
      title,
      type,
      status,
      salonId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    // 페이지 및 제한 검증
    const validatedPage = Math.max(1, parseInt(page, 10));
    const validatedLimit = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const offset = (validatedPage - 1) * validatedLimit;

    // 기본 쿼리 옵션
    const queryOptions = {
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
        },
        {
          model: Salon,
          required: false,
          attributes: ['name']
        },
        {
          model: AdCampaign, // 새로 추가한 캠페인 모델
          required: false,
          attributes: ['budget', 'daily_budget', 'start_date', 'end_date']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: validatedLimit,
      offset: offset,
      distinct: true
    };

    // WHERE 조건 구성
    const whereConditions = {};

    // 제목 검색
    if (title && title.trim() !== '') {
      whereConditions.title = {
        [Op.like]: `%${title.trim()}%`
      };
    }

    // 광고 타입 필터링
    if (type) {
      whereConditions.type = type;
    }

    // 광고 상태 필터링
    if (status && status !== 'all') {
      whereConditions.status = status;
    }

    // 미용실 ID 필터링
    if (salonId) {
      whereConditions.salon_id = salonId;
    }

    // 날짜 범위 필터링
    if (startDate && endDate) {
      whereConditions.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereConditions.created_at = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereConditions.created_at = {
        [Op.lte]: new Date(endDate)
      };
    }

    // WHERE 조건 적용
    if (Object.keys(whereConditions).length > 0) {
      queryOptions.where = whereConditions;
    }

    // 데이터 조회
    const { count, rows } = await Ad.findAndCountAll(queryOptions);

    // 각 광고에 대해 타겟팅된 미용실 수를 추가
    const formattedAdsPromises = rows.map(async (ad) => {
      const formattedAd = formatAdResponse(ad);
      // 타겟팅된 미용실 수 추가
      formattedAd.targetedSalonCount = await this.getTargetedSalonCount(ad.id);
      return formattedAd;
    });

    // 모든 Promise 처리를 기다림
    const formattedAds = await Promise.all(formattedAdsPromises);

    // 페이지네이션 메타데이터 계산
    const totalItems = count;
    const totalPages = Math.ceil(totalItems / validatedLimit);
    const hasNext = validatedPage < totalPages;
    const hasPrevious = validatedPage > 1;

    return {
      ads: formattedAds,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        totalItems,
        totalPages,
        hasNext,
        hasPrevious
      },
      filters: {
        title,
        type,
        status,
        salonId,
        startDate,
        endDate,
        sortBy,
        sortOrder
      }
    };
  }

  async getPublicAds(options) {
    const {
      title,
      type = 'sponsor',
      status,
      page = 1,
      limit = 20,  // 일반 사용자에게는 더 많은 결과를 기본값으로 제공
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;
  
    // 페이지 및 제한 검증
    const validatedPage = Math.max(1, parseInt(page, 10));
    const validatedLimit = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const offset = (validatedPage - 1) * validatedLimit;
  
    // 기본 쿼리 옵션 - 현재 활성화된 광고만 표시
    const queryOptions = {
      include: [
        {
          model: AdMedia,
          as: 'media',
          attributes: ['url', 'type', 'duration', 'is_primary']
        }
      ],
      where: {
        status: 'active',  // 활성화된 광고만 표시
        type: 'sponsor'
      },
      order: [[sortBy, sortOrder]],
      limit: validatedLimit,
      offset: offset,
      distinct: true
    };
  
    // 제목 검색
    if (title && title.trim() !== '') {
      queryOptions.where.title = {
        [Op.like]: `%${title.trim()}%`
      };
    }
  
    // 현재 날짜 내의 캠페인만 표시
    const now = new Date();
    queryOptions.include = queryOptions.include.map(include => {
      if (include.model === AdCampaign) {
        include.where = {
          start_date: { [Op.lte]: now },
          end_date: { [Op.gte]: now }
        };
      }
      return include;
    });
  
    // 데이터 조회
    const { count, rows } = await Ad.findAndCountAll(queryOptions);
  
    // 응답 데이터 포맷팅 - 일반 사용자에게 필요한 정보만 포함
    const formattedAds = rows.map(ad => formatPublicAdResponse(ad));
  
    // 페이지네이션 메타데이터 계산
    const totalItems = count;
    const totalPages = Math.ceil(totalItems / validatedLimit);
    const hasNext = validatedPage < totalPages;
    const hasPrevious = validatedPage > 1;
  
    return {
      ads: formattedAds,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        totalItems,
        totalPages,
        hasNext,
        hasPrevious
      }
    };
  }

  async getAdsForSalonId(salonId) {
    const salon = await Salon.findOne({
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
      where: { status: 'active' },
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
        status: adData.status || 'inactive',
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
      
      // 4. 캠페인 정보 생성 (있는 경우)
      if (adData.campaign) {
        await this.createOrUpdateCampaign(ad.id, adData.campaign, transaction);
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
  async updateAd(id, { title, status, schedules, media, targetLocations, campaign }, logContext = {}) {
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
        updateFields: { title, status }
      }));
      await ad.update({ title, status }, { transaction });
  
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
      
      // 5. 캠페인 정보 업데이트
      if (campaign !== undefined) {
        if (campaign === null) {
          // 캠페인 삭제 요청
          await this.deleteCampaign(id, transaction);
        } else {
          // 캠페인 생성 또는 업데이트
          await this.createOrUpdateCampaign(id, campaign, transaction);
        }
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
        }, 
        {
          model: AdSchedule,
          required: false,
          attributes: ['id', 'time']
        }, 
        {
          model: AdLocation
        },
        {
          model: AdCampaign,
          required: false
        }]
      })

      return ad;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 광고 캠페인 생성 또는 업데이트
   */
  async createOrUpdateCampaign(adId, campaignData, transaction = null) {
    const createNewTransaction = !transaction;

    try {
      if (createNewTransaction) {
        transaction = await sequelize.transaction();
      }
      
      // 기존 캠페인 조회
      const existingCampaign = await AdCampaign.findOne({
        where: { ad_id: adId },
        transaction
      });
      
      // 캠페인 데이터 검증
      if (!campaignData.budget || !campaignData.start_date || !campaignData.end_date) {
        throw new Error('예산, 시작일, 종료일은 필수 항목입니다.');
      }
      
      let startDate = new Date(campaignData.start_date);
      let endDate = new Date(campaignData.end_date);
      
      if (startDate >= endDate) {
        throw new Error('종료일은 시작일보다 이후여야 합니다.');
      }
      
      // 예산 유효성 검사
      if (parseFloat(campaignData.budget) <= 0) {
        throw new Error('예산은 0보다 커야 합니다.');
      }
      
      // 일일 예산 검증 (설정된 경우)
      if (campaignData.daily_budget && parseFloat(campaignData.daily_budget) <= 0) {
        throw new Error('일일 예산은 0보다 커야 합니다.');
      }
      
      // 일일 예산이 전체 예산보다 크면 안됨
      if (campaignData.daily_budget && parseFloat(campaignData.daily_budget) > parseFloat(campaignData.budget)) {
        throw new Error('일일 예산은 전체 예산보다 클 수 없습니다.');
      }
      
      let campaign;
  
      if (existingCampaign) {
        // 기존 캠페인 업데이트
        campaign = await existingCampaign.update({
          budget: campaignData.budget,
          daily_budget: campaignData.daily_budget || null,
          start_date: startDate,
          end_date: endDate
        }, { transaction });
        
        logger.info('광고 캠페인 업데이트', {
          adId,
          campaignId: campaign.id
        });
      } else {
        // 새 캠페인 생성
        campaign = await AdCampaign.create({
          ad_id: adId,
          budget: campaignData.budget,
          daily_budget: campaignData.daily_budget || null,
          start_date: startDate,
          end_date: endDate
        }, { transaction });
        
        logger.info('광고 캠페인 생성', {
          adId,
          campaignId: campaign.id
        });
      }
      
      if (createNewTransaction) {
        await transaction.commit();
      }
      
      return campaign;
    } catch (error) {
      if (createNewTransaction && transaction) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  /**
   * 광고 캠페인 삭제
   */
  async deleteCampaign(adId, transaction = null) {
    const createNewTransaction = !transaction;
    
    try {
      if (createNewTransaction) {
        transaction = await sequelize.transaction();
      }
      
      await AdCampaign.destroy({
        where: { ad_id: adId },
        transaction
      });
      
      if (createNewTransaction) {
        await transaction.commit();
        // 캠페인 삭제 후 광고 상태 업데이트
        await adStatusService.updateAdStatus(adId);
      }
      
      return true;
    } catch (error) {
      if (createNewTransaction && transaction) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  /**
   * 광고 캠페인 조회
   */
  async getCampaign(adId) {
    const campaign = await AdCampaign.findOne({
      where: { ad_id: adId }
    });
    
    return campaign;
  }

  /**
   * 활성 캠페인 목록 조회
   * 현재 진행 중인 캠페인만 반환
   */
  async getActiveCampaigns() {
    const now = new Date();
    
    const campaigns = await AdCampaign.findAll({
      where: {
        start_date: { [Op.lte]: now },
        end_date: { [Op.gte]: now }
      },
      include: [{
        model: Ad,
        where: { status: 'active' },
        include: [{
          model: AdMedia,
          as: 'media'
        }]
      }]
    });
    
    return campaigns;
  }
}

module.exports = new AdService();