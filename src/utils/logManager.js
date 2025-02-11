const fs = require('fs').promises;
const path = require('path');
const logger = require('../config/winston');

class LogManager {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
  }

  // 로그 레벨 동적 변경
  setLogLevel(level) {
    if (['error', 'warn', 'info', 'http', 'debug'].includes(level)) {
      logger.level = level;
      return true;
    }
    return false;
  }

  // 최근 로그 파일 목록 조회
  async getLogFiles() {
    try {
      const [errorLogs, combinedLogs] = await Promise.all([
        fs.readdir(path.join(this.logDir, 'error')),
        fs.readdir(path.join(this.logDir, 'combined'))
      ]);

      return {
        errorLogs: errorLogs.filter(file => file.endsWith('.log')),
        combinedLogs: combinedLogs.filter(file => file.endsWith('.log'))
      };
    } catch (error) {
      logger.error('로그 파일 목록 조회 실패', { error });
      throw error;
    }
  }

  // 오래된 로그 파일 정리 (예: 30일 이상된 로그)
  async cleanOldLogs(days = 30) {
    try {
      const now = Date.now();
      const maxAge = days * 24 * 60 * 60 * 1000;

      const cleanDirectory = async (dirPath) => {
        const files = await fs.readdir(dirPath);
        
        for (const file of files) {
          if (!file.endsWith('.log')) continue;
          
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            logger.info('오래된 로그 파일 삭제', { file });
          }
        }
      };

      await Promise.all([
        cleanDirectory(path.join(this.logDir, 'error')),
        cleanDirectory(path.join(this.logDir, 'combined'))
      ]);

      return true;
    } catch (error) {
      logger.error('로그 정리 중 오류 발생', { error });
      throw error;
    }
  }

  // 특정 requestId로 로그 검색
  async findLogsByRequestId(requestId, date) {
    try {
      const logFile = path.join(
        this.logDir, 
        'combined', 
        `combined-${date}.log`
      );

      const content = await fs.readFile(logFile, 'utf8');
      const logs = content
        .split('\n')
        .filter(line => line)
        .map(line => JSON.parse(line))
        .filter(log => log.requestId === requestId);

      return logs;
    } catch (error) {
      logger.error('로그 검색 중 오류 발생', { error, requestId });
      throw error;
    }
  }

  // 향상된 로그 검색 기능
  async findLogs({ requestId, userId, errorType, startDate, endDate, level, limit = 100 }) {
    try {
      // 날짜 범위에 해당하는 로그 파일 목록 가져오기
      const logFiles = await this.getLogFilesInRange(startDate, endDate);
      let results = [];

      for (const file of logFiles) {
        const content = await fs.readFile(file, 'utf8');
        const logs = content
          .split('\n')
          .filter(line => line)
          .map(line => {
            try {
              return JSON.parse(line);
            } catch (e) {
              logger.warn('Invalid log line format', { line });
              return null;
            }
          })
          .filter(log => log !== null);

        // 필터 조건 적용
        const filteredLogs = logs.filter(log => {
          let matches = true;

          // requestId 필터
          if (requestId && log.requestId !== requestId) {
            matches = false;
          }

          // userId 필터
          if (userId && log.userId !== userId) {
            matches = false;
          }

          // errorType 필터
          if (errorType && (!log.error || log.error.name !== errorType)) {
            matches = false;
          }

          // 로그 레벨 필터
          if (level && log.level !== level) {
            matches = false;
          }

          // 타임스탬프 범위 필터
          const logDate = new Date(log.timestamp);
          if (startDate && logDate < new Date(startDate)) {
            matches = false;
          }
          if (endDate && logDate > new Date(endDate)) {
            matches = false;
          }

          return matches;
        });

        results = results.concat(filteredLogs);
      }

      // 결과 정렬 및 제한
      results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      results = results.slice(0, limit);

      return {
        total: results.length,
        logs: results
      };
    } catch (error) {
      logger.error('로그 검색 중 오류 발생', { error });
      throw error;
    }
  }

  // 날짜 범위에 해당하는 로그 파일 목록 가져오기
  async getLogFilesInRange(startDate, endDate) {
    const files = [];
    const dirs = ['combined', 'error'];
    
    for (const dir of dirs) {
      const dirPath = path.join(this.logDir, dir);
      const dirFiles = await fs.readdir(dirPath);
      
      for (const file of dirFiles) {
        if (!file.endsWith('.log')) continue;
        
        // 파일명에서 날짜 추출 (예: combined-2024-02-11.log)
        const fileDate = file.match(/\d{4}-\d{2}-\d{2}/)?.[0];
        if (!fileDate) continue;

        if ((!startDate || fileDate >= startDate) && 
            (!endDate || fileDate <= endDate)) {
          files.push(path.join(dirPath, file));
        }
      }
    }

    return files;
  }

  // 로그 통계 생성
  async getLogStats({ startDate, endDate }) {
    const logs = await this.findLogs({ startDate, endDate });
    
    return {
      totalLogs: logs.total,
      byLevel: logs.logs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {}),
      byErrorType: logs.logs
        .filter(log => log.error)
        .reduce((acc, log) => {
          acc[log.error.name] = (acc[log.error.name] || 0) + 1;
          return acc;
        }, {}),
      averageResponseTime: logs.logs
        .filter(log => log.duration)
        .reduce((acc, log) => acc + parseFloat(log.duration), 0) / 
        logs.logs.filter(log => log.duration).length
    };
  }
  
}

module.exports = new LogManager();