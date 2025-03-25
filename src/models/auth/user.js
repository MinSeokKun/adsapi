const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    // OAuth 로그인의 경우 비밀번호가 없을 수 있으므로 allowNull: true
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  provider: {
    type: DataTypes.ENUM('local', 'google', 'kakao', 'naver'),
    allowNull: false,
    defaultValue: 'local'
  },
  providerId: {
    type: DataTypes.STRING(255),
    allowNull: true  // local 회원가입의 경우 없음
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'superadmin'), // 미용실 원장, 관리자, 최고 관리자
    defaultValue: 'user',
    allowNull: false
  },
  profileImage: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // 이메일 인증 관련
  // isEmailVerified: {
  //   type: DataTypes.BOOLEAN,
  //   defaultValue: false
  // },
  // verificationToken: {
  //   type: DataTypes.STRING(255),
  //   allowNull: true
  // },
  // verificationTokenExpires: {
  //   type: DataTypes.DATE,
  //   allowNull: true
  // }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    // 회원가입 시에만 실행
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    // 비밀번호 변경 시에만 실행
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// 비밀번호 검증 메서드
User.prototype.validatePassword = async function(password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

module.exports = User;