const express = require('express');
const router = express.Router();
const sequelize = require('../../config/database');
const { SubscriptionPlan, Subscription } = require('../../models');
const { verifyToken, isSuperAdmin } = require('../../middleware/auth');
const logger = require('../../config/winston');
const { sanitizeData } = require('../../utils/sanitizer');

// 구독 플랜 조회
router.get('/api/subscription-plans', async (req, res) => {
  const logContext = {
    requestId: req.id,
    userId: req.user?.id,
    path: req.path
  };
  
  try {
    const plans = await SubscriptionPlan.findAll({
      where: { is_active: true }, // 활성화된 플랜만 조회
      attributes: [
        'id',
        'name',
        'type',
        'price',
        'duration_months',
        'features',
        'created_at'
      ]
    });

    logger.info('구독 플랜 조회 완료', sanitizeData(logContext));
    
    res.json({
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        type: plan.type,
        price: plan.price,
        durationMonths: plan.duration_months,
        features: plan.features,
        createdAt: plan.created_at
      }))
    });

  } catch (error) {
    logger.error('플랜 조회 실패', sanitizeData({
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }));

    res.status(500).json({
      error: '서버 오류가 발생했습니다',
      message: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// 슈퍼 관리자 구독 플랜 등록
router.post('/api/admin/subscription-plans', 
  verifyToken, 
  isSuperAdmin, 
  async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      requestData: sanitizeData(req.body)
    };
    let transaction;
    try {
      const { name, type, price, duration_months, features } = req.body;
      transaction = await sequelize.transaction();
      // 필수 필드 검증
      if (!name || !type || !price || !duration_months || !features) {
        logger.warn('필수 필드 누락', sanitizeData(logContext));
        return res.status(400).json({
          error: '필수 정보가 누락되었습니다',
          required: ['name', 'type', 'price', 'duration_months', 'features']
        });
      }

      // 플랜 타입 검증
      if (!['basic_sponsor', 'premium_sponsor'].includes(type)) {
        logger.warn('잘못된 플랜 타입', sanitizeData({ ...logContext, type }));
        return res.status(400).json({
          error: '유효하지 않은 플랜 타입입니다',
          allowedTypes: ['basic_sponsor', 'premium_sponsor']
        });
      }

      // 가격과 기간 검증
      if (price < 0 || duration_months < 1) {
        logger.warn('잘못된 가격 또는 기간', sanitizeData({ 
          ...logContext, 
          price, 
          duration_months 
        }));
        return res.status(400).json({
          error: '가격과 기간은 양수여야 합니다'
        });
      }

      // features 구조 검증
      if (!features.max_ads || !features.max_media_per_ad || !features.allowed_ad_types) {
        logger.warn('잘못된 features 구조', sanitizeData({ ...logContext, features }));
        return res.status(400).json({
          error: 'features에 필수 정보가 누락되었습니다',
          required: {
            features: ['max_ads', 'max_media_per_ad', 'allowed_ad_types']
          }
        });
      }

      // 동일한 이름의 플랜이 있는지 확인
      const existingPlan = await SubscriptionPlan.findOne({ 
        where: { name }
      });

      if (existingPlan) {
        logger.warn('중복된 플랜 이름', sanitizeData({ ...logContext, name }));
        return res.status(409).json({
          error: '이미 존재하는 플랜 이름입니다'
        });
      }

      // 새 플랜 생성
      const newPlan = await SubscriptionPlan.create({
        name,
        type,
        price,
        duration_months,
        features,
        is_active: true
      }, { transaction });

      logger.info('새 구독 플랜 등록 완료', sanitizeData({
        ...logContext,
        planId: newPlan.id
      }));

      await transaction.commit();

      res.status(201).json({
        message: '구독 플랜이 성공적으로 등록되었습니다',
        plan: {
          id: newPlan.id,
          name: newPlan.name,
          type: newPlan.type,
          price: newPlan.price,
          durationMonths: newPlan.duration_months,
          features: newPlan.features,
          createdAt: newPlan.created_at
        }
      });

    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error('구독 플랜 등록 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));

      res.status(500).json({
        error: '서버 오류가 발생했습니다',
        message: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
});

router.put('/api/admin/subscription-plans/:planId', 
  verifyToken, 
  isSuperAdmin, 
  async (req, res) => {
    const logContext = {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      planId: req.params.planId,
      requestData: sanitizeData(req.body)
    };
    let transaction;
    try {
      const { planId } = req.params;
      const { name, type, price, duration_months, features, is_active } = req.body;
      transaction = await sequelize.transaction();
      // 플랜 존재 여부 확인
      const plan = await SubscriptionPlan.findByPk(planId);
      if (!plan) {
        logger.warn('존재하지 않는 플랜', sanitizeData(logContext));
        return res.status(404).json({
          error: '해당 플랜을 찾을 수 없습니다'
        });
      }

      // 입력값 검증
      if (name || type || price || duration_months || features) {
        // 플랜 타입 검증
        if (type && !['basic_sponsor', 'premium_sponsor'].includes(type)) {
          logger.warn('잘못된 플랜 타입', sanitizeData({ ...logContext, type }));
          return res.status(400).json({
            error: '유효하지 않은 플랜 타입입니다',
            allowedTypes: ['basic_sponsor', 'premium_sponsor']
          });
        }

        // 가격과 기간 검증
        if ((price !== undefined && price < 0) || 
            (duration_months !== undefined && duration_months < 1)) {
          logger.warn('잘못된 가격 또는 기간', sanitizeData({ 
            ...logContext, 
            price, 
            duration_months 
          }));
          return res.status(400).json({
            error: '가격과 기간은 양수여야 합니다'
          });
        }

        // features 구조 검증
        if (features && (!features.max_ads || 
            !features.max_media_per_ad || 
            !features.allowed_ad_types)) {
          logger.warn('잘못된 features 구조', sanitizeData({ ...logContext, features }));
          return res.status(400).json({
            error: 'features에 필수 정보가 누락되었습니다',
            required: {
              features: ['max_ads', 'max_media_per_ad', 'allowed_ad_types']
            }
          });
        }

        // 이름 중복 검사 (다른 플랜과 중복되는지)
        if (name) {
          const existingPlan = await SubscriptionPlan.findOne({
            where: {
              name,
              id: { [Op.ne]: planId } // 현재 플랜 제외
            }
          });

          if (existingPlan) {
            logger.warn('중복된 플랜 이름', sanitizeData({ ...logContext, name }));
            return res.status(409).json({
              error: '이미 존재하는 플랜 이름입니다'
            });
          }
        }
      }

      // 플랜 비활성화 시 현재 구독자 확인
      if (is_active === false) {
        const activeSubscriptions = await Subscription.count({
          where: {
            plan_id: planId,
            status: 'active'
          }
        });

        if (activeSubscriptions > 0) {
          logger.warn('활성 구독이 있는 플랜 비활성화 시도', sanitizeData({
            ...logContext,
            activeSubscriptions
          }));
          return res.status(400).json({
            error: '현재 활성 구독이 있는 플랜은 비활성화할 수 없습니다',
            activeSubscriptions
          });
        }
      }

      // 플랜 업데이트
      await plan.update({
        name: name || plan.name,
        type: type || plan.type,
        price: price ?? plan.price,
        duration_months: duration_months || plan.duration_months,
        features: features || plan.features,
        is_active: is_active ?? plan.is_active
      }, { transaction });

      logger.info('구독 플랜 수정 완료', sanitizeData({
        ...logContext,
        updatedPlan: {
          id: plan.id,
          name: plan.name,
          type: plan.type,
          is_active: plan.is_active
        }
      }));
      
      await transaction.commit();

      res.json({
        message: '구독 플랜이 성공적으로 수정되었습니다',
        plan: {
          id: plan.id,
          name: plan.name,
          type: plan.type,
          price: plan.price,
          durationMonths: plan.duration_months,
          features: plan.features,
          isActive: plan.is_active,
          updatedAt: plan.updated_at
        }
      });

    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error('구독 플랜 수정 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));

      res.status(500).json({
        error: '서버 오류가 발생했습니다',
        message: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
});

// router.delete('/api/admin/subscription-plans/:planId',
//   verifyToken, isSuperAdmin,
//   async (req, res) => {
//     const logContext = {
//       requestId: req.id,
//       userId: req.user?.id,
//       path: req.path,
//       planId: req.params.planId
//     };

//     let transaction;
//     try {
//       transaction = await sequelize.transaction();
//       const { id } = req.params;
//       const plan = await SubscriptionPlan.findByPk(id)
//     } catch (error) {
//       if (transaction) await transaction.rollback();
//     }

// });


module.exports = router;