'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 1. 현재 존재하는 모든 활성 광고 ID 조회
      const ads = await queryInterface.sequelize.query(
        `SELECT id FROM ads WHERE is_active = true`,
        {
          type: Sequelize.QueryTypes.SELECT
        }
      );

      // 2. 각 광고에 대해 nationwide 타입의 location 레코드 생성
      const now = new Date();
      const locationRecords = ads.map(ad => ({
        ad_id: ad.id,
        target_type: 'nationwide',
        created_at: now,
        updated_at: now
      }));

      // 3. bulk insert 실행
      if (locationRecords.length > 0) {
        await queryInterface.bulkInsert('ad_locations', locationRecords);
        console.log(`Created nationwide targeting for ${locationRecords.length} existing ads`);
      }

    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // 1. 현재 존재하는 모든 활성 광고 ID 조회
      const ads = await queryInterface.sequelize.query(
        `SELECT id FROM ads WHERE is_active = true`,
        {
          type: Sequelize.QueryTypes.SELECT
        }
      );

      // 2. 해당 광고들의 location 레코드 삭제
      if (ads.length > 0) {
        const adIds = ads.map(ad => ad.id);
        await queryInterface.bulkDelete('ad_locations', {
          ad_id: {
            [Sequelize.Op.in]: adIds
          }
        });
        console.log(`Removed targeting data for ${adIds.length} ads`);
      }

    } catch (error) {
      console.error('Error in migration rollback:', error);
      throw error;
    }
  }
};