const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const AdLocation = sequelize.define('AdLocation', {
  // 타겟팅 타입 구분
  target_type: {
    type: DataTypes.ENUM('nationwide', 'administrative', 'radius'),
    allowNull: false,
    comment: '전국/행정구역/반경 설정'
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
  },
  // 반경 타겟팅용 필드
  radius: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '반경 (미터 단위, 반경 타겟팅시 사용)'
  },
  center_latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    },
    comment: '중심점 위도 (반경 타겟팅시 사용)'
  },
  center_longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    },
    comment: '중심점 경도 (반경 타겟팅시 사용)'
  }
}, {
  tableName: 'ad_locations',
  timestamps: true,
  underscored: true,
  validate: {
    locationFieldsValidation() {
      // 전국 단위 설정시 다른 필드들은 null이어야 함
      if (this.target_type === 'nationwide') {
        if (this.city || this.district || this.radius || 
          this.center_latitude || this.center_longitude) {
            throw new Error('Nationwide targeting cannot have other location fields');
        }
      }
      
      // 행정구역 단위 설정시 관련 필드들만 설정되어야 함
      if (this.target_type === 'administrative') {
        if (this.radius || this.center_latitude || this.center_longitude) {
          throw new Error('Administrative targeting cannot have radius fields');
        }
        if (!this.city) {
          throw new Error('City is required for administrative targeting');
        }
      }
      
      // 반경 설정시 관련 필드들만 설정되어야 함
      if (this.target_type === 'radius') {
        if (this.city || this.district) {
          throw new Error('Radius targeting cannot have administrative fields');
        }
        if (!this.radius || !this.center_latitude || !this.center_longitude) {
          throw new Error('Radius targeting requires radius and center point');
        }
      }
    }
  }
});

module.exports = AdLocation;