/**
 * @swagger
 * tags:
 *   name: AdminDashboard
 *   description: 관리자 대시보드 API
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: 관리자 대시보드 정보 조회
 *     description: 회원 수, 광고 수, 살롱 수 및 최근 등록된 데이터를 포함한 대시보드 정보를 제공합니다.
 *     tags: [AdminDashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 대시보드 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       description: 총 회원 수
 *                     totalAds:
 *                       type: integer
 *                       description: 총 광고 수
 *                     totalSalons:
 *                       type: integer
 *                       description: 총 살롱 수
 *                 recentUsers:
 *                   type: array
 *                   description: 최근 가입한 사용자 목록
 *                   items:
 *                     $ref: '#/components/schemas/UserSummary'
 *                 recentAds:
 *                   type: array
 *                   description: 최근 등록된 광고 목록
 *                   items:
 *                     $ref: '#/components/schemas/AdSummary'
 *                 recentSalons:
 *                   type: array
 *                   description: 최근 등록된 살롱 목록
 *                   items:
 *                     $ref: '#/components/schemas/SalonSummary'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: 전체 회원 조회
 *     description: 페이지네이션, 검색, 필터링 기능을 포함한 전체 회원 목록을 조회합니다.
 *     tags: [AdminDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 회원 이름/이메일 검색
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, superadmin]
 *         description: 권한으로 필터링
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [local, google, kakao, naver]
 *         description: 가입 제공자로 필터링
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 가입일 시작 범위
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 가입일 종료 범위
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, name, email, createdAt, lastLogin]
 *           default: id
 *         description: 정렬 기준 필드
 *       - in: query
 *         name: sortDir
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: 정렬 방향
 *     responses:
 *       200:
 *         description: 회원 목록 및 페이지네이션 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pageInfo:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     limit:
 *                       type: integer
 *                 filters:
 *                   type: object
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/admin/ads:
 *   get:
 *     summary: 전체 광고 조회
 *     description: 관리자용 전체 광고 목록을 조회합니다.
 *     tags: [AdminDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 광고 제목 검색
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sponsor, salon]
 *         description: 광고 유형으로 필터링
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: 광고 상태로 필터링
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *         description: 정렬 기준 필드
 *       - in: query
 *         name: sortDir
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: 정렬 방향
 *     responses:
 *       200:
 *         description: 광고 목록 및 페이지네이션 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ads:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ad'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrevious:
 *                       type: boolean
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/admin/salons:
 *   get:
 *     summary: 전체 미용실 조회
 *     description: 관리자용 전체 미용실 목록을 조회합니다.
 *     tags: [AdminDashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 미용실 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salons:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Salon'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/admin/salon/{id}:
 *   get:
 *     summary: 미용실 상세 조회
 *     description: 관리자용 미용실 상세 정보를 조회합니다.
 *     tags: [AdminDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 미용실 ID
 *     responses:
 *       200:
 *         description: 미용실 상세 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salon:
 *                   $ref: '#/components/schemas/Salon'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 부족
 *       404:
 *         description: 미용실을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         provider:
 *           type: string
 *           enum: [local, google, kakao, naver]
 *         createdAt:
 *           type: string
 *           format: date-time
 * 
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *         name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [user, admin, superadmin]
 *         provider:
 *           type: string
 *           enum: [local, google, kakao, naver]
 *         profileImage:
 *           type: string
 *           nullable: true
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     AdSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         type:
 *           type: string
 *           enum: [sponsor, salon]
 *         createdAt:
 *           type: string
 *           format: date-time
 * 
 *     Ad:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         type:
 *           type: string
 *           enum: [sponsor, salon]
 *         salon_id:
 *           type: integer
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         media:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [image, video]
 *               duration:
 *                 type: integer
 *               size:
 *                 type: string
 *               is_primary:
 *                 type: boolean
 *         schedules:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               time:
 *                 type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     SalonSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         owner:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *         location:
 *           type: object
 *           properties:
 *             address_line1:
 *               type: string
 *             address_line2:
 *               type: string
 *               nullable: true
 * 
 *     Salon:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         business_hours:
 *           type: string
 *         business_number:
 *           type: string
 *         phone:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         owner:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         location:
 *           type: object
 *           properties:
 *             address_line1:
 *               type: string
 *             address_line2:
 *               type: string
 *               nullable: true
 *             city:
 *               type: string
 *             district:
 *               type: string
 *             latitude:
 *               type: number
 *               format: float
 *             longitude:
 *               type: number
 *               format: float
 *         displays:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               device_id:
 *                 type: string
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */