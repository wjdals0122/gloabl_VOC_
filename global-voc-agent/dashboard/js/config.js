/**
 * dashboard/js/config.js
 * API 엔드포인트 및 설정 관리
 */

const AppConfig = {
  // 기본 실행 모드: true = 데모 시뮬레이션, false = 실제 백엔드 연동
  isDemoMode: true,

  // API 엔드포인트 규격
  endpoints: {
    // 1단계: 출처 탐색 API (국가, 제품 전달 -> 후보 출처 목록 반환)
    discoverSources: 'http://localhost:5678/webhook/discover-voc-sources',

    // 2단계: 선택 출처 수집 API (국가, 제품, 선택 출처 목록 전달 -> CSV 파일 반환)
    collectSelectedSources: 'http://localhost:5678/webhook/collect-selected-sources',

    // ⚡ n8n 단일 일괄 즉시 수집 Webhook (테스트 모드: webhook-test, 상시 모드: webhook)
    instantWebhook: 'http://localhost:5678/webhook-test/collect-global-voc',

    // 참고: 기존 단일 Webhook
    legacySingleWebhook: 'http://localhost:5678/webhook/collect-global-voc'
  },

  // 서버 측 격리 설정 (클라이언트 전송 금지 - 서버/n8n 환경변수 주입)
  serverSideSettings: {
    proxyType: 'datacenter',
    extractionType: 'markdown',
    extractProperties: 'reviews(list: author, rating, date, review_title, review_text)',
    apiKeyStatus: '서버 환경변수 주입 (클라이언트 미노출)'
  },

  // 실제 모드 허용 상태
  CollectionStatus: {
    IDLE: '요청 전',
    PROCESSING: '요청 처리 중',
    COMPLETED: '수신 완료',
    FAILED: '요청 실패'
  },

  // 국가 목록
  countries: [
    { code: 'US', name: '미국 (US)' },
    { code: 'JP', name: '일본 (JP)' },
    { code: 'DE', name: '독일 (DE)' },
    { code: 'PL', name: '폴란드 (PL)' },
    { code: 'UK', name: '영국 (UK)' },
    { code: 'FR', name: '프랑스 (FR)' },
    { code: 'KR', name: '대한민국 (KR)' }
  ],

  loadCustomEndpoints() {
    try {
      const saved = localStorage.getItem('voc_custom_endpoints');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.discoverSources) this.endpoints.discoverSources = parsed.discoverSources;
        if (parsed.collectSelectedSources) this.endpoints.collectSelectedSources = parsed.collectSelectedSources;
        if (parsed.instantWebhook) this.endpoints.instantWebhook = parsed.instantWebhook;
      }
    } catch (e) {
      console.warn('[Config] 커스텀 엔드포인트 로드 실패:', e);
    }
  },

  saveCustomEndpoints(discoverUrl, collectUrl, instantUrl) {
    this.endpoints.discoverSources = discoverUrl || this.endpoints.discoverSources;
    this.endpoints.collectSelectedSources = collectUrl || this.endpoints.collectSelectedSources;
    this.endpoints.instantWebhook = instantUrl || this.endpoints.instantWebhook;
    try {
      localStorage.setItem('voc_custom_endpoints', JSON.stringify({
        discoverSources: this.endpoints.discoverSources,
        collectSelectedSources: this.endpoints.collectSelectedSources,
        instantWebhook: this.endpoints.instantWebhook
      }));
    } catch (e) {}
  }
};

AppConfig.loadCustomEndpoints();
