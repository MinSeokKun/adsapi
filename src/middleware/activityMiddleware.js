const userActivityService = require('../services/userActivityService');

/**
 * 사용자 활동을 자동으로 로깅하는 미들웨어
 * @param {string} activityType - 활동 유형
 * @param {Function} getDetailsFunction - 요청 객체로부터 상세 정보를 추출하는 함수
 * @returns {Function} Express 미들웨어
 */
exports.logActivity = (activityType, getDetailsFunction = null) => {
  return async (req, res, next) => {
    // 응답 완료 이벤트에 리스너 등록
    res.on('finish', async () => {
      // 성공 응답인 경우만 로깅
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user && req.user.id) {
        try {
          const details = getDetailsFunction ? getDetailsFunction(req) : {};
          details.ip = req.ip;
          details.method = req.method;
          details.path = req.path;
          
          await userActivityService.recordActivity(req.user.id, activityType, details);
          console.log(`Activity logged: ${activityType}`);
        } catch (error) {
          console.error('활동 로깅 실패:', error);
        }
      }
    });

    next();
  };
};

// 컨트롤러 실행 전에 필요한 정보를 캡처하는 미들웨어
exports.prepareActivityLog = (activityType, getDetailsFunction = null) => {
  return async (req, res, next) => {
    // 원래 응답 메서드를 저장
    const originalJson = res.json;
    
    // res.json을 오버라이드
    res.json = function(data) {
      // 성공 응답일 경우에만 로깅
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          const details = getDetailsFunction ? getDetailsFunction(req, data) : {};
          
          // 요청 및 응답 메타데이터 추가
          details.ip = req.ip;
          details.method = req.method;
          details.path = req.path;
          
          // 응답 전에 로깅 수행
          userActivityService.recordActivity(req.user.id, activityType, details)
            .then(() => {
              console.log(`Activity logged: ${activityType}`);
            })
            .catch(error => {
              console.error('활동 로깅 실패:', error);
            });
        } catch (error) {
          console.error('활동 로깅 준비 실패:', error);
        }
      }
      
      // 원래 json 메소드 호출
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * 로그인 활동을 로깅하는 미들웨어
 */
exports.logLoginActivity = async (req, res, next) => {
  try {
    // 로그인 성공 후에만 실행 (req.user가 설정된 경우)
    if (req.user && req.user.id) {
      const details = {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      };
      
      await userActivityService.recordActivity(req.user.id, 'user_login', details);
    }
  } catch (error) {
    console.error('로그인 활동 로깅 실패:', error);
    // 로깅 실패해도 로그인 프로세스는 계속 진행
  }
  
  next();
};

/**
 * 주요 활동 유형 상수
 * 일관된 활동 유형 사용을 위한 참조
 */
exports.ACTIVITY_TYPES = {
  // 사용자 관련
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  USER_PROFILE_UPDATE: 'user_profile_update',
  USER_PASSWORD_CHANGE: 'user_password_change',
  
  // 살롱 관련
  SALON_CREATE: 'salon_create',
  SALON_UPDATE: 'salon_update',
  SALON_DELETE: 'salon_delete',
  
  // 광고 관련
  AD_CREATE: 'ad_create',
  AD_UPDATE: 'ad_update',
  AD_DELETE: 'ad_delete',
  
  // 결제 관련
  PAYMENT_CREATED: 'payment_created',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  REFUND_REQUESTED: 'refund_requested',
  REFUND_COMPLETED: 'refund_completed',
  
  // 구독 관련
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  
  // 디스플레이 관련
  DISPLAY_ADDED: 'display_added',
  DISPLAY_UPDATED: 'display_updated',
  DISPLAY_REMOVED: 'display_removed',
  
  // 관리자 활동
  ADMIN_LOGIN: 'admin_login',
  ADMIN_USER_UPDATE: 'admin_user_update',
  ADMIN_SALON_UPDATE: 'admin_salon_update',

};

// 활동 로그 설명 제공 (선택적, UI 표시용)
exports.ACTIVITY_DESCRIPTIONS = {
  user_login: '로그인',
  user_logout: '로그아웃',
  user_register: '회원가입',
  user_profile_update: '프로필 업데이트',
  user_password_change: '비밀번호 변경',
  
  salon_create: '미용실 등록',
  salon_update: '미용실 정보 수정',
  salon_delete: '미용실 삭제',
  
  ad_create: '광고 생성',
  ad_update: '광고 수정',
  ad_delete: '광고 삭제',
  
  payment_created: '결제 시작',
  payment_completed: '결제 완료',
  payment_failed: '결제 실패',
  refund_requested: '환불 요청',
  refund_completed: '환불 완료',
  
  subscription_created: '구독 시작',
  subscription_renewed: '구독 갱신',
  subscription_cancelled: '구독 취소',
  subscription_expired: '구독 만료',
  
  display_added: '디스플레이 추가',
  display_updated: '디스플레이 업데이트',
  display_removed: '디스플레이 제거',
  
  admin_login: '관리자 로그인',
  admin_user_update: '사용자 정보 관리자 수정',
  admin_salon_update: '미용실 정보 관리자 수정'
};