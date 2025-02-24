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
const { requestLogger, errorLogger } = require('./src/middleware/logger');
const logger = require('./src/config/winston');

const app = express();

// Security
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100
});

// CORS 설정
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        process.env.FRONTEND_URL,
        'https://ads-web-seven.vercel.app'
      ]
    : [
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:5173',
        'http://182.220.6.227:3000',
        'http://192.168.0.42:3000',
        'https://ads-web-seven.vercel.app',
        'https://2576-182-220-6-227.ngrok-free.app',
        /^https:\/\/[a-zA-Z0-9-]+\.ngrok-free\.app$/ // ngrok URL 패턴 매칭
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
};

app.set('trust proxy', 1);

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
app.use((error, req, res, next) => {
  logger.error('서버 에러 발생', {
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    }
  })
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
    const localauthDoc = yaml.load(
      fs.readFileSync(path.join(__dirname, 'src/config/swagger/localauth.yaml'), 'utf8')
    );
    const adsDoc = yaml.load(
      fs.readFileSync(path.join(__dirname, 'src/config/swagger/ads.yaml'), 'utf8')
    );
    const salonDoc = yaml.load(
      fs.readFileSync(path.join(__dirname, 'src/config/swagger/salon.yaml'), 'utf8')
    );
    const salonAdsDoc = yaml.load(
      fs.readFileSync(path.join(__dirname, 'src/config/swagger/salonAds.yaml'), 'utf8')
    );
    const adminDoc = yaml.load(
      fs.readFileSync(path.join(__dirname, 'src/config/swagger/admin.yaml'), 'utf8')
    );
    const planDoc = yaml.load(
      fs.readFileSync(path.join(__dirname, 'src/config/swagger/subscription.yaml'), 'utf8')
    );
    const displayDoc = yaml.load(
      fs.readFileSync(path.join(__dirname, 'src/config/swagger/display.yaml'), 'utf8')
    );
    // paths와 schemas 병합
    mainDoc.paths = {
      ...mainDoc.paths,
      ...authDoc.paths,
      ...localauthDoc.paths,
      ...adsDoc.paths,
      ...salonDoc.paths,
      ...salonAdsDoc.paths,
      ...adminDoc.paths,
      ...planDoc.paths,
      ...displayDoc.paths
    };

    mainDoc.components.schemas = {
      ...mainDoc.components.schemas,
      ...authDoc.components.schemas,
      ...adsDoc.components.schemas,
      ...salonDoc.components.schemas,
      ...planDoc.components.schemas,
      ...displayDoc.components.schemas
    };

    return mainDoc;
  } catch (error) {
    logger.error('Swagger 문서 로드 실패:', { error });
    throw error;
  }
};

// Swagger 설정
try {
  const swaggerDocument = loadSwaggerDocument();
  app.use('/api-docs', verifyToken, isSuperAdmin, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  logger.error('Swagger 문서 로드 실패:', { error });
}

// 미들웨어 설정
app.use(requestLogger);

app.use(express.json());

app.use(errorLogger);

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
    app.listen(port, '0.0.0.0', () => {
      console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
      console.log(`Swagger 문서는 http://localhost:${port}/api-docs 에서 확인할 수 있습니다.`);
    });
  } catch (error) {
    logger.error('Swagger 문서 로드 실패:', { error });
    process.exit(1);
  }
};

startServer();