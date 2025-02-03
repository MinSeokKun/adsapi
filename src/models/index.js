const sequelize = require('../config/database');
const AdCategory = require('./adCategory');
const Ad = require('./ad');
const AdSchedule = require('./adSchedule');

// 기존 관계 설정
AdCategory.hasMany(Ad, {
  foreignKey: 'ad_category_id'
});
Ad.belongsTo(AdCategory, {
  foreignKey: 'ad_category_id'
});

// 새로운 관계 설정
Ad.hasMany(AdSchedule, {
  foreignKey: 'ad_id'
});
AdSchedule.belongsTo(Ad, {
  foreignKey: 'ad_id'
});

// 모델 동기화
const syncModels = async () => {
  try {
    // await sequelize.sync({ force: true }); // 테이블 재생성
    await sequelize.sync(); // 테이블 생성
    console.log('모델 동기화 완료');
  } catch (error) {
    console.error('모델 동기화 실패:', error);
  }
};

module.exports = {
  sequelize,
  AdCategory,
  Ad,
  AdSchedule,
  syncModels
};