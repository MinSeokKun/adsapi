// src/middleware/uploadMiddleware.js
const multer = require('multer');

const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif'],
  VIDEO: ['video/mp4'],
  get ALL() {
    return [...this.IMAGE, ...this.VIDEO];
  }
};

const FILE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,     // 5MB
  VIDEO: 100 * 1024 * 1024,   // 100MB for videos
  PROFILE: 5 * 1024 * 1024,   // 5MB for profile images
  get MAX() {
    return Math.max(this.IMAGE, this.VIDEO);
  }
};

/**
 * 파일 타입별 크기 제한 체크
 */
function checkFileSize(file) {
  const maxSize = ALLOWED_FILE_TYPES.IMAGE.includes(file.mimetype)
    ? FILE_LIMITS.IMAGE
    : FILE_LIMITS.VIDEO;

  if (file.size > maxSize) {
    const sizeInMB = maxSize / (1024 * 1024);
    throw new multer.MulterError(
      'LIMIT_FILE_SIZE',
      `${file.mimetype.includes('video') ? '비디오' : '이미지'} 파일은 ${sizeInMB}MB를 초과할 수 없습니다.`
    );
  }
  return true;
}

/**
 * 이미지 파일만 허용하는 필터 (프로필 이미지용)
 */
function imageOnlyFilter(req, file, cb) {
  if (ALLOWED_FILE_TYPES.IMAGE.includes(file.mimetype)) {
    try {
      // 프로필 이미지는 5MB 제한
      if (file.size > FILE_LIMITS.PROFILE) {
        cb(new multer.MulterError(
          'LIMIT_FILE_SIZE',
          `프로필 이미지는 ${FILE_LIMITS.PROFILE / (1024 * 1024)}MB를 초과할 수 없습니다.`
        ), false);
      } else {
        cb(null, true);
      }
    } catch (err) {
      cb(err, false);
    }
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
  }
}

function validateFileType(file, cb) {
  if (ALLOWED_FILE_TYPES.ALL.includes(file.mimetype)) {
    try {
      checkFileSize(file);
      cb(null, true);
    } catch (err) {
      cb(err, false);
    }
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다.'), false);
  }
}

const multerConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_LIMITS.DEFAULT
  },
  fileFilter: (req, file, cb) => validateFileType(file, cb)
};

// 기본 설정을 사용한 단일 이미지 업로드 미들웨어 (프로필 이미지)
const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_LIMITS.PROFILE
  },
  fileFilter: imageOnlyFilter
}).single('profileImage');

// 스폰서 광고용 업로드 미들웨어 (max, min 파일 분리)
const sponsorAdUpload = multer(multerConfig).fields([
  { name: 'maxFiles', maxCount: 10 },
  { name: 'minFiles', maxCount: 10 }
]);

// 미용실 광고용 업로드 미들웨어 (단일 필드)
const salonAdUpload = multer(multerConfig).fields([
  { name: 'files', maxCount: 5 }  // 미용실 광고는 최대 5개 파일로 제한
]);

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: '파일 크기가 제한을 초과했습니다.',
        details: err.message || `최대 ${FILE_LIMITS.DEFAULT / (1024 * 1024)}MB까지 업로드 가능합니다.`
      });
    }
    return res.status(400).json({ error: err.message });
  }
  
  res.status(400).json({ error: err.message });
};

module.exports = {
  ALLOWED_FILE_TYPES,
  FILE_LIMITS,
  sponsorAdUpload,
  salonAdUpload,
  profileImageUpload,
  handleUploadError
};