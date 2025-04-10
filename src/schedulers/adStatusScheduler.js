// src/schedulers/adStatusScheduler.js
const cron = require('node-cron');
const adStatusService = require('../services/adStatusService');
const logger = require('../config/winston');

// 매 시간마다 실행 (실제 요구사항에 따라 주기 조정)
cron.schedule('0 * * * *', async () => {
  try {
    logger.info('광고 상태 업데이트 스케줄러 시작');
    
    const result = await adStatusService.updateAllAdStatuses();
    
    logger.info('광고 상태 업데이트 스케줄러 완료', {
      totalProcessed: result.totalProcessed,
      updatedCount: result.updatedCount
    });
  } catch (error) {
    logger.error('광고 상태 업데이트 스케줄러 실패', {
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    });
  }
});

// 애플리케이션 시작 시 한 번 실행
setTimeout(async () => {
  try {
    logger.info('애플리케이션 시작 시 광고 상태 업데이트 시작');
    
    const result = await adStatusService.updateAllAdStatuses();
    
    logger.info('애플리케이션 시작 시 광고 상태 업데이트 완료', {
      totalProcessed: result.totalProcessed,
      updatedCount: result.updatedCount
    });
  } catch (error) {
    logger.error('애플리케이션 시작 시 광고 상태 업데이트 실패', {
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    });
  }
}, 5000); // 애플리케이션 초기화 후 5초 후에 실행

module.exports = {
  // 스케줄러를 외부에서 제어할 수 있는 함수를 추가할 수 있습니다
  start: () => {
    // 스케줄러 시작 로직
  },
  stop: () => {
    // 스케줄러 중지 로직
  }
};