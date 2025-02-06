const { Ad, AdMedia, AdSchedule } = require('../models');

async function seedDatabase() {
  try {
    // 뷰티 광고 생성
    const beautyAd1 = await Ad.create({
      title: '화장품 광고 1',
      is_active: true
    });

    await AdMedia.create({
      ad_id: beautyAd1.id,
      url: 'https://example.com/beauty1_max.png',
      type: 'image',
      duration: 15,
      order: 0,
      is_primary: true,
      size: 'max'
    });

    await AdMedia.create({
      ad_id: beautyAd1.id,
      url: 'https://example.com/beauty1_min.png',
      type: 'image',
      duration: 15,
      order: 1,
      is_primary: false,
      size: 'min'
    });

    const beautyAd2 = await Ad.create({
      title: '화장품 광고 2',
      is_active: true
    });

    await AdMedia.create({
      ad_id: beautyAd2.id,
      url: 'https://example.com/beauty2_max.mp4',
      type: 'video',
      duration: 30,
      order: 0,
      is_primary: true,
      size: 'max'
    });

    await AdMedia.create({
      ad_id: beautyAd2.id,
      url: 'https://example.com/beauty2_min.mp4',
      type: 'video',
      duration: 30,
      order: 1,
      is_primary: false,
      size: 'min'
    });

    // 패션 광고 생성
    const fashionAd1 = await Ad.create({
      title: '의류 광고 1',
      is_active: true
    });

    await AdMedia.create({
      ad_id: fashionAd1.id,
      url: 'https://example.com/fashion1_max.png',
      type: 'image',
      duration: 20,
      order: 0,
      is_primary: true,
      size: 'max'
    });

    await AdMedia.create({
      ad_id: fashionAd1.id,
      url: 'https://example.com/fashion1_min.png',
      type: 'image',
      duration: 20,
      order: 1,
      is_primary: false,
      size: 'min'
    });

    const fashionAd2 = await Ad.create({
      title: '의류 광고 2',
      is_active: true
    });

    await AdMedia.create({
      ad_id: fashionAd2.id,
      url: 'https://example.com/fashion2_max.mp4',
      type: 'video',
      duration: 25,
      order: 0,
      is_primary: true,
      size: 'max'
    });

    await AdMedia.create({
      ad_id: fashionAd2.id,
      url: 'https://example.com/fashion2_min.mp4',
      type: 'video',
      duration: 25,
      order: 1,
      is_primary: false,
      size: 'min'
    });

    // 음식 광고 생성
    const foodAd1 = await Ad.create({
      title: '음식 광고',
      is_active: true
    });

    await AdMedia.create({
      ad_id: foodAd1.id,
      url: 'https://example.com/food1_max.png',
      type: 'image',
      duration: 15,
      order: 0,
      is_primary: true,
      size: 'max'
    });

    await AdMedia.create({
      ad_id: foodAd1.id,
      url: 'https://example.com/food1_min.png',
      type: 'image',
      duration: 15,
      order: 1,
      is_primary: false,
      size: 'min'
    });

    // 광고 스케줄 생성
    // 뷰티 광고 스케줄
    await AdSchedule.create({
      ad_id: beautyAd1.id,
      time: '10:00:00',
      is_active: true
    });

    await AdSchedule.create({
      ad_id: beautyAd2.id,
      time: '14:00:00',
      is_active: true
    });

    // 패션 광고 스케줄
    await AdSchedule.create({
      ad_id: fashionAd1.id,
      time: '11:00:00',
      is_active: true
    });

    await AdSchedule.create({
      ad_id: fashionAd2.id,
      time: '15:00:00',
      is_active: true
    });

    // 음식 광고 스케줄
    await AdSchedule.create({
      ad_id: foodAd1.id,
      time: '12:00:00',
      is_active: true
    });

    await AdSchedule.create({
      ad_id: foodAd1.id,
      time: '13:00:00',
      is_active: true
    });

    console.log('테스트 데이터 삽입 완료');
  } catch (error) {
    console.error('테스트 데이터 삽입 실패:', error);
    console.error(error.stack);
  } finally {
    process.exit();
  }
}

// seed 실행
seedDatabase();