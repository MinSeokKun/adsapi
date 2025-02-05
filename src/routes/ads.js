const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { Ad, AdCategory, AdSchedule } = require('../models');

router.get('/api/ads', async (req, res) => {
  try {
    const { category, time } = req.query;
    console.log('요청된 카테고리:', category);
    console.log('요청된 시간:', time);

    // 기본 쿼리 설정
    const queryOptions = {
      include: [
        {
          model: AdCategory,
          where: { name: category }
        }
      ],
      where: {
        is_active: true
      },
      logging: console.log
    };

    // time 파라미터가 있는 경우 스케줄 조건 추가
    if (time) {
      queryOptions.include.push({
        model: AdSchedule,
        where: {
          time: time + ':00:00', // HH:mm:ss 형식으로 변환
          is_active: true
        },
        required: true // INNER JOIN 사용
      });
    }

    const ads = await Ad.findAll(queryOptions);

    res.json({ 
      ads: ads.map(ad => ({
        id: ad.id,
        type: ad.type,
        url: ad.url,
        duration: ad.duration,
        scheduledTime: time // 요청된 시간 포함
      }))
    });

  } catch (error) {
    console.error('광고 조회 실패:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/api/ads/list', async (req, res) => {
  try {
    const ads = await Ad.findAll({
      where: {
        is_active: true
      }
    });

    res.json({ ads });
  } catch (error) {
    console.error('광고 목록 조회 실패:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

router.post('/api/ads', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      title,
      type,
      url,
      duration,
      // categoryId,
      category,
      schedules  // 선택된 시간들의 배열 ["10:00", "11:00", "13:00"]
    } = req.body;

    // 1. 카테고리 조회 또는 생성
    let adCategory = await AdCategory.findOne({ 
      where: { name: category },
      transaction 
    });

    if (!adCategory) {
      // 카테고리가 없으면 새로 생성
      adCategory = await AdCategory.create({
        name: category,
        description: `${category} 카테고리`
      }, { transaction });
    }

    
    // 2. 광고 기본 정보 저장
    const ad = await Ad.create({
      title,
      type,
      url,
      duration,
      ad_category_id: adCategory.id,
      is_active: true
    }, { transaction });

    // 3. 선택된 시간들에 대한 스케줄 생성
    const schedulePromises = schedules.map(time => 
      AdSchedule.create({
        ad_id: ad.id,
        time: time + ':00:00', // HH:mm:ss 형식으로 저장
        is_active: true
      }, { transaction })
    );

    await Promise.all(schedulePromises);
    await transaction.commit();

    res.status(201).json({ 
      message: '광고가 성공적으로 저장되었습니다',
      ad: {
        id: ad.id,
        title: ad.title,
        type: ad.type,
        url: ad.url,
        duration: ad.duration,
        schedules: schedules
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('광고 저장 실패:', error);
    
    res.status(500).json({ 
      error: '광고 저장 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 광고 수정을 위한 PUT 엔드포인트
router.put('/api/ads/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { 
      title,
      type,
      url,
      duration,
      category,
      // categoryId,
      schedules,
      is_active
    } = req.body;

    // 1. 카테고리 조회 또는 생성
    let adCategory = await AdCategory.findOne({ 
      where: { name: category },
      transaction 
    });

    if (!adCategory) {
      // 카테고리가 없으면 새로 생성
      adCategory = await AdCategory.create({
        name: category,
        description: `${category} 카테고리`
      }, { transaction });
    }
    
    // 2. 광고 기본 정보 업데이트
    const ad = await Ad.findByPk(id);
    if (!ad) {
      return res.status(404).json({ error: '광고를 찾을 수 없습니다' });
    }

    await ad.update({
      title,
      type,
      url,
      duration,
      ad_category_id: adCategory.id,
      is_active
    }, { transaction });

    // 3. 기존 스케줄 비활성화
    await AdSchedule.update(
      { is_active: false },
      { 
        where: { ad_id: id },
        transaction 
      }
    );

    // 4. 새로운 스케줄 생성
    const schedulePromises = schedules.map(time => 
      AdSchedule.create({
        ad_id: id,
        time: time + ':00:00',
        is_active: true
      }, { transaction })
    );

    await Promise.all(schedulePromises);
    await transaction.commit();

    res.json({ 
      message: '광고가 성공적으로 수정되었습니다',
      ad: {
        id: ad.id,
        title: ad.title,
        type: ad.type,
        url: ad.url,
        duration: ad.duration,
        schedules: schedules
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('광고 수정 실패:', error);
    
    res.status(500).json({ 
      error: '광고 수정 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

router.post('/api/ads/bulk', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      selectedTime,  // "13"
      adGroups      // 2차원 배열 데이터
    } = req.body;

    // 광고 그룹별로 처리
    const createPromises = adGroups.map(async (group, index) => {
      const [maxImage, minImage] = group;
      
      // 1. 메인 이미지 광고 생성
      const mainAd = await Ad.create({
        title: `광고 그룹 ${index + 1} - 메인`,
        type: 'image',
        url: maxImage,
        duration: 30, // 기본 재생시간
        is_active: true
      }, { transaction });

      // 2. 썸네일 이미지 광고 생성
      const thumbnailAd = await Ad.create({
        title: `광고 그룹 ${index + 1} - 썸네일`,
        type: 'image',
        url: minImage,
        duration: 30,
        is_active: true
      }, { transaction });

      // 3. 선택된 시간에 대한 스케줄 생성
      await AdSchedule.create({
        ad_id: mainAd.id,
        time: selectedTime + ':00:00',
        is_active: true
      }, { transaction });

      await AdSchedule.create({
        ad_id: thumbnailAd.id,
        time: selectedTime + ':00:00',
        is_active: true
      }, { transaction });

      return [mainAd, thumbnailAd];
    });

    const createdAds = await Promise.all(createPromises);
    await transaction.commit();

    res.status(201).json({ 
      message: '광고가 성공적으로 저장되었습니다',
      ads: createdAds.flat().map(ad => ({
        id: ad.id,
        title: ad.title,
        url: ad.url,
        scheduledTime: selectedTime
      }))
    });

  } catch (error) {
    await transaction.rollback();
    console.error('광고 저장 실패:', error);
    
    res.status(500).json({ 
      error: '광고 저장 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 특정 시간대의 광고 그룹 조회
router.get('/api/ads/groups', async (req, res) => {
  try {
    const { time } = req.query;

    const ads = await Ad.findAll({
      include: [{
        model: AdSchedule,
        where: {
          time: time + ':00:00',
          is_active: true
        }
      }],
      where: {
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    // URL 기준으로 max/min 이미지 그룹화
    const groupedAds = [];
    const processedUrls = new Set();

    ads.forEach(ad => {
      if (processedUrls.has(ad.url)) return;
      
      const isMax = ad.url.includes('-max');
      const pairedUrl = isMax ? 
        ad.url.replace('-max', '-min') : 
        ad.url.replace('-min', '-max');
      
      const pairedAd = ads.find(a => a.url === pairedUrl);
      
      if (pairedAd) {
        groupedAds.push({
          maxImage: isMax ? ad.url : pairedUrl,
          minImage: isMax ? pairedUrl : ad.url,
          scheduledTime: time
        });
        
        processedUrls.add(ad.url);
        processedUrls.add(pairedUrl);
      }
    });

    res.json({ adGroups: groupedAds });

  } catch (error) {
    console.error('광고 그룹 조회 실패:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});


module.exports = router;