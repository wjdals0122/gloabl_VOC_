/**
 * dashboard/js/config.js
 * API 엔드포인트 및 서버 격리 설정 관리 모듈
 * 
 * [주의] ScrapingAnt API Key는 절대 프론트엔드나 요청 본문에 포함하지 않으며,
 * 백엔드 서버 또는 n8n 워크플로우의 환경변수로 안전하게 주입됩니다.
 */

const AppConfig = {
  // 기본 실행 모드: true = 데모 시뮬레이션, false = 실제 백엔드 연동
  isDemoMode: true,

  // API 엔드포인트 규격 (추후 팀원이 백엔드 배포 시 한곳에서 변경 가능)
  endpoints: {
    // 1단계: 출처 탐색 API (국가, 제품 전달 -> 후보 출처 목록 반환)
    discoverSources: 'http://localhost:5678/webhook/discover-voc-sources',

    // 2단계: 선택 출처 수집 API (국가, 제품, 선택 출처 목록 전달 -> CSV 파일 반환)
    collectSelectedSources: 'http://localhost:5678/webhook/collect-selected-sources',

    // (참고) 현재 워크플로우 단일 실행 Webhook (검색+수집 일괄 실행 노드이므로 출처검색 버튼에 연결 금지)
    legacySingleWebhook: 'http://localhost:5678/webhook/collect-global-voc'
  },

  // 서버 측 격리 설정 (클라이언트 전송 금지 - 서버/n8n 워크플로우 환경에서 주입)
  serverSideSettings: {
    proxyType: 'datacenter', // 'datacenter' | 'residential'
    extractionType: 'markdown', // 'markdown' | 'extended' | 'extract'
    extractProperties: 'reviews(list: author, rating, date, review_title, review_text)',
    apiKeyStatus: '🔒 서버/n8n 환경변수 주입 (클라이언트 미노출)'
  },

  // 실제 모드에서 허용되는 엄격한 4가지 상태 정의 (임의 진행률/가짜 시간 절대 금지)
  CollectionStatus: {
    IDLE: '요청 전',
    PROCESSING: '요청 처리 중',
    COMPLETED: '응답 수신 완료',
    FAILED: '요청 실패'
  },

  // 지원 국가 프리셋
  countries: [
    { code: 'US', name: '미국 (United States)', flag: '🇺🇸' },
    { code: 'JP', name: '일본 (Japan)', flag: '🇯🇵' },
    { code: 'DE', name: '독일 (Germany)', flag: '🇩🇪' },
    { code: 'PL', name: '폴란드 (Poland)', flag: '🇵🇱' },
    { code: 'UK', name: '영국 (United Kingdom)', flag: '🇬🇧' },
    { code: 'FR', name: '프랑스 (France)', flag: '🇫🇷' },
    { code: 'KR', name: '대한민국 (Korea)', flag: '🇰🇷' }
  ],

  // 설정 저장 및 불러오기 (로컬 개발 환경용)
  loadCustomEndpoints() {
    try {
      const saved = localStorage.getItem('voc_custom_endpoints');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.discoverSources) this.endpoints.discoverSources = parsed.discoverSources;
        if (parsed.collectSelectedSources) this.endpoints.collectSelectedSources = parsed.collectSelectedSources;
      }
    } catch (e) {
      console.warn('[Config] 커스텀 엔드포인트 로드 실패:', e);
    }
  },

  saveCustomEndpoints(discoverUrl, collectUrl) {
    this.endpoints.discoverSources = discoverUrl || this.endpoints.discoverSources;
    this.endpoints.collectSelectedSources = collectUrl || this.endpoints.collectSelectedSources;
    try {
      localStorage.setItem('voc_custom_endpoints', JSON.stringify({
        discoverSources: this.endpoints.discoverSources,
        collectSelectedSources: this.endpoints.collectSelectedSources
      }));
    } catch (e) {
      console.error('[Config] 커스텀 엔드포인트 저장 실패:', e);
    }
  }
};

// 초기 로드
AppConfig.loadCustomEndpoints();
