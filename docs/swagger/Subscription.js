/**
 * @swagger
 * /api/subscription-plans:
 *   get:
 *     summary: 구독 플랜 목록 조회
 *     description: 활성화된 모든 구독 플랜을 조회합니다
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: 구독 플랜 목록이 성공적으로 반환됨
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: 플랜 ID
 *                       name:
 *                         type: string
 *                         description: 플랜 이름
 *                       type:
 *                         type: string
 *                         enum: [basic_sponsor, premium_sponsor]
 *                         description: 플랜 타입
 *                       price:
 *                         type: integer
 *                         description: 가격
 *                       durationMonths:
 *                         type: integer
 *                         description: 구독 기간(월)
 *                       features:
 *                         type: object
 *                         description: 플랜 기능 및 제한사항
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 플랜 생성 일시
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: 오류 메시지
 *                 message:
 *                   type: string
 *                   description: 상세 오류 메시지
 */

/**
 * @swagger
 * /api/subscription-plan/{planId}:
 *   get:
 *     summary: 구독 플랜 상세 조회
 *     description: 특정 ID의 구독 플랜 정보를 조회합니다
 *     tags: [Subscription]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 조회할 플랜 ID
 *     responses:
 *       200:
 *         description: 플랜 정보가 성공적으로 반환됨
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: 플랜 ID
 *                 name:
 *                   type: string
 *                   description: 플랜 이름
 *                 price:
 *                   type: integer
 *                   description: 가격
 *                 duration_months:
 *                   type: integer
 *                   description: 구독 기간(월)
 *                 features:
 *                   type: object
 *                   description: 플랜 기능 및 제한사항
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: 오류 메시지
 *       404:
 *         description: 구독 플랜을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: 오류 메시지
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: 오류 메시지
 */

/**
 * @swagger
 * /api/admin/subscription-plan:
 *   post:
 *     summary: 새 구독 플랜 등록
 *     description: 슈퍼관리자 권한으로 새로운 구독 플랜을 등록합니다
 *     tags: [Subscription, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - price
 *               - duration_months
 *               - features
 *             properties:
 *               name:
 *                 type: string
 *                 description: 플랜 이름
 *               type:
 *                 type: string
 *                 enum: [basic_sponsor, premium_sponsor]
 *                 description: 플랜 타입
 *               price:
 *                 type: integer
 *                 description: 가격
 *               duration_months:
 *                 type: integer
 *                 description: 구독 기간(월)
 *               features:
 *                 type: object
 *                 required:
 *                   - max_ads
 *                   - max_media_per_ad
 *                   - allowed_ad_types
 *                 properties:
 *                   max_ads:
 *                     type: integer
 *                     description: 최대 광고 개수
 *                   max_media_per_ad:
 *                     type: integer
 *                     description: 광고당 최대 미디어 개수
 *                   allowed_ad_types:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: 허용 광고 타입
 *     responses:
 *       201:
 *         description: 구독 플랜이 성공적으로 등록됨
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 성공 메시지
 *                 plan:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     price:
 *                       type: integer
 *                     durationMonths:
 *                       type: integer
 *                     features:
 *                       type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 required:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: 인증 오류
 *       403:
 *         description: 권한 부족
 *       409:
 *         description: 중복된 플랜 이름
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/admin/subscription-plans/{planId}:
 *   put:
 *     summary: 구독 플랜 수정
 *     description: 슈퍼관리자 권한으로 기존 구독 플랜을 수정합니다
 *     tags: [Subscription, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 수정할 플랜 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 플랜 이름
 *               type:
 *                 type: string
 *                 enum: [basic_sponsor, premium_sponsor]
 *                 description: 플랜 타입
 *               price:
 *                 type: integer
 *                 description: 가격
 *               duration_months:
 *                 type: integer
 *                 description: 구독 기간(월)
 *               features:
 *                 type: object
 *                 properties:
 *                   max_ads:
 *                     type: integer
 *                     description: 최대 광고 개수
 *                   max_media_per_ad:
 *                     type: integer
 *                     description: 광고당 최대 미디어 개수
 *                   allowed_ad_types:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: 허용 광고 타입
 *               is_active:
 *                 type: boolean
 *                 description: 플랜 활성화 상태
 *     responses:
 *       200:
 *         description: 구독 플랜이 성공적으로 수정됨
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 성공 메시지
 *                 plan:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     price:
 *                       type: integer
 *                     durationMonths:
 *                       type: integer
 *                     features:
 *                       type: object
 *                     isActive:
 *                       type: boolean
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: 인증 오류
 *       403:
 *         description: 권한 부족
 *       404:
 *         description: 구독 플랜을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       409:
 *         description: 중복된 플랜 이름
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: 서버 오류
 */