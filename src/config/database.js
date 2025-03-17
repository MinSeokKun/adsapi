require('dotenv').config();
const { Sequelize } = require('sequelize');

let sequelize;

// DATABASE_URL이 존재하면 사용하고, 없으면 개별 환경 변수 사용
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // 개발 환경용. 프로덕션에서는 적절한 SSL 설정 필요
      }
    }
  });
} else {
  // 기존 방식 유지 (로컬 개발 환경 등에서 사용)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

module.exports = sequelize;