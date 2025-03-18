// middleware/cookieHandler.js 파일 생성
const setCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = isProduction ? process.env.COOKIE_DOMAIN : undefined;
  
  // 공통 옵션
  const commonOptions = {
    httpOnly: true,
    secure: isProduction, // 개발환경에서는 false, 배포환경에서는 true
    sameSite: isProduction ? 'lax' : 'lax', // 더 안전하게 설정
  };
  
  // 도메인 옵션 (개발환경에서는 도메인 설정 없음)
  const domainOption = cookieDomain ? { domain: cookieDomain } : {};
  
  // Access Token 쿠키 설정
  res.cookie('accessToken', accessToken, {
    ...commonOptions,
    ...domainOption,
    maxAge: 60 * 60 * 1000 // 1시간
  });

  // Refresh Token 쿠키 설정
  res.cookie('refreshToken', refreshToken, {
    ...commonOptions,
    ...domainOption,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
  });
};
  
// 쿠키 제거 함수
const clearCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = isProduction ? process.env.COOKIE_DOMAIN : undefined;
  const options = cookieDomain ? { domain: cookieDomain } : {};
  
  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
};
  
module.exports = { setCookies, clearCookies };