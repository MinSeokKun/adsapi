const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { syncModels } = require('./src/models');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
require('./src/config/passport');
const createSuperAdmin = require('./src/seeders/createSuperAdmin');
const loadRoutes = require('./src/utils/routeLoader');
const { verifyToken, isSuperAdmin } = require('./src/middleware/auth');

const app = express();

// Security
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100
});

// CORS 설정
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'http://localhost:5173'],// 허용할 도메인
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // CORS 프리플라이트 요청 캐시 시간 (10분)
};

app.use(helmet()); // 기본 보안 헤더 설정
app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json({ limit: '10mb' })); // 요청 바디 크기 제한
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 세션 설정
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message
  });
});

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
    const salonDoc = yaml.load(
      fs.readFileSync(path.join(__dirname, 'src/config/swagger/salon.yaml'), 'utf8')
    );

    // paths와 schemas 병합
    mainDoc.paths = {
      ...mainDoc.paths,
      ...authDoc.paths,
      ...adsDoc.paths,
      ...salonDoc.paths
    };

    mainDoc.components.schemas = {
      ...mainDoc.components.schemas,
      ...authDoc.components.schemas,
      ...adsDoc.components.schemas,
      ...salonDoc.components.schemas
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

// 모든 라우터 자동 로드
loadRoutes(app, path.join(__dirname, 'src', 'routes'));

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
    process.exit(1);
  }
};

startServer();