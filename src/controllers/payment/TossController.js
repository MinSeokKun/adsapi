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
      
      // 토스페이먼츠 API 인증키 생성
      const encryptedSecretKey = Buffer.from(this.secretKey + ':').toString('base64');
      console.log('[Toss Payment] Secret Key Generated');

      console.log('[Toss Payment] Requesting payment confirmation to Toss API...');
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

      // 결제 성공 처리
      console.log('[Toss Payment] Processing payment success...');
      await this.handleSuccess(response.data);
      
      console.log('[Toss Payment] Payment successfully completed');
      res.status(200).json(response.data);
    } catch (error) {
      console.error('[Toss Payment] Error occurred:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      await this.handleFail(error);
      
      res.status(error.response?.status || 500).json(error.response?.data || {
        message: '결제 처리 중 오류가 발생했습니다.',
      });
    }
  }

  // 결제 성공 콜백 처리
  async handleSuccess(req, res) {
    try {
      const { orderId, amount, paymentKey } = req.query;
      
      // 토스페이먼츠 API를 통해 결제 정보 조회
      const encryptedSecretKey = Buffer.from(this.secretKey + ':').toString('base64');
      const paymentDetails = await axios.get(
        `https://api.tosspayments.com/v1/payments/${paymentKey}`,
        {
          headers: {
            Authorization: `Basic ${encryptedSecretKey}`,
          },
        }
      );

      // metadata에서 구독 정보 추출
      const { subscriptionPlanId, duration_months } = paymentDetails.data.metadata;
      
      if (!subscriptionPlanId) {
        throw new Error('구독 플랜 정보를 찾을 수 없습니다.');
      }

      // 결제 정보 생성
      const paymentData = {
        merchant_uid: orderId,
        amount: parseInt(amount),
        payment_method: paymentDetails.data.method,
        payment_status: 'completed',
        payment_date: new Date(),
        pg_provider: 'toss',
        receipt_url: paymentDetails.data.receipt?.url,
      };

      // 결제 정보 저장
      const payment = await Payment.create(paymentData);

      // 구독 정보 업데이트
      const subscription = await Subscription.create({
        status: 'active',
        start_date: new Date(),
        end_date: this.calculateEndDate(duration_months),
        auto_renewal: true,
        payment_id: payment.id,
        subscription_plan_id: subscriptionPlanId
      });

      res.status(200).json({ 
        message: '결제와 구독이 성공적으로 완료되었습니다.',
        data: {
          payment: paymentData,
          subscription: subscription
        }
      });
    } catch (error) {
      console.error('Success callback error:', error);
      res.status(500).json({ 
        message: '결제 완료 처리 중 오류가 발생했습니다.',
        error: error.message 
      });
    }
  }

  // 구독 종료일 계산
  calculateEndDate(durationMonths) {
    const today = new Date();
    return new Date(today.setMonth(today.getMonth() + parseInt(durationMonths)));
  }

  // 결제 실패 콜백 처리
  async handleFail(req, res) {
    try {
      const { code, message, orderId } = req.query;

      // 실패 정보 저장
      const failData = {
        merchant_uid: orderId,
        payment_status: 'failed',
        pg_provider: 'toss',
        fail_reason: `${code}: ${message}`
      };

      await Payment.create(failData);

      res.status(200).json({ 
        message: '결제가 실패했습니다.',
        error: failData 
      });
    } catch (error) {
      console.error('Fail callback error:', error);
      res.status(500).json({ message: '결제 실패 처리 중 오류가 발생했습니다.' });
    }
  }
}

module.exports = new TossController();