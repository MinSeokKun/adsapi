/**
 * @swagger
 * tags:
 *   name: SalonAds
 *   description: 미용실 개인 광고 관리 API
 */

/**
 * @swagger
 * /api/ads/salon:
 *   get:
 *     summary: 미용실 개인 광고 목록 조회
 *     description: 로그인한 사용자가 소유한 미용실의 광고 목록을 조회합니다.
 *     tags: [SalonAds]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 미용실 광고 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salons:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: 미용실 ID
 *                       name:
 *                         type: string
 *                         description: 미용실 이름
 *                       address:
 *                         type: string
 *                         description: 미용실 주소
 *                       business_hours:
 *                         type: string
 *                         description: 영업 시간
 *                       ads:
 *                         type: array
 *                         description: 미용실 광고 목록
 *                         items:
 *                           $ref: '#/components/schemas/Ad'
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 미용실 광고 조회 중 오류가 발생했습니다
 *                 details:
 *                   type: string
 *
 *   post:
 *     summary: 미용실 개인 광고 등록
 *     description: 사용자가 소유한 미용실에 새로운 광고를 등록합니다.
 *     tags: [SalonAds]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - salon_id
 *             properties:
 *               title:
 *                 type: string
 *                 description: 광고 제목
 *               salon_id:
 *                 type: integer
 *                 description: 미용실 ID
 *               schedules:
 *                 type: array
 *                 description: 광고 스케줄 (시간)
 *                 items:
 *                   type: string
 *                   format: HH:MM:SS
 *                   example: "09:00:00"
 *               files:
 *                 type: array
 *                 description: 광고 미디어 파일 (이미지/비디오)
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: 광고 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 광고가 성공적으로 저장되었습니다
 *                 ad:
 *                   $ref: '#/components/schemas/Ad'
 *       400:
 *         description: 필수 입력값 누락
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 해당 미용실의 소유자가 아님
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/ads/salon/{id}:
 *   put:
 *     summary: 미용실 개인 광고 수정
 *     description: 기존 미용실 광고를 수정합니다.
 *     tags: [SalonAds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 광고 ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: 광고 제목
 *               is_active:
 *                 type: boolean
 *                 description: 광고 활성화 여부
 *               schedules:
 *                 type: array
 *                 description: 광고 스케줄 (시간)
 *                 items:
 *                   type: string
 *                   format: HH:MM:SS
 *                   example: "09:00:00"
 *               files:
 *                 type: array
 *                 description: 광고 미디어 파일 (이미지/비디오)
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: 광고 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 광고가 성공적으로 수정되었습니다
 *                 ad:
 *                   $ref: '#/components/schemas/Ad'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 해당 미용실의 소유자가 아님
 *       404:
 *         description: 광고를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 *
 *   delete:
 *     summary: 미용실 개인 광고 삭제
 *     description: 미용실 광고를 삭제합니다.
 *     tags: [SalonAds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 광고 ID
 *     responses:
 *       200:
 *         description: 광고 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 광고가 성공적으로 삭제되었습니다
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 해당 미용실의 소유자가 아님
 *       404:
 *         description: 광고를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Ad:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 광고 ID
 *         title:
 *           type: string
 *           description: 광고 제목
 *         type:
 *           type: string
 *           enum: [sponsor, salon]
 *           description: 광고 유형
 *           example: salon
 *         is_active:
 *           type: boolean
 *           description: 광고 활성화 여부
 *         media:
 *           type: array
 *           description: 광고 미디어 목록
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: 미디어 URL
 *               type:
 *                 type: string
 *                 enum: [image, video]
 *                 description: 미디어 유형
 *               duration:
 *                 type: integer
 *                 description: 재생 시간(초)
 *               size:
 *                 type: string
 *                 enum: [min, max]
 *                 description: 표시 크기
 *               is_primary:
 *                 type: boolean
 *                 description: 대표 미디어 여부
 *         schedules:
 *           type: array
 *           description: 광고 스케줄
 *           items:
 *             type: object
 *             properties:
 *               time:
 *                 type: string
 *                 format: HH:MM:SS
 *                 description: 광고 표시 시간
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 생성 일시
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 수정 일시
 */