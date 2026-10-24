/**
 * dashboard/js/views/results_view.js
 * 2단계: 수집 실행 및 결과 확인 뷰 모듈
 * 
 * [요구사항 반영]
 * 1. VOC 탐색에서 '선택한 N개 출처 수집' 클릭 시 수집 결과 탭으로 즉시 전환 후 자동 수집 시작
 * 2. 수집 시작 버튼 불필요화에 따른 완전 제거 (중복 액션 방지)
 * 3. 서버 및 기술 정보 보기 기능 완전 삭제
 * 4. 원형 스피너 로딩 대신 예상 소요 시간과 단계가 표시되는 바(Bar) 형태의 시각적 프로그레스 바 적용
 * 5. HTTP 200 수신을 '원문 수신됨'으로 정직하게 표기 및 아코디언/상세 패널 지원
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
    expandedItemIds: new Set(),
    selectedDetailItem: null,
    searchFilter: '',
    progressTimer: null
  },

  init() {
    this.render();

    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('preview_progress') === '1') {
        const dummySources = MockData.sourcesByCountry['US'];
        this.state.selectedSources = dummySources;
        this.state.collectionStatus = AppConfig.CollectionStatus.PROCESSING;
        this.state.statusMessage = '가상 환경에서 출처별 스크래핑을 시뮬레이션하고 있습니다...';
        this.render();
        setTimeout(() => {
          const fillEl = document.getElementById('voc-progress-fill');
          const percentEl = document.getElementById('voc-progress-percent');
          const stepEl = document.getElementById('voc-progress-step-text');
          const timerEl = document.getElementById('progress-timer-display');
          if (fillEl) fillEl.style.width = '62%';
          if (percentEl) percentEl.textContent = '62%';
          if (stepEl) stepEl.textContent = '[3/5] RTINGS.com 디스플레이 평가 분석 중...';
          if (timerEl) timerEl.textContent = '1.4초 경과 / 약 2~3초 소요 예상';
          [0, 1].forEach(idx => {
            const chip = document.getElementById(`source-chip-${idx}`);
            if (chip) {
              chip.className = 'source-chip completed';
              const icon = chip.querySelector('.chip-icon');
              if (icon) icon.textContent = '✓';
            }
          });
          const activeChip = document.getElementById('source-chip-2');
          if (activeChip) {
            activeChip.className = 'source-chip active';
            const icon = activeChip.querySelector('.chip-icon');
            if (icon) icon.textContent = '⚡';
          }
        }, 50);
      }

      if (urlParams.get('preview_completed') === '1') {
        const dummySources = MockData.sourcesByCountry['US'];
        this.state.selectedSources = dummySources;
        this.state.collectionStatus = AppConfig.CollectionStatus.COMPLETED;
        this.state.rawCsvText = MockData.generateMockResultCsv('US', 'LG OLED evo G4', dummySources);
        this.state.results = CsvUtils.parseResultCsv(this.state.rawCsvText);
        this.state.statusMessage = '5개 사이트 수집 완료 (2.1초 소요)';
        this.state.expandedItemIds = new Set(this.state.results.map(r => r.id));
        this.render();
        setTimeout(() => {
          if (typeof App !== 'undefined' && App.navigateToTab) {
            App.navigateToTab('tab-results');
            window.scrollTo(0, 0);
          }
        }, 10);
      }
    } catch (e) {}
  },

  setTarget(country, product, sources, autoStart = true) {
    this.state.country = country;
    this.state.product = product;
    this.state.selectedSources = sources || [];
    this.state.rawCsvText = '';
    this.state.results = [];
    this.state.expandedItemIds.clear();

    if (autoStart && this.state.selectedSources.length > 0) {
      this.startCollection();
    } else {
      this.state.collectionStatus = AppConfig.CollectionStatus.IDLE;
      this.state.statusMessage = `${this.state.selectedSources.length}개 출처 선택됨`;
      this.render();
    }
  },

  async startCollection() {
    if (this.state.selectedSources.length === 0) {
      alert('수집할 출처가 없습니다. 먼저 출처 탐색 단계에서 출처를 선택해주세요.');
      return;
    }

    // 기존 타이머 정리
    if (this.state.progressTimer) {
      clearInterval(this.state.progressTimer);
      this.state.progressTimer = null;
    }

    this.state.collectionStatus = AppConfig.CollectionStatus.PROCESSING;
    this.state.statusMessage = '선택한 출처에서 VOC를 수집하고 있습니다...';
    this.render();

    const startTime = Date.now();
    const sources = this.state.selectedSources;
    const totalSources = sources.length;

    // 프로그레스 바 DOM 요소 업데이트 헬퍼
    const updateProgressUI = (percent, stepText, timerText, activeIdx) => {
      const fillEl = document.getElementById('voc-progress-fill');
      const percentEl = document.getElementById('voc-progress-percent');
      const stepEl = document.getElementById('voc-progress-step-text');
      const timerEl = document.getElementById('progress-timer-display');

      if (fillEl) fillEl.style.width = `${Math.min(Math.round(percent), 100)}%`;
      if (percentEl) percentEl.textContent = `${Math.min(Math.round(percent), 100)}%`;
      if (stepEl && stepText) stepEl.textContent = stepText;
      if (timerEl && timerText) timerEl.textContent = timerText;

      if (typeof activeIdx === 'number') {
        sources.forEach((_, idx) => {
          const chip = document.getElementById(`source-chip-${idx}`);
          if (!chip) return;
          if (idx < activeIdx) {
            chip.className = 'source-chip completed';
            const icon = chip.querySelector('.chip-icon');
            if (icon) icon.textContent = '✓';
          } else if (idx === activeIdx) {
            chip.className = 'source-chip active';
            const icon = chip.querySelector('.chip-icon');
            if (icon) icon.textContent = '⚡';
          } else {
            chip.className = 'source-chip pending';
            const icon = chip.querySelector('.chip-icon');
            if (icon) icon.textContent = '⏳';
          }
        });
      }
    };

    // 초기 상태 반영
    updateProgressUI(8, '출처 서버 연결 및 세션 초기화 중...', '약 2~3초 소요 예상', 0);

    // 부드러운 진행률 시각화 타이머 (최대 92%까지 도달)
    let currentPercent = 8;
    this.state.progressTimer = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const elapsedSec = (elapsedMs / 1000).toFixed(1);

      if (currentPercent < 92) {
        currentPercent += Math.max(1, (92 - currentPercent) * 0.12);
        
        // 현재 활성 출처 인덱스 계산
        const stageRatio = currentPercent / 92;
        const currentActiveIdx = Math.min(Math.floor(stageRatio * totalSources), totalSources - 1);
        const currentSourceName = sources[currentActiveIdx] ? sources[currentActiveIdx].site_name : '출처';
        
        const stepText = `[${currentActiveIdx + 1}/${totalSources}] ${currentSourceName} 리뷰 텍스트 수집 및 파싱 중...`;
        const timerText = `${elapsedSec}초 경과 / 약 2~3초 소요 예상`;

        updateProgressUI(currentPercent, stepText, timerText, currentActiveIdx);
      } else {
        const timerText = `${elapsedSec}초 경과 (응답 대기 중)`;
        updateProgressUI(92, '수집 원문 정제 및 결과 생성 중...', timerText, totalSources - 1);
      }
    }, 120);

    try {
      const res = await VocApiClient.collectSelectedSources(
        this.state.country,
        this.state.product,
        this.state.selectedSources
      );

      // 타이머 중단 및 100% 완료 연출
      if (this.state.progressTimer) {
        clearInterval(this.state.progressTimer);
        this.state.progressTimer = null;
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      updateProgressUI(100, '수집 완료! 결과를 불러옵니다...', `수집 완료 (${elapsed}초 소요)`, totalSources);

      // 100% 도달 후 280ms 시각적 여운 후 결과 화면으로 전환
      await new Promise(r => setTimeout(r, 280));

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
      if (this.state.progressTimer) {
        clearInterval(this.state.progressTimer);
        this.state.progressTimer = null;
      }
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
    let statusText = '대기';
    if (this.state.collectionStatus === AppConfig.CollectionStatus.PROCESSING) {
      statusBadgeClass = 'badge-processing';
      statusText = '요청 처리 중';
    } else if (this.state.collectionStatus === AppConfig.CollectionStatus.COMPLETED) {
      statusBadgeClass = 'badge-success';
      statusText = '수집 완료';
    } else if (this.state.collectionStatus === AppConfig.CollectionStatus.FAILED) {
      statusBadgeClass = 'badge-danger';
      statusText = '수집 실패';
    }

    let subTabContentHtml = '';
    if (isProcessing) {
      subTabContentHtml = `
        <div class="collection-progress-card">
          <div class="progress-card-top">
            <div class="progress-title-area">
              <div class="progress-title-row">
                <span class="badge badge-processing-pulse">수집 진행 중</span>
                <h4 class="progress-main-heading">선택한 ${selectedCount}개 출처에서 리뷰 데이터를 수집하고 있습니다</h4>
              </div>
              <p class="progress-sub-text">가상 환경에서 각 출처별 리뷰 텍스트 및 고객 반응 데이터를 수집하고 정제합니다.</p>
            </div>
            <div class="progress-timer-box">
              <span class="timer-icon">⏱️</span>
              <div class="timer-text-group">
                <span class="timer-label">소요 시간</span>
                <strong class="timer-value" id="progress-timer-display">약 2~3초 소요 예상</strong>
              </div>
            </div>
          </div>

          <!-- 진행률 바 본체 -->
          <div class="progress-bar-shell">
            <div class="progress-bar-track">
              <div class="progress-bar-fill" id="voc-progress-fill" style="width: 8%;">
                <div class="progress-bar-shimmer"></div>
              </div>
            </div>
          </div>

          <!-- 하단 상태 메타: 현재 단계 텍스트 + 백분율 -->
          <div class="progress-status-meta">
            <div class="progress-current-step">
              <span class="step-pulse-dot"></span>
              <span class="step-text" id="voc-progress-step-text">출처 서버 연결 및 세션 초기화 중...</span>
            </div>
            <div class="progress-percentage-display">
              <strong id="voc-progress-percent">8%</strong>
            </div>
          </div>

          <!-- 출처별 진행 현황 칩 목록 -->
          <div class="progress-source-chips">
            ${this.state.selectedSources.map((s, i) => `
              <div class="source-chip ${i === 0 ? 'active' : 'pending'}" id="source-chip-${i}">
                <span class="chip-icon">${i === 0 ? '⚡' : '⏳'}</span>
                <span class="chip-name">${CsvUtils.escapeHtml(s.site_name || '출처')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (!hasResults) {
      subTabContentHtml = `
        <div class="empty-state-card text-center">
          <h3>수집된 결과가 없습니다.</h3>
          <p>VOC 탐색 탭에서 수집할 출처를 선택한 후 <strong>[선택한 출처 수집]</strong>을 진행하세요.</p>
          <button type="button" class="btn btn-primary btn-sm" onclick="App.navigateToTab('tab-sources')" style="margin-top: 14px;">
            VOC 탐색으로 이동
          </button>
        </div>
      `;
    } else {
      subTabContentHtml = this.renderVocContentView();
    }

    container.innerHTML = `
      <!-- 수집 컨트롤 카드 (수집 시작 버튼 불필요화 제거 & 서버/기술 정보 완전 삭제) -->
      <div class="collection-header-card">
        <div class="header-card-row">
          <div class="target-summary">
            <span class="summary-label">수집 대상:</span>
            <span class="badge badge-neutral">${this.state.country}</span>
            <strong class="target-product-name">${CsvUtils.escapeHtml(this.state.product)}</strong>
            <span class="target-count-badge">선택 출처: ${selectedCount}개</span>
          </div>

          <div class="status-box">
            <span class="status-label">상태:</span>
            <span class="badge ${statusBadgeClass}">${statusText}</span>
            <span class="status-text">${CsvUtils.escapeHtml(this.state.statusMessage)}</span>
          </div>

          <div class="action-buttons">
            <button type="button" class="btn btn-outline" id="btn-download-results-csv" ${!hasResults ? 'disabled' : ''} onclick="ResultsView.downloadResultCsv()">
              수집 결과 CSV 다운로드
            </button>
          </div>
        </div>
      </div>

      <!-- 사이트별 수집 내용 부제목 영역 (요약 탭 불필요 처리 제거 및 검은색 부제목 배치) -->
      <div class="results-header-bar">
        <h3 class="results-section-title">
          사이트별 수집 내용 ${hasResults ? `<span class="badge badge-neutral" style="font-size: 13px; font-weight: 600; color: #111827;">${this.state.results.length}개</span>` : ''}
        </h3>

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
      body.innerHTML = this.renderVocContentView();
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
              ${!isHttpOk ? `<span class="badge badge-danger">수집 실패 (${item.status_code})</span>` : ''}
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
  }
};
