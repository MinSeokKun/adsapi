// src/utils/adUtils.js
const { createMediaInfo } = require('./mediaUtils');
const { storage, STORAGE_PATHS } = require('../config/storage');
const { AdMedia, Ad, AdSchedule } = require('../models');

const parseSchedules = (schedulesInput) => {
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
 * 스폰서 광고 미디어 파일 처리
 */
async function processSponsorAdMedia(files, adId, transaction) {
  const mediaPromises = [];

  // max size 파일 처리
  if (files.maxFiles) {
    for (const file of files.maxFiles) {
      const fileUrl = await storage.uploadFile(file, STORAGE_PATHS.ADS, adId.toString());
      const mediaInfo = await createMediaInfo(file, fileUrl, adId, 'max');
      mediaPromises.push(AdMedia.create(mediaInfo, { transaction }));
    }
  }

  // min size 파일 처리
  if (files.minFiles) {
    for (const file of files.minFiles) {
      const fileUrl = await storage.uploadFile(file, STORAGE_PATHS.ADS, adId.toString());
      const mediaInfo = await createMediaInfo(file, fileUrl, adId, 'min');
      mediaPromises.push(AdMedia.create(mediaInfo, { transaction }));
    }
  }

  return Promise.all(mediaPromises);
}

/**
 * 미용실 광고 미디어 파일 처리
 */
async function processSalonAdMedia(files, adId, salonId, transaction) {
  const mediaPromises = [];

  if (files && files.files) {
    for (const [index, file] of files.files.entries()) {
      const fileUrl = await storage.uploadFile(
        file, 
        STORAGE_PATHS.ADS, 
        `salon_${salonId}`
      );
      
      const mediaInfo = await createMediaInfo(
        file, 
        fileUrl, 
        adId, 
        'min',
        index === 0  // 첫 번째 파일을 대표 이미지로 설정
      );
      
      mediaPromises.push(AdMedia.create(mediaInfo, { transaction }));
    }
  }

  return Promise.all(mediaPromises);
}

/**
 * 광고 정보 포맷팅
 */
function formatAdResponse(ad) {
  return {
    id: ad.id,
    title: ad.title,
    type: ad.type,
    salon_id: ad.salon_id,
    media: ad.media.map(m => ({
      url: m.url,
      type: m.type,
      duration: m.duration,
      size: m.size,
      is_primary: m.is_primary
    })),
    ...(ad.schedules && { schedules: ad.schedules })
  };
}

/**
 * 광고 스케줄 업데이트
 */
async function updateAdSchedules(adId, schedules, transaction) {
  // 기존 스케줄 비활성화
  await AdSchedule.update(
    { is_active: false },
    { 
      where: { ad_id: adId },
      transaction 
    }
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
 * 광고 미디어 업데이트
 */
async function updateAdMedia(adId, files, transaction) {
  // 기존 미디어 삭제
  await AdMedia.destroy({
    where: { ad_id: adId },
    transaction
  });

  // 새로운 미디어 처리
  return processSponsorAdMedia(files, adId, transaction);
}

/**
 * 광고 정보 조회
 */
async function getAdDetails(adId) {
  return Ad.findByPk(adId, {
    include: [{
      model: AdMedia,
      as: 'media',
      attributes: ['url', 'type', 'duration', 'size', 'is_primary']
    }]
  });
}

module.exports = {
  processSponsorAdMedia,
  processSalonAdMedia,
  formatAdResponse,
  updateAdSchedules,
  updateAdMedia,
  getAdDetails
};