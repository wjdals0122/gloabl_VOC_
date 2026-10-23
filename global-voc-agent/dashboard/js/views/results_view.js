/**
 * dashboard/js/views/results_view.js
 * 2단계: 수집 실행 및 결과 데이터 표시 뷰 모듈
 * 
 * [표시 규칙 엄격 준수]
 * 1. 실제 모드 진행 상태: 오직 4개 상태만 표시 (요청 전, 요청 처리 중, 응답 수신 완료, 요청 실패)
 *    -> 임의의 진행률(%), 현재 처리 사이트, 남은 시간 절대 표시 금지!
 * 2. 데모 모드의 상세 상태는 [시뮬레이션]임을 명확히 표시
 * 3. 결과 탭 2개 하위 뷰 구성:
 *    - 사이트별 수집 내용: 사이트명, URL, HTTP 상태 코드, voc_content (펼쳐보기/상세 패널)
 *    - 출처·처리 결과: 출처별 HTTP 상태, 프록시 유형, 추출 모드, 수신 크기 등
 * 4. 리뷰별 평점, 작성일, 리뷰 수, 구매 인증 여부 임의 표시 절대 금지 (별도 정형화 데이터 전까지)
 * 5. HTTP 200 응답을 '리뷰 추출 성공'으로 해석하지 않음 (원문 수신 여부와 리뷰 추출은 별개)
 * 6. 외부 HTML 스크립트 실행 방지를 위해 HTML Escape 처리 후 안전 텍스트/마크다운 프리뷰 렌더링
 * 7. 수집 완료 시 '수집 결과 CSV' 파일 다운로드 및 브라우저 로컬 저장소에 CSV 원문 보관
 */

const ResultsView = {
  containerId: 'view-results-content',

  // 뷰 내부 상태
  state: {
    country: 'US',
    product: 'LG CordZero A9X',
    selectedSources: [],
    collectionStatus: AppConfig.CollectionStatus.IDLE, // '요청 전' | '요청 처리 중' | '응답 수신 완료' | '요청 실패'
    statusMessage: '',
    rawCsvText: '',
    results: [], // 파싱된 행 데이터
    activeSubTab: 'content', // 'content' (사이트별 수집 내용) | 'summary' (출처·처리 결과)
    expandedItemIds: new Set(),
    selectedDetailItem: null,
    searchFilter: ''
  },

  init() {
    this.render();
  },

  /**
   * 상위 탭에서 수집 대상 출처 목록을 전달받았을 때 호출
   */
  setTarget(country, product, sources) {
    this.state.country = country;
    this.state.product = product;
    this.state.selectedSources = sources || [];
    this.state.collectionStatus = AppConfig.CollectionStatus.IDLE;
    this.state.statusMessage = `${this.state.selectedSources.length}개 출처에 대한 수집 준비가 완료되었습니다.`;
    this.state.rawCsvText = '';
    this.state.results = [];
    this.state.expandedItemIds.clear();
    this.render();
  },

  /**
   * 기존 수집 이력 데이터를 결과 탭에 복원
   */
  loadFromHistory(historyItem) {
    this.state.country = historyItem.country;
    this.state.product = historyItem.product;
    this.state.selectedSources = historyItem.selectedSources || [];
    this.state.rawCsvText = historyItem.rawCsv || '';
    this.state.results = CsvUtils.parseResultCsv(this.state.rawCsvText);
    this.state.collectionStatus = AppConfig.CollectionStatus.COMPLETED;
    this.state.statusMessage = `이력에서 불러옴 (${historyItem.timestamp.slice(0, 19).replace('T', ' ')})`;
    this.render();
  },

  /**
   * 선택 출처 수집 실행
   */
  async startCollection() {
    if (this.state.selectedSources.length === 0) {
      alert('수집할 출처가 없습니다. 먼저 [출처 탐색] 탭에서 출처를 선택해주세요.');
      return;
    }

    // 상태 1: 요청 처리 중으로 변경 (임의 진행률 없이 정직한 상태 표시)
    this.state.collectionStatus = AppConfig.CollectionStatus.PROCESSING;
    this.state.statusMessage = AppConfig.isDemoMode
      ? '[시뮬레이션] 선택한 출처에 대한 스크래핑을 시뮬레이션 중입니다...'
      : '백엔드 수집 서버로 선택 출처 목록을 전달하고 응답을 대기하고 있습니다...';
    this.render();

    const startTime = Date.now();

    try {
      const res = await VocApiClient.collectSelectedSources(
        this.state.country,
        this.state.product,
        this.state.selectedSources
      );

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // 상태 2: 응답 수신 완료
      this.state.collectionStatus = AppConfig.CollectionStatus.COMPLETED;
      this.state.rawCsvText = res.csvText;
      this.state.results = CsvUtils.parseResultCsv(res.csvText);
      this.state.statusMessage = AppConfig.isDemoMode
        ? `[시뮬레이션 완료] ${this.state.results.length}개 사이트 결과 수신 (${elapsed}초)`
        : `응답 수신 완료: ${this.state.results.length}개 사이트 결과 CSV 파싱 완료 (${elapsed}초)`;

      // 모든 사이트 아코디언 기본 펼침
      this.state.expandedItemIds = new Set(this.state.results.map(r => r.id));

      // 새로고침 후에도 유지되도록 브라우저 로컬 저장소에 CSV 원문 저장
      HistoryStorage.saveItem({
        country: this.state.country,
        product: this.state.product,
        sourcesCount: this.state.selectedSources.length,
        selectedSources: this.state.selectedSources,
        isDemo: AppConfig.isDemoMode,
        rawCsv: res.csvText
      });

      // 히스토리 뷰 갱신
      if (typeof HistoryView !== 'undefined' && HistoryView.render) {
        HistoryView.render();
      }

    } catch (error) {
      // 상태 3: 요청 실패
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

    // 기존 모달 제거
    const old = document.getElementById('modal-voc-detail');
    if (old) old.remove();

    const isHttpOk = item.status_code === 200;
    const httpStatusLabel = isHttpOk
      ? `<span class="badge badge-success">HTTP 200 수신 (원문 수신됨)</span>`
      : `<span class="badge badge-danger">HTTP ${item.status_code} 오류</span>`;

    const modal = document.createElement('div');
    modal.id = 'modal-voc-detail';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <div>
            <h3>${CsvUtils.escapeHtml(item.site_name)} - 수집 원문 상세</h3>
            <p class="modal-subtext"><a href="${CsvUtils.escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer">${CsvUtils.escapeHtml(item.source_url)} ↗</a></p>
          </div>
          <button class="modal-close" onclick="ResultsView.closeDetailModal()">&times;</button>
        </div>
        <div class="modal-meta-strip">
          <div><strong>HTTP 상태:</strong> ${httpStatusLabel}</div>
          <div><strong>프록시:</strong> <code>${CsvUtils.escapeHtml(item.proxy_type)}</code></div>
          <div><strong>추출 방식:</strong> <code>${CsvUtils.escapeHtml(item.extraction_type)}</code></div>
          <div><strong>글자 수:</strong> ${item.voc_content.length.toLocaleString()}자</div>
        </div>
        <div class="modal-body">
          <div class="code-preview-box">
            <pre><code>${CsvUtils.escapeHtml(item.voc_content || '(수집된 내용이 비어 있습니다)')}</code></pre>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText(${JSON.stringify(item.voc_content)}); alert('클립보드에 복사되었습니다.');">
            📋 원문 전체 복사
          </button>
          <button class="btn btn-secondary btn-sm" onclick="ResultsView.closeDetailModal()">닫기</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // 1. 상단 타겟 요약 및 수집 트리거 바
    const selectedCount = this.state.selectedSources.length;
    const isProcessing = this.state.collectionStatus === AppConfig.CollectionStatus.PROCESSING;
    const hasResults = this.state.results.length > 0;

    // 2. 상태 뱃지 렌더링 (엄격한 4가지 상태)
    let statusBadgeClass = 'badge-neutral';
    if (this.state.collectionStatus === AppConfig.CollectionStatus.PROCESSING) statusBadgeClass = 'badge-processing';
    else if (this.state.collectionStatus === AppConfig.CollectionStatus.COMPLETED) statusBadgeClass = 'badge-success';
    else if (this.state.collectionStatus === AppConfig.CollectionStatus.FAILED) statusBadgeClass = 'badge-danger';

    const demoNotice = AppConfig.isDemoMode
      ? `<span class="demo-tag">[시뮬레이션]</span> `
      : '';

    // 3. 서브 탭 콘텐츠 렌더링
    let subTabContentHtml = '';
    if (!hasResults && !isProcessing) {
      subTabContentHtml = `
        <div class="empty-state-card glass-panel text-center">
          <div class="empty-icon">📊</div>
          <h3>수집된 결과가 없습니다.</h3>
          <p>상단의 <strong>[선택 출처 수집 시작]</strong> 버튼을 클릭하여 스크래핑을 실행하세요.</p>
        </div>
      `;
    } else if (isProcessing) {
      subTabContentHtml = `
        <div class="loading-state-box glass-panel">
          <div class="spinner"></div>
          <h4>${demoNotice}수집 요청 처리 중</h4>
          <p>${CsvUtils.escapeHtml(this.state.statusMessage)}</p>
          <p class="muted-info">※ ScrapingAnt 크롤링은 웹사이트 렌더링 및 프록시 우회에 수 초에서 수십 초가 소요될 수 있습니다.<br>
          (현재 워크플로우는 동기 방식이므로 완료 시까지 대기합니다.)</p>
        </div>
      `;
    } else if (this.state.activeSubTab === 'content') {
      // 3-A: 사이트별 수집 내용 뷰
      subTabContentHtml = this.renderVocContentView();
    } else {
      // 3-B: 출처·처리 결과 뷰
      subTabContentHtml = this.renderProcessingSummaryView();
    }

    container.innerHTML = `
      <!-- 수집 컨트롤러 헤더 패널 -->
      <div class="collection-control-card glass-panel">
        <div class="control-grid">
          <div class="target-meta">
            <span class="meta-label">수집 대상:</span>
            <span class="badge badge-country">${this.state.country}</span>
            <strong class="target-product">${CsvUtils.escapeHtml(this.state.product)}</strong>
            <span class="sources-pill">선택 출처: <strong>${selectedCount}개</strong></span>
          </div>

          <div class="status-indicator-strip">
            <span class="status-label">현재 상태:</span>
            <span class="badge ${statusBadgeClass}">${demoNotice}${this.state.collectionStatus}</span>
            <span class="status-message">${CsvUtils.escapeHtml(this.state.statusMessage)}</span>
          </div>

          <div class="control-actions">
            <button class="btn btn-primary" id="btn-start-collection" ${isProcessing || selectedCount === 0 ? 'disabled' : ''} onclick="ResultsView.startCollection()">
              ${isProcessing ? '<div class="spinner-sm"></div> 수집 처리 중...' : '▶️ 선택 출처 수집 시작'}
            </button>
            <button class="btn btn-outline" id="btn-download-results-csv" ${!hasResults ? 'disabled' : ''} onclick="ResultsView.downloadResultCsv()">
              💾 수집 결과 CSV 다운로드
            </button>
          </div>
        </div>
      </div>

      <!-- 결과 서브 네비게이션 탭 -->
      <div class="results-subnav-container">
        <div class="subnav-tabs">
          <button class="subnav-btn ${this.state.activeSubTab === 'content' ? 'active' : ''}" onclick="ResultsView.switchSubTab('content')">
            📑 사이트별 수집 내용 (${this.state.results.length})
          </button>
          <button class="subnav-btn ${this.state.activeSubTab === 'summary' ? 'active' : ''}" onclick="ResultsView.switchSubTab('summary')">
            ⚙️ 출처·처리 결과 요약
          </button>
        </div>

        <div class="results-filter">
          <input type="text" class="input-text-sm" placeholder="사이트명 또는 URL 필터 검색..." value="${CsvUtils.escapeHtml(this.state.searchFilter)}" oninput="ResultsView.setSearchFilter(this.value)">
        </div>
      </div>

      <!-- 메인 결과 렌더링 영역 -->
      <div class="results-tab-body">
        ${subTabContentHtml}
      </div>
    `;
  },

  setSearchFilter(query) {
    this.state.searchFilter = query || '';
    const body = document.querySelector('.results-tab-body');
    if (body) {
      if (this.state.activeSubTab === 'content') {
        body.innerHTML = this.renderVocContentView();
      } else {
        body.innerHTML = this.renderProcessingSummaryView();
      }
    }
  },

  /**
   * 서브탭 A: 사이트별 수집 내용 렌더링
   */
  renderVocContentView() {
    let items = this.state.results;
    if (this.state.searchFilter) {
      const q = this.state.searchFilter.toLowerCase();
      items = items.filter(r => r.site_name.toLowerCase().includes(q) || r.source_url.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      return `
        <div class="glass-panel text-center py-4">
          <p>검색 조건에 맞는 수집 결과가 없습니다.</p>
        </div>
      `;
    }

    const cardsHtml = items.map((item) => {
      const isExpanded = this.state.expandedItemIds.has(item.id);
      const isHttpOk = item.status_code === 200;

      // [규칙 5 준수] HTTP 200 응답을 '리뷰 추출 성공'으로 해석하지 않음!
      const httpBadge = isHttpOk
        ? `<span class="badge badge-success">HTTP 200 수신 (원문 수신됨)</span>`
        : `<span class="badge badge-danger">HTTP ${item.status_code} 오류</span>`;

      // [보안 준수] 외부 HTML/Markdown은 XSS 방지를 위해 escapeHtml 처리
      const safeContent = CsvUtils.escapeHtml(item.voc_content || '(수집된 내용 없음)');
      const previewText = safeContent.length > 500 && !isExpanded
        ? safeContent.slice(0, 500) + '...\n\n(아래 [펼쳐보기]를 클릭하여 전체 원문을 확인하세요)'
        : safeContent;

      return `
        <div class="voc-site-card glass-panel" id="card-${item.id}">
          <div class="voc-card-header">
            <div class="header-left">
              <h4 class="site-title">${CsvUtils.escapeHtml(item.site_name)}</h4>
              <a href="${CsvUtils.escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer" class="link-external" title="원본 사이트 열기">
                ${CsvUtils.escapeHtml(item.source_url)} ↗
              </a>
            </div>
            <div class="header-right">
              ${httpBadge}
              <span class="badge badge-neutral">${item.voc_content.length.toLocaleString()} 글자</span>
              <button class="btn btn-sm btn-outline" onclick="ResultsView.openDetailModal('${item.id}')">
                🔍 상세 패널
              </button>
              <button class="btn btn-sm btn-secondary" onclick="ResultsView.toggleAccordion('${item.id}')">
                ${isExpanded ? '접기 ▲' : '펼쳐보기 ▼'}
              </button>
            </div>
          </div>

          <div class="voc-card-body ${isExpanded ? 'expanded' : 'collapsed'}">
            <div class="content-preview-container">
              <pre class="voc-content-pre"><code>${previewText}</code></pre>
            </div>
          </div>

          <div class="voc-card-footer">
            <span class="footer-note">📌 <strong>데이터 안내</strong>: 본 영역은 사이트 단위 수집 결과(voc_content)입니다. 평점/작성일 등 구조화 리뷰 단위 데이터는 백엔드 정형화 파서 추가 후 노출됩니다.</span>
            <button class="btn btn-xs btn-outline" onclick="navigator.clipboard.writeText(${JSON.stringify(item.voc_content)}); alert('원문 내용이 클립보드에 복사되었습니다.');">
              복사
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="voc-cards-list">${cardsHtml}</div>`;
  },

  /**
   * 서브탭 B: 출처·처리 결과 요약 테이블 렌더링
   */
  renderProcessingSummaryView() {
    let items = this.state.results;
    if (this.state.searchFilter) {
      const q = this.state.searchFilter.toLowerCase();
      items = items.filter(r => r.site_name.toLowerCase().includes(q) || r.source_url.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      return `
        <div class="glass-panel text-center py-4">
          <p>표시할 출처 및 처리 결과 데이터가 없습니다.</p>
        </div>
      `;
    }

    const rowsHtml = items.map((item, idx) => {
      const isHttpOk = item.status_code === 200;
      const statusBadge = isHttpOk
        ? `<span class="badge badge-success">HTTP 200 OK</span>`
        : `<span class="badge badge-danger">HTTP ${item.status_code}</span>`;

      const processingStatus = isHttpOk
        ? `<span class="text-success">원문 텍스트 수신 완료 (${item.voc_content.length} bytes)</span>`
        : `<span class="text-danger">스크래핑 실패 / 차단 응답</span>`;

      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><strong>${CsvUtils.escapeHtml(item.site_name)}</strong></td>
          <td>
            <a href="${CsvUtils.escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer" class="link-external">
              ${CsvUtils.escapeHtml(item.source_url)} ↗
            </a>
          </td>
          <td class="text-center">${statusBadge}</td>
          <td class="text-center"><span class="badge badge-neutral">${CsvUtils.escapeHtml(item.proxy_type)}</span></td>
          <td class="text-center"><span class="badge badge-neutral">${CsvUtils.escapeHtml(item.extraction_type)}</span></td>
          <td>${processingStatus}</td>
          <td class="text-center">
            <button class="btn btn-xs btn-outline" onclick="ResultsView.openDetailModal('${item.id}')">상세 보기</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="glass-panel">
        <div class="table-responsive">
          <table class="voc-data-table">
            <thead>
              <tr>
                <th class="text-center" style="width: 50px;">#</th>
                <th>출처 사이트명</th>
                <th>원본 URL</th>
                <th class="text-center">HTTP 상태</th>
                <th class="text-center">프록시 유형</th>
                <th class="text-center">추출 모드</th>
                <th>처리 상태 판정</th>
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
