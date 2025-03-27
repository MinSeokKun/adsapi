// routes/geocode.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/api/geocode', async (req, res) => {
  const { address } = req.query;
  
  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const response = await axios({
      method: 'GET',
      url: 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode',
      params: {
        query: address,
      },
      headers: {
        'X-NCP-APIGW-API-KEY-ID': process.env.NAVER_MAP_CLIENT_ID,
        'X-NCP-APIGW-API-KEY': process.env.NAVER_MAP_CLIENT_SECRET,
        'Accept': 'application/json'
      }
    });

    // 응답 데이터 로깅
    console.log('Geocoding API Response:', response.data);

    res.json(response.data);
  } catch (error) {
    console.error('Geocoding error:', error.response?.data || error.message);
    console.error('Full error:', error);
    
    // 더 자세한 에러 정보 반환
    res.status(error.response?.status || 500).json({
      error: 'Geocoding failed',
      details: error.response?.data || error.message,
      status: error.response?.status,
      headers: error.response?.headers
    });
  }
});

module.exports = router;