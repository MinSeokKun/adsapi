// src/services/adStatusService.js
const { Ad, AdCampaign } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');

class AdStatusService {
  /**
   * 모든 광고의 상태를 업데이트합니다
   * 이 함수는 스케줄러에 의해 정기적으로 호출됩니다
   */
  async updateAllAdStatuses() {
    const logContext = {
      action: 'updateAllAdStatuses',
      timestamp: new Date().toISOString()
    };
    
    try {
      logger.info('광고 상태 일괄 업데이트 시작', sanitizeData(logContext));
      
      const now = new Date();
      
      // 캠페인이 있는 모든 광고 조회
      const adsWithCampaigns = await Ad.findAll({
        include: [{
          model: AdCampaign,
          required: true
        }]
      });
      
      // 캠페인이 없는 모든 광고 조회
      const adsWithoutCampaigns = await Ad.findAll({
        include: [{
          model: AdCampaign,
          required: false,
          where: { id: null }
        }]
      });
      
      let updatedCount = 0;
      
      // 캠페인이 있는 광고 상태 업데이트
      for (const ad of adsWithCampaigns) {
        const campaign = ad.AdCampaign;
        let newStatus;
        
        // 상태 결정 로직
        if (ad.status === 'paused') {
          // 일시중지 상태는 수동으로 설정된 것이므로 변경하지 않음
          continue;
        } else if (now < new Date(campaign.start_date)) {
          newStatus = 'pending';
        } else if (now >= new Date(campaign.start_date) && now <= new Date(campaign.end_date)) {
          newStatus = 'active';
        } else {
          newStatus = 'inactive';
        }
        
        // 상태가 변경된 경우만 업데이트
        if (ad.status !== newStatus) {
          await ad.update({ status: newStatus });
          updatedCount++;
          
          logger.info('광고 상태 업데이트', sanitizeData({
            ...logContext,
            adId: ad.id,
            oldStatus: ad.status,
            newStatus,
            campaignId: campaign.id
          }));
        }
      }
      
      // 캠페인이 없는 광고는 모두 inactive로 설정
      for (const ad of adsWithoutCampaigns) {
        if (ad.status !== 'inactive') {
          await ad.update({ status: 'inactive' });
          updatedCount++;
          
          logger.info('캠페인 없는 광고 상태 업데이트', sanitizeData({
            ...logContext,
            adId: ad.id,
            oldStatus: ad.status,
            newStatus: 'inactive'
          }));
        }
      }
      
      logger.info('광고 상태 일괄 업데이트 완료', sanitizeData({
        ...logContext,
        totalProcessed: adsWithCampaigns.length + adsWithoutCampaigns.length,
        updatedCount
      }));
      
      return {
        totalProcessed: adsWithCampaigns.length + adsWithoutCampaigns.length,
        updatedCount
      };
    } catch (error) {
      logger.error('광고 상태 업데이트 중 오류 발생', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      throw error;
    }
  }
  
  /**
   * 개별 광고의 상태를 업데이트합니다
   * 이 함수는 캠페인 변경 시 호출될 수 있습니다
   */
  async updateAdStatus(adId) {
    const logContext = {
      action: 'updateAdStatus',
      adId,
      timestamp: new Date().toISOString()
    };
    
    try {
      const ad = await Ad.findByPk(adId, {
        include: [{ model: AdCampaign }]
      });
      
      if (!ad) {
        logger.warn('광고 상태 업데이트 실패 - 광고를 찾을 수 없음', sanitizeData(logContext));
        throw new Error('광고를 찾을 수 없습니다');
      }
      
      // 광고가 수동으로 일시중지 상태로 설정된 경우 변경하지 않음
      if (ad.status === 'paused') {
        return ad;
      }
      
      const campaign = ad.AdCampaign;
      let newStatus;
      
      if (!campaign) {
        newStatus = 'inactive';
      } else {
        const now = new Date();
        
        if (now < new Date(campaign.start_date)) {
          newStatus = 'pending';
        } else if (now >= new Date(campaign.start_date) && now <= new Date(campaign.end_date)) {
          newStatus = 'active';
        } else {
          newStatus = 'inactive';
        }
      }
      
      // 상태 변경이 있는 경우만 업데이트
      if (ad.status !== newStatus) {
        logger.info('광고 상태 업데이트', sanitizeData({
          ...logContext,
          oldStatus: ad.status,
          newStatus
        }));
        
        await ad.update({ status: newStatus });
      }
      
      return ad;
    } catch (error) {
      logger.error('개별 광고 상태 업데이트 중 오류 발생', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      throw error;
    }
  }
  
  /**
   * 광고 상태를 수동으로 변경합니다
   * paused 상태는 이 함수로만 설정 가능합니다
   */
  async manuallyUpdateAdStatus(adId, status) {
    const logContext = {
      action: 'manuallyUpdateAdStatus',
      adId,
      status,
      timestamp: new Date().toISOString()
    };
    
    try {
      const ad = await Ad.findByPk(adId);
      
      if (!ad) {
        logger.warn('광고 상태 수동 업데이트 실패 - 광고를 찾을 수 없음', sanitizeData(logContext));
        throw new Error('광고를 찾을 수 없습니다');
      }
      
      // 유효한 상태 확인
      const validStatuses = ['active', 'pending', 'paused', 'inactive'];
      if (!validStatuses.includes(status)) {
        logger.warn('광고 상태 수동 업데이트 실패 - 유효하지 않은 상태', sanitizeData(logContext));
        throw new Error('유효하지 않은 상태입니다');
      }
      
      logger.info('광고 상태 수동 업데이트', sanitizeData({
        ...logContext,
        oldStatus: ad.status
      }));
      
      await ad.update({ status });
      return ad;
    } catch (error) {
      logger.error('광고 상태 수동 업데이트 중 오류 발생', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      throw error;
    }
  }
}

module.exports = new AdStatusService();