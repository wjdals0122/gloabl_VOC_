/**
 * dashboard/js/api.js
 * 분리된 API 연결 계층 (API Client Layer)
 * 
 * [핵심 규칙 준수]
 * 1. discoverSources 와 collectSelectedSources 2개 기능으로 명확히 분리
 * 2. 현재 첨부된 단일 Webhook(/collect-global-voc)을 '출처 검색' 버튼에 절대 연결하지 않음
 * 3. 실제 모드에서 API 미분리 상태일 경우 '출처 탐색 API 연결 필요'를 명확히 반환
 * 4. ScrapingAnt API Key 및 프록시 설정은 브라우저 요청 본문에 넣지 않음
 * 5. 미래 비동기 Polling(Job ID) 확장을 위한 구조체(JobStatusTracker) 분리
 */

const VocApiClient = {
  /**
   * 1단계: 후보 출처 목록 탐색 요청
   * @param {string} country 국가 코드 (예: 'US', 'JP', 'DE')
   * @param {string} product 제품명 (예: 'LG CordZero A9X')
   * @returns {Promise<{ success: boolean, sources: Array, isDemo: boolean, message?: string }>}
   */
  async discoverSources(country, product) {
    console.log(`[API Client] discoverSources 호출 -> 국가: ${country}, 제품: ${product}, 모드: ${AppConfig.isDemoMode ? '데모' : '실제'}`);

    // 데모 모드: 사전 정의된 시뮬레이션 후보 출처 반환
    if (AppConfig.isDemoMode) {
      await new Promise(r => setTimeout(r, 600)); // 자연스러운 UI 피드백을 위한 가상 지연
      const sources = MockData.getMockDiscoveredSources(country, product);
      return {
        success: true,
        isDemo: true,
        sources: sources,
        message: '데모 모드 시뮬레이션 출처 목록이 로드되었습니다.'
      };
    }

    // 실제 모드: 백엔드 분리 엔드포인트 호출 시도
    // [중요] 단일 실행 Webhook(legacySingleWebhook)은 절대 호출하지 않음!
    const endpoint = AppConfig.endpoints.discoverSources;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ country, product })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status} (${response.statusText})`);
      }

      const data = await response.json();
      const sources = Array.isArray(data) ? data : (data.sources || data.data || []);

      return {
        success: true,
        isDemo: false,
        sources: sources,
        message: '백엔드 API로부터 후보 출처를 수신했습니다.'
      };
    } catch (error) {
      console.warn('[API Client] discoverSources 호출 실패:', error);
      return {
        success: false,
        isDemo: false,
        sources: [],
        errorType: 'ENDPOINT_UNAVAILABLE',
        message: '출처 탐색 API 연결 필요 (백엔드에서 discoverSources 엔드포인트 분리 작업 진행 중)'
      };
    }
  },

  /**
   * 2단계: 선택한 출처에 대한 수집 실행 요청
   * @param {string} country 국가 코드
   * @param {string} product 제품명
   * @param {Array} selectedSources 사용자가 체크박스로 선택한 출처 목록
   * @returns {Promise<{ success: boolean, csvText: string, blob: Blob, isDemo: boolean, message?: string }>}
   */
  async collectSelectedSources(country, product, selectedSources) {
    console.log(`[API Client] collectSelectedSources 호출 -> 국가: ${country}, 제품: ${product}, 선택된 출처 수: ${selectedSources.length}`);

    if (!selectedSources || selectedSources.length === 0) {
      throw new Error('수집할 출처를 최소 1개 이상 선택해야 합니다.');
    }

    // 데모 모드: 시뮬레이션 CSV 데이터 생성
    if (AppConfig.isDemoMode) {
      await new Promise(r => setTimeout(r, 1200)); // 시뮬레이션 지연
      const csvText = MockData.generateMockResultCsv(country, product, selectedSources);
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvText], { type: 'text/csv;charset=utf-8;' });

      return {
        success: true,
        isDemo: true,
        csvText: csvText,
        blob: blob,
        message: '데모 모드 시뮬레이션 수집이 완료되었습니다.'
      };
    }

    // 실제 모드: 백엔드 수집 엔드포인트로 선택 출처 전달
    const endpoint = AppConfig.endpoints.collectSelectedSources;

    // [보안 및 규격 준수]
    // 1. selected_sources 에 ID, URL, 사이트명만 정제하여 전송
    // 2. api_key, proxy_type, extraction_type 은 프론트엔드가 주입하지 않음 (서버 설정 격리)
    const payload = {
      country: country,
      product: product,
      selected_sources: selectedSources.map(s => ({
        source_id: s.source_id || s.id || '',
        url: s.url,
        site_name: s.site_name || ''
      }))
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`수집 서버 응답 오류: HTTP ${response.status} (${response.statusText})`);
      }

      // 백엔드는 파일 응답(Content-Disposition: attachment) 또는 CSV 텍스트를 반환함
      const blob = await response.blob();
      const csvText = await blob.text();

      return {
        success: true,
        isDemo: false,
        csvText: csvText,
        blob: blob,
        message: '수집 서버로부터 결과 CSV 수신 완료'
      };
    } catch (error) {
      console.error('[API Client] collectSelectedSources 요청 실패:', error);
      throw error;
    }
  }
};

/**
 * 미래 비동기 Polling(Job ID) 연동을 위한 구조 분리
 * 백엔드에서 비동기 작업 큐 및 상태 조회 API가 제공되면 활성화할 수 있도록 어댑터 준비
 */
const JobStatusTracker = {
  isPollingSupported: false, // 현재 워크플로우는 동기식이므로 false

  async pollJob(jobId, onProgress) {
    if (!this.isPollingSupported) {
      console.info('[JobTracker] 현재 백엔드는 Job ID 기반 비동기 폴링을 지원하지 않습니다 (동기 일괄 응답 방식).');
      return null;
    }
    // 추후 GET /api/voc/jobs/:jobId/status 연동용 뼈대
  }
};
