const sequelize = require('../config/database');
const Ad = require('./ad/ad');
const AdSchedule = require('./ad/adSchedule');
const AdMedia = require('./ad/adMedia');
const User = require('./auth/user');
const Salon = require('./auth/salon');
const PaymentRefund = require('./pay/PaymentRefund');
const Subscription = require('./pay/Subscription');
const SubscriptionPlan = require('./pay/SubscriptionPlan');
const Payment = require('./pay/payment');
const Location = require('./auth/location');
const AdLocation = require('./ad/adLocation');
const Display = require('./auth/display');
const UserActivity = require('./auth/userActivity');
const AdCampaign = require('./ad/AdCampaign');

// 광고 관련 관계 설정
Ad.hasMany(AdSchedule, {
  foreignKey: 'ad_id'
});
AdSchedule.belongsTo(Ad, {
  foreignKey: 'ad_id'
});

Ad.hasMany(AdMedia, {
  foreignKey: 'ad_id',
  as: 'media'
});
AdMedia.belongsTo(Ad, {
  foreignKey: 'ad_id'
});
// 광고 위치 관계 설정
Ad.hasMany(AdLocation, {
  foreignKey: 'ad_id',
  // as: 'targetLocations'
});
AdLocation.belongsTo(Ad, {
  foreignKey: 'ad_id'
});

Ad.hasOne(AdCampaign, {
  foreignKey: 'ad_id'
});
AdCampaign.belongsTo(Ad, {
  foreignKey: 'ad_id'
});
  
// 살롱 관련 관계 설정
User.hasMany(Salon, {
  foreignKey: 'owner_id',
  as: 'ownedSalons'
});
Salon.belongsTo(User, {
  foreignKey: 'owner_id',
  as: 'owner'
});

Salon.hasOne(Location, {
  foreignKey: {
    name: 'salon_id',
    allowNull: false
  },
  as: 'location'
});
Location.belongsTo(Salon, {
  foreignKey: 'salon_id',
  as: 'salon'
});

// 디스플레이 관계 설정
Salon.hasMany(Display, {
  foreignKey: {
    name: 'salon_id',
    allowNull: false
  },
  as: 'displays'
});
Display.belongsTo(Salon, {
  foreignKey: 'salon_id',
  as: 'salon'
});

Salon.hasMany(Ad, {
  foreignKey: 'salon_id'
});
Ad.belongsTo(Salon, {
  foreignKey: 'salon_id'
});

// 구독 및 결제 관련 관계 설정
User.hasMany(Subscription, {
  foreignKey: 'user_id',
  as: 'subscriptions'
});
Subscription.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

SubscriptionPlan.hasMany(Subscription, {
  foreignKey: 'plan_id',
  as: 'subscriptions'
});
Subscription.belongsTo(SubscriptionPlan, {
  foreignKey: 'plan_id',
  as: 'plan'
});

User.hasMany(Payment, {
  foreignKey: 'user_id',
  as: 'payments'
});
Payment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(UserActivity, {
  foreignKey: 'user_id',
  as: 'activities'
});
UserActivity.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Subscription.hasMany(Payment, {
  foreignKey: 'subscription_id',
  as: 'payments'
});
Payment.belongsTo(Subscription, {
  foreignKey: 'subscription_id',
  as: 'subscription'
});

Payment.hasMany(PaymentRefund, {
  foreignKey: 'payment_id',
  as: 'refunds'
});
PaymentRefund.belongsTo(Payment, {
  foreignKey: 'payment_id',
  as: 'payment'
});

// 모델 동기화
const syncModels = async () => {
  try {
    await sequelize.sync({ force: false }); // 프로덕션 환경에서는 force: false로 설정
    console.log('모델 동기화 완료');
  } catch (error) {
    console.error('모델 동기화 실패:', error);
  }
};

module.exports = {
  sequelize,
  Ad,
  AdMedia,
  AdSchedule,
  AdLocation,
  AdCampaign,
  User,
  Salon,
  Display,
  Location,
  Payment,
  PaymentRefund,
  Subscription,
  SubscriptionPlan,
  UserActivity,
  syncModels
};