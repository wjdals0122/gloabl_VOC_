/**
 * dashboard/js/views/source_view.js
 * 1단계: VOC 탐색 및 수집 조건 설정 화면
 * 
 * [개편 사항]
 * 1. '수집할 출처 선택' 목록 및 하단 고정 수집 바 완전 삭제
 * 2. [대상 국가], [키워드], [기간 선택], [수집 채널 선택(3가지)] 입력 지원
 * 3. [🔍 VOC 수집 및 분석 시작] 클릭 시 결과 대시보드로 자동 이동 및 분석 시작
 * 4. 추천 분석 키워드 클릭 시 원클릭 수집 지원
 */

const SourceView = {
  containerId: 'view-sources-content',

  state: {
    country: 'US',
    keyword: 'LG 워시콤보',
    period: '1m', // '7d' | '1m' | '3m' | '6m' | '1y'
    channel: 'all' // 'all' | 'community' | 'reviews'
  },

  init() {
    this.readInputsFromDom();
    this.bindEvents();
    this.render();
  },

  readInputsFromDom() {
    const countryEl = document.getElementById('input-country');
    if (countryEl) this.state.country = countryEl.value || 'US';

    const keywordEl = document.getElementById('input-product');
    if (keywordEl) this.state.keyword = keywordEl.value ? keywordEl.value.trim() : 'LG 워시콤보';

    const periodEl = document.getElementById('select-period');
    if (periodEl) this.state.period = periodEl.value || '1m';

    const channelEl = document.getElementById('select-channel');
    if (channelEl) this.state.channel = channelEl.value || 'all';

    const excludeEl = document.getElementById('input-explore-exclude');
    if (excludeEl && excludeEl.value) {
      this.state.excludedKeywords = excludeEl.value
        .split(',')
        .map(w => w.trim().replace(/^#/, ''))
        .filter(w => w.length > 0);
    } else {
      this.state.excludedKeywords = [];
    }
  },

  bindEvents() {
    // 1. 수집 및 분석 시작 버튼
    const searchBtn = document.getElementById('btn-discover-sources');
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.startCollectionAndAnalysis();
      });
    }

    // 2. 국가 선택 드롭다운
    const countrySelect = document.getElementById('input-country');
    if (countrySelect) {
      countrySelect.addEventListener('change', (e) => {
        this.state.country = e.target.value;
      });
    }

    // 3. 키워드 입력 필드 (IME 한글 입력 보존)
    const keywordInput = document.getElementById('input-product');
    if (keywordInput) {
      keywordInput.addEventListener('input', (e) => {
        this.state.keyword = e.target.value;
      });
      keywordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.startCollectionAndAnalysis();
        }
      });
    }

    // 4. 기간 선택 드롭다운
    const periodSelect = document.getElementById('select-period');
    if (periodSelect) {
      periodSelect.addEventListener('change', (e) => {
        this.state.period = e.target.value;
      });
    }

    // 5. 수집 채널 선택 드롭다운
    const channelSelect = document.getElementById('select-channel');
    if (channelSelect) {
      channelSelect.addEventListener('change', (e) => {
        this.state.channel = e.target.value;
      });
    }

    // 6. 제외 키워드 입력 필드 엔터키
    const excludeInput = document.getElementById('input-explore-exclude');
    if (excludeInput) {
      excludeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.startCollectionAndAnalysis();
        }
      });
    }
  },

  setPresetKeyword(keyword) {
    const keywordInput = document.getElementById('input-product');
    if (keywordInput) {
      keywordInput.value = keyword;
      this.state.keyword = keyword;
    }
    this.startCollectionAndAnalysis();
  },

  startCollectionAndAnalysis() {
    this.readInputsFromDom();

    const country = this.state.country || 'US';
    const keyword = this.state.keyword ? this.state.keyword.trim() : 'LG 워시콤보';
    const period = this.state.period || '1m';
    const channel = this.state.channel || 'all';
    const excludedKeywords = this.state.excludedKeywords || [];

    // [수집 결과] 탭으로 전환하여 분석 대시보드 실행
    App.navigateToTab('tab-results', {
      country: country,
      keyword: keyword,
      product: keyword,
      period: period,
      channel: channel,
      excludedKeywords: excludedKeywords,
      autoStart: true
    });
  },

  getChannelName(channel) {
    switch (channel) {
      case 'community': return '커뮤니티 전용';
      case 'reviews': return '제품리뷰 전용';
      default: return '커뮤니티 + 제품리뷰 통합';
    }
  },

  getPeriodName(period) {
    switch (period) {
      case '7d': return '최근 7일';
      case '3m': return '최근 3개월';
      case '6m': return '최근 6개월';
      case '1y': return '최근 1년';
      default: return '최근 1개월';
    }
  },

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // 출처 선택 테이블 및 고정바 완전 삭제 후, 신뢰도 높은 채널 인텔리전스 가이드 렌더링
    container.innerHTML = `
      <div class="voc-exploration-guide-section">
        <!-- 추천 검색 키워드 칩스 -->
        <div class="explore-preset-bar">
          <span class="preset-label">🔥 추천 분석 키워드:</span>
          <div class="preset-chips">
            <button type="button" class="preset-chip" onclick="SourceView.setPresetKeyword('LG 워시콤보')">#LG 워시콤보</button>
            <button type="button" class="preset-chip" onclick="SourceView.setPresetKeyword('LG OLED evo G4')">#LG OLED evo G4</button>
            <button type="button" class="preset-chip" onclick="SourceView.setPresetKeyword('LG 스탠바이미')">#LG 스탠바이미</button>
            <button type="button" class="preset-chip" onclick="SourceView.setPresetKeyword('LG 스타일러')">#LG 스타일러</button>
            <button type="button" class="preset-chip" onclick="SourceView.setPresetKeyword('LG 인스타뷰 냉장고')">#LG 인스타뷰 냉장고</button>
          </div>
        </div>

        <!-- 3대 수집 채널 및 분석 역량 안내 카드 -->
        <div class="channel-coverage-grid">
          <!-- 채널 1: 커뮤니티 -->
          <div class="channel-info-card">
            <div class="card-icon-wrap icon-community">💬</div>
            <div class="card-body">
              <div class="card-badge">채널 옵션 1</div>
              <h3 class="card-title">커뮤니티 (Community)</h3>
              <p class="card-desc">Reddit, AVS Forum, 현지 테크 커뮤니티, 카페 등의 솔직한 실사용 토론 및 설치/내구성 이슈를 수집합니다.</p>
              <div class="card-sources-tag">주요 출처: Reddit, AVS Forum, Wykop, Clien 등</div>
            </div>
          </div>

          <!-- 채널 2: 제품리뷰 -->
          <div class="channel-info-card">
            <div class="card-icon-wrap icon-reviews">⭐</div>
            <div class="card-body">
              <div class="card-badge">채널 옵션 2</div>
              <h3 class="card-title">제품리뷰 (Product Reviews)</h3>
              <p class="card-desc">Best Buy, MediaMarkt, 전문 테크 평가 사이트(RTINGS 등)의 구매 평점과 상세 평가 의견을 정밀 분석합니다.</p>
              <div class="card-sources-tag">주요 출처: Best Buy, RTINGS, Home Depot, Danawa 등</div>
            </div>
          </div>

          <!-- 채널 3: 통합 인텔리전스 -->
          <div class="channel-info-card highlight-card">
            <div class="card-icon-wrap icon-combined">📊</div>
            <div class="card-body">
              <div class="card-badge badge-recommended">추천 채널 옵션 3</div>
              <h3 class="card-title">커뮤니티 + 제품리뷰 (통합)</h3>
              <p class="card-desc">구매 전 탐색(커뮤니티)과 구매 후 평가(제품리뷰)를 크로스 분석하여 고객 여정 전반의 긍부정 및 키워드 순위를 제공합니다.</p>
              <div class="card-sources-tag">언급량 추이 · 긍/부정 비율 · 순위 키워드 자동 산출</div>
            </div>
          </div>
        </div>

        <!-- 분석 파이프라인 프로세스 띠 배너 -->
        <div class="pipeline-flow-banner">
          <div class="flow-step">
            <span class="step-num">01</span>
            <span class="step-title">글로벌 채널 수집</span>
            <span class="step-sub">국가/기간별 다채널 데이터 스크래핑</span>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-step">
            <span class="step-num">02</span>
            <span class="step-title">Gemini AI 정밀 분석</span>
            <span class="step-sub">긍부정 판별 · 핵심 키워드 클러스터링</span>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-step">
            <span class="step-num">03</span>
            <span class="step-title">시계열 & 채널 비교 대시보드</span>
            <span class="step-sub">언급량 추이 및 순위 시각화 리포트</span>
          </div>
        </div>
      </div>
    `;
  }
};

if (typeof window !== 'undefined') {
  window.SourceView = SourceView;
}
