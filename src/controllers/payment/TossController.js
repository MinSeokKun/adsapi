const axios = require('axios');
const { Payment, Subscription } = require('../../models');

class TossController {
  constructor() {
    this.secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY || 'test_sk_D4yKeq5bgrpKRd0J97BVGm0YZwp1';
  }

  // 결제 승인 요청 처리
  async confirmPayment(req, res) {
    try {
      const { paymentKey, orderId, amount } = req.body;
      
      console.log('[Toss Payment] Request body:', { paymentKey, orderId, amount });
      
      const encryptedSecretKey = Buffer.from(this.secretKey + ':').toString('base64');
      
      // 결제 승인 API 호출
      const response = await axios.post(
        'https://api.tosspayments.com/v1/payments/confirm',
        {
          paymentKey,
          orderId,
          amount,
        },
        {
          headers: {
            Authorization: `Basic ${encryptedSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[Toss Payment] Toss API Response:', response.data);
      
      // 결제 정보 생성
      const paymentData = {
        merchant_uid: orderId,
        amount: parseInt(amount),
        payment_method: response.data.method || 'card',  // 기본값 설정
        payment_status: 'completed',
        payment_date: new Date(),
        pg_provider: 'toss',
        receipt_url: response.data.receipt?.url
      };

      console.log('[Toss Payment] Creating payment record:', paymentData);

      // 결제 정보 저장
      const payment = await Payment.create(paymentData);
      
      // metadata에서 구독 정보 추출
      const duration_months = response.data.metadata?.duration_months || 1;
      const subscriptionPlanId = response.data.metadata?.subscriptionPlanId;

      if (subscriptionPlanId) {
        // 구독 정보 업데이트
        const subscription = await Subscription.create({
          status: 'active',
          start_date: new Date(),
          end_date: this.calculateEndDate(duration_months),
          auto_renewal: true,
          payment_id: payment.id,
          subscription_plan_id: subscriptionPlanId
        });

        console.log('[Toss Payment] Subscription created:', subscription);
      }

      res.status(200).json({
        message: '결제가 성공적으로 완료되었습니다.',
        data: {
          payment: payment,
          orderId: orderId,
          amount: amount
        }
      });
      
    } catch (error) {
      console.error('[Toss Payment] Error occurred:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      // 실패 정보 저장
      try {
        const failData = {
          merchant_uid: req.body.orderId,
          amount: parseInt(req.body.amount),
          payment_method: 'card',
          payment_status: 'failed',
          pg_provider: 'toss',
          fail_reason: error.response?.data?.message || error.message
        };

        await Payment.create(failData);
      } catch (dbError) {
        console.error('Failed to save payment failure:', dbError);
      }

      res.status(error.response?.status || 500).json({
        message: '결제가 실패했습니다.',
        error: error.response?.data || { message: '결제 처리 중 오류가 발생했습니다.' }
      });
    }
  }

  // 구독 종료일 계산
  calculateEndDate(durationMonths) {
    const today = new Date();
    return new Date(today.setMonth(today.getMonth() + parseInt(durationMonths)));
  }

  // 성공 페이지 렌더링
  async handleSuccess(req, res) {
    const { paymentKey, orderId, amount } = req.query;
    res.status(200).json({ paymentKey, orderId, amount });
  }

  // 실패 페이지 렌더링
  async handleFail(req, res) {
    const { code, message, orderId } = req.query;
    res.status(200).json({ code, message, orderId });
  }
}

module.exports = new TossController();