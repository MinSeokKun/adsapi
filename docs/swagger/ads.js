/**
 * @swagger
 * tags:
 *   name: Advertisements
 *   description: 광고 관리 API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Ad:
 *       type: object
 *       required:
 *         - title
 *         - type
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
 *           description: 광고 타입 (sponsor 또는 salon)
 *         is_active:
 *           type: boolean
 *           description: 광고 활성화 상태
 *         salon_id:
 *           type: integer
 *           description: 연결된 미용실 ID (salon 타입인 경우)
 *         media:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: 미디어 URL
 *               type:
 *                 type: string
 *                 enum: [image, video]
 *                 description: 미디어 타입
 *               duration:
 *                 type: integer
 *                 description: 재생 시간(초)
 *               size:
 *                 type: string
 *                 enum: [min, max]
 *                 description: 표시 크기
 *               is_primary:
 *                 type: boolean
 *                 description: 대표 이미지 여부
 *         schedules:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               time:
 *                 type: string
 *                 description: 시간 (HH:00:00 형식)
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/ads:
 *   get:
 *     summary: 광고 목록 조회
 *     description: 광고 목록을 조회합니다. 시간(time) 파라미터를 통해 특정 시간대의 광고만 필터링할 수 있습니다.
 *     tags: [Advertisements]
 *     parameters:
 *       - in: query
 *         name: time
 *         schema:
 *           type: string
 *           description: 시간 필터 (예시 - "13"은 13시 광고를 의미함)
 *     responses:
 *       200:
 *         description: 광고 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ads:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ad'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */

/**
 * @swagger
 * /api/display/ads:
 *   get:
 *     summary: 디스플레이용 광고 조회
 *     description: 디스플레이 기기에서 표시할 광고 목록을 조회합니다. 시간(time) 파라미터로 필터링 가능합니다.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: time
 *         schema:
 *           type: string
 *           description: 시간 필터 (예시 - "13"은 13시 광고를 의미함)
 *     responses:
 *       200:
 *         description: 디스플레이용 광고 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ads:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ad'
 *       401:
 *         description: 인증되지 않음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/ads/search:
 *   get:
 *     summary: 광고 검색
 *     description: 다양한 조건으로 광고를 검색합니다.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: 광고 제목 검색어
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sponsor, salon]
 *         description: 광고 유형
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: 광고 상태
 *       - in: query
 *         name: salonId
 *         schema:
 *           type: integer
 *         description: 미용실 ID
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
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *         description: 정렬 기준 필드
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: 정렬 방향
 *     responses:
 *       200:
 *         description: 광고 검색 결과
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
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrevious:
 *                       type: boolean
 *                 filters:
 *                   type: object
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/public/ads:
 *   get:
 *     summary: 공개 광고 목록 조회
 *     description: 일반 사용자에게 제공되는 공개 광고 목록을 조회합니다.
 *     tags: [Advertisements]
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: 광고 제목 검색어
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *         description: 정렬 기준 필드
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: 정렬 방향
 *     responses:
 *       200:
 *         description: 공개 광고 목록
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
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrevious:
 *                       type: boolean
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/ads/list:
 *   get:
 *     summary: 모든 활성 광고 목록 조회
 *     description: 현재 활성화된 모든 광고 목록을 조회합니다.
 *     tags: [Advertisements]
 *     responses:
 *       200:
 *         description: 활성 광고 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ads:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ad'
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/ads:
 *   post:
 *     summary: 새 광고 등록
 *     description: 새로운 광고를 등록합니다.
 *     tags: [Advertisements]
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
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *                 description: 광고 제목
 *               type:
 *                 type: string
 *                 enum: [sponsor, salon]
 *                 description: 광고 타입
 *               is_active:
 *                 type: boolean
 *                 default: true
 *                 description: 광고 활성화 상태
 *               schedules:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 광고 표시 시간 배열 (예 ["09", "10", "11"])
 *               maxFiles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 최대 크기로 표시되는 미디어 파일들
 *               minFiles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 최소 크기로 표시되는 미디어 파일들
 *               targetLocations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     target_type:
 *                       type: string
 *                       enum: [nationwide, administrative]
 *                     city:
 *                       type: string
 *                     district:
 *                       type: string
 *               campaign:
 *                 type: object
 *                 description: 광고 캠페인 정보 (선택 사항)
 *                 properties:
 *                   budget:
 *                     type: number
 *                     description: 캠페인 총 예산
 *                   daily_budget:
 *                     type: number
 *                     description: 일일 예산 (선택 사항)
 *                   start_date:
 *                     type: string
 *                     format: date-time
 *                     description: 캠페인 시작일
 *                   end_date:
 *                     type: string
 *                     format: date-time
 *                     description: 캠페인 종료일
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
 *                 ad:
 *                   $ref: '#/components/schemas/Ad'
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증되지 않음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/ads/{id}:
 *   get:
 *     summary: ID로 광고 조회
 *     description: 특정 ID의 광고 상세 정보를 조회합니다.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 광고 ID
 *     responses:
 *       200:
 *         description: 광고 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ad:
 *                   $ref: '#/components/schemas/Ad'
 *       401:
 *         description: 인증되지 않음
 *       404:
 *         description: 광고를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/ads/{id}:
 *   put:
 *     summary: 광고 수정
 *     description: 특정 ID의 광고 정보를 수정합니다.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 광고 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: 광고 제목
 *               is_active:
 *                 type: boolean
 *                 description: 광고 활성화 상태
 *               schedules:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 광고 표시 시간 배열
 *               media:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                 description: 광고 미디어 ID 목록
 *               targetLocations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     target_type:
 *                       type: string
 *                       enum: [nationwide, administrative]
 *                     city:
 *                       type: string
 *                     district:
 *                       type: string
 *               campaign:
 *                 type: object
 *                 description: 광고 캠페인 정보. null인 경우 캠페인 삭제
 *                 nullable: true
 *                 properties:
 *                   budget:
 *                     type: number
 *                     description: 캠페인 총 예산
 *                   daily_budget:
 *                     type: number
 *                     description: 일일 예산 (선택 사항)
 *                   start_date:
 *                     type: string
 *                     format: date-time
 *                     description: 캠페인 시작일
 *                   end_date:
 *                     type: string
 *                     format: date-time
 *                     description: 캠페인 종료일
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
 *                 ad:
 *                   $ref: '#/components/schemas/Ad'
 *       401:
 *         description: 인증되지 않음
 *       404:
 *         description: 광고를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/ads/{id}:
 *   delete:
 *     summary: 광고 삭제
 *     description: 특정 ID의 광고를 삭제합니다.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 광고를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/ads/schedule:
 *   post:
 *     summary: 광고 스케줄 등록 및 수정
 *     description: 광고의 표시 스케줄을 등록하거나 수정합니다.
 *     tags: [Advertisements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - ad_id
 *                 - time
 *               properties:
 *                 ad_id:
 *                   type: integer
 *                   description: 광고 ID
 *                 time:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: 스케줄 시간 배열 (예 ["09", "13", "18"])
 *     responses:
 *       200:
 *         description: 스케줄 업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ads:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ad'
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/ads/{id}/media:
 *   post:
 *     summary: 광고에 새 미디어 추가
 *     description: 특정 광고에 새 미디어 파일을 추가합니다.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 광고 ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               maxFiles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 최대 크기로 표시되는 미디어 파일들
 *               minFiles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 최소 크기로 표시되는 미디어 파일들
 *     responses:
 *       201:
 *         description: 미디어 추가 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 media:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       url:
 *                         type: string
 *                       type:
 *                         type: string
 *                       duration:
 *                         type: integer
 *                       size:
 *                         type: string
 *                       is_primary:
 *                         type: boolean
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증되지 않음
 *       404:
 *         description: 광고를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Campaign:
 *       type: object
 *       required:
 *         - budget
 *         - start_date
 *         - end_date
 *       properties:
 *         id:
 *           type: integer
 *           description: 캠페인 ID
 *         budget:
 *           type: number
 *           format: float
 *           description: 캠페인 총 예산
 *         daily_budget:
 *           type: number
 *           format: float
 *           description: 일일 예산 (선택 사항)
 *         start_date:
 *           type: string
 *           format: date-time
 *           description: 캠페인 시작일
 *         end_date:
 *           type: string
 *           format: date-time
 *           description: 캠페인 종료일
 *         isActive:
 *           type: boolean
 *           description: 현재 활성화 상태 여부
 */

/**
 * @swagger
 * /api/ads/{id}/campaign:
 *   post:
 *     summary: 광고 캠페인 생성 또는 업데이트
 *     description: 특정 광고에 대한 캠페인을 생성하거나 업데이트합니다.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 광고 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - budget
 *               - start_date
 *               - end_date
 *             properties:
 *               budget:
 *                 type: number
 *                 format: float
 *                 description: 캠페인 총 예산
 *               daily_budget:
 *                 type: number
 *                 format: float
 *                 description: 일일 예산 (선택 사항)
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 description: 캠페인 시작일
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 description: 캠페인 종료일
 *     responses:
 *       200:
 *         description: 캠페인 생성/업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 campaign:
 *                   $ref: '#/components/schemas/Campaign'
 *       400:
 *         description: 잘못된 요청 (예산이 0보다 작거나, 종료일이 시작일보다 빠른 경우 등)
 *       401:
 *         description: 인증되지 않음
 *       404:
 *         description: 광고를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/ads/{id}/campaign:
 *   delete:
 *     summary: 광고 캠페인 삭제
 *     description: 특정 광고의 캠페인을 삭제합니다.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 광고 ID
 *     responses:
 *       200:
 *         description: 캠페인 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: 인증되지 않음
 *       404:
 *         description: 광고를 찾을 수 없거나 해당 광고에 캠페인이 존재하지 않음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/ads/campaigns/active:
 *   get:
 *     summary: 활성 캠페인 목록 조회
 *     description: 현재 활성화된 모든 캠페인 목록을 조회합니다. 활성화된 캠페인은 현재 날짜가 캠페인의 시작일과 종료일 사이에 있는 경우입니다.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 활성 캠페인 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: 캠페인 ID
 *                       budget:
 *                         type: number
 *                         description: 총 예산
 *                       daily_budget:
 *                         type: number
 *                         description: 일일 예산
 *                       start_date:
 *                         type: string
 *                         format: date-time
 *                         description: 시작일
 *                       end_date:
 *                         type: string
 *                         format: date-time
 *                         description: 종료일
 *                       ad:
 *                         $ref: '#/components/schemas/Ad'
 *       401:
 *         description: 인증되지 않음
 *       500:
 *         description: 서버 오류
 */