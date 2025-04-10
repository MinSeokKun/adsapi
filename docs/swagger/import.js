/**
 * @swagger
 * tags:
 *   name: 데이터 가져오기
 *   description: 테스트 데이터 삽입 API
 */

/**
 * @swagger
 * /api/admin/import/guide/{dataType}:
 *   get:
 *     tags:
 *       - 데이터 가져오기
 *     summary: CSV 파일 가이드라인 조회
 *     description: 데이터 유형에 따른 CSV 파일 형식 가이드라인을 제공합니다.
 *     parameters:
 *       - in: path
 *         name: dataType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [users, salons]
 *         description: 데이터 유형 (users - 사용자, salons - 미용실)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 성공적으로 가이드라인 정보를 반환함
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 guide:
 *                   type: object
 *                   properties:
 *                     format:
 *                       type: string
 *                       example: "CSV (쉼표로 구분된 값)"
 *                     requiredColumns:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["email", "password", "name", "role"]
 *                     optionalColumns:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *                     example:
 *                       type: string
 *                     notes:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 */

/**
 * @swagger
 * /api/admin/import/users:
 *   post:
 *     tags:
 *       - 데이터 가져오기
 *     summary: 사용자 데이터 가져오기
 *     description: CSV 파일을 통해 사용자 데이터를 일괄 등록합니다.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csv:
 *                 type: string
 *                 format: binary
 *                 description: CSV 파일 (최대 10MB)
 *     responses:
 *       200:
 *         description: 성공적으로 사용자 데이터를 가져옴
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
 *                   example: 총 5개의 사용자 데이터가 성공적으로 가져와졌습니다.
 *                 result:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 7
 *                     success:
 *                       type: integer
 *                       example: 5
 *                     error:
 *                       type: integer
 *                       example: 2
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           email:
 *                             type: string
 *                             example: user@example.com
 *                           status:
 *                             type: string
 *                             enum: [success, error, skip]
 *                             example: success
 *                           message:
 *                             type: string
 *                             example: 사용자가 성공적으로 생성되었습니다
 *       400:
 *         description: 잘못된 요청 또는 CSV 파일 오류
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       429:
 *         description: 요청 제한 초과
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /api/admin/import/salons:
 *   post:
 *     tags:
 *       - 데이터 가져오기
 *     summary: 미용실 데이터 가져오기
 *     description: CSV 파일을 통해 미용실 데이터를 일괄 등록합니다.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csv:
 *                 type: string
 *                 format: binary
 *                 description: CSV 파일 (최대 10MB)
 *     responses:
 *       200:
 *         description: 성공적으로 미용실 데이터를 가져옴
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
 *                   example: 총 5개의 미용실 데이터가 성공적으로 가져와졌습니다.
 *                 result:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 7
 *                     success:
 *                       type: integer
 *                       example: 5
 *                     error:
 *                       type: integer
 *                       example: 2
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: 미용실1
 *                           status:
 *                             type: string
 *                             enum: [success, error, skip]
 *                             example: success
 *                           message:
 *                             type: string
 *                             example: 미용실이 성공적으로 등록되었습니다
 *       400:
 *         description: 잘못된 요청 또는 CSV 파일 오류
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       429:
 *         description: 요청 제한 초과
 *       500:
 *         description: 서버 오류
 */