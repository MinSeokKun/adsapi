// src/config/ncloudStorage.js
const AWS = require('aws-sdk');

// Naver Cloud 엔드포인트 설정
const endpoint = new AWS.Endpoint('https://kr.object.ncloudstorage.com');

// S3 클라이언트 설정
const S3 = new AWS.S3({
  endpoint: endpoint,
  region: 'kr-standard',
  credentials: {
    accessKeyId: process.env.NCLOUD_ACCESS_KEY,
    secretAccessKey: process.env.NCLOUD_SECRET_KEY
  }
});

class NCloudStorage {
  constructor() {
    this.bucketName = process.env.NCLOUD_BUCKET_NAME;
  }

  async uploadFile(file) {
    const fileName = `${Date.now()}-${file.originalname}`;
    
    const params = {
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'  // 파일을 공개적으로 접근 가능하게 설정
    };

    const result = await S3.upload(params).promise();
    return result.Location;  // 업로드된 파일의 URL 반환
  }

  async deleteFile(fileName) {
    const params = {
      Bucket: this.bucketName,
      Key: fileName
    };

    await S3.deleteObject(params).promise();
  }

  async listFiles(prefix = '') {
    const params = {
      Bucket: this.bucketName,
      Prefix: prefix
    };

    const result = await S3.listObjects(params).promise();
    return result.Contents;
  }
}

module.exports = new NCloudStorage();