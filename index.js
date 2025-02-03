const express = require('express');
const { syncModels } = require('./src/models');
const adsRouter = require('./src/routes/ads');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const app = express();

// Swagger 설정
try {
  const swaggerDocument = yaml.load(
    fs.readFileSync(path.join(__dirname, 'src/config/swagger.yaml'), 'utf8')
  );
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.error('Swagger 문서 로드 실패:', error);
}

// 미들웨어 설정
app.use(express.json());

// 라우터 설정
app.use(adsRouter);

// 모델 동기화 후 서버 시작
const startServer = async () => {
  try {
    await syncModels();
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
      console.log(`Swagger 문서는 http://localhost:${port}/api-docs 에서 확인할 수 있습니다.`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error);
  }
};

startServer();