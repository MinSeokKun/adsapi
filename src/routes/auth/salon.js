const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');
const salonController = require('../../controllers/salonController');

// 개인 미용실 조회
router.get(
  '/api/salons', 
  verifyToken, 
  salonController.getAllSalons
);

// 미용실 등록
router.post(
  '/api/salons', 
  verifyToken, 
  salonController.createSalon
);

// 미용실 검색
router.get(
  '/api/salons/search', 
  salonController.searchSalons
);

// 도시 목록 조회
router.get(
  '/api/salons/cities', 
  salonController.getCities
);

// 구/군 목록 조회
router.get(
  '/api/salons/cities/:city/districts', 
  salonController.getDistricts
);

// 인기 도시 목록 조회
router.get(
  '/api/salons/popular-cities', 
  salonController.getPopularCities
);

// 미용실 상세 조회
router.get(
  '/api/salons/:salonId', 
  verifyToken, 
  salonController.getSalonById
);

// 미용실 수정
router.put(
  '/api/salons/:salonId', 
  verifyToken, 
  salonController.updateSalon
);

// 미용실 삭제
router.delete(
  '/api/salons/:salonId', 
  verifyToken, 
  salonController.deleteSalon
);

module.exports = router;