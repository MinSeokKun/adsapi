const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { syncModels } = require('./src/models');
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
const axios = require('axios');
const app = express();
const { specs, swaggerUi } = require('./src/config/swagger');
const adStatusScheduler = require('./src/schedulers/adStatusScheduler');

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
        'http://localhost:3000',
        'https://app.cocoh.kr',
      ]
      : [
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:5173',
        'http://182.220.6.227:3000',
        'http://192.168.0.42:3000',
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

// 미들웨어 설정
app.use(requestLogger);

app.use(express.json());

app.use(errorLogger);

// 모든 라우터 자동 로드
loadRoutes(app, path.join(__dirname, 'src', 'routes'));

app.get('/api/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    
    if (!imageUrl) {
      return res.status(400).json({ error: '이미지 URL이 필요합니다.' });
    }

    // 이미지 요청
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'arraybuffer'
    });

    // CORS 및 리소스 정책 헤더 설정
    res.set({
      'Content-Type': response.headers['content-type'] || 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    });
    
    // 이미지 데이터 전송
    res.send(response.data);
    
  } catch (error) {
    // 오류 처리 로직
    res.status(500).json({ 
      error: '이미지를 가져오는데 실패했습니다.',
      details: error.message 
    });
  }
});

// 비디오 프록시 라우트
app.get('/api/proxy-video', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    
    if (!videoUrl) {
      return res.status(400).json({ error: '비디오 URL이 필요합니다.' });
    }

    // 비디오 요청 (스트림 방식 사용)
    const response = await axios({
      url: videoUrl,
      method: 'GET',
      responseType: 'stream'
    });

    // 응답 헤더 설정
    res.set('Content-Type', response.headers['content-type'] || 'video/mp4');
    res.set('Content-Length', response.headers['content-length']);
    res.set('Accept-Ranges', 'bytes');
    res.set('Cache-Control', 'public, max-age=86400');
    
    // 비디오 스트림 파이프
    response.data.pipe(res);
    
  } catch (error) {
    
    res.status(500).json({ 
      error: '비디오를 가져오는데 실패했습니다.',
      details: error.message 
    });
  }
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

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
      
      // 스케줄러 로드 (여기서는 단순히 모듈을 import하는 것만으로도 스케줄러가 시작됨)
      console.log('광고 상태 업데이트 스케줄러 초기화 완료');
    });
  } catch (error) {
    logger.error('서버 시작 실패:', { error });
    process.exit(1);
  }
};

startServer();