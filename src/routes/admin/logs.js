const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const logManager = require('../../utils/logManager');
const { verifyToken, isSuperAdmin } = require('../../middleware/auth');
const logger = require('../../config/winston');
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 최대 요청 수
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
});

// 비동기 에러 핸들링을 위한 래퍼 함수
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 로그 파일 목록 조회
router.get('/api/logs/files', 
  verifyToken, isSuperAdmin, apiLimiter,
  asyncHandler(async (req, res) => {
    const files = await logManager.getLogFiles();
    res.json({
      success: true,
      data: files
    });
  })
);
  
// 로그 레벨 변경
router.post('/api/logs/level',
  verifyToken, isSuperAdmin,
  apiLimiter,
  body('level').isIn(['error', 'warn', 'info', 'http', 'debug']),
  asyncHandler(async (req, res) => {
    const success = logManager.setLogLevel(req.body.level);
    
    if (!success) {
      return res.status(400).json({
        error: '로그 레벨 변경에 실패했습니다.'
      });
    }

    logger.info('로그 레벨이 변경되었습니다.', {
      level: req.body.level,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: '로그 레벨이 변경되었습니다.'
    });
  })
);

// 로그 검색
router.get('/api/logs/search',
  verifyToken, isSuperAdmin,
  apiLimiter,
  query('requestId').isString().trim().notEmpty(),
  query('date').isDate(),
  asyncHandler(async (req, res) => {
    const { requestId, date } = req.query;

    const logs = await logManager.findLogsByRequestId(requestId, date);
    
    if (!logs || logs.length === 0) {
      return res.status(404).json({
        error: '해당 요청에 대한 로그를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: logs
    });
  })
);

router.get('/api/logs/content',
  verifyToken, isSuperAdmin,
  apiLimiter,
  query('file').isString().notEmpty(),
  query('type').isIn(['error', 'combined']),
  asyncHandler(async (req, res) => {
    const { file, type } = req.query;
    const logDir = path.join(__dirname, '../../logs', type);
    const logPath = path.join(logDir, file);

    // 경로 검증 (directory traversal 방지)
    if (!logPath.startsWith(logDir)) {
      return res.status(400).json({
        error: '잘못된 파일 경로입니다.'
      });
    }

    try {
      const content = await fs.readFile(logPath, 'utf8');
      const logs = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return { message: line };
          }
        });

      res.json({
        success: true,
        content: logs
      });
    } catch (error) {
      logger.error('로그 파일 읽기 실패', { error, file });
      res.status(500).json({
        error: '로그 파일을 읽을 수 없습니다.'
      });
    }
  })
);

// 오래된 로그 정리
router.post('/api/logs/clean',
  verifyToken, isSuperAdmin,
  apiLimiter,
  body('days').optional().isInt({ min: 1, max: 365 }),
  asyncHandler(async (req, res) => {
    const days = req.body.days || 30; // 기본값 30일

    await logManager.cleanOldLogs(days);
    
    logger.info('오래된 로그 파일이 정리되었습니다.', {
      days,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: `${days}일 이상 된 로그 파일이 정리되었습니다.`
    });
  })
);

// 전역 에러 핸들러
router.use((err, req, res, next) => {
  logger.error('로그 API 에러 발생', {
    error: err,
    path: req.path,
    userId: req.user?.id
  });

  res.status(500).json({
    error: '서버 에러가 발생했습니다.',
    requestId: req.id
  });
});

module.exports = router;