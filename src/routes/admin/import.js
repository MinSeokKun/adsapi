// src/routes/admin/import.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken, isSuperAdmin } = require('../../middleware/auth');
const importController = require('../../controllers/importController');
const rateLimit = require('express-rate-limit');

// 메모리에 파일 임시 저장 (파일 시스템에 쓰지 않음)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
    files: 1 // 파일 1개만 허용
  },
  fileFilter: (req, file, cb) => {
    // CSV 파일만 허용
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('CSV 파일만 업로드할 수 있습니다.'), false);
    }
  }
});

// 가져오기 작업에 대한 속도 제한 설정
const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // IP당 최대 요청 수
  message: '너무 많은 가져오기 요청이 발생했습니다. 15분 후에 다시 시도해주세요.'
});

// CSV 가이드라인 제공 API
router.get(
  '/api/admin/import/guide/:dataType',
  verifyToken,
  isSuperAdmin,
  importController.getCsvGuide
);

// 사용자 데이터 가져오기 API
router.post(
  '/api/admin/import/users',
  verifyToken,
  isSuperAdmin,
  importLimiter,
  upload.single('csv'),
  (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV 파일이 제공되지 않았습니다.'
      });
    }
    next();
  },
  importController.importUsers
);

// 미용실 데이터 가져오기 API
router.post(
  '/api/admin/import/salons',
  verifyToken,
  isSuperAdmin,
  importLimiter,
  upload.single('csv'),
  (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV 파일이 제공되지 않았습니다.'
      });
    }
    next();
  },
  importController.importSalons
);

// CSV 업로드 오류 처리 미들웨어
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '파일 크기는 10MB를 초과할 수 없습니다.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `파일 업로드 오류: ${err.message}`
    });
  }
  
  if (err.message.includes('CSV')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next(err);
});

module.exports = router;