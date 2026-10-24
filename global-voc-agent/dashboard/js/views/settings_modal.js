/**
 * dashboard/js/views/settings_modal.js
 * 통합 설정 및 API 연동 규격서 모달
 */

const SettingsModal = {
  open() {
    const old = document.getElementById('modal-settings');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-settings';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 style="margin: 0;">환경 설정 및 시스템 정보</h3>
              <span class="badge badge-neutral" style="font-size: 11px; font-weight: 700;">Global VOC Collector v1.2</span>
            </div>
            <p class="modal-subtext">실행 모드, 화면 테마 및 백엔드 API 연동 정보를 관리합니다.</p>
          </div>
          <button type="button" class="modal-close" onclick="SettingsModal.close()">&times;</button>
        </div>

        <div class="modal-body">
          <!-- 1. 실행 모드 설정 -->
          <div class="settings-section">
            <h4 class="settings-section-title">실행 모드</h4>
            <div class="setting-row">
              <div>
                <strong>데모 시뮬레이션 모드</strong>
                <p class="setting-desc">백엔드 서버 없이 사전 정의된 출처 데이터와 시뮬레이션 수집으로 동작합니다.</p>
              </div>
              <div>
                <label class="toggle-switch">
                  <input type="checkbox" id="modal-switch-demo" ${AppConfig.isDemoMode ? 'checked' : ''} onchange="App.toggleDemoMode(this.checked)">
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <hr class="modal-divider">

          <!-- 2. 화면 테마 설정 (다크모드) -->
          <div class="settings-section">
            <h4 class="settings-section-title">화면 테마</h4>
            <div class="setting-row">
              <div>
                <strong>다크 모드</strong>
                <p class="setting-desc">어두운 테마로 화면을 전환하여 가독성과 사용성을 최적화합니다.</p>
              </div>
              <div>
                <label class="toggle-switch">
                  <input type="checkbox" id="modal-switch-dark" ${App.currentTheme === 'dark' ? 'checked' : ''} onchange="App.setTheme(this.checked ? 'dark' : 'light')">
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <hr class="modal-divider">

          <!-- 2. API 엔드포인트 관리 -->
          <div class="settings-section">
            <h4 class="settings-section-title">API 엔드포인트 주소</h4>
            <div class="form-group mb-3">
              <label class="form-label" for="cfg-discover-url">1단계: 출처 탐색 API (discoverSources)</label>
              <input type="text" id="cfg-discover-url" class="input-text w-100" value="${CsvUtils.escapeHtml(AppConfig.endpoints.discoverSources)}">
              <span class="form-help">국가·제품명을 전달받아 후보 출처 목록을 반환하는 백엔드 URL</span>
            </div>

            <div class="form-group mb-3">
              <label class="form-label" for="cfg-collect-url">2단계: 선택 출처 수집 API (collectSelectedSources)</label>
              <input type="text" id="cfg-collect-url" class="input-text w-100" value="${CsvUtils.escapeHtml(AppConfig.endpoints.collectSelectedSources)}">
              <span class="form-help">선택된 출처 URL들을 수집하여 최종 CSV를 반환하는 백엔드 URL</span>
            </div>

            <div class="form-group mb-3">
              <label class="form-label" for="cfg-instant-url" style="color: #a78bfa;">⚡ n8n 일괄 즉시 수집 Webhook URL (instantWebhook)</label>
              <input type="text" id="cfg-instant-url" class="input-text w-100" value="${CsvUtils.escapeHtml(AppConfig.endpoints.instantWebhook)}">
              <span class="form-help">테스트 시: <code>/webhook-test/collect-global-voc</code> | 상시 운영 시: <code>/webhook/collect-global-voc</code></span>
            </div>

            <button type="button" class="btn btn-secondary btn-sm" onclick="SettingsModal.saveEndpoints()">
              엔드포인트 설정 저장
            </button>
          </div>

          <hr class="modal-divider">

          <!-- 3. 서버 측 보안 격리 안내 -->
          <div class="settings-section">
            <h4 class="settings-section-title">서버 격리 설정 (보안 정책)</h4>
            <div class="security-info-box">
              <p>ScrapingAnt API 키 및 크롤링 파라미터는 프론트엔드 코드나 브라우저 저장소에 노출되지 않으며, 서버 및 n8n 환경변수로 격리 주입됩니다.</p>
              <ul>
                <li><strong>API Key:</strong> ${AppConfig.serverSideSettings.apiKeyStatus}</li>
                <li><strong>프록시 유형:</strong> ${AppConfig.serverSideSettings.proxyType}</li>
                <li><strong>추출 모드:</strong> ${AppConfig.serverSideSettings.extractionType}</li>
              </ul>
            </div>
          </div>

          <hr class="modal-divider">

          <!-- 4. API 연동 규격서 열람 -->
          <div class="settings-section">
            <h4 class="settings-section-title">개발팀 연동 규격서</h4>
            <p class="setting-desc">백엔드 엔지니어 전달용 API 요청·응답 규격서 및 워크플로우 분리 체크리스트입니다.</p>
            <div class="mt-2">
              <button type="button" class="btn btn-outline btn-sm" onclick="SettingsModal.openApiSpecSubModal()">
                API 연동 규격서 전문 열람 ↗
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-primary btn-sm" onclick="SettingsModal.close()">닫기</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  close() {
    const modal = document.getElementById('modal-settings');
    if (modal) modal.remove();
  },

  saveEndpoints() {
    const discover = document.getElementById('cfg-discover-url').value.trim();
    const collect = document.getElementById('cfg-collect-url').value.trim();
    const instant = document.getElementById('cfg-instant-url').value.trim();
    AppConfig.saveCustomEndpoints(discover, collect, instant);
    if (window.App && App.updateWebhookIndicator) App.updateWebhookIndicator();
    alert('API 엔드포인트 주소가 저장되었습니다.');
  },

  openApiSpecSubModal() {
    this.close();
    if (typeof ApiDocsView !== 'undefined' && ApiDocsView.openModal) {
      ApiDocsView.openModal();
    }
  }
};
