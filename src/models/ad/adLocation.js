const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const AdLocation = sequelize.define('AdLocation', {
  // 타겟팅 타입 구분 (반경 옵션 제거)
  target_type: {
    type: DataTypes.ENUM('nationwide', 'administrative'),
    allowNull: false,
    comment: '전국/행정구역 설정'
  },
  // 행정구역 타겟팅용 필드
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '시/도 (행정구역 타겟팅시 사용)'
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '구/군 (행정구역 타겟팅시 사용)'
  }
  // 반경 관련 필드 모두 제거됨
}, {
  tableName: 'ad_locations',
  timestamps: true,
  underscored: true,
  validate: {
    locationFieldsValidation() {
      // 전국 단위 설정시 다른 필드들은 null이어야 함
      if (this.target_type === 'nationwide') {
        if (this.city || this.district) {
            throw new Error('Nationwide targeting cannot have other location fields');
        }
      }
      
      // 행정구역 단위 설정시 관련 필드들만 설정되어야 함
      if (this.target_type === 'administrative') {
        if (!this.city) {
          throw new Error('City is required for administrative targeting');
        }
      }
    }
  }
});

module.exports = AdLocation;