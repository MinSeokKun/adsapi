// src/routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const ncloudStorage = require('../config/nCloudStorage');

// 메모리에 임시 저장하는 multer 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'), false);
    }
  }
});

// 단일 파일 업로드
router.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 없습니다.' });
    }

    const fileUrl = await ncloudStorage.uploadFile(req.file);

    res.status(201).json({
      message: '파일 업로드 성공',
      file: {
        url: fileUrl,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    res.status(500).json({ 
      error: '파일 업로드 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

// 다중 파일 업로드
router.post('/api/upload/multiple', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '파일이 없습니다.' });
    }

    const uploadPromises = req.files.map(file => ncloudStorage.uploadFile(file));
    const fileUrls = await Promise.all(uploadPromises);

    const uploadedFiles = req.files.map((file, index) => ({
      url: fileUrls[index],
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.status(201).json({
      message: '파일 업로드 성공',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    res.status(500).json({ 
      error: '파일 업로드 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

module.exports = router;