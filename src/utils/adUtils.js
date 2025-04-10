// src/utils/adUtils.js
const { createMediaInfo } = require('./mediaUtils');
const { storage, STORAGE_PATHS } = require('../config/storage');
const { AdMedia, Ad, AdSchedule, AdLocation } = require('../models');

function parseSchedules (schedulesInput) {
  if (!schedulesInput) return [];
  
  try {
    // 문자열인 경우 JSON 파싱 시도
    if (typeof schedulesInput === 'string') {
      // 단일 숫자인지 확인
      if (!isNaN(schedulesInput)) {
        return [schedulesInput];
      }
      
      // JSON 파싱 시도
      try {
        const parsed = JSON.parse(schedulesInput);
        // 파싱된 결과가 배열이 아니면 단일 요소 배열로 변환
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // JSON 파싱 실패 시 콤마로 구분된 문자열로 처리
        return schedulesInput.split(',').map(t => t.trim());
      }
    }
    
    // 이미 배열인 경우
    if (Array.isArray(schedulesInput)) {
      return schedulesInput;
    }
    
    // 그 외의 경우 (숫자 등) 단일 요소 배열로 변환
    return [schedulesInput];
  } catch (e) {
    throw new Error('schedules must be a valid JSON array string, comma-separated time values, or a single time value');
  }
};

/**
 * 통합된 광고 미디어 파일 처리 함수
 * @param {Object} options - 파일 처리 옵션
 * @param {Object} options.files - 업로드된 파일 객체
 * @param {number} options.adId - 광고 ID
 * @param {Object} options.transaction - DB 트랜잭션 객체
 * @param {string} [options.type='sponsor'] - 광고 타입 ('sponsor' | 'salon')
 * @param {number} [options.salonId] - 미용실 ID (salon 타입인 경우 필수)
 * @param {Object} [options.fileConfig] - 파일 설정
 * @param {string[]} [options.fileConfig.fields=['maxFiles', 'minFiles']] - 파일 필드명
 * @param {Object} [options.sizeConfig] - 사이즈 설정
 * @returns {Promise<Array>} 생성된 미디어 객체 배열
 */
async function processAdMedia(options) {
  const {
    files,
    adId,
    transaction,
    type = 'sponsor',
    salonId,
    fileConfig = {
      fields: type === 'sponsor' ? ['maxFiles', 'minFiles'] : ['files']
    },
    sizeConfig = {
      maxFiles: 'max',
      minFiles: 'min',
      files: 'min'
    }
  } = options;

  const mediaPromises = [];
  const subFolder = type === 'salon' ? `salon_${salonId}` : adId.toString();

  // 각 파일 필드 처리
  for (const field of fileConfig.fields) {
    if (files[field]) {
      const fileList = Array.isArray(files[field]) ? files[field] : [files[field]];
      
      for (const [index, file] of fileList.entries()) {
        const fileUrl = await storage.uploadFile(
          file,
          STORAGE_PATHS.ADS,
          subFolder
        );

        const mediaInfo = await createMediaInfo(
          file,
          fileUrl,
          adId,
          sizeConfig[field],
          type === 'salon' && index === 0 // 미용실 광고의 경우 첫 번째 파일을 대표 이미지로 설정
        );

        mediaPromises.push(AdMedia.create(mediaInfo, { transaction }));
      }
    }
  }

  return Promise.all(mediaPromises);
}

async function processSponsorAdMedia(files, adId, transaction) {
  return processAdMedia({
    files,
    adId,
    transaction,
    type: 'sponsor'
  });
}

async function processSalonAdMedia(files, adId, salonId, transaction) {
  return processAdMedia({
    files,
    adId,
    salonId,
    transaction,
    type: 'salon'
  });
}

/**
 * 광고 정보 포맷팅
 */
function formatAdResponse(ad) {
  return {
    id: ad.id,
    title: ad.title,
    type: ad.type,
    is_active: ad.is_active,
    salon_id: ad.salon_id,
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt,
    media: Array.isArray(ad.media) 
      ? ad.media.map(m => ({
          id: m.id,
          url: m.url,
          type: m.type,
          duration: m.duration,
          size: m.size,
          is_primary: m.is_primary
        }))
      : [],
    schedules: ad.AdSchedules
      ? ad.AdSchedules.map(s => ({
          id: s.id,
          time: s.time
        }))
      : [],
    targetLocations: ad.AdLocations
      ? ad.AdLocations.map(l => ({
          id: l.id,
          target_type: l.target_type,
          city: l.city,
          district: l.district
        }))
      : [],
    campaign: ad.AdCampaign
      ? {
          id: ad.AdCampaign.id,
          budget: ad.AdCampaign.budget,
          daily_budget: ad.AdCampaign.daily_budget,
          start_date: ad.AdCampaign.start_date,
          end_date: ad.AdCampaign.end_date,
          isActive: new Date() >= new Date(ad.AdCampaign.start_date) && 
                    new Date() <= new Date(ad.AdCampaign.end_date)
        }
      : null
  };
}

function formatPublicAdResponse(ad) {
  if (!ad) return null;

  const adData = ad.dataValues || ad;
  const mediaArray = adData.media ? (Array.isArray(adData.media) ? adData.media : [adData.media]) : [];
  
  // 대표 이미지만 찾기
  const primaryMedia = mediaArray.find(m => m.dataValues.is_primary) || 
                      (mediaArray.length > 0 ? mediaArray[0] : null);
  
  return {
    id: adData.id,
    title: adData.title,
    type: adData.type,
    thumbnail: primaryMedia ? primaryMedia.dataValues.url : null,
    media_type: primaryMedia ? primaryMedia.dataValues.type : null,
    duration: primaryMedia ? primaryMedia.dataValues.duration : null
  };
}

/**
 * 광고 스케줄 업데이트
 */
async function updateAdSchedules(adId, schedules, transaction) {
  // 기존 스케줄 비활성화
  await AdSchedule.destroy(
    {where: { ad_id: adId }, transaction }
  );

  // 새로운 스케줄 생성
  const parsedSchedules = parseSchedules(schedules);
  const schedulePromises = parsedSchedules.map(time => 
    AdSchedule.create({
      ad_id: adId,
      time: time + ':00:00',
      is_active: true
    }, { transaction })
  );

  await Promise.all(schedulePromises);
  return parsedSchedules;
}

/**
 * 광고 미디어 파일들을 storage에서 삭제하는 함수
 * @param {Array<AdMedia>} mediaList - 삭제할 미디어 객체 배열
 * @returns {Promise<void>}
 */
async function deleteMediaFiles(mediaList) {
  const deletePromises = mediaList.map(media => 
    storage.deleteFile(media.url).catch(error => {
      console.error(`Failed to delete file from storage: ${media.url}`, error);
      // 파일 삭제 실패는 전체 프로세스를 중단하지 않음
    })
  );
  
  await Promise.all(deletePromises);
}

/**
 * 광고 미디어 업데이트 함수
 * @param {Object} options - 업데이트 옵션
 * @param {number} options.adId - 광고 ID
 * @param {Object} options.files - 업로드된 파일 객체
 * @param {Object} options.transaction - DB 트랜잭션 객체
 * @param {string} [options.type='sponsor'] - 광고 타입 ('sponsor' | 'salon')
 * @param {number} [options.salonId] - 미용실 ID (salon 타입인 경우)
 */
async function updateAdMedia(options) {
  const { adId, files, transaction, type = 'sponsor', salonId } = options;
  
  try {
    // 기존 미디어 조회
    const existingMedia = await AdMedia.findAll({
      where: { ad_id: adId },
      transaction
    });

    // Storage에서 기존 파일 삭제
    if (existingMedia.length > 0) {
      await deleteMediaFiles(existingMedia);
    }

    // DB에서 기존 미디어 레코드 삭제
    await AdMedia.destroy({
      where: { ad_id: adId },
      transaction
    });

    // 새로운 미디어 처리
    return processAdMedia({
      files,
      adId,
      transaction,
      type,
      ...(salonId && { salonId })
    });
  } catch (error) {
    // 에러 발생 시 트랜잭션에서 처리되도록 에러를 상위로 전파
    throw error;
  }
}


/**
 * 광고 정보 조회
 */
async function getAdDetails(adId) {
  const ad = await Ad.findByPk(adId, {
    include: [
      {
        model: AdMedia,
        as: 'media',
        attributes: ['id', 'url', 'type', 'duration', 'size', 'is_primary']
      },
      {
        model: AdSchedule,
        attributes: ['id', 'time']
      },
      {
        model: AdLocation,
        attributes: ['id', 'target_type', 'city', 'district']
      },
      {
        model: AdCampaign,
        attributes: ['id', 'budget', 'daily_budget', 'start_date', 'end_date']
      }
    ]
  });
  
  if (!ad) return null;
  
  return formatAdResponse(ad);
}

module.exports = {
  parseSchedules,
  processSponsorAdMedia,
  processSalonAdMedia,
  formatAdResponse,
  formatPublicAdResponse,
  updateAdSchedules,
  updateAdMedia,
  getAdDetails
};