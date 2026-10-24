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

    // 4. 모드 UI 반영 및 Webhook 주소 라벨 갱신
    this.updateModeUI();
    this.updateWebhookIndicator();

    // 5. 메인 안내 문구 완성형 타이핑 효과 (최초 진입 시 1회 실행)
    this.initTypingHero();
  },

  updateWebhookIndicator() {
    const el = document.getElementById('label-instant-webhook');
    if (el && typeof AppConfig !== 'undefined' && AppConfig.endpoints && AppConfig.endpoints.instantWebhook) {
      el.textContent = AppConfig.endpoints.instantWebhook;
    }
  },

  initTypingHero() {
    const displayEl = document.querySelector('.typing-text-display');
    const cursorEl = document.querySelector('.typing-cursor');
    if (!displayEl) return;

    if (this._hasRunTyping) return;
    this._hasRunTyping = true;

    const fullText = '세계 곳곳의 고객 목소리를 찾아보세요.';

    // 이전 타이머 초기화 및 커서 가시화
    if (this._typingTimer) clearInterval(this._typingTimer);
    if (this._cursorTimer) clearTimeout(this._cursorTimer);

    displayEl.textContent = '';
    if (cursorEl) {
      cursorEl.style.display = 'inline-block';
      cursorEl.classList.remove('fade-out');
    }

    let currentIndex = 0;
    const totalChars = fullText.length;
    const charInterval = 75; // 75ms * 21자 = 약 1.57초 동안 완성된 글자 단위로 자연스럽게 출력

    this._typingTimer = setInterval(() => {
      if (currentIndex <= totalChars) {
        displayEl.textContent = fullText.slice(0, currentIndex);
        currentIndex++;
      } else {
        clearInterval(this._typingTimer);
        // 입력 완료 후 커서는 1.2초간 깜빡인 후 부드럽게 사라짐
        this._cursorTimer = setTimeout(() => {
          if (cursorEl) {
            cursorEl.classList.add('fade-out');
            setTimeout(() => {
              cursorEl.style.display = 'none';
            }, 400);
          }
        }, 1200);
      }
    }, charInterval);
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
          window.location.hash = targetTab;
          this.navigateToTab(targetTab);
        }
      });
    });

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'tab-results' || hash === 'tab-sources') {
        this.navigateToTab(hash);
      }
    });

    const initHash = window.location.hash.replace('#', '');
    if (initHash === 'tab-results') {
      this.navigateToTab('tab-results');
    }
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
        btnDemo.className = 'btn-demo-badge active';
        btnDemo.title = '데모 시뮬레이션 모드 동작 중 (클릭 시 실제 연동 모드로 전환)';
      }
      if (demoLabel) {
        demoLabel.textContent = '데모 모드';
      }
      if (banner) {
        banner.style.display = 'flex';
        banner.innerHTML = `
          <span>💡 <strong>데모 데이터로 체험 중입니다.</strong></span>
        `;
      }
    } else {
      if (btnDemo) {
        btnDemo.className = 'btn-demo-badge inactive';
        btnDemo.title = '실제 Webhook 연동 모드 (클릭 시 데모 모드로 전환)';
      }
      if (demoLabel) {
        demoLabel.textContent = '실제 모드';
      }
      if (banner) {
        banner.style.display = 'flex';
        banner.innerHTML = `
          <span>⚡ <strong>실제 연동 모드로 동작 중입니다.</strong></span>
        `;
      }
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
