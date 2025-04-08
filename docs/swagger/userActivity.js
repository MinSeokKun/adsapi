/**
 * @swagger
 * tags:
 *   name: User Activities
 *   description: 사용자 활동 로그 관련 API
 */

/**
 * @swagger
 * /api/activities/recent:
 *   get:
 *     summary: 최근 활동 목록 조회
 *     tags: [User Activities]
 *     description: 관리자 대시보드용 최근 활동 목록을 조회합니다
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 조회할 활동 수
 *     responses:
 *       200:
 *         description: 최근 활동 목록 조회 성공
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
 *                       id:
 *                         type: integer
 *                       user:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                       message:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (관리자만 접근 가능)
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
 *                 error:
 *                   type: string
 *                   example: "활동 정보를 가져오는데 실패했습니다."
 */

// 이하 실제 코드는 그대로 두고 주석만 추가합니다