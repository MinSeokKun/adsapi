const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { Ad, AdMedia, AdSchedule } = require('../models');
const multer = require('multer');
const ncloudStorage = require('../config/nCloudStorage');

router.get('/api/ads', async (req, res) => {
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
        where: {
          is_active: true
        },
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

router.get('/api/ads/list', async (req, res) => {
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

// 메모리에 임시 저장하는 multer 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'), false);
    }
  }
});

// 여러 파일을 처리하기 위한 필드 설정
const uploadFields = upload.fields([
  { name: 'maxFiles', maxCount: 10 },  // max size 이미지/비디오
  { name: 'minFiles', maxCount: 10 }   // min size 이미지/비디오
]);

const parseSchedules = (schedulesInput) => {
  if (!schedulesInput) return [];
  
  try {
    // 문자열인 경우 JSON 파싱 시도
    if (typeof schedulesInput === 'string') {
      // 단일 숫자인지 확인
      if (!isNaN(schedulesInput)) {
        return [schedulesInput];
      }
      
      // JSON 파싱 시도
      try {
        const parsed = JSON.parse(schedulesInput);
        // 파싱된 결과가 배열이 아니면 단일 요소 배열로 변환
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // JSON 파싱 실패 시 콤마로 구분된 문자열로 처리
        return schedulesInput.split(',').map(t => t.trim());
      }
    }
    
    // 이미 배열인 경우
    if (Array.isArray(schedulesInput)) {
      return schedulesInput;
    }
    
    // 그 외의 경우 (숫자 등) 단일 요소 배열로 변환
    return [schedulesInput];
  } catch (e) {
    throw new Error('schedules must be a valid JSON array string, comma-separated time values, or a single time value');
  }
};

router.post('/api/ads', uploadFields, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { title, schedules } = req.body;
    const parsedSchedules = parseSchedules(schedules);

    // 1. 광고 기본 정보 저장
    const ad = await Ad.create({
      title,
      is_active: true
    }, { transaction });

    // 2. 파일 업로드 및 미디어 정보 저장
    const mediaPromises = [];

    // max size 파일 처리
    if (req.files.maxFiles) {
      for (const file of req.files.maxFiles) {
        const fileUrl = await ncloudStorage.uploadFile(file);
        mediaPromises.push(
          AdMedia.create({
            ad_id: ad.id,
            url: fileUrl,
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            duration: 30, // 기본값 또는 req.body에서 받을 수 있음
            size: 'max',
            is_primary: false
          }, { transaction })
        );
      }
    }

    // min size 파일 처리
    if (req.files.minFiles) {
      for (const file of req.files.minFiles) {
        const fileUrl = await ncloudStorage.uploadFile(file);
        mediaPromises.push(
          AdMedia.create({
            ad_id: ad.id,
            url: fileUrl,
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            duration: 30, // 기본값 또는 req.body에서 받을 수 있음
            size: 'min',
            is_primary: false
          }, { transaction })
        );
      }
    }

    await Promise.all(mediaPromises);
    
    // 3. 선택된 시간들에 대한 스케줄 생성
    console.log('parsedSchedules:', parsedSchedules);
    const schedulePromises = parsedSchedules.map(time => 
      AdSchedule.create({
        ad_id: ad.id,
        time: time + ':00:00', // HH:mm:ss 형식으로 저장
        is_active: true
      }, { transaction })
    );
    
    await Promise.all(schedulePromises);
    await transaction.commit();

    // 생성된 광고 정보 조회
    const createdAd = await Ad.findByPk(ad.id, {
      include: [
        {
          model: AdMedia,
          as: 'media',
          attributes: ['url', 'type', 'duration', 'size', 'is_primary']
        }
      ]
    });

    res.status(201).json({ 
      message: '광고가 성공적으로 저장되었습니다',
      ad: {
        id: createdAd.id,
        title: createdAd.title,
        media: createdAd.media.map(m => ({
          url: m.url,
          type: m.type,
          duration: m.duration,
          size: m.size,
          is_primary: m.is_primary
        })),
        schedules: parsedSchedules
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

router.put('/api/ads/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { 
      title,
      media,    // [{url, type, duration, size, is_primary}, ...]
      schedules,
      is_active
    } = req.body;

    // 1. 광고 존재 확인
    const ad = await Ad.findByPk(id);
    if (!ad) {
      return res.status(404).json({ error: '광고를 찾을 수 없습니다' });
    }

    // 2. 광고 기본 정보 업데이트
    await ad.update({
      title,
      is_active
    }, { transaction });

    // 3. 기존 미디어 비활성화 (soft delete) 또는 삭제
    await AdMedia.destroy({
      where: { ad_id: id },
      transaction
    });

    // 4. 새로운 미디어 정보 저장
    const mediaPromises = media.map(item => 
      AdMedia.create({
        ad_id: id,
        url: item.url,
        type: item.type,
        duration: item.duration,
        size: item.size,
        is_primary: item.is_primary
      }, { transaction })
    );

    await Promise.all(mediaPromises);

    // 5. 기존 스케줄 비활성화
    await AdSchedule.update(
      { is_active: false },
      { 
        where: { ad_id: id },
        transaction 
      }
    );

    // 6. 새로운 스케줄 생성
    const schedulePromises = schedules.map(time => 
      AdSchedule.create({
        ad_id: id,
        time: time + ':00:00',
        is_active: true
      }, { transaction })
    );

    await Promise.all(schedulePromises);
    await transaction.commit();

    // 업데이트된 광고 정보 조회
    const updatedAd = await Ad.findByPk(id, {
      include: [
        {
          model: AdMedia,
          as: 'media',
          attributes: ['url', 'type', 'duration', 'size', 'is_primary']
        }
      ]
    });

    res.json({ 
      message: '광고가 성공적으로 수정되었습니다',
      ad: {
        id: updatedAd.id,
        title: updatedAd.title,
        media: updatedAd.media.map(m => ({
          url: m.url,
          type: m.type,
          duration: m.duration,
          size: m.size,
          is_primary: m.is_primary
        })),
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

router.delete('/api/ads/:id', async (req, res) => {
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

router.post('/api/ads/schedule', async (req, res) => {
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