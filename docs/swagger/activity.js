/**
 * @swagger
 * tags:
 *   name: AdminActivity
 *   description: 사용자 활동 관리 API
 */

/**
 * @swagger
 * /api/activity:
 *   get:
 *     summary: 활동 검색
 *     tags: [AdminActivity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: 특정 사용자 ID로 필터링
 *       - in: query
 *         name: activityType
 *         schema:
 *           type: string
 *         description: 활동 유형
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 검색 시작 날짜
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 검색 종료 날짜
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 검색 키워드
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *     responses:
 *       200:
 *         description: 활동 검색 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 activities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activity'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/activity/recent:
 *   get:
 *     summary: 최근 활동 목록 조회
 *     description: 관리자 대시보드에서 사용할 최근 활동 목록을 가져옵니다.
 *     tags: [AdminActivity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 가져올 활동 수
 *     responses:
 *       200:
 *         description: 최근 활동 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 activities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activity'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/activity/user/{userId}:
 *   get:
 *     summary: 특정 사용자의 활동 조회
 *     tags: [AdminActivity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: 사용자 ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 가져올 활동 수
 *     responses:
 *       200:
 *         description: 사용자 활동 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 activities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activity'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/activity/stats:
 *   get:
 *     summary: 활동 통계 조회
 *     tags: [AdminActivity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 통계 조회 기간(일)
 *     responses:
 *       200:
 *         description: 활동 통계 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     activityByType:
 *                       type: array
 *                       items:
 *                         type: object
 *                     dailyActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                     mostActiveUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/activity/types:
 *   get:
 *     summary: 모든 활동 유형 목록 조회
 *     tags: [AdminActivity]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 활동 유형 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 types:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/activity/type/{type}:
 *   get:
 *     summary: 특정 유형의 활동 조회
 *     tags: [AdminActivity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: 활동 유형
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 가져올 활동 수
 *     responses:
 *       200:
 *         description: 활동 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 activities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activity'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/activity/salon/{salonId}:
 *   get:
 *     summary: 특정 살롱 관련 활동 조회
 *     tags: [AdminActivity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: salonId
 *         schema:
 *           type: integer
 *         required: true
 *         description: 살롱 ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 가져올 활동 수
 *     responses:
 *       200:
 *         description: 살롱 관련 활동 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 activities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activity'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       404:
 *         description: 살롱을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/activity/search:
 *   get:
 *     summary: 활동 검색
 *     tags: [AdminActivity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *       - in: query
 *         name: activityType
 *         schema:
 *           type: string
 *         description: 활동 유형
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 검색 시작 날짜
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 검색 종료 날짜
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 검색 키워드
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *     responses:
 *       200:
 *         description: 검색 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 activities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activity'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/activity/report/weekly:
 *   get:
 *     summary: 주간 활동 리포트 생성
 *     tags: [AdminActivity]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 주간 활동 리포트
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 report:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                     weeklyActivity:
 *                       type: array
 *                     activityByType:
 *                       type: array
 *                     topUsers:
 *                       type: array
 *                     activityChange:
 *                       type: object
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Activity:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         activity_type:
 *           type: string
 *         details:
 *           type: object
 *         created_at:
 *           type: string
 *           format: date-time
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             email:
 *               type: string
 */