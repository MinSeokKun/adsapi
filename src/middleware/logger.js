const { v4: uuidv4 } = require('uuid');
const logger = require('../config/winston');
const { sanitizeRequest, sanitizeData } = require('../utils/sanitizer');
const monitor = require('../utils/monitoring');

const requestLogger = (req, res, next) => {
  req.id = uuidv4();
  const start = process.hrtime();

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000;

    monitor.trackRequest(req, duration);

    // 요청 정보 필터링
    const sanitizedReq = sanitizeRequest(req);

    const logInfo = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      request: sanitizedReq,
      userId: req.user?.id,
    };

    if (res.statusCode >= 500) {
      logger.error('Server Error', logInfo);
    } else if (res.statusCode >= 400) {
      logger.warn('Client Error', logInfo);
    } else {
      logger.info('Request completed', logInfo);
    }
  });

  next();
};

const errorLogger = (err, req, res, next) => {
  monitor.trackError(err);
  
  const sanitizedReq = sanitizeRequest(req);
  
  const logInfo = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    request: sanitizedReq,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    },
    userId: req.user?.id,
  };

  logger.error('Unhandled error occurred', sanitizeData(logInfo));

  res.status(500).json({
    error: '서버 오류가 발생했습니다',
    requestId: req.id
  });
};

module.exports = {
  requestLogger,
  errorLogger
};