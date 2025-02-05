const express = require('express');
const router = express.Router();
const { Salon } = require('../../models');
const { verifyToken, isAdmin, isSuperAdmin } = require('../../middleware/auth');

// 개인 미용실 조회
router.get('/api/salons', verifyToken, async (req, res) => {
  try {
    const salons = await Salon.findAll({
      where: { owner_id: req.user.id }
    });

    res.json({salons});
  } catch (error) {
    console.error('사용자 샵 조회 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 미용실 등록
router.post('/api/salons', verifyToken, async (req, res) => {
  try {
    const { name, address, region_code, business_hours } = req.body;

    const salon = await Salon.create({
      owner_id: req.user.id,
      name,
      address,
      region_code,
      business_hours,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.status(201).json({ 
      message : "미용실이 등록되었습니다.",
      salon });
  } catch (error) {
    console.error('미용실 등록 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 미용실 상세 조회
router.get('/api/salons/:salonId', verifyToken, async (req, res) => {
  try {
    const salon = await Salon.findOne({
      where: { 
        id: req.params.salonId,
        owner_id: req.user.id
      }
    });

    if (!salon) {
      return res.status(404).json({ message: '미용실을 찾을 수 없습니다.' });
    }

    res.json({ salon });
  } catch (error) {
    console.error('미용실 조회 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 미용실 수정
router.put('/api/salons/:salonId', verifyToken, async (req, res) => {
  try {
    const { name, address, region_code, business_hours } = req.body;
    
    // 업데이트할 필드 객체 동적 생성
    const updateFields = {};
    if (name) updateFields.name = name;
    if (address) updateFields.address = address;
    if (region_code) updateFields.region_code = region_code;
    if (business_hours) updateFields.business_hours = business_hours;

    const salon = await Salon.findOne({
      where: {
        id: req.params.salonId,
        owner_id: req.user.id
      }
    });

    if (!salon) {
      return res.status(404).json({ message: '미용실을 찾을 수 없습니다.' });
    }

    await salon.update(updateFields);

    res.json({ 
      message: '미용실이 수정되었습니다.',
      salon
    });
  } catch (error) {
    console.error('미용실 수정 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 미용실 삭제
router.delete('/api/salons/:salonId', verifyToken, async (req, res) => {
  try {
    const salon = await Salon.findOne({
      where: {
        id: req.params.salonId,
        owner_id: req.user.id
      }
    });

    if (!salon) {
      return res.status(404).json({ message: '미용실을 찾을 수 없습니다.' });
    }

    await salon.destroy();

    res.json({ message: '미용실이 삭제되었습니다.' });
  } catch (error) {
    console.error('미용실 삭제 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;