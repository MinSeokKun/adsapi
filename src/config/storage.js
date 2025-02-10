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

// 파일 저장 경로 상수 정의
const STORAGE_PATHS = {
  PROFILES: 'profiles',
  SALONS: 'salons',
  ADS: 'ads',
  TEMP: 'temp'
};

class NCloudStorage {
  constructor() {
    this.bucketName = process.env.NCLOUD_BUCKET_NAME;
  }

  /**
   * 파일 업로드 함수
   * @param {Object} file - 업로드할 파일 객체
   * @param {string} folder - 저장할 최상위 폴더 경로 (STORAGE_PATHS 상수 사용)
   * @param {...string} subFolders - 하위 폴더들 (여러 개 가능)
   * @returns {Promise<string>} 업로드된 파일의 URL
   */
  async uploadFile(file, folder, ...subFolders) {
    // 폴더 경로 생성 (subFolders가 비어있으면 빈 문자열 반환)
    const subFolderPath = subFolders
      .filter(folder => folder) // 빈 문자열, null, undefined 제거
      .join('/');
    
    // 최종 폴더 경로 생성
    const folderPath = subFolderPath 
      ? `${folder}/${subFolderPath}/`
      : `${folder}/`;
    
    // 파일명 생성 (timestamp-원본파일명)
    const fileName = `${folderPath}${Date.now()}-${file.originalname}`;
    
    const params = {
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };

    const result = await S3.upload(params).promise();
    return result.Location;
  }

  /**
   * 여러 파일 업로드 함수
   * @param {Array} files - 업로드할 파일 객체 배열
   * @param {string} folder - 저장할 최상위 폴더 경로
   * @param {...string} subFolders - 하위 폴더들 (여러 개 가능)
   * @returns {Promise<Array<string>>} 업로드된 파일들의 URL 배열
   */
  async uploadMultipleFiles(files, folder, ...subFolders) {
    const uploadPromises = files.map(file => 
      this.uploadFile(file, folder, ...subFolders)
    );
    return Promise.all(uploadPromises);
  }

  /**
   * 파일 삭제 함수
   * @param {string} fileUrl - 삭제할 파일의 전체 URL
   * @returns {Promise<void>}
   */
  async deleteFile(fileUrl) {
    try {
      // URL을 파싱하여 경로 추출
      const urlObject = new URL(fileUrl);
      const key = urlObject.pathname.substring(1); // 첫 번째 '/' 제거
      
      if (!key) {
        throw new Error('Invalid file URL: Unable to extract key');
      }
  
      // console.log('Deleting file with key:', key); // 디버깅용 로그
  
      const params = {
        Bucket: this.bucketName,
        Key: key
      };
  
      await S3.deleteObject(params).promise();
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * 특정 폴더의 파일 목록 조회
   * @param {string} folder - 조회할 최상위 폴더 경로
   * @param {...string} subFolders - 하위 폴더들 (여러 개 가능)
   * @returns {Promise<Array>} 파일 목록
   */
  async listFiles(folder, ...subFolders) {
    const subFolderPath = subFolders
      .filter(folder => folder)
      .join('/');
    
    const prefix = subFolderPath 
      ? `${folder}/${subFolderPath}/`
      : `${folder}/`;

    const params = {
      Bucket: this.bucketName,
      Prefix: prefix
    };

    const result = await S3.listObjects(params).promise();
    return result.Contents;
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
module.exports = {
  storage: new NCloudStorage(),
  STORAGE_PATHS
};