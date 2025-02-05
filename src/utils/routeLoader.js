// src/utils/routeLoader.js
const fs = require('fs');
const path = require('path');

function loadRoutes(app, basePath) {
  // routes 디렉토리 내의 모든 파일을 재귀적으로 탐색
  function traverseRoutes(currentPath) {
    const files = fs.readdirSync(currentPath);

    files.forEach(file => {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // 디렉토리인 경우 재귀적으로 탐색
        traverseRoutes(filePath);
      } else if (file.endsWith('.js') && !file.endsWith('.test.js')) {
        // .js 파일이면서 테스트 파일이 아닌 경우에만 로드
        const router = require(filePath);
        
        // Express 라우터인 경우에만 등록
        if (router && typeof router === 'function' && router.stack) {
          const relativePath = path.relative(basePath, filePath);
          console.log(`라우터 등록: ${relativePath}`);
          app.use(router);
        }
      }
    });
  }

  traverseRoutes(basePath);
}

module.exports = loadRoutes;