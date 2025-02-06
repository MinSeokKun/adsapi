const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const KakaoStrategy = require('passport-kakao').Strategy;
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
        name: profile.displayName,
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