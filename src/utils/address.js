const axios = require('axios');

class AddressService {
  constructor() {
    this.kakaoApiKey = process.env.KAKAO_API_KEY;
    this.kakaoApiUrl = 'https://dapi.kakao.com/v2/local/search/address.json';
  }

  async convertAddress(fullAddress) {
    try {
      if (!this.kakaoApiKey) {
        throw new Error('Kakao API 키가 설정되지 않았습니다.');
      }

      // 주소에서 번지수를 제외한 기본 주소만 추출
      const basicAddress = this.extractBasicAddress(fullAddress);
      console.log('검색할 기본 주소:', basicAddress);

      const response = await axios.get(this.kakaoApiUrl, {
        params: {
          query: basicAddress,
          analyze_type: 'similar'
        },
        headers: {
          Authorization: `KakaoAK ${this.kakaoApiKey}`,
        },
      });

      console.log('Kakao API 응답:', JSON.stringify(response.data, null, 2));

      const result = response.data.documents[0];
      if (!result) {
        // 기본 주소로도 검색이 안되면 동까지만 잘라서 다시 시도
        const dongAddress = this.extractDongAddress(basicAddress);
        console.log('동 주소로 재시도:', dongAddress);
        
        const retryResponse = await axios.get(this.kakaoApiUrl, {
          params: {
            query: dongAddress,
            analyze_type: 'similar'
          },
          headers: {
            Authorization: `KakaoAK ${this.kakaoApiKey}`,
          },
        });

        console.log('재시도 응답:', JSON.stringify(retryResponse.data, null, 2));
        result = retryResponse.data.documents[0];
        
        if (!result) {
          throw new Error('주소를 찾을 수 없습니다. 도로명 주소나 지번 주소를 정확하게 입력해주세요.');
        }
      }

      let addressComponents;
      if (result.road_address) {
        addressComponents = {
          address_line1: result.road_address.address_name,
          city: result.road_address.region_1depth_name,
          district: result.road_address.region_2depth_name,
        };
      } else if (result.address) {
        addressComponents = {
          address_line1: result.address.address_name,
          city: result.address.region_1depth_name,
          district: result.address.region_2depth_name,
        };
      } else {
        throw new Error('주소 형식이 올바르지 않습니다.');
      }

      return {
        ...addressComponents,
        address_line2: '', // 상세주소는 별도로 받음
        latitude: parseFloat(result.y),
        longitude: parseFloat(result.x)
      };
    } catch (error) {
      console.error('주소 변환 중 에러:', error);
      throw error;
    }
  }

  extractBasicAddress(address) {
    // 번지수와 그 이후의 상세주소를 제거
    return address.replace(/\s+\d+[번지\-]\d*.*$/, '')
                 .replace(/\s+\d+[번지\-]?$/, '');
  }

  extractDongAddress(address) {
    // 동(읍/면) 레벨까지만 주소 추출
    const match = address.match(/(.*[동읍면])/);
    return match ? match[1] : address;
  }
}

module.exports = new AddressService();