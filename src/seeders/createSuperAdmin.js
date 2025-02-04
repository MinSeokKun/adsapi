const { User } = require('../models');

const createSuperAdmin = async () => {
  try {
    // Google OAuth로 로그인한 특정 이메일을 슈퍼관리자로 설정
    const [superAdmin, created] = await User.findOrCreate({
      where: { 
        email: process.env.SUPER_ADMIN_EMAIL // 환경변수에서 이메일 가져오기
      },
      defaults: {
        name: 'Super Admin',
        role: 'superadmin',
        provider: 'google',
        providerId: process.env.SUPER_ADMIN_EMAIL, // 이메일을 providerId로 사용
        // is_active: true
      }
    });

    if (!created && superAdmin.role !== 'superadmin') {
      // 이미 존재하는 사용자라면 superadmin으로 업데이트
      await superAdmin.update({ role: 'superadmin' });
    }

    console.log('슈퍼관리자가 생성되었거나 업데이트되었습니다:', superAdmin.email);
    return superAdmin;
  } catch (error) {
    console.error('슈퍼관리자 생성 실패:', error);
    throw error;
  }
};

module.exports = createSuperAdmin;