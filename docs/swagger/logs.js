/**
 * @swagger
 * tags:
 *   name: AdminLogs
 *   description: 로그 관리 API
 */

/**
 * @swagger
 * /api/logs/files:
 *   get:
 *     summary: 로그 파일 목록 조회
 *     tags: [AdminLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 로그 파일 목록을 성공적으로 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: 파일명
 *                       size:
 *                         type: number
 *                         description: 파일 크기
 *                       type:
 *                         type: string
 *                         description: 로그 유형 (error/combined)
 *                       created:
 *                         type: string
 *                         format: date-time
 *                         description: 파일 생성 일시
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/logs/level:
 *   get:
 *     summary: 현재 로그 레벨 조회
 *     tags: [AdminLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 현재 로그 레벨 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 level:
 *                   type: string
 *                   enum: [error, warn, info, http, debug]
 *                   example: info
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 *   post:
 *     summary: 로그 레벨 변경
 *     tags: [AdminLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - level
 *             properties:
 *               level:
 *                 type: string
 *                 enum: [error, warn, info, http, debug]
 *                 example: info
 *     responses:
 *       200:
 *         description: 로그 레벨 변경 성공
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
 *                   example: 로그 레벨이 변경되었습니다.
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/logs/search:
 *   get:
 *     summary: 로그 검색
 *     tags: [AdminLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: requestId
 *         schema:
 *           type: string
 *         required: true
 *         description: 요청 ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: 검색 날짜 (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: 요청 ID에 대한 로그 검색 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: 로그를 찾을 수 없음
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/logs/content:
 *   get:
 *     summary: 로그 파일 내용 조회
 *     tags: [AdminLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: file
 *         schema:
 *           type: string
 *         required: true
 *         description: 로그 파일명
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [error, combined]
 *         required: true
 *         description: 로그 파일 유형
 *     responses:
 *       200:
 *         description: 로그 파일 내용 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 content:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       404:
 *         description: 파일을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/logs/clean:
 *   post:
 *     summary: 오래된 로그 정리
 *     tags: [AdminLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 30
 *                 description: 보존할 로그 기간 (일)
 *     responses:
 *       200:
 *         description: 오래된 로그 정리 성공
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
 *                   example: 30일 이상 된 로그 파일이 정리되었습니다.
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */