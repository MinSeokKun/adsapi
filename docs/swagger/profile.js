/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: 사용자 프로필 관리 API
 */

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: 현재 사용자 프로필 정보 조회
 *     tags: [Profile]
 *     description: 로그인한 사용자의 프로필 정보를 조회합니다
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 프로필 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 profile:
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
 *                       enum: [user, admin, superadmin]
 *                     provider:
 *                       type: string
 *                       enum: [local, google, kakao, naver]
 *                     profileImage:
 *                       type: string
 *                       nullable: true
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: 인증되지 않음
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "프로필 정보를 조회하는 중 오류가 발생했습니다."
 *
 *   put:
 *     summary: 프로필 정보 수정
 *     tags: [Profile]
 *     description: 이름 및 프로필 이미지 등 프로필 정보를 수정합니다
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 사용자 이름
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: 프로필 이미지 파일 (최대 5MB, 이미지 파일만 허용)
 *               removeProfileImage:
 *                 type: boolean
 *                 description: 프로필 이미지 제거 요청 (true인 경우 기존 이미지 삭제)
 *     responses:
 *       200:
 *         description: 프로필 정보 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "프로필 정보가 성공적으로 업데이트되었습니다."
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
 *       400:
 *         description: 잘못된 요청 (필수 필드 누락, 이미지 크기 초과 등)
 *       401:
 *         description: 인증되지 않음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/profile/password:
 *   put:
 *     summary: 비밀번호 변경
 *     tags: [Profile]
 *     description: 로컬 사용자 (이메일/비밀번호 회원가입)의 비밀번호를 변경합니다
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: 현재 비밀번호
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: 새 비밀번호 (최소 8자 이상)
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "비밀번호가 성공적으로 변경되었습니다."
 *       400:
 *         description: 잘못된 요청 또는 유효하지 않은 비밀번호
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "현재 비밀번호가 일치하지 않습니다."
 *       401:
 *         description: 인증되지 않음
 *       500:
 *         description: 서버 오류
 */

// 이하 실제 코드는 그대로 두고 주석만 추가합니다