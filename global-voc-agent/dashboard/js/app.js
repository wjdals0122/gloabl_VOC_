/**
 * dashboard/js/app.js
 * 글로벌 VOC 수집 대시보드 메인 오케스트레이터
 * 
 * [기능]
 * 1. 기본 라이트 모드 및 다크 모드 On/Off 토글 지원 (localStorage 저장)
 * 2. 상단 헤더 데모 모드 On/Off 직접 토글 버튼 지원
 * 3. 2대 핵심 메뉴(출처 탐색 / 수집 및 결과) 라우팅
 * 4. 통합 설정 모달 바인딩
 */

const App = {
  currentTab: 'tab-sources',
  currentTheme: 'light', // 기본 라이트 모드

  init() {
    console.log('[App] 글로벌 VOC 수집기 대시보드 초기화');

    // 1. 테마 초기화 (기본값: 라이트 모드)
    this.initTheme();

    // 2. 네비게이션 및 헤더 컨트롤 바인딩
    this.bindNavigation();
    this.bindHeaderControls();

    // 3. 뷰 초기화
    SourceView.init();
    ResultsView.init();

    // 4. 모드 UI 반영
    this.updateModeUI();
  },

  initTheme() {
    try {
      const savedTheme = localStorage.getItem('voc_theme') || 'light';
      this.setTheme(savedTheme);
    } catch (e) {
      this.setTheme('light');
    }
  },

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('voc_theme', theme);
    } catch (e) {}

    const themeLabel = document.getElementById('theme-toggle-label');
    const themeIcon = document.getElementById('theme-toggle-icon');

    if (theme === 'dark') {
      if (themeLabel) themeLabel.textContent = '라이트모드';
      if (themeIcon) themeIcon.textContent = '☀️';
    } else {
      if (themeLabel) themeLabel.textContent = '다크모드';
      if (themeIcon) themeIcon.textContent = '🌙';
    }
  },

  toggleTheme() {
    const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(nextTheme);
  },

  bindHeaderControls() {
    // 1. 데모 모드 직접 On/Off 토글 버튼
    const btnDemoToggle = document.getElementById('btn-toggle-demo');
    if (btnDemoToggle) {
      btnDemoToggle.addEventListener('click', () => {
        this.toggleDemoMode(!AppConfig.isDemoMode);
      });
    }

    // 2. 테마 전환 버튼 (라이트/다크)
    const btnThemeToggle = document.getElementById('btn-toggle-theme');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // 3. 설정 모달 버튼
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

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-view-section').forEach(section => {
      section.classList.toggle('active', section.id === tabId);
    });

    if (tabId === 'tab-results') {
      if (data && data.selectedSources) {
        ResultsView.setTarget(data.country, data.product, data.selectedSources);
      }
    }
  },

  toggleDemoMode(isDemo) {
    AppConfig.isDemoMode = isDemo;
    this.updateModeUI();

    // 모달 내부 스위치도 동기화
    const modalSwitch = document.getElementById('modal-switch-demo');
    if (modalSwitch) modalSwitch.checked = isDemo;

    SourceView.handleSearch();
    ResultsView.render();
  },

  updateModeUI() {
    const btnDemo = document.getElementById('btn-toggle-demo');
    const demoLabel = document.getElementById('demo-toggle-label');
    const banner = document.getElementById('content-demo-banner');

    if (AppConfig.isDemoMode) {
      if (btnDemo) {
        btnDemo.className = 'btn-demo-toggle active';
      }
      if (demoLabel) {
        demoLabel.textContent = '데모 모드 ON';
      }
      if (banner) {
        banner.style.display = 'flex';
        banner.innerHTML = `
          <span>💡 데모 모드입니다. 가상 데이터로 출처 탐색 및 수집 흐름을 테스트할 수 있습니다. 상단 <strong>[데모 모드 ON]</strong> 버튼을 눌러 언제든 실제 모드로 전환할 수 있습니다.</span>
        `;
      }
    } else {
      if (btnDemo) {
        btnDemo.className = 'btn-demo-toggle inactive';
      }
      if (demoLabel) {
        demoLabel.textContent = '실제 연동 모드';
      }
      if (banner) {
        banner.style.display = 'flex';
        banner.innerHTML = `
          <span>⚡ <strong>실제 모드 동작 중</strong>: 백엔드 Webhook 연동을 수행합니다. 데모 데이터로 복귀하려면 상단 <strong>[실제 연동 모드]</strong>를 클릭하세요.</span>
        `;
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
