/**
 * dashboard/js/views/results_view.js
 * 2단계: 수집 실행 및 결과 확인 뷰 모듈
 * 
 * [요구사항 반영]
 * 1. 통일된 다크 테마 및 단일 블루 강조색 적용 (그라데이션 및 발광 제거)
 * 2. 수집 상태와 결과를 주요 정보로 배치, 기술/서버 정보는 접어서 확인하도록 구성
 * 3. HTTP 200 수신을 '원문 수신됨'으로 정직하게 표기
 * 4. 긴 본문은 펼쳐보기 및 상세 패널로 가독성 높게 표시
 */

const ResultsView = {
  containerId: 'view-results-content',

  state: {
    country: 'US',
    product: 'LG OLED evo G4',
    selectedSources: [],
    collectionStatus: AppConfig.CollectionStatus.IDLE,
    statusMessage: '',
    rawCsvText: '',
    results: [],
    activeSubTab: 'content',
    expandedItemIds: new Set(),
    selectedDetailItem: null,
    searchFilter: '',
    isTechInfoOpen: false,
    isInstantMode: false
  },

  init() {
    this.render();
  },

  setTarget(country, product, sources) {
    this.state.country = country;
    this.state.product = product;
    this.state.selectedSources = sources || [];
    this.state.isInstantMode = false;
    this.state.collectionStatus = AppConfig.CollectionStatus.IDLE;
    this.state.statusMessage = `${this.state.selectedSources.length}개 출처가 선택되었습니다.`;
    this.state.rawCsvText = '';
    this.state.results = [];
    this.state.expandedItemIds.clear();
    this.render();
  },

  async startInstantCollection(country, product) {
    this.state.country = country;
    this.state.product = product;
    this.state.selectedSources = [];
    this.state.isInstantMode = true;
    this.state.collectionStatus = AppConfig.CollectionStatus.PROCESSING;
    this.state.statusMessage = 'n8n Webhook(collect-global-voc) 호출 중: AI 후보 출처 탐색 및 스크래핑을 일괄 실행하고 있습니다...';
    this.state.rawCsvText = '';
    this.state.results = [];
    this.state.expandedItemIds.clear();
    this.render();

    const startTime = Date.now();

    try {
      const res = await VocApiClient.collectInstantWebhook(country, product);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      this.state.collectionStatus = AppConfig.CollectionStatus.COMPLETED;
      this.state.rawCsvText = res.csvText;
      this.state.results = CsvUtils.parseResultCsv(res.csvText);
      this.state.statusMessage = `n8n 일괄 수집 완료: ${this.state.results.length}개 사이트 데이터 수신 (${elapsed}초 소요)`;
      this.state.expandedItemIds = new Set(this.state.results.map(r => r.id));

      try {
        localStorage.setItem('voc_last_session_result', JSON.stringify({
          country: this.state.country,
          product: this.state.product,
          rawCsv: res.csvText,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {}

    } catch (error) {
      this.state.collectionStatus = AppConfig.CollectionStatus.FAILED;
      this.state.statusMessage = `수집 실패: ${error.message || '요청 처리 중 오류가 발생했습니다.'}`;
      console.error('[ResultsView] n8n 일괄 수집 오류:', error);
    } finally {
      this.render();
    }
  },

  async startCollection() {
    if (this.state.selectedSources.length === 0) {
      alert('수집할 출처가 없습니다. 먼저 출처 탐색 단계에서 출처를 선택해주세요.');
      return;
    }

    this.state.collectionStatus = AppConfig.CollectionStatus.PROCESSING;
    this.state.statusMessage = AppConfig.isDemoMode
      ? '가상 환경에서 출처별 스크래핑을 시뮬레이션하고 있습니다...'
      : '수집 서버로 요청을 전달하고 응답을 대기하고 있습니다...';
    this.render();

    const startTime = Date.now();

    try {
      const res = await VocApiClient.collectSelectedSources(
        this.state.country,
        this.state.product,
        this.state.selectedSources
      );

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      this.state.collectionStatus = AppConfig.CollectionStatus.COMPLETED;
      this.state.rawCsvText = res.csvText;
      this.state.results = CsvUtils.parseResultCsv(res.csvText);
      this.state.statusMessage = `${this.state.results.length}개 사이트 수집 완료 (${elapsed}초 소요)`;
      this.state.expandedItemIds = new Set(this.state.results.map(r => r.id));

      // 최근 세션 결과 로컬 임시 보관
      try {
        localStorage.setItem('voc_last_session_result', JSON.stringify({
          country: this.state.country,
          product: this.state.product,
          rawCsv: res.csvText,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {}

    } catch (error) {
      this.state.collectionStatus = AppConfig.CollectionStatus.FAILED;
      this.state.statusMessage = `수집 실패: ${error.message || '네트워크 오류가 발생했습니다.'}`;
      console.error('[ResultsView] 수집 실행 오류:', error);
    } finally {
      this.render();
    }
  },

  downloadResultCsv() {
    if (!this.state.rawCsvText) {
      alert('다운로드할 수집 결과 데이터가 없습니다.');
      return;
    }
    const filename = `scraped_voc_${this.state.country}_${this.state.product.replace(/\s+/g, '_')}.csv`;
    CsvUtils.downloadCsvText(this.state.rawCsvText, filename);
  },

  switchSubTab(tabName) {
    this.state.activeSubTab = tabName;
    this.render();
  },

  toggleAccordion(id) {
    if (this.state.expandedItemIds.has(id)) {
      this.state.expandedItemIds.delete(id);
    } else {
      this.state.expandedItemIds.add(id);
    }
    this.render();
  },

  toggleTechInfo() {
    this.state.isTechInfoOpen = !this.state.isTechInfoOpen;
    this.render();
  },

  openDetailModal(id) {
    const item = this.state.results.find(r => r.id === id);
    if (!item) return;
    this.state.selectedDetailItem = item;
    this.renderDetailModal();
  },

  closeDetailModal() {
    this.state.selectedDetailItem = null;
    const modal = document.getElementById('modal-voc-detail');
    if (modal) modal.remove();
  },

  renderDetailModal() {
    const item = this.state.selectedDetailItem;
    if (!item) return;

    const old = document.getElementById('modal-voc-detail');
    if (old) old.remove();

    const isHttpOk = item.status_code === 200;
    const httpStatusLabel = isHttpOk
      ? `<span class="badge badge-success">HTTP 200 (원문 수신됨)</span>`
      : `<span class="badge badge-danger">HTTP ${item.status_code} 오류</span>`;

    const modal = document.createElement('div');
    modal.id = 'modal-voc-detail';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <div>
            <h3>${CsvUtils.escapeHtml(item.site_name)} - 수집 원문 상세</h3>
            <p class="modal-subtext"><a href="${CsvUtils.escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer" class="link-open-page">${CsvUtils.escapeHtml(item.source_url)} ↗</a></p>
          </div>
          <button type="button" class="modal-close" onclick="ResultsView.closeDetailModal()">&times;</button>
        </div>
        <div class="modal-meta-strip">
          <div>상태: ${httpStatusLabel}</div>
          <div>수집 크기: ${item.voc_content.length.toLocaleString()}자</div>
        </div>
        <div class="modal-body">
          <div class="code-preview-box">
            <pre><code>${CsvUtils.escapeHtml(item.voc_content || '(수집된 내용이 없습니다)')}</code></pre>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText(${JSON.stringify(item.voc_content)}); alert('원문이 클립보드에 복사되었습니다.');">
            원문 복사
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="ResultsView.closeDetailModal()">닫기</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const selectedCount = this.state.selectedSources.length;
    const isProcessing = this.state.collectionStatus === AppConfig.CollectionStatus.PROCESSING;
    const hasResults = this.state.results.length > 0;

    let statusBadgeClass = 'badge-neutral';
    if (this.state.collectionStatus === AppConfig.CollectionStatus.PROCESSING) statusBadgeClass = 'badge-processing';
    else if (this.state.collectionStatus === AppConfig.CollectionStatus.COMPLETED) statusBadgeClass = 'badge-success';
    else if (this.state.collectionStatus === AppConfig.CollectionStatus.FAILED) statusBadgeClass = 'badge-danger';

    let subTabContentHtml = '';
    if (!hasResults && !isProcessing) {
      if (this.state.collectionStatus === AppConfig.CollectionStatus.FAILED) {
        subTabContentHtml = `
          <div class="empty-state-card text-center">
            <div class="n8n-alert-card">
              <div class="n8n-alert-header">
                <span class="alert-icon">⚠️</span>
                <h4>수집 요청 실패 안내</h4>
              </div>
              <p class="alert-message">${CsvUtils.escapeHtml(this.state.statusMessage)}</p>
              <div class="n8n-guide-box">
                <strong>💡 n8n 연결 및 수신 체크리스트:</strong>
                <ol>
                  <li><strong>n8n 실행 확인:</strong> 브라우저에서 <a href="http://localhost:5678" target="_blank" rel="noopener noreferrer">http://localhost:5678 ↗</a>이 열리는지 확인하세요.</li>
                  <li><strong>테스트 이벤트 대기:</strong> n8n 캔버스에서 <strong>[Execute workflow]</strong> (또는 Webhook 노드의 <strong>[Listen for test event]</strong>)를 클릭합니다.</li>
                  <li><strong>상시 수신 설정(권장):</strong> 워크플로우를 상시 수신하려면 상단 토글을 <strong>Active(ON)</strong>로 켜고, 설정(⚙️)에서 엔드포인트를 <code>/webhook/collect-global-voc</code>로 지정하세요.</li>
                </ol>
              </div>
              <div class="alert-action-row">
                ${this.state.isInstantMode ? `
                  <button type="button" class="btn btn-instant" onclick="ResultsView.startInstantCollection(ResultsView.state.country, ResultsView.state.product)">
                    ⚡ n8n 즉시 재수집 시도
                  </button>
                ` : `
                  <button type="button" class="btn btn-primary" onclick="ResultsView.startCollection()">
                    다시 시도
                  </button>
                `}
              </div>
            </div>
          </div>
        `;
      } else {
        subTabContentHtml = `
          <div class="empty-state-card text-center">
            <h3>수집된 결과가 없습니다.</h3>
            <p>상단의 <strong>[${this.state.isInstantMode ? 'n8n 일괄 즉시 수집' : '수집 시작'}]</strong> 버튼을 클릭하여 스크래핑을 실행하세요.</p>
          </div>
        `;
      }
    } else if (isProcessing) {
      subTabContentHtml = `
        <div class="loading-state-card">
          <div class="spinner"></div>
          <h4>수집 요청 처리 중</h4>
          <p>${CsvUtils.escapeHtml(this.state.statusMessage)}</p>
          <span class="loading-hint">AI 출처 탐색 및 ScrapingAnt 웹 스크래핑이 진행되는 동안 잠시만 기다려주세요 (약 10~30초).</span>
        </div>
      `;
    } else if (this.state.activeSubTab === 'content') {
      subTabContentHtml = this.renderVocContentView();
    } else {
      subTabContentHtml = this.renderProcessingSummaryView();
    }

    // 기술 정보 및 서버 설정 접이식 영역
    const techInfoHtml = `
      <div class="tech-info-collapsible">
        <button type="button" class="btn-tech-toggle" onclick="ResultsView.toggleTechInfo()">
          <span>${this.state.isTechInfoOpen ? '▼ 서버 및 기술 정보 접기' : '▶ 서버 및 기술 정보 보기'}</span>
        </button>
        ${this.state.isTechInfoOpen ? `
          <div class="tech-info-content">
            <div class="tech-info-grid">
              <div><strong>프록시 유형:</strong> ${AppConfig.serverSideSettings.proxyType}</div>
              <div><strong>추출 방식:</strong> ${AppConfig.serverSideSettings.extractionType}</div>
              <div><strong>보안 키:</strong> ${AppConfig.serverSideSettings.apiKeyStatus}</div>
              <div><strong>수집 엔드포인트:</strong> <code>${this.state.isInstantMode ? AppConfig.endpoints.instantWebhook : AppConfig.endpoints.collectSelectedSources}</code></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    const countBadgeHtml = this.state.isInstantMode
      ? `<span class="target-count-badge badge-instant-mode">⚡ n8n 일괄 즉시 수집 모드</span>`
      : `<span class="target-count-badge">선택 출처: ${selectedCount}개</span>`;

    const actionButtonHtml = this.state.isInstantMode
      ? `<button type="button" class="btn btn-instant" id="btn-start-collection" ${isProcessing ? 'disabled' : ''} onclick="ResultsView.startInstantCollection(ResultsView.state.country, ResultsView.state.product)">
          ${isProcessing ? '처리 중...' : '⚡ n8n 일괄 재수집'}
        </button>`
      : `<button type="button" class="btn btn-primary" id="btn-start-collection" ${isProcessing || selectedCount === 0 ? 'disabled' : ''} onclick="ResultsView.startCollection()">
          ${isProcessing ? '처리 중...' : '수집 시작'}
        </button>`;

    container.innerHTML = `
      <!-- 수집 컨트롤 카드 -->
      <div class="collection-header-card">
        <div class="header-card-row">
          <div class="target-summary">
            <span class="summary-label">수집 대상:</span>
            <span class="badge badge-neutral">${this.state.country}</span>
            <strong class="target-product-name">${CsvUtils.escapeHtml(this.state.product)}</strong>
            ${countBadgeHtml}
          </div>

          <div class="status-box">
            <span class="status-label">상태:</span>
            <span class="badge ${statusBadgeClass}">${this.state.collectionStatus}</span>
            <span class="status-text">${CsvUtils.escapeHtml(this.state.statusMessage)}</span>
          </div>

          <div class="action-buttons">
            ${actionButtonHtml}
            <button type="button" class="btn btn-outline" id="btn-download-results-csv" ${!hasResults ? 'disabled' : ''} onclick="ResultsView.downloadResultCsv()">
              수집 결과 CSV 다운로드
            </button>
          </div>
        </div>

        ${techInfoHtml}
      </div>

      <!-- 결과 서브 네비게이션 -->
      <div class="results-subnav-bar">
        <div class="subnav-tabs">
          <button type="button" class="subnav-btn ${this.state.activeSubTab === 'content' ? 'active' : ''}" onclick="ResultsView.switchSubTab('content')">
            사이트별 수집 내용 (${this.state.results.length})
          </button>
          <button type="button" class="subnav-btn ${this.state.activeSubTab === 'summary' ? 'active' : ''}" onclick="ResultsView.switchSubTab('summary')">
            출처 및 처리 결과 요약
          </button>
        </div>

        <div class="results-search">
          <input type="text" class="input-text-sm" placeholder="사이트명 또는 URL 필터..." value="${CsvUtils.escapeHtml(this.state.searchFilter)}" oninput="ResultsView.setSearchFilter(this.value)">
        </div>
      </div>

      <!-- 메인 결과 본문 -->
      <div class="results-body">
        ${subTabContentHtml}
      </div>
    `;
  },

  setSearchFilter(query) {
    this.state.searchFilter = query || '';
    const body = document.querySelector('.results-body');
    if (body) {
      if (this.state.activeSubTab === 'content') {
        body.innerHTML = this.renderVocContentView();
      } else {
        body.innerHTML = this.renderProcessingSummaryView();
      }
    }
  },

  renderVocContentView() {
    let items = this.state.results;
    if (this.state.searchFilter) {
      const q = this.state.searchFilter.toLowerCase();
      items = items.filter(r => r.site_name.toLowerCase().includes(q) || r.source_url.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      return `
        <div class="empty-state-card text-center">
          <p>검색 조건에 맞는 수집 결과가 없습니다.</p>
        </div>
      `;
    }

    const cardsHtml = items.map((item) => {
      const isExpanded = this.state.expandedItemIds.has(item.id);
      const isHttpOk = item.status_code === 200;

      const httpBadge = isHttpOk
        ? `<span class="badge badge-success">HTTP 200 (원문 수신됨)</span>`
        : `<span class="badge badge-danger">HTTP ${item.status_code}</span>`;

      const safeContent = CsvUtils.escapeHtml(item.voc_content || '(수집된 내용 없음)');
      const previewText = safeContent.length > 500 && !isExpanded
        ? safeContent.slice(0, 500) + '...\n\n[펼쳐보기]를 클릭하여 전체 내용을 확인하세요.'
        : safeContent;

      return `
        <div class="voc-card" id="card-${item.id}">
          <div class="voc-card-header">
            <div class="header-title-box">
              <strong class="voc-site-name">${CsvUtils.escapeHtml(item.site_name)}</strong>
              <a href="${CsvUtils.escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer" class="link-open-page" title="${CsvUtils.escapeHtml(item.source_url)}">
                페이지 열기 ↗
              </a>
            </div>
            <div class="header-action-box">
              ${httpBadge}
              <span class="content-length-tag">${item.voc_content.length.toLocaleString()}자</span>
              <button type="button" class="btn btn-sm btn-outline" onclick="ResultsView.openDetailModal('${item.id}')">
                상세 패널
              </button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="ResultsView.toggleAccordion('${item.id}')">
                ${isExpanded ? '접기 ▲' : '펼쳐보기 ▼'}
              </button>
            </div>
          </div>

          <div class="voc-card-content ${isExpanded ? 'expanded' : 'collapsed'}">
            <pre class="voc-pre"><code>${previewText}</code></pre>
          </div>

          <div class="voc-card-footer">
            <span class="footer-hint">※ 본 영역은 사이트 단위 수집 원문입니다.</span>
            <button type="button" class="btn btn-xs btn-outline" onclick="navigator.clipboard.writeText(${JSON.stringify(item.voc_content)}); alert('클립보드에 복사되었습니다.');">
              내용 복사
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="voc-card-list">${cardsHtml}</div>`;
  },

  renderProcessingSummaryView() {
    let items = this.state.results;
    if (this.state.searchFilter) {
      const q = this.state.searchFilter.toLowerCase();
      items = items.filter(r => r.site_name.toLowerCase().includes(q) || r.source_url.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      return `
        <div class="empty-state-card text-center">
          <p>표시할 결과 데이터가 없습니다.</p>
        </div>
      `;
    }

    const rowsHtml = items.map((item, idx) => {
      const isHttpOk = item.status_code === 200;
      const statusBadge = isHttpOk
        ? `<span class="badge badge-success">HTTP 200</span>`
        : `<span class="badge badge-danger">HTTP ${item.status_code}</span>`;

      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><strong>${CsvUtils.escapeHtml(item.site_name)}</strong></td>
          <td>
            <a href="${CsvUtils.escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer" class="link-open-page" title="${CsvUtils.escapeHtml(item.source_url)}">
              페이지 열기 ↗
            </a>
          </td>
          <td class="text-center">${statusBadge}</td>
          <td class="text-center">${CsvUtils.escapeHtml(item.proxy_type)}</td>
          <td class="text-center">${CsvUtils.escapeHtml(item.extraction_type)}</td>
          <td class="text-center">${item.voc_content.length.toLocaleString()}자</td>
          <td class="text-center">
            <button type="button" class="btn btn-xs btn-outline" onclick="ResultsView.openDetailModal('${item.id}')">상세 보기</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="table-card">
        <div class="table-responsive">
          <table class="voc-data-table">
            <thead>
              <tr>
                <th class="text-center" style="width: 50px;">#</th>
                <th>출처 사이트명</th>
                <th>원문 링크</th>
                <th class="text-center">HTTP 상태</th>
                <th class="text-center">프록시</th>
                <th class="text-center">추출 모드</th>
                <th class="text-center">수신 크기</th>
                <th class="text-center">작업</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
