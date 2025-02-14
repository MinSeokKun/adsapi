const axios = require('axios');

class TossController {
  constructor() {
    this.secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY || 'test_sk_D4yKeq5bgrpKRd0J97BVGm0YZwp1';
  }

  // 결제 승인 요청 처리
  async confirmPayment(req, res) {
    try {
      const { paymentKey, orderId, amount } = req.body;
      
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
      await this.handlePaymentSuccess(response.data);
      
      // 성공 응답
      res.status(200).json(response.data);
    } catch (error) {
      // 결제 실패 처리
      await this.handlePaymentError(error);
      
      res.status(error.response?.status || 500).json(error.response?.data || {
        message: '결제 처리 중 오류가 발생했습니다.',
      });
    }
  }

  // 결제 성공 콜백 처리
  async handleSuccess(req, res) {
    try {
      const { orderId, amount, paymentKey } = req.query;
      
      // 결제 정보 검증 및 DB 처리 등을 수행할 수 있습니다
      const paymentData = {
        orderId,
        amount,
        paymentKey,
        status: 'SUCCESS'
      };

      // TODO: DB에 결제 정보 저장
      await this.savePaymentData(paymentData);

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
      const { code, message, orderId } = req.query;

      // 실패 정보 저장
      const failData = {
        orderId,
        code,
        message,
        status: 'FAILED'
      };

      // TODO: DB에 실패 정보 저장
      await this.savePaymentData(failData);

      res.status(200).json({ 
        message: '결제가 실패했습니다.',
        error: failData 
      });
    } catch (error) {
      console.error('Fail callback error:', error);
      res.status(500).json({ message: '결제 실패 처리 중 오류가 발생했습니다.' });
    }
  }

  // 결제 성공 시 추가 처리
  async handlePaymentSuccess(paymentData) {
    // TODO: 결제 성공 시 필요한 비즈니스 로직 구현
    // 예: DB에 결제 정보 저장, 주문 상태 업데이트, 이메일 발송 등
    console.log('Payment success:', paymentData);
  }

  // 결제 실패 시 추가 처리
  async handlePaymentError(error) {
    // TODO: 결제 실패 시 필요한 비즈니스 로직 구현
    // 예: 실패 로그 기록, 관리자 알림 등
    console.error('Payment error:', error.response?.data || error);
  }

  // DB 저장 (예시)
  async savePaymentData(data) {
    // TODO: 실제 DB 저장 로직 구현
    console.log('Saving payment data:', data);
  }
}

module.exports = new TossController();