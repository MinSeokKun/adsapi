/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: 사용자 인증 및 OAuth 관련 API
 */

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Google OAuth 로그인 시작
 *     tags: [Authentication]
 *     description: Google OAuth 로그인 프로세스를 시작합니다
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: 리다이렉트 정보를 담고 있는 인코딩된 JSON 문자열
 *     responses:
 *       302:
 *         description: Google 인증 페이지로 리다이렉트
 */

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth 콜백 처리
 *     tags: [Authentication]
 *     description: Google 인증 후 콜백을 처리하고 사용자를 프론트엔드로 리다이렉트합니다
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Google에서 제공하는 인증 코드
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: 리다이렉트 정보를 담고 있는 인코딩된 JSON 문자열
 *     responses:
 *       302:
 *         description: 프론트엔드로 리다이렉트
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /auth/naver:
 *   get:
 *     summary: Naver OAuth 로그인 시작
 *     tags: [Authentication]
 *     description: Naver OAuth 로그인 프로세스를 시작합니다
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: 리다이렉트 정보를 담고 있는 인코딩된 JSON 문자열
 *     responses:
 *       302:
 *         description: Naver 인증 페이지로 리다이렉트
 */

/**
 * @swagger
 * /auth/naver/callback:
 *   get:
 *     summary: Naver OAuth 콜백 처리
 *     tags: [Authentication]
 *     description: Naver 인증 후 콜백을 처리하고 사용자를 프론트엔드로 리다이렉트합니다
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Naver에서 제공하는 인증 코드
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: 리다이렉트 정보를 담고 있는 인코딩된 JSON 문자열
 *     responses:
 *       302:
 *         description: 프론트엔드로 리다이렉트
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /auth/kakao:
 *   get:
 *     summary: Kakao OAuth 로그인 시작
 *     tags: [Authentication]
 *     description: Kakao OAuth 로그인 프로세스를 시작합니다
 *     responses:
 *       302:
 *         description: Kakao 인증 페이지로 리다이렉트
 */

/**
 * @swagger
 * /auth/kakao/callback:
 *   get:
 *     summary: Kakao OAuth 콜백 처리
 *     tags: [Authentication]
 *     description: Kakao 인증 후 콜백을 처리하고 사용자를 프론트엔드로 리다이렉트합니다
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Kakao에서 제공하는 인증 코드
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: 리다이렉트 정보를 담고 있는 인코딩된 JSON 문자열
 *     responses:
 *       302:
 *         description: 프론트엔드로 리다이렉트
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 로그아웃
 *     tags: [Authentication]
 *     description: 현재 로그인된 사용자의 세션을 종료합니다
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "로그아웃 되었습니다."
 *       401:
 *         description: 인증되지 않음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/users/{userId}/role:
 *   patch:
 *     summary: 사용자 권한 업데이트
 *     tags: [Authentication]
 *     description: 특정 사용자의 권한을 변경합니다 (슈퍼 관리자만 가능)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, superadmin]
 *                 description: 변경할 권한
 *     responses:
 *       200:
 *         description: 권한 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "권한이 업데이트되었습니다."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: 현재 로그인된 사용자 정보 조회
 *     tags: [Authentication]
 *     description: 현재 로그인된 사용자의 정보를 반환합니다. 토큰이 없어도 사용 가능하며 이 경우 null을 반환합니다.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   nullable: true
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
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
