/**
 * @swagger
 * /confirm:
 *   post:
 *     summary: 결제 승인 요청
 *     description: Toss Payments 결제 후 결제 승인을 요청합니다
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentKey
 *               - orderId
 *               - amount
 *             properties:
 *               paymentKey:
 *                 type: string
 *                 description: Toss Payments에서 발급한 결제 키
 *               orderId:
 *                 type: string
 *                 description: 주문 고유 ID
 *               amount:
 *                 type: integer
 *                 description: 결제 금액
 *     responses:
 *       200:
 *         description: 결제가 성공적으로 완료됨
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 성공 메시지
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       description: 결제 정보
 *                     orderId:
 *                       type: string
 *                       description: 주문 ID
 *                     amount:
 *                       type: integer
 *                       description: 결제 금액
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 오류 메시지
 *                 error:
 *                   type: object
 *                   description: 상세 오류 정보
 */

/**
 * @swagger
 * /success:
 *   get:
 *     summary: 결제 성공 처리
 *     description: Toss Payments 결제 성공 후 리다이렉트되는 엔드포인트
 *     tags: [Payment]
 *     parameters:
 *       - in: query
 *         name: paymentKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Toss Payments에서 발급한 결제 키
 *       - in: query
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: 주문 고유 ID
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: integer
 *         description: 결제 금액
 *     responses:
 *       200:
 *         description: 결제 성공 정보 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentKey:
 *                   type: string
 *                   description: 결제 키
 *                 orderId:
 *                   type: string
 *                   description: 주문 ID
 *                 amount:
 *                   type: integer
 *                   description: 결제 금액
 *       500:
 *         description: 서버 오류
 */

/**
 * @swagger
 * /fail:
 *   get:
 *     summary: 결제 실패 처리
 *     description: Toss Payments 결제 실패 후 리다이렉트되는 엔드포인트
 *     tags: [Payment]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: 오류 코드
 *       - in: query
 *         name: message
 *         schema:
 *           type: string
 *         description: 오류 메시지
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: 주문 고유 ID
 *     responses:
 *       200:
 *         description: 결제 실패 정보 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   description: 오류 코드
 *                 message:
 *                   type: string
 *                   description: 오류 메시지
 *                 orderId:
 *                   type: string
 *                   description: 주문 ID
 *       500:
 *         description: 서버 오류
 */