const express = require('express');
const { syncModels } = require('./src/models');
const adsRouter = require('./src/routes/ads');
const authRouter = require('./src/routes/auth');
const localauthRouter = require('./src/routes/localauth');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
require('./src/config/passport');
const createSuperAdmin = require('./src/seeders/createSuperAdmin');
const { verifyToken, isSuperAdmin } = require('./src/middleware/auth');

const app = express();

app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// 스웨거 문서 로드
const loadSwaggerDocument = () => {
  try {
    // 메인 Swagger 파일 로드
    const mainDoc = yaml.load(
      fs.readFileSync(path.join(__dirname, 'src/config/swagger/main.yaml'), 'utf8')
    );

    // 각 참조된 파일들을 로드하고 병합
    const authDoc = yaml.load(
      fs.readFileSync(path.join(__dirname, 'src/config/swagger/auth.yaml'), 'utf8')
    );
    const adsDoc = yaml.load(
      fs.readFileSync(path.join(__dirname, 'src/config/swagger/ads.yaml'), 'utf8')
    );

    // paths와 schemas 병합
    mainDoc.paths = {
      ...mainDoc.paths,
      ...authDoc.paths,
      ...adsDoc.paths
    };

    mainDoc.components.schemas = {
      ...mainDoc.components.schemas,
      ...authDoc.components.schemas,
      ...adsDoc.components.schemas
    };

    return mainDoc;
  } catch (error) {
    console.error('Swagger 문서 로드 실패:', error);
    throw error;
  }
};

// Swagger 설정
try {
  const swaggerDocument = loadSwaggerDocument();
  app.use('/api-docs', verifyToken, isSuperAdmin, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.error('Swagger 문서 로드 실패:', error);
}

// 미들웨어 설정
app.use(express.json());

// 라우터 설정
app.use(adsRouter);
app.use(authRouter);
app.use(localauthRouter);

// 모델 동기화 후 서버 시작
const startServer = async () => {
  try {
    await syncModels();

    // 슈퍼관리자 생성
    if (process.env.SUPER_ADMIN_EMAIL) {
      await createSuperAdmin();
    }
    
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