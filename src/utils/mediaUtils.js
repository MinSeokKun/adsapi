// src/utils/mediaUtils.js
const { getVideoDurationInSeconds } = require('get-video-duration');
const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);

/**
 * 미디어 파일의 재생 시간을 추출하는 유틸리티 함수
 * 동영상: 실제 재생 시간
 * 이미지: 기본값 30초
 * 
 * @param {Object} file - multer 또는 유사한 미들웨어가 제공하는 파일 객체
 * @param {string} file.mimetype - 파일의 MIME 타입
 * @param {Buffer} file.buffer - 파일의 버퍼
 * @param {string} [file.filename] - 파일의 이름 (옵션)
 * @returns {Promise<number>} 미디어 재생 시간 (초)
 */
async function getMediaDuration(file) {
  // 동영상 파일인 경우
  if (file.mimetype.startsWith('video/')) {
    try {
      // 임시 파일 경로 생성
      const tempPath = `/tmp/${file.filename || Date.now()}.tmp`;
      
      // 버퍼를 임시 파일로 저장
      await writeFile(tempPath, file.buffer);
      
      try {
        // 동영상 길이 추출
        const durationInSeconds = await getVideoDurationInSeconds(tempPath);
        return Math.round(durationInSeconds);
      } finally {
        // 임시 파일 삭제 (에러가 발생하더라도 실행)
        await unlink(tempPath).catch(console.error);
      }
    } catch (error) {
      console.error('동영상 길이 추출 실패:', error);
      return 30; // 실패시 기본값 반환
    }
  }
  
  // 이미지 파일인 경우 기본값 반환
  return 30;
}

/**
 * 파일의 MIME 타입을 기반으로 미디어 타입을 반환하는 함수
 * 
 * @param {string} mimetype - 파일의 MIME 타입
 * @returns {'image' | 'video'} 미디어 타입
 */
function getMediaType(mimetype) {
  return mimetype.startsWith('image/') ? 'image' : 'video';
}

/**
 * 미디어 파일 정보를 생성하는 함수
 * 
 * @param {Object} file - 파일 객체
 * @param {string} fileUrl - 업로드된 파일의 URL
 * @param {number} adId - 광고 ID
 * @param {string} size - 미디어 크기 ('min' | 'max')
 * @param {boolean} [isPrimary=false] - 대표 이미지 여부
 * @returns {Promise<Object>} 미디어 정보 객체
 */
async function createMediaInfo(file, fileUrl, adId, size, isPrimary = false) {
  const duration = await getMediaDuration(file);
  
  return {
    ad_id: adId,
    url: fileUrl,
    type: getMediaType(file.mimetype),
    duration,
    size,
    is_primary: isPrimary
  };
}

module.exports = {
  getMediaDuration,
  getMediaType,
  createMediaInfo
};