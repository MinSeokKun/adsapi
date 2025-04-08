/**
 * @swagger
 * tags:
 *   name: Salons
 *   description: 미용실 관리 관련 API
 */

/**
 * @swagger
 * /api/salons:
 *   get:
 *     summary: 개인 미용실 조회
 *     tags: [Salons]
 *     description: 현재 로그인한 사용자가 소유한 모든 미용실 목록을 조회합니다
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 미용실 목록 조회 성공
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
 *                       name:
 *                         type: string
 *                       business_hours:
 *                         type: string
 *                       business_number:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       status:
 *                         type: string
 *                         enum: [pending, approved, rejected]
 *                       location:
 *                         type: object
 *                         properties:
 *                           address_line1:
 *                             type: string
 *                           address_line2:
 *                             type: string
 *                             nullable: true
 *                           city:
 *                             type: string
 *                           district:
 *                             type: string
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
 *                       displays:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             device_id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             status:
 *                               type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 인증되지 않음
 *       500:
 *         description: 서버 오류
 *
 *   post:
 *     summary: 미용실 등록
 *     tags: [Salons]
 *     description: 새로운 미용실을 등록합니다
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - salon
 *               - address
 *             properties:
 *               salon:
 *                 type: object
 *                 required:
 *                   - name
 *                   - business_hours
 *                   - business_number
 *                   - phone
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: 미용실 이름
 *                   business_hours:
 *                     type: string
 *                     description: 영업 시간 (예: 10:00-20:00)
 *                   business_number:
 *                     type: string
 *                     description: 사업자 등록번호 (10자리)
 *                   phone:
 *                     type: string
 *                     description: 미용실 연락처
 *                   description:
 *                     type: string
 *                     description: 미용실 소개 및 설명
 *               address:
 *                 type: string
 *                 description: 미용실 주소 (도로명 또는 지번 주소)
 *               addressDetail:
 *                 type: string
 *                 description: 상세 주소 (동/호수 등)
 *     responses:
 *       201:
 *         description: 미용실 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "미용실이 등록되었습니다."
 *                 salon:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     business_hours:
 *                       type: string
 *                     business_number:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected]
 *                 location:
 *                   type: object
 *                   properties:
 *                     address_line1:
 *                       type: string
 *                     address_line2:
 *                       type: string
 *                     city:
 *                       type: string
 *                     district:
 *                       type: string
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *       400:
 *         description: 잘못된 요청 (필수 정보 누락, 잘못된 형식 등)
 *       401:
 *         description: 인증되지 않음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/salons/search:
 *   get:
 *     summary: 미용실 검색
 *     tags: [Salons]
 *     description: 위치(도시, 구/군) 및 키워드 기반으로 미용실을 검색합니다
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: 도시명
 *       - in: query
 *         name: district
 *         schema:
 *           type: string
 *         description: 구/군명
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 검색어 (미용실 이름)
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
 *         description: 한 페이지에 표시할 항목 수
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: 미용실 상태 필터링
 *     responses:
 *       200:
 *         description: 미용실 검색 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       business_hours:
 *                         type: string
 *                       status:
 *                         type: string
 *                       location:
 *                         type: object
 *                         properties:
 *                           address_line1:
 *                             type: string
 *                           city:
 *                             type: string
 *                           district:
 *                             type: string
 *                       owner:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
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
 * /api/salons/cities:
 *   get:
 *     summary: 도시 목록 조회
 *     tags: [Salons]
 *     description: 미용실이 등록된 모든 도시 목록을 조회합니다
 *     responses:
 *       200:
 *         description: 도시 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       city:
 *                         type: string
 *                       salonCount:
 *                         type: integer
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/salons/cities/{city}/districts:
 *   get:
 *     summary: 구/군 목록 조회
 *     tags: [Salons]
 *     description: 특정 도시에 속한 구/군 목록을 조회합니다
 *     parameters:
 *       - in: path
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: 도시명
 *     responses:
 *       200:
 *         description: 구/군 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       district:
 *                         type: string
 *                       salonCount:
 *                         type: integer
 *       400:
 *         description: 잘못된 요청 (도시 파라미터 누락)
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/salons/popular-cities:
 *   get:
 *     summary: 인기 도시 목록 조회
 *     tags: [Salons]
 *     description: 미용실이 가장 많이 등록된 인기 도시 목록을 조회합니다
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 조회할 도시 수
 *     responses:
 *       200:
 *         description: 인기 도시 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       city:
 *                         type: string
 *                       salonCount:
 *                         type: integer
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/salons/{salonId}:
 *   get:
 *     summary: 미용실 상세 조회
 *     tags: [Salons]
 *     description: 특정 미용실의 상세 정보를 조회합니다
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: salonId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미용실 ID
 *     responses:
 *       200:
 *         description: 미용실 상세 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salon:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     business_hours:
 *                       type: string
 *                     business_number:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                     location:
 *                       type: object
 *                       properties:
 *                         address_line1:
 *                           type: string
 *                         address_line2:
 *                           type: string
 *                         city:
 *                           type: string
 *                         district:
 *                           type: string
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                     displays:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           device_id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           status:
 *                             type: string
 *                     owner:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (해당 미용실 소유자가 아님)
 *       404:
 *         description: 미용실을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 *
 *   put:
 *     summary: 미용실 수정
 *     tags: [Salons]
 *     description: 특정 미용실의 정보를 수정합니다
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: salonId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미용실 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 미용실 이름
 *               business_hours:
 *                 type: string
 *                 description: 영업 시간
 *               phone:
 *                 type: string
 *                 description: 미용실 연락처
 *               description:
 *                 type: string
 *                 description: 미용실 설명
 *               location:
 *                 type: object
 *                 properties:
 *                   address_line1:
 *                     type: string
 *                     description: 기본 주소
 *                   address_line2:
 *                     type: string
 *                     description: 상세 주소
 *                   city:
 *                     type: string
 *                     description: 시/도
 *                   district:
 *                     type: string
 *                     description: 구/군
 *                   latitude:
 *                     type: number
 *                     description: 위도
 *                   longitude:
 *                     type: number
 *                     description: 경도
 *     responses:
 *       200:
 *         description: 미용실 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "미용실이 수정되었습니다."
 *                 salon:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     # 기타 속성 생략
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (해당 미용실 소유자가 아님)
 *       404:
 *         description: 미용실을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 *
 *   delete:
 *     summary: 미용실 삭제
 *     tags: [Salons]
 *     description: 특정 미용실을 삭제합니다
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: salonId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미용실 ID
 *     responses:
 *       200:
 *         description: 미용실 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "미용실이 삭제되었습니다."
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (해당 미용실 소유자가 아님)
 *       404:
 *         description: 미용실을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/salons/{salonId}/status:
 *   patch:
 *     summary: 미용실 상태 업데이트
 *     tags: [Salons]
 *     description: 미용실의 상태를 변경합니다 (슈퍼 관리자만 가능)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: salonId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미용실 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *                 description: 변경할 상태
 *     responses:
 *       200:
 *         description: 미용실 상태 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "미용실 상태가 변경되었습니다."
 *                 status:
 *                   type: string
 *                   enum: [pending, approved, rejected]
 *       400:
 *         description: 잘못된 상태값
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (슈퍼 관리자만 가능)
 *       404:
 *         description: 미용실을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

// 이하 실제 코드는 그대로 두고 주석만 추가합니다