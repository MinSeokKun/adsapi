const sensitiveFields = [
    'password',
    'token',
    'refreshToken',
    'accessToken',
    'authorization',
    'cookie',
    'jwt',
    'creditCard',
    'phoneNumber',
    // 추가 민감 필드...
  ];
  
  // 객체 내의 민감 정보를 [REDACTED]로 치환
  const sanitizeData = (data) => {
    if (!data) return data;
    
    // 문자열인 경우 그대로 반환
    if (typeof data !== 'object') return data;
    
    // 배열인 경우 각 요소를 재귀적으로 처리
    if (Array.isArray(data)) {
      return data.map(item => sanitizeData(item));
    }
  
    // 객체인 경우 복사본 생성
    const sanitized = { ...data };
  
    // 각 필드를 검사하고 처리
    Object.keys(sanitized).forEach(key => {
      // 대소문자 구분 없이 필드명 비교
      const isFieldSensitive = sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
  
      if (isFieldSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        // 중첩된 객체는 재귀적으로 처리
        sanitized[key] = sanitizeData(sanitized[key]);
      }
    });
  
    return sanitized;
  };
  
  // 요청 객체 필터링
  const sanitizeRequest = (req) => {
    const sanitizedReq = {
      body: sanitizeData(req.body),
      query: sanitizeData(req.query),
      params: sanitizeData(req.params),
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        // 필요한 헤더만 포함
      }
    };
  
    return sanitizedReq;
  };
  
  module.exports = {
    sanitizeData,
    sanitizeRequest
  };