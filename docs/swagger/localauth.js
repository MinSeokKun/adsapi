/**
 * @swagger
 * tags:
 *   name: Local Authentication
 *   description: 이메일/비밀번호 기반 인증 API
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: 회원가입
 *     tags: [Local Authentication]
 *     description: 새로운 사용자를 등록합니다 (이메일/비밀번호 기반)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 사용자 이메일 주소
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 사용자 비밀번호 (최소 8자 이상)
 *               name:
 *                 type: string
 *                 description: 사용자 이름
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "회원가입이 완료되었습니다."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: 이미 사용 중인 이메일 또는 입력값 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "이미 사용 중인 이메일입니다."
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "서버 오류"
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 로그인
 *     tags: [Local Authentication]
 *     description: 이메일/비밀번호로 로그인하고 토큰을 발급받습니다
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 사용자 이메일 주소
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 사용자 비밀번호
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "로그인 성공"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     provider:
 *                       type: string
 *                     profileImage:
 *                       type: string
 *                       nullable: true
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *         headers:
 *           Set-Cookie:
 *             description: 인증 토큰이 쿠키로 설정됩니다
 *             schema:
 *               type: string
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "이메일 또는 비밀번호가 올바르지 않습니다."
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "서버 오류"
 */

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: 토큰 갱신
 *     tags: [Local Authentication]
 *     description: 쿠키에 저장된 리프레시 토큰을 사용하여 액세스 토큰을 갱신합니다
 *     responses:
 *       200:
 *         description: 토큰 갱신 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "토큰이 갱신되었습니다."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *         headers:
 *           Set-Cookie:
 *             description: 새로운 인증 토큰이 쿠키로 설정됩니다
 *             schema:
 *               type: string
 *       401:
 *         description: 유효하지 않은 리프레시 토큰
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "토큰이 유효하지 않습니다."
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /forgot-password:
 *   post:
 *     summary: 비밀번호 재설정 요청
 *     tags: [Local Authentication]
 *     description: 비밀번호 재설정 링크를 이메일로 전송합니다
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 사용자 이메일 주소
 *     responses:
 *       200:
 *         description: 비밀번호 재설정 이메일 발송 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "비밀번호 재설정 이메일이 발송되었습니다."
 *       404:
 *         description: 이메일을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "해당 이메일로 가입된 계정을 찾을 수 없습니다."
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: 비밀번호 재설정
 *     tags: [Local Authentication]
 *     description: 토큰을 확인하고 새 비밀번호로 변경합니다
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: 비밀번호 재설정 토큰
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 새 비밀번호
 *     responses:
 *       200:
 *         description: 비밀번호 재설정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "비밀번호가 성공적으로 재설정되었습니다."
 *       400:
 *         description: 유효하지 않은 토큰
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "유효하지 않거나 만료된 토큰입니다."
 *       500:
 *         description: 서버 오류
 */

// 이하 실제 코드는 그대로 두고 주석만 추가합니다