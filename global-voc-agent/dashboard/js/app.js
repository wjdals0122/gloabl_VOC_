/**
 * dashboard/js/app.js
 * 글로벌 VOC 수집 대시보드 메인 오케스트레이터
 * 
 * [요구사항 반영]
 * 1. 2대 주요 메뉴만 관리 (출처 탐색 및 선택 / 수집 및 결과)
 * 2. 브라우저 수집 이력 라우트 및 관련 코드 정리
 * 3. 데모 모드일 때는 헤더에 작은 배지 하나만 노출, 콘텐츠 상단에 간결한 1줄 안내 표시
 * 4. 우측 설정 버튼을 통해 통합 설정 패널(모달) 연결
 */

const App = {
  currentTab: 'tab-sources',

  init() {
    console.log('[App] 글로벌 VOC 수집기 대시보드 초기화');

    // 1. 네비게이션 및 헤더 컨트롤 바인딩
    this.bindNavigation();
    this.bindHeaderControls();

    // 2. 뷰 초기화 (출처 탐색 / 수집 및 결과)
    SourceView.init();
    ResultsView.init();

    // 3. 모드 UI 반영 및 Webhook 주소 라벨 갱신
    this.updateModeUI();
    this.updateWebhookIndicator();
  },

  updateWebhookIndicator() {
    const el = document.getElementById('label-instant-webhook');
    if (el && AppConfig.endpoints && AppConfig.endpoints.instantWebhook) {
      el.textContent = AppConfig.endpoints.instantWebhook;
    }
  },

  bindHeaderControls() {
    const btnSettings = document.getElementById('btn-open-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        SettingsModal.open();
      });
    }
  },

  bindNavigation() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        if (targetTab) {
          this.navigateToTab(targetTab);
        }
      });
    });
  },

  navigateToTab(tabId, data = null) {
    this.currentTab = tabId;

    // 네비게이션 버튼 갱신
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // 탭 섹션 전환
    document.querySelectorAll('.tab-view-section').forEach(section => {
      section.classList.toggle('active', section.id === tabId);
    });

    // 탭별 데이터 전달
    if (tabId === 'tab-results') {
      if (data && data.selectedSources) {
        ResultsView.setTarget(data.country, data.product, data.selectedSources);
      }
    }
  },

  toggleDemoMode(isDemo) {
    AppConfig.isDemoMode = isDemo;
    this.updateModeUI();
    SourceView.handleSearch();
    ResultsView.render();
  },

  updateModeUI() {
    const badge = document.getElementById('header-demo-badge');
    const banner = document.getElementById('content-demo-banner');

    if (AppConfig.isDemoMode) {
      if (badge) badge.style.display = 'inline-flex';
      if (banner) {
        banner.style.display = 'flex';
        banner.innerHTML = `
          <span>데모 모드입니다. 가상 데이터로 출처 탐색 및 수집 흐름을 테스트할 수 있습니다.</span>
        `;
      }
    } else {
      if (badge) badge.style.display = 'none';
      if (banner) {
        banner.style.display = 'none';
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
