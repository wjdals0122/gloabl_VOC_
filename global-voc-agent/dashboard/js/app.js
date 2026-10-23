/**
 * dashboard/js/app.js
 * 글로벌 VOC 수집 대시보드 메인 오케스트레이터 및 전역 상태 관리
 */

const App = {
  currentTab: 'tab-sources',

  init() {
    console.log('[App] 글로벌 VOC 수집기 대시보드 초기화 시작');

    // 1. 헤더 모드 토글 바인딩
    this.bindHeaderControls();

    // 2. 탭 네비게이션 바인딩
    this.bindNavigation();

    // 3. 각 뷰 모듈 초기화
    SourceView.init();
    ResultsView.init();
    HistoryView.init();

    // 4. 모드 UI 초기 상태 반영
    this.updateModeUI();

    console.log('[App] 대시보드 초기화 완료');
  },

  bindHeaderControls() {
    // 모드 전환 토글 스위치
    const modeSwitch = document.getElementById('switch-demo-mode');
    if (modeSwitch) {
      modeSwitch.checked = AppConfig.isDemoMode;
      modeSwitch.addEventListener('change', (e) => {
        this.toggleDemoMode(e.target.checked);
      });
    }

    // API 연동 규격서 모달 열기 버튼
    const btnApiDocs = document.getElementById('btn-open-api-docs');
    if (btnApiDocs) {
      btnApiDocs.addEventListener('click', () => {
        ApiDocsView.openModal();
      });
    }

    // 서버/백엔드 설정 모달 열기 버튼
    const btnServerConfig = document.getElementById('btn-open-server-config');
    if (btnServerConfig) {
      btnServerConfig.addEventListener('click', () => {
        this.openServerConfigModal();
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

    // 네비게이션 버튼 활성화 갱신
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // 탭 컨텐츠 표시 전환
    document.querySelectorAll('.tab-view-section').forEach(section => {
      section.classList.toggle('active', section.id === tabId);
    });

    // 탭별 데이터 전달 처리
    if (tabId === 'tab-results') {
      if (data && data.selectedSources) {
        ResultsView.setTarget(data.country, data.product, data.selectedSources);
      }
    } else if (tabId === 'tab-history') {
      HistoryView.render();
    }
  },

  toggleDemoMode(isDemo) {
    AppConfig.isDemoMode = isDemo;
    const modeSwitch = document.getElementById('switch-demo-mode');
    if (modeSwitch) modeSwitch.checked = isDemo;

    this.updateModeUI();

    // 현재 뷰 갱신
    SourceView.handleSearch();
    ResultsView.render();
  },

  updateModeUI() {
    const banner = document.getElementById('header-mode-banner');
    const badge = document.getElementById('header-mode-badge');

    if (AppConfig.isDemoMode) {
      if (badge) {
        badge.className = 'badge badge-demo';
        badge.textContent = '🧪 데모 모드 (시뮬레이션)';
      }
      if (banner) {
        banner.className = 'mode-info-banner demo';
        banner.innerHTML = `
          <span>🧪 <strong>데모 시뮬레이션 모드 활성화됨</strong>: 백엔드 API 호출 없이 출처 선택 및 수집 결과를 사전 검증할 수 있습니다.</span>
        `;
      }
    } else {
      if (badge) {
        badge.className = 'badge badge-live';
        badge.textContent = '⚡ 실제 백엔드 연동 모드';
      }
      if (banner) {
        banner.className = 'mode-info-banner real';
        banner.innerHTML = `
          <span>⚠️ <strong>실제 모드 동작 중</strong>: n8n 워크플로우 분리 전까지 단일 Webhook(/collect-global-voc) 오호출을 방지하기 위해 '출처 탐색 API 연결 필요' 상태가 유지됩니다.</span>
        `;
      }
    }
  },

  openServerConfigModal() {
    const old = document.getElementById('modal-server-config');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-server-config';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div>
            <h3>⚙️ 서버 설정 및 엔드포인트 관리</h3>
            <p class="modal-subtext">백엔드 및 크롤러 연동 주소를 설정합니다.</p>
          </div>
          <button class="modal-close" onclick="document.getElementById('modal-server-config').remove()">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-group mb-3">
            <label class="form-label">출처 탐색 API 엔드포인트 (discoverSources)</label>
            <input type="text" id="cfg-discover-url" class="input-text w-100" value="${CsvUtils.escapeHtml(AppConfig.endpoints.discoverSources)}">
            <small class="form-help">국가/제품을 전송받아 후보 출처 JSON을 반환하는 백엔드 Webhook 주소</small>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">선택 출처 수집 API 엔드포인트 (collectSelectedSources)</label>
            <input type="text" id="cfg-collect-url" class="input-text w-100" value="${CsvUtils.escapeHtml(AppConfig.endpoints.collectSelectedSources)}">
            <small class="form-help">선택된 출처 URL들을 수집하여 최종 CSV를 반환하는 백엔드 Webhook 주소</small>
          </div>

          <div class="server-isolation-box">
            <h4>🔒 서버 측 격리 설정 (클라이언트 전송 금지)</h4>
            <p>아래 ScrapingAnt 설정 및 보안 키는 브라우저 코드나 요청 본문에 노출되지 않으며, 백엔드 서버/n8n에서 직접 관리됩니다:</p>
            <ul>
              <li><strong>ScrapingAnt API Key:</strong> <code>${AppConfig.serverSideSettings.apiKeyStatus}</code></li>
              <li><strong>Proxy Type:</strong> <code>${AppConfig.serverSideSettings.proxyType}</code> (datacenter / residential)</li>
              <li><strong>Extraction Type:</strong> <code>${AppConfig.serverSideSettings.extractionType}</code></li>
              <li><strong>Extract Properties:</strong> <code>${AppConfig.serverSideSettings.extractProperties}</code></li>
            </ul>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-server-config').remove()">닫기</button>
          <button class="btn btn-primary btn-sm" onclick="App.saveServerConfig()">저장하기</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  saveServerConfig() {
    const discoverUrl = document.getElementById('cfg-discover-url').value.trim();
    const collectUrl = document.getElementById('cfg-collect-url').value.trim();

    AppConfig.saveCustomEndpoints(discoverUrl, collectUrl);
    alert('엔드포인트 설정이 로컬 브라우저에 저장되었습니다.');

    const modal = document.getElementById('modal-server-config');
    if (modal) modal.remove();
  }
};

// DOM 로드 완료 시 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
