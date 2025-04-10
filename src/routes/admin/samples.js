// src/routes/admin/samples.js
const express = require('express');
const router = express.Router();
const { verifyToken, isSuperAdmin } = require('../../middleware/auth');
const path = require('path');
const fs = require('fs');

// 사용자 데이터용 샘플 CSV
const usersCSV = `email,password,name,role
test1@example.com,password123,김미용,user
test2@example.com,password123,이헤어,user
test3@example.com,password123,박살롱,user
admin@example.com,admin123,관리자,admin`;

// 미용실 데이터용 샘플 CSV
const salonsCSV = `owner_email,name,business_hours,business_number,phone,description,address,address_detail
test1@example.com,김미용헤어살롱,09:00-19:00,1234567890,02-123-4567,트렌디한 헤어스타일을 제공하는 미용실입니다.,서울특별시 강남구 테헤란로 152,3층 301호
test2@example.com,이헤어디자인,10:00-20:00,2345678901,02-234-5678,20년 경력의 디자이너가 운영하는 프리미엄 헤어살롱입니다.,서울특별시 서초구 서초대로 389,4층
test3@example.com,박뷰티샵,09:30-20:30,3456789012,02-345-6789,합리적인 가격의 헤어 서비스를 제공합니다.,서울특별시 마포구 홍대입구로 127,2층`;

// 샘플 CSV 다운로드 엔드포인트
router.get('/api/admin/samples/:type', verifyToken, isSuperAdmin, (req, res) => {
  const { type } = req.params;
  
  // 타입에 따라 적절한 CSV 데이터와 파일명 설정
  let csvData;
  let filename;
  
  if (type === 'users') {
    csvData = usersCSV;
    filename = 'sample-users.csv';
  } else if (type === 'salons') {
    csvData = salonsCSV;
    filename = 'sample-salons.csv';
  } else {
    return res.status(400).json({
      success: false,
      message: "유효하지 않은 샘플 타입입니다. 'users' 또는 'salons'를 사용하세요."
    });
  }
  
  // 다운로드 헤더 설정
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  
  // CSV 데이터 반환
  res.status(200).send(csvData);
});

module.exports = router;