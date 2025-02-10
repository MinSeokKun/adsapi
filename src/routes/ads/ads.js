const express = require('express');
const router = express.Router();
const sequelize = require('../../config/database');
const { Ad, AdMedia, AdSchedule } = require('../../models');
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const { sponsorAdUpload, handleUploadError } = require('../../middleware/uploadMiddleware');
const { processSponsorAdMedia, updateAdMedia, updateAdSchedules, getAdDetails, formatAdResponse } = require('../../utils/adUtils');

// 광고 조회
router.get('/api/ads', 
  // verifyToken,
  async (req, res) => {
  try {
    const { time } = req.query;
    console.log('요청된 시간:', time);

    // 기본 쿼리 설정
    const queryOptions = {
      include: [{
        model: AdMedia,
        as: 'media',
        attributes: ['url', 'type', 'duration', 'size', 'is_primary']
      }, {
        model: AdSchedule,
        required: false, // LEFT JOIN
        attributes: ['time']
      }],
      where: {
        is_active: true
      },
      logging: console.log
    };

    // time 파라미터가 있는 경우에만 시간 조건 추가
    if (time) {
      queryOptions.include[1].where.time = time + ':00:00';
      queryOptions.include[1].required = true; // INNER JOIN
    }

    const ads = await Ad.findAll(queryOptions);

    res.json({ 
      ads: ads.map(ad => ({
        id: ad.id,
        title: ad.title,
        media: ad.media.map(media => ({
          url: media.url,
          type: media.type,
          duration: media.duration,
          size: media.size,
          is_primary: media.is_primary
        })),
        schedules: ad.AdSchedules ? 
          ad.AdSchedules.map(schedule => parseInt(schedule.time.split(':')[0])).sort((a, b) => a - b) 
          : null
      }))
    });

  } catch (error) {
    console.error('광고 조회 실패:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});
// 광고 전체 목록 조회 (삭제 할지도)
router.get('/api/ads/list',
  // verifyToken,
  async (req, res) => {
  try {
    const ads = await Ad.findAll({
      include: [{
        model: AdMedia,
        as: 'media',
        attributes: ['url', 'type', 'duration', 'size', 'is_primary']
      }],
      where: {
        is_active: true
      }
    });

    res.json({ 
      ads: ads.map(ad => ({
        id: ad.id,
        title: ad.title,
        media: ad.media.map(media => ({
          url: media.url,
          type: media.type,
          duration: media.duration,
          size: media.size,
          is_primary: media.is_primary
        }))
      }))
    });

  } catch (error) {
    console.error('광고 목록 조회 실패:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 광고 등록
router.post('/api/ads', 
  // verifyToken, 
  // isAdmin, 
  sponsorAdUpload,
  handleUploadError,
  async (req, res) => {
    let transaction;
    
    try {
      transaction = await sequelize.transaction();
      
      const { title, schedules } = req.body;
      const parsedSchedules = parseSchedules(schedules);

      // 1. 광고 기본 정보 저장
      const ad = await Ad.create({
        title,
        is_active: true,
        type: 'sponsor'
      }, { transaction });

      // 2. 미디어 파일 처리
      await processSponsorAdMedia(req.files, ad.id, transaction);
      
      // 3. 스케줄 생성
      const schedulePromises = parsedSchedules.map(time => 
        AdSchedule.create({
          ad_id: ad.id,
          time: time + ':00:00',
          is_active: true
        }, { transaction })
      );
      
      await Promise.all(schedulePromises);
      await transaction.commit();

      // 생성된 광고 정보 조회
      const createdAd = await Ad.findByPk(ad.id, {
        include: [{
          model: AdMedia,
          as: 'media',
          attributes: ['url', 'type', 'duration', 'size', 'is_primary']
        }]
      });

      res.status(201).json({ 
        message: '광고가 성공적으로 저장되었습니다',
        ad: formatAdResponse({ ...createdAd.toJSON(), schedules: parsedSchedules })
      });

    } catch (error) {
      // transaction이 존재하고 완료되지 않은 경우에만 rollback 실행
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error('광고 저장 실패:', error);
      res.status(500).json({ 
        error: '광고 저장 중 오류가 발생했습니다',
        details: error.message 
      });
    }
  }
);

// 광고 수정
router.put('/api/ads/:id', 
  // verifyToken, 
  // isAdmin, 
  sponsorAdUpload,
  handleUploadError,
  async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const { title, is_active, schedules } = req.body;

      // 1. 광고 존재 확인
      const ad = await Ad.findByPk(id);
      if (!ad) {
        return res.status(404).json({ error: '광고를 찾을 수 없습니다' });
      }

      // 2. 광고 기본 정보 업데이트
      await ad.update({ title, is_active }, { transaction });

      // 3. 미디어 파일 업데이트
      if (req.files.maxFiles || req.files.minFiles) {
        await updateAdMedia(id, req.files, transaction);
      }

      // 4. 스케줄 업데이트
      const parsedSchedules = await updateAdSchedules(id, schedules, transaction);

      await transaction.commit();

      // 5. 업데이트된 광고 정보 조회
      const updatedAd = await getAdDetails(id);

      res.json({ 
        message: '광고가 성공적으로 수정되었습니다',
        ad: formatAdResponse({
          ...updatedAd.toJSON(),
          schedules: parsedSchedules
        })
      });

    } catch (error) {
      await transaction.rollback();
      console.error('광고 수정 실패:', error);
      
      res.status(500).json({ 
        error: '광고 수정 중 오류가 발생했습니다',
        details: error.message 
      });
    }
  }
);

// 광고 삭제
router.delete('/api/ads/:id', 
  // verifyToken, 
  // isAdmin, 
  async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findByPk(id);

    if (!ad) {
      return res.status(404).json({ error: '광고를 찾을 수 없습니다' });
    }

    await ad.destroy();
    res.json({ message: '광고가 삭제되었습니다' });

  } catch (error) {
    console.error('광고 삭제 실패:', error);
    res.status(500).json({ error: '광고 삭제 중 오류가 발생했습니다' });
  }
});

// 광고 스케줄 등록 및 수정
router.post('/api/ads/schedule', 
  // verifyToken, 
  // isAdmin, 
  async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const scheduleData = req.body;
    
    // 요청 데이터가 배열인지 검증
    if (!Array.isArray(scheduleData)) {
      return res.status(400).json({ 
        error: '올바른 형식의 데이터가 아닙니다' 
      });
    }

    // 광고 ID 목록 추출
    const adIds = scheduleData.map(item => item.ad_id);

    // 각 광고의 스케줄 처리
    const schedulePromises = scheduleData.flatMap(item => {
      const { ad_id, time } = item;
      
      return [
        // 기존 스케줄 비활성화
        AdSchedule.destroy(
          { 
            where: { ad_id },
            transaction 
          }
        ),
        // 새로운 스케줄 생성
        ...time.map(hour => 
          AdSchedule.create({
            ad_id,
            time: `${hour}:00:00`
          }, { transaction })
        )
      ];
    });

    // 모든 스케줄 업데이트와 생성 실행
    await Promise.all(schedulePromises);
    await transaction.commit();

    // 업데이트된 광고와 스케줄 정보 조회
    const updatedAds = await Ad.findAll({
      where: {
        id: adIds
      },
      include: [
        {
          model: AdMedia,
          as: 'media',
          attributes: ['url', 'type', 'duration', 'size', 'is_primary']
        },
        {
          model: AdSchedule,
          required: false, // LEFT JOIN 사용
          attributes: ['time']
        }
      ]
    });

    // 응답 데이터 포맷팅
    const formattedAds = updatedAds.map(ad => ({
      id: ad.id,
      title: ad.title,
      media: ad.media.map(m => ({
        url: m.url,
        type: m.type,
        duration: m.duration,
        size: m.size,
        is_primary: m.is_primary
      })),
      schedules: ad.AdSchedules.map(schedule => 
        parseInt(schedule.time.split(':')[0]) // HH:mm:ss에서 시간만 추출
      ).sort((a, b) => a - b) // 시간 순으로 정렬
    }));

    res.status(200).json({ 
      message: '광고 스케줄이 성공적으로 저장되었습니다',
      ads: formattedAds
    });

  } catch (error) {
    await transaction.rollback();
    console.error('광고 스케줄 저장 실패:', error);
    
    res.status(500).json({ 
      error: '광고 스케줄 저장 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

module.exports = router;