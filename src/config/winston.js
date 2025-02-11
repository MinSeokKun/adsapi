const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

// 로그 디렉토리 설정
const logDir = path.join(__dirname, '../', '../', 'logs');

// 로그 레벨 정의
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// 로그 레벨 색상 정의
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
}

winston.addColors(colors);

// 로그 포맷 정의
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(), // 메타데이터 추가
  winston.format.json()
);

// 로거 생성
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format: logFormat,
  transports: [
    // error 레벨 로그는 error.log 파일에 작성
    new winston.transports.DailyRotateFile({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: path.join(logDir, 'error'),
      filename: 'error-%DATE%.log',
      maxFiles: '30d',
      maxSize: '20m',
      zippedArchive: true,
      createSymlink: true,  // 심볼릭 링크 생성
      auditFile: 'audit.json',  // 로그 파일 감사 기록
    }),
    // 모든 레벨 로그는 combined.log 파일에 작성
    new winston.transports.DailyRotateFile({
      datePattern: 'YYYY-MM-DD',
      dirname: path.join(logDir, 'combined'),
      filename: 'combined-%DATE%.log',
      maxFiles: '30d',
      maxSize: '20m',
      zippedArchive: true,
      createSymlink: true,  // 심볼릭 링크 생성
      auditFile: 'audit.json',  // 로그 파일 감사 기록
    }),
  ],
});

// 개발 환경에서는 콘솔에도 출력
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    })
  );
}

module.exports = logger;