const axios = require('axios');
const { Payment, Subscription } = require('../../models');

class TossController {
  constructor() {
    this.secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY || 'test_sk_D4yKeq5bgrpKRd0J97BVGm0YZwp1';
  }

  // 결제 승인 요청 처리
  async confirmPayment(req, res) {
    try {
      const { paymentKey, orderId, amount, subscriptionId } = req.body;
      
      // 구독 정보 확인
      const subscription = await Subscription.findByPk(subscriptionId);
      if (!subscription) {
        throw new Error('구독 정보를 찾을 수 없습니다.');
      }

      // 토스페이먼츠 API 인증키 생성
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

      // 결제 성공 처리
      await this.handlePaymentSuccess(response.data, subscription);
      
      res.status(200).json(response.data);
    } catch (error) {
      await this.handlePaymentError(error);
      
      res.status(error.response?.status || 500).json(error.response?.data || {
        message: '결제 처리 중 오류가 발생했습니다.',
      });
    }
  }

  // 결제 성공 시 추가 처리
  async handlePaymentSuccess(paymentData, subscription) {
    // 결제 정보 저장
    const payment = await Payment.create({
      amount: paymentData.amount,
      currency: paymentData.currency,
      payment_method: paymentData.method,
      payment_status: 'completed',
      payment_date: new Date(),
      merchant_uid: paymentData.paymentKey,
      pg_provider: 'toss',
      receipt_url: paymentData.receipt?.url
    });

    // 구독 정보 업데이트
    const subscriptionEndDate = new Date(subscription.end_date);
    const newEndDate = new Date(subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1));
    
    await subscription.update({
      end_date: newEndDate,
      status: 'active'
    });

    return { payment, subscription };
  }

  // 결제 실패 시 추가 처리
  async handlePaymentError(error) {
    // 결제 실패 정보 저장
    await Payment.create({
      amount: error.response?.data?.amount || 0,
      payment_status: 'failed',
      payment_method: error.response?.data?.method || 'unknown',
      merchant_uid: error.response?.data?.paymentKey,
      pg_provider: 'toss'
    });

    console.error('Payment error:', error.response?.data || error);
  }

  // 결제 성공 콜백 처리
  async handleSuccess(req, res) {
    try {
      const { orderId, amount, paymentKey, subscriptionId } = req.query;
      
      const subscription = await Subscription.findByPk(subscriptionId);
      if (!subscription) {
        throw new Error('구독 정보를 찾을 수 없습니다.');
      }

      const paymentData = {
        orderId,
        amount,
        paymentKey,
        status: 'SUCCESS'
      };

      await this.handlePaymentSuccess(paymentData, subscription);

      res.status(200).json({ 
        message: '결제가 성공적으로 완료되었습니다.',
        data: paymentData 
      });
    } catch (error) {
      console.error('Success callback error:', error);
      res.status(500).json({ message: '결제 완료 처리 중 오류가 발생했습니다.' });
    }
  }

  // 결제 실패 콜백 처리
  async handleFail(req, res) {
    try {
      const { code, message, orderId, subscriptionId } = req.query;

      const subscription = await Subscription.findByPk(subscriptionId);
      if (subscription) {
        await subscription.update({
          status: 'expired'
        });
      }

      const failData = {
        orderId,
        code,
        message,
        status: 'FAILED'
      };

      await this.handlePaymentError({ 
        response: { 
          data: failData 
        } 
      });

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