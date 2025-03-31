const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const KakaoStrategy = require('passport-kakao').Strategy;
const NaverStrategy = require('passport-naver-v2').Strategy;
const { User } = require('../models');
const { Op } = require('sequelize');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Google Strategy 설정
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            {
              provider: 'google',
              providerId: profile.id
            },
            {
              email: profile.emails[0].value
            }
          ]
        }
      });
      
      if (existingUser) {
        // 이미 존재하는 계정이지만 다른 provider로 가입한 경우
        if (existingUser.provider !== 'google') {
          console.log('이미 다른 방식으로 가입된 이메일입니다:', existingUser.provider);
        }
        return done(null, existingUser);
      }

      const newUser = await User.create({
        email: profile.emails[0].value,
        name: profile.displayName,
        provider: 'google',
        providerId: profile.id,
        profileImage: profile.photos[0].value,
        refreshToken
      });

      done(null, newUser);
    } catch (error) {
      done(error);
    }
  }
));

// Naver Strategy 설정
passport.use(new NaverStrategy({
  clientID: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    callbackURL: "/auth/naver/callback",
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      
      const email = profile.email;
      
      if (!email) {
        // _json.response에서 이메일 추출 시도
        const responseEmail = profile._json?.response?.email;
        
        if (responseEmail) {
          // 이 값을 사용하는 대신 아래 코드 계속 진행
          const existingUser = await User.findOne({
            where: {
              [Op.or]: [
                {
                  provider: 'naver',
                  providerId: profile.id
                },
                {
                  email: responseEmail
                }
              ]
            }
          });
          
          if (existingUser) {
            if (existingUser.provider !== 'naver') {
              console.log('이미 다른 방식으로 가입된 이메일입니다:', existingUser.provider);
            }
            return done(null, existingUser);
          }
  
          const newUser = await User.create({
            email: responseEmail,
            name: profile.name || profile._json?.response?.name || '네이버 사용자',
            provider: 'naver',
            providerId: profile.id,
            profileImage: profile.profileImage || profile._json?.response?.profile_image,
            refreshToken
          });
  
          return done(null, newUser);
        }
        
        // 최후의 대안: providerId를 이용한 임시 이메일 생성
        const tempEmail = `naver_${profile.id}@example.com`;
        
        const existingUser = await User.findOne({
          where: {
            provider: 'naver',
            providerId: profile.id
          }
        });
        
        if (existingUser) {
          return done(null, existingUser);
        }
  
        const newUser = await User.create({
          email: tempEmail,
          name: profile.name || profile._json?.response?.name || '네이버 사용자',
          provider: 'naver',
          providerId: profile.id,
          profileImage: profile.profileImage || profile._json?.response?.profile_image,
          refreshToken
        });
  
        return done(null, newUser);
      }
  
      // 원래 코드 계속 진행 (이메일이 있는 경우)
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            {
              provider: 'naver',
              providerId: profile.id
            },
            {
              email: email
            }
          ]
        }
      });
      
      if (existingUser) {
        if (existingUser.provider !== 'naver') {
          console.log('이미 다른 방식으로 가입된 이메일입니다:', existingUser.provider);
        }
        return done(null, existingUser);
      }
  
      const newUser = await User.create({
        email: email,
        name: profile.name || '네이버 사용자',
        provider: 'naver',
        providerId: profile.id,
        profileImage: profile.profileImage,
        refreshToken
      });
  
      done(null, newUser);
    } catch (error) {
      console.error('네이버 인증 오류:', error);
      done(error);
    }
  }
));

// Kakao Strategy 설정
passport.use(new KakaoStrategy({
    clientID: process.env.KAKAO_CLIENT_ID,
    callbackURL: "/auth/kakao/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await User.findOne({
        where: {
          provider: 'kakao',
          providerId: profile.id
        }
      });

      if (existingUser) {
        return done(null, existingUser);
      }

      const newUser = await User.create({
        email: profile._json.kakao_account.email,
        name: profile.profile_nickname,
        provider: 'kakao',
        providerId: profile.id,
        profileImage: profile._json.properties.profile_image,
        refreshToken
      });

      done(null, newUser);
    } catch (error) {
      done(error);
    }
  }
));