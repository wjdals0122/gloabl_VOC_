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
  },

  startCollectionAndAnalysis() {
    this.readInputsFromDom();

    const country = this.state.country || 'US';
    const keyword = this.state.keyword ? this.state.keyword.trim() : 'LG 워시콤보';
    const period = this.state.period || '1m';
    const channel = this.state.channel || 'all';

    // [수집 결과] 탭으로 전환하여 분석 대시보드 실행
    App.navigateToTab('tab-results', {
      country: country,
      keyword: keyword,
      product: keyword,
      period: period,
      channel: channel,
      autoStart: true
    });
  },

  getChannelName(channel) {
    switch (channel) {
      case 'community': return '커뮤니티';
      case 'reviews': return '제품리뷰';
      default: return '커뮤니티 + 제품리뷰 (통합)';
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

    // 추천 분석 키워드부터 아래 모두 삭제 (사용자 요청 반영: 검색 카드 단독의 깔끔한 미니멀 레이아웃 유지)
    container.innerHTML = '';
  }
};

if (typeof window !== 'undefined') {
  window.SourceView = SourceView;
}
