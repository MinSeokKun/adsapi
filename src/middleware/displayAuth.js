const { Display } = require('../models');

const displayAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '인증 토큰이 필요합니다' });
    }

    const access_token = authHeader.split(' ')[1];
    // console.log('display Token', access_token);
    
    const display = await Display.findOne({
      where: {
        access_token
      },
      logging: console.log // 실제 실행되는 SQL문 확인
    });

    if (!display) {
      return res.status(401).json({ message: '유효하지 않은 인증정보입니다' });
    }

    // 마지막 핑 업데이트
    await display.update({ last_ping: new Date() });

    // 요청 객체에 디스플레이 정보 추가
    req.display = display;
    next();

  } catch (error) {
    console.error('디스플레이 인증 에러:', error);
    res.status(500).json({ message: '서버 에러가 발생했습니다' });
  }
};

module.exports = displayAuth;