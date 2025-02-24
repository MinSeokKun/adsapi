const { Op } = require('sequelize');
const { User } = require('../models');
const logger = require('../config/winston');
const { sanitizeData } = require('../utils/sanitizer');
const tokenHandler = require('../middleware/tokenHandler');
const crypto = require('crypto');

class UserService {
  async getUsers(params, logContext) {
    try {
      const {
        limit = 20,
        page = 1,
        search,
        role,
        provider,
        startDate,
        endDate,
        sortBy = 'id',
        sortDir = 'DESC'
      } = params;

      const offset = (page - 1) * limit;
      const whereClause = this.buildWhereClause({
        search,
        role,
        provider,
        startDate,
        endDate
      });
      
      const order = this.buildOrderClause(sortBy, sortDir);

      const [users, totalUsers] = await Promise.all([
        User.findAll({
          where: whereClause,
          limit,
          offset,
          order,
          attributes: [
            'id',
            'email',
            'name',
            'role',
            'provider',
            'lastLogin',
            'createdAt',
            'updatedAt'
          ]
        }),
        User.count({ where: whereClause })
      ]);

      const totalPages = Math.ceil(totalUsers / limit);
      const hasNextPage = page < totalPages;

      logger.info('회원 목록 조회 성공', sanitizeData(logContext));

      return {
        users,
        pageInfo: {
          totalUsers,
          totalPages,
          currentPage: page,
          hasNextPage,
          limit
        },
        filters: {
          search,
          role,
          provider,
          startDate,
          endDate,
          sortBy,
          sortDir
        }
      };
    } catch (error) {
      logger.error('회원 목록 조회 실패', sanitizeData({
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        }
      }));
      throw error;
    }
  }

  async signup(userData, logContext) {
    try {
      const existingUser = await User.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        logger.warn('이미 사용 중인 이메일 입니다.', sanitizeData(logContext))
      }
      
      const user = await User.create({
        ...userData,
        provider: "local"
      });

      logger.info('회원가입 완료', sanitizeData({ ...logContext, userId: user.id }));

      return {
        id: user.id,
        email: user.email,
        name: user.name
      };
    } catch (error) {
      logger.error('회원가입 처리 실패', sanitizeData({
        ...logContext,
        error: this.formatError(error)
      }));
      throw error;
    }
  }

  async login(credentials, logContext) {
    try {
      const user = await User.findOne({ 
        where: { email: credentials.email } 
      });

      if (!user) {
        logger.warn('로그인 실패 - 사용자 없음', sanitizeData(logContext));
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }

      const updatedLogContext = {
        ...logContext,
        userId: user.id,
        provider: user.provider
      };

      // local 계정이 아닌 경우
      if (user.provider !== 'local') {
        logger.warn('로그인 실패 - 잘못된 인증 제공자', sanitizeData(updatedLogContext));
        throw new Error(`${user.provider} 계정으로 가입된 이메일입니다. ${user.provider} 로그인을 이용해주세요.`);
      }

      // 비밀번호 검증
      const isValid = await user.validatePassword(credentials.password);
      if (!isValid) {
        logger.warn('로그인 실패 - 잘못된 비밀번호', sanitizeData(updatedLogContext));
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }

      // 토큰 생성
      const accessToken = tokenHandler.generateAccessToken(user);
      const refreshToken = tokenHandler.generateRefreshToken(user);

      // 로그인 시간 업데이트
      await user.update({
        refreshToken,
        lastLogin: new Date()
      });

      logger.info('로그인 성공', sanitizeData(updatedLogContext));

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      logger.error('로그인 처리 실패', sanitizeData({
        ...logContext,
        error: this.formatError(error)
      }));
      throw error;
    }
  }

  /**
   * 에러 포맷팅 헬퍼
   */
  formatError(error) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    };
  }

  /**
   * 비밀번호 재설정 요청
   */
  async requestPasswordReset(email, logContext) {
    try {
      logger.info('비밀번호 재설정 요청', sanitizeData(logContext));

      const user = await User.findOne({ 
        where: { email, provider: 'local' } 
      });

      if (!user) {
        logger.warn('비밀번호 재설정 실패 - 사용자 없음', sanitizeData(logContext));
        throw new Error('해당 이메일로 가입된 계정을 찾을 수 없습니다.');
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1시간

      await user.update({
        verificationToken: resetToken,
        verificationTokenExpires: resetTokenExpires
      });

      logger.info('비밀번호 재설정 토큰 생성', sanitizeData({
        ...logContext,
        userId: user.id,
        tokenExpiry: resetTokenExpires
      }));

      return { resetToken };
    } catch (error) {
      logger.error('비밀번호 재설정 요청 처리 실패', sanitizeData({
        ...logContext,
        error: this.formatError(error)
      }));
      throw error;
    }
  }

  /**
   * 비밀번호 재설정
   */
  async resetPassword(token, newPassword, logContext) {
    try {
      logger.info('비밀번호 재설정 시도', sanitizeData(logContext));

      const user = await User.findOne({
        where: {
          verificationToken: token,
          verificationTokenExpires: { [Op.gt]: new Date() }
        }
      });

      if (!user) {
        logger.warn('비밀번호 재설정 실패 - 유효하지 않은 토큰', sanitizeData(logContext));
        throw new Error('유효하지 않거나 만료된 토큰입니다.');
      }

      await user.update({
        password: newPassword,
        verificationToken: null,
        verificationTokenExpires: null
      });

      logger.info('비밀번호 재설정 완료', sanitizeData({
        ...logContext,
        userId: user.id
      }));

      return true;
    } catch (error) {
      logger.error('비밀번호 재설정 처리 실패', sanitizeData({
        ...logContext,
        error: this.formatError(error)
      }));
      throw error;
    }
  }

  /**
   * 검색 조건을 위한 WHERE 절을 생성합니다.
   * @private
   */
  buildWhereClause({ search, role, provider, startDate, endDate }) {
    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    if (provider) {
      whereClause.provider = provider;
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    return whereClause;
  }

  /**
   * 정렬을 위한 ORDER 절을 생성합니다.
   * @private
   */
  buildOrderClause(sortBy, sortDir) {
    const order = [];
    const validSortFields = ['id', 'name', 'email', 'createdAt', 'lastLogin'];
    
    if (validSortFields.includes(sortBy)) {
      order.push([sortBy, sortDir]);
    }
    
    if (sortBy !== 'id') {
      order.push(['id', 'DESC']);
    }
    
    return order;
  }

}

module.exports = new UserService();