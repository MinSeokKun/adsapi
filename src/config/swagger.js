const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger 정의
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API 문서',
      version: '1.0.0',
      description: '미용실-광고 API에 대한 문서',
    },
    servers: [
      {
        url: 'http://localhost:3100',
        description: '개발 서버',
      },
    ],
  },
  // API 라우트가 있는 파일들의 경로 패턴
  apis: [
    './src/routes/*.js',
    './src/routes/**/*.js', 
    './docs/swagger/*.js'// 별도 문서 파일
    ],
};

const specs = swaggerJsdoc(options);

module.exports = { specs, swaggerUi };