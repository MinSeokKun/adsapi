const { AdCategory, Ad, AdSchedule } = require('../models');

async function seedDatabase() {
  try {
    // 카테고리 생성
    const beautyCategory = await AdCategory.create({
      name: 'beauty',
      description: '뷰티 관련 광고'
    });

    const fashionCategory = await AdCategory.create({
      name: 'fashion',
      description: '패션 관련 광고'
    });

    const foodCategory = await AdCategory.create({
      name: 'food',
      description: '음식 관련 광고'
    });

    // 뷰티 카테고리 광고 생성
    const beautyAd1 = await Ad.create({
      title: '화장품 광고 1',
      type: 'image',
      url: 'https://example.com/beauty1.png',
      duration: 15,
      ad_category_id: beautyCategory.id
    });

    const beautyAd2 = await Ad.create({
      title: '화장품 광고 2',
      type: 'video',
      url: 'https://example.com/beauty2.mp4',
      duration: 30,
      ad_category_id: beautyCategory.id
    });

    // 패션 카테고리 광고 생성
    const fashionAd1 = await Ad.create({
      title: '의류 광고 1',
      type: 'image',
      url: 'https://example.com/fashion1.png',
      duration: 20,
      ad_category_id: fashionCategory.id
    });

    const fashionAd2 = await Ad.create({
      title: '의류 광고 2',
      type: 'video',
      url: 'https://example.com/fashion2.mp4',
      duration: 25,
      ad_category_id: fashionCategory.id
    });

    // 음식 카테고리 광고 생성
    const foodAd1 = await Ad.create({
      title: '음식 광고',
      type: 'image',
      url: 'https://example.com/food1.png',
      duration: 15,
      ad_category_id: foodCategory.id
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

    // 음식 광고 스케줄 (여러 시간대)
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