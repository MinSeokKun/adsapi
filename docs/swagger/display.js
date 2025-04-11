/**
 * @swagger
 * tags:
 *   name: Displays
 *   description: 미용실 디스플레이 관리 API
 */

/**
 * @swagger
 * /api/displays:
 *   post:
 *     summary: 새 디스플레이 등록
 *     tags: [Displays]
 *     description: 미용실에 새 디스플레이를 등록합니다 (미용실 관리자만 가능)
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
 *               - salon_id
 *             properties:
 *               name:
 *                 type: string
 *                 description: 디스플레이 이름 (예시 - 입구, 대기실)
 *               salon_id:
 *                 type: integer
 *                 description: 미용실 ID
 *     responses:
 *       201:
 *         description: 디스플레이 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 device_id:
 *                   type: string
 *                   description: 디스플레이 고유 ID
 *                 access_token:
 *                   type: string
 *                   description: 디스플레이 접근 토큰
 *                 name:
 *                   type: string
 *                   description: 디스플레이 이름
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (해당 미용실 소유자가 아님)
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/displays/activate:
 *   post:
 *     summary: 디스플레이 활성화
 *     tags: [Displays]
 *     description: 디바이스에서 호출하여 디스플레이를 활성화합니다
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_id
 *               - access_token
 *             properties:
 *               device_id:
 *                 type: string
 *                 description: 디스플레이 고유 ID
 *               access_token:
 *                 type: string
 *                 description: 디스플레이 접근 토큰
 *     responses:
 *       200:
 *         description: 디스플레이 활성화 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "디스플레이가 활성화되었습니다"
 *       401:
 *         description: 유효하지 않은 인증 정보
 *       404:
 *         description: 디스플레이를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/displays/{id}:
 *   get:
 *     summary: 살롱별 디스플레이 목록 조회
 *     tags: [Displays]
 *     description: 특정 미용실의 디스플레이 목록을 조회합니다
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미용실 ID
 *     responses:
 *       200:
 *         description: 디스플레이 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "디스플레이 조회 완료"
 *                 displays:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       device_id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [active, inactive, maintenance]
 *                       last_ping:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (해당 미용실 소유자가 아님)
 *       500:
 *         description: 서버 오류
 *
 *   delete:
 *     summary: 디스플레이 삭제
 *     tags: [Displays]
 *     description: 특정 디스플레이를 삭제합니다
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 디스플레이 ID
 *     responses:
 *       200:
 *         description: 디스플레이 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "디스플레이 삭제 완료"
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (해당 디스플레이의 소유자가 아님)
 *       404:
 *         description: 디스플레이를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

// 이하 실제 코드는 그대로 두고 주석만 추가합니다