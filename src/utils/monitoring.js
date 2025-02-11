const logger = require('../config/winston');

class Monitor {
  constructor() {
    this.errorCount = 0;
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.alertThreshold = 10; // 분당 에러 임계값
    
    // 매 분마다 카운터 초기화
    setInterval(() => this.resetCounters(), 60000);
  }

  // 에러 카운트 증가 및 알림
  trackError(error) {
    this.errorCount++;
    
    if (this.errorCount >= this.alertThreshold) {
      this.sendAlert('error_threshold_exceeded', {
        message: '분당 에러 횟수가 임계값을 초과했습니다',
        count: this.errorCount,
        threshold: this.alertThreshold
      });
    }
  }

  // 요청 추적
  trackRequest(req, duration) {
    this.requestCount++;
    
    // 느린 요청 감지 (1초 이상)
    if (duration > 1000) {
      this.sendAlert('slow_request', {
        path: req.path,
        method: req.method,
        duration: duration,
        requestId: req.id
      });
    }
  }

  // 카운터 초기화
  resetCounters() {
    this.errorCount = 0;
    this.requestCount = 0;
    this.lastResetTime = Date.now();
  }

  // 알림 전송
  sendAlert(type, data) {
    logger.warn('Monitor Alert', {
      type,
      timestamp: new Date().toISOString(),
      ...data
    });

    // 여기에 실제 알림 로직 추가 (이메일, 슬랙 등)
  }
}

module.exports = new Monitor();