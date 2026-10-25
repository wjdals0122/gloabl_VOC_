/**
 * dashboard/js/views/results_view.js
 * 2단계: 수집 실행 및 결과 확인 뷰 모듈
 * 
 * [출처별 그룹화 & AI 스마트 필터 적용]
 * 1. 사이트별 그룹화 아코디언(Site-Grouped Accordion) 적용으로 수십~수백 건의 리뷰도 깔끔하게 탐색
 * 2. 14개 표준 AI VOC 스키마 연동 (한국어 요약, 감성 분석, 고객 의도, 토픽 태그, 경쟁사, LG 언급)
 * 3. 스마트 필터: [전체] [🔥 LG 직접 언급] [⚠️ 불만·품질 이슈] [⚔️ 경쟁사 비교] [🟢 긍정 후기]
 * 4. 각 리뷰 카드: AI 한국어 1줄 요약 볼드 강조 + [영문 원문 보기 ▼] 접이식 아코디언
 */

const ResultsView = {
  containerId: 'view-results-content',

  state: {
    country: 'US',
    product: 'LG OLED evo G4 & 워시타워',
    selectedSources: [],
    collectionStatus: AppConfig.CollectionStatus.IDLE,
    statusMessage: '',
    rawCsvText: '',
    results: [],
    activeFilter: 'all', // 'all' | 'lg_only' | 'negative' | 'competitors' | 'positive'
    expandedSiteNames: new Set(),
    expandedReviewIds: new Set(),
    searchFilter: '',
    progressTimer: null
  },

  init() {
    // 최초 진입 시 또는 기본 결과가 없을 때, 사용자에게 직관적인 시연을 위한 표준 AI VOC 데이터 로드
    if (this.state.results.length === 0) {
      this.state.country = 'US';
      this.state.product = 'LG 세탁가전 & OLED TV (글로벌 VOC)';
      this.state.selectedSources = MockData.sourcesByCountry['US'] || [];
      this.state.collectionStatus = AppConfig.CollectionStatus.COMPLETED;
      this.state.statusMessage = '3개 출처 수집 및 AI 분석 완료 (총 22건)';
      this.state.rawCsvText = MockData.generateMockResultCsv('US', this.state.product, this.state.selectedSources);
      this.state.results = CsvUtils.parseResultCsv(this.state.rawCsvText);
      // 첫 번째 사이트(Reddit) 기본 펼침
      if (this.state.results.length > 0) {
        this.state.expandedSiteNames.add(this.state.results[0].site_name);
      }
    }
    this.render();
  },

  setTarget(country, product, sources, autoStart = true) {
    this.state.country = country;
    this.state.product = product;
    this.state.selectedSources = sources || [];
    this.state.rawCsvText = '';
    this.state.results = [];
    this.state.expandedSiteNames.clear();
    this.state.expandedReviewIds.clear();

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

    if (this.state.progressTimer) {
      clearInterval(this.state.progressTimer);
      this.state.progressTimer = null;
    }

    this.state.collectionStatus = AppConfig.CollectionStatus.PROCESSING;
    this.state.statusMessage = '선택한 출처에서 VOC를 수집하고 있습니다...';
    this.render();

    const startTime = Date.now();
    const sources = this.state.selectedSources;

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

    updateProgressUI(10, '출처 서버 연결 및 세션 초기화 중...', '약 2~3초 소요 예상', 0);

    let currentPercent = 10;
    this.state.progressTimer = setInterval(() => {
      if (currentPercent < 90) {
        currentPercent += (90 - currentPercent) * 0.18;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        let activeIdx = 0;
        let stepText = '데이터 스크래핑 진행 중...';

        if (currentPercent > 30 && currentPercent <= 65) {
          activeIdx = Math.min(1, sources.length - 1);
          stepText = `[${activeIdx + 1}/${sources.length}] 리뷰 본문 및 댓글 추출 중...`;
        } else if (currentPercent > 65) {
          activeIdx = Math.min(2, sources.length - 1);
          stepText = `[AI 분석] 한국어 핵심 요약 및 감성 분류 실행 중...`;
        }
        updateProgressUI(currentPercent, stepText, `${elapsed}초 경과 / 약 2~3초 소요 예상`, activeIdx);
      }
    }, 180);

    try {
      const res = await ApiClient.collectVoc({
        country: this.state.country,
        product: this.state.product,
        selected_sources: sources
      });

      if (this.state.progressTimer) {
        clearInterval(this.state.progressTimer);
        this.state.progressTimer = null;
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      updateProgressUI(100, `수집 및 AI 분석 완료 (총 ${elapsed}초 소요)`, `${elapsed}초 소요 완료`, sources.length);

      await new Promise(r => setTimeout(r, 260));

      this.state.collectionStatus = AppConfig.CollectionStatus.COMPLETED;
      this.state.rawCsvText = res.csvText;
      this.state.results = CsvUtils.parseResultCsv(res.csvText);
      this.state.statusMessage = `${sources.length}개 출처 수집 및 AI 분석 완료 (${elapsed}초 소요)`;
      this.state.expandedSiteNames.clear();
      if (this.state.results.length > 0) {
        this.state.expandedSiteNames.add(this.state.results[0].site_name);
      }

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

  setFilter(filterKey) {
    this.state.activeFilter = filterKey;
    this.renderResultsBody();
  },

  setSearchFilter(query) {
    this.state.searchFilter = query || '';
    this.renderResultsBody();
  },

  toggleSiteAccordion(siteName) {
    if (this.state.expandedSiteNames.has(siteName)) {
      this.state.expandedSiteNames.delete(siteName);
    } else {
      this.state.expandedSiteNames.add(siteName);
    }
    this.renderResultsBody();
  },

  toggleRawContent(reviewId, event) {
    if (event) event.stopPropagation();
    if (this.state.expandedReviewIds.has(reviewId)) {
      this.state.expandedReviewIds.delete(reviewId);
    } else {
      this.state.expandedReviewIds.add(reviewId);
    }
    this.renderResultsBody();
  },

  getFilteredResults() {
    let items = this.state.results;

    if (this.state.activeFilter === 'lg_only') {
      items = items.filter(r => r.lg_mentioned);
    } else if (this.state.activeFilter === 'negative') {
      items = items.filter(r => r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPLAINT');
    } else if (this.state.activeFilter === 'positive') {
      items = items.filter(r => r.ai_sentiment === 'POSITIVE');
    } else if (this.state.activeFilter === 'competitors') {
      items = items.filter(r => r.competitors && r.competitors.length > 0);
    }

    if (this.state.searchFilter) {
      const q = this.state.searchFilter.toLowerCase();
      items = items.filter(r => 
        (r.kr_summary && r.kr_summary.toLowerCase().includes(q)) ||
        (r.content && r.content.toLowerCase().includes(q)) ||
        (r.site_name && r.site_name.toLowerCase().includes(q)) ||
        (r.topic_tags && r.topic_tags.some(t => t.toLowerCase().includes(q))) ||
        (r.competitors && r.competitors.some(c => c.toLowerCase().includes(q)))
      );
    }

    return items;
  },

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const selectedCount = this.state.selectedSources.length;
    const isProcessing = this.state.collectionStatus === AppConfig.CollectionStatus.PROCESSING;
    const hasResults = this.state.results.length > 0;

    let statusBadgeClass = 'badge-neutral';
    let statusText = '대기';
    if (isProcessing) {
      statusBadgeClass = 'badge-processing';
      statusText = '수집 및 AI 분석 중';
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
                <h4 class="progress-main-heading">선택한 ${selectedCount}개 출처에서 리뷰 데이터를 수집하고 AI로 분석 중입니다</h4>
              </div>
              <p class="progress-sub-text">각 출처별 고객 리뷰 텍스트를 수집하고, 한국어 핵심 요약 및 감성 분석을 진행합니다.</p>
            </div>
            <div class="progress-timer-box">
              <span class="timer-icon">⏱️</span>
              <div class="timer-text-group">
                <span class="timer-label">소요 시간</span>
                <strong class="timer-value" id="progress-timer-display">약 2~3초 소요 예상</strong>
              </div>
            </div>
          </div>

          <div class="progress-bar-shell">
            <div class="progress-bar-track">
              <div class="progress-bar-fill" id="voc-progress-fill" style="width: 10%;">
                <div class="progress-bar-shimmer"></div>
              </div>
            </div>
          </div>

          <div class="progress-status-meta">
            <div class="progress-current-step">
              <span class="step-pulse-dot"></span>
              <span class="step-text" id="voc-progress-step-text">출처 서버 연결 및 세션 초기화 중...</span>
            </div>
            <div class="progress-percentage-display">
              <strong id="voc-progress-percent">10%</strong>
            </div>
          </div>

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
        <div class="empty-state-card text-center" style="padding: 48px 20px;">
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
      <!-- 수집 컨트롤 카드 -->
      <div class="collection-header-card">
        <div class="header-card-row">
          <div class="target-summary">
            <span class="summary-label">수집 대상:</span>
            <span class="badge badge-neutral">${this.state.country}</span>
            <strong class="target-product-name">${CsvUtils.escapeHtml(this.state.product)}</strong>
            <span class="target-count-badge">수집 리뷰: ${this.state.results.length}건</span>
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

      <!-- 메인 결과 본문 (필터 바 및 사이트별 아코디언) -->
      <div class="results-body">
        ${subTabContentHtml}
      </div>
    `;
  },

  renderResultsBody() {
    const body = document.querySelector('.results-body');
    if (body) {
      body.innerHTML = this.renderVocContentView();
    }
  },

  renderVocContentView() {
    const allItems = this.state.results;
    const filteredItems = this.getFilteredResults();

    const totalCount = allItems.length;
    const lgCount = allItems.filter(r => r.lg_mentioned).length;
    const negCount = allItems.filter(r => r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPLAINT').length;
    const posCount = allItems.filter(r => r.ai_sentiment === 'POSITIVE').length;
    const compCount = allItems.filter(r => r.competitors && r.competitors.length > 0).length;

    // 사이트별 그룹화
    const siteGroups = {};
    filteredItems.forEach(item => {
      const sName = item.site_name || '기타 출처';
      if (!siteGroups[sName]) {
        siteGroups[sName] = {
          siteName: sName,
          category: item.category || '커뮤니티',
          items: []
        };
      }
      siteGroups[sName].items.push(item);
    });

    const siteNames = Object.keys(siteGroups);

    return `
      <!-- 1. 스마트 인사이트 필터 툴바 -->
      <div class="voc-filter-toolbar">
        <div class="filter-tabs-group">
          <button type="button" class="btn-voc-filter ${this.state.activeFilter === 'all' ? 'active' : ''}" onclick="ResultsView.setFilter('all')">
            전체 <span class="filter-count">${totalCount}</span>
          </button>
          <button type="button" class="btn-voc-filter highlight-lg ${this.state.activeFilter === 'lg_only' ? 'active' : ''}" onclick="ResultsView.setFilter('lg_only')">
            🔥 LG 직접 언급 <span class="filter-count">${lgCount}</span>
          </button>
          <button type="button" class="btn-voc-filter alert-neg ${this.state.activeFilter === 'negative' ? 'active' : ''}" onclick="ResultsView.setFilter('negative')">
            ⚠️ 불만·품질 이슈 <span class="filter-count">${negCount}</span>
          </button>
          <button type="button" class="btn-voc-filter ${this.state.activeFilter === 'competitors' ? 'active' : ''}" onclick="ResultsView.setFilter('competitors')">
            ⚔️ 경쟁사 비교 <span class="filter-count">${compCount}</span>
          </button>
          <button type="button" class="btn-voc-filter ${this.state.activeFilter === 'positive' ? 'active' : ''}" onclick="ResultsView.setFilter('positive')">
            🟢 긍정 후기 <span class="filter-count">${posCount}</span>
          </button>
        </div>

        <div class="filter-search-box">
          <input type="text" class="input-text-sm" placeholder="요약, 태그, 키워드 검색..." value="${CsvUtils.escapeHtml(this.state.searchFilter)}" oninput="ResultsView.setSearchFilter(this.value)">
        </div>
      </div>

      <!-- 2. 사이트별 그룹 아코디언 목록 -->
      <div class="site-accordion-container">
        ${siteNames.length === 0 ? `
          <div class="empty-state-card text-center" style="padding: 40px 20px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px;">선택한 필터 조건에 해당하는 수집 VOC가 없습니다.</p>
          </div>
        ` : siteNames.map(sName => this.renderSiteGroup(siteGroups[sName])).join('')}
      </div>
    `;
  },

  renderSiteGroup(group) {
    const isExpanded = this.state.expandedSiteNames.has(group.siteName);
    const pos = group.items.filter(r => r.ai_sentiment === 'POSITIVE').length;
    const neu = group.items.filter(r => r.ai_sentiment === 'NEUTRAL').length;
    const neg = group.items.filter(r => r.ai_sentiment === 'NEGATIVE').length;

    let siteSummary = '실사용 고객 피드백과 제품 성능 관련 토론이 활발히 진행 중입니다.';
    if (group.siteName.includes('Reddit')) {
      siteSummary = '올인원 세탁건조 콤보의 공간 효율성에 대한 논의가 활발하며, 타사 내구성 불만 및 LG 워시타워 중앙 조작 편의성 호평 확인.';
    } else if (group.siteName.includes('Best Buy')) {
      siteSummary = '인체공학적 센터 컨트롤 조작부와 저소음 야간 건조 기능에 대한 실구매자 만족도(평균 4.7점)가 매우 높게 형성됨.';
    } else if (group.siteName.includes('RTINGS')) {
      siteSummary = '전문 계측 결과 세탁 일관성과 AI 직물 센서 알고리즘, 진동 억제 성능에서 동급 최상위 8.8/10 점수를 획득함.';
    }

    return `
      <div class="site-group-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}">
        <!-- 사이트 그룹 헤더 -->
        <div class="site-group-header" onclick="ResultsView.toggleSiteAccordion('${CsvUtils.escapeHtml(group.siteName)}')">
          <div class="site-header-left">
            <span class="site-category-badge">${CsvUtils.escapeHtml(group.category)}</span>
            <h4 class="site-title">${CsvUtils.escapeHtml(group.siteName)}</h4>
            <span class="site-count-pill">${group.items.length}건 수집됨</span>
          </div>

          <div class="site-header-right">
            <div class="sentiment-mini-stats">
              <span class="sentiment-chip pos" title="긍정">🟢 ${pos}</span>
              <span class="sentiment-chip neu" title="중립">⚪ ${neu}</span>
              <span class="sentiment-chip neg" title="부정">🔴 ${neg}</span>
            </div>
            <button type="button" class="btn-accordion-toggle">
              ${isExpanded ? '접기 ▲' : '펼쳐보기 ▼'}
            </button>
          </div>
        </div>

        <!-- 사이트별 AI 종합 1줄 요약 바 -->
        <div class="site-summary-bar">
          <span class="summary-bulb">💡</span>
          <span class="summary-text"><strong>AI 출처 요약:</strong> ${CsvUtils.escapeHtml(siteSummary)}</span>
        </div>

        <!-- 아코디언 내부 개별 리뷰 리스트 -->
        <div class="site-reviews-body ${isExpanded ? 'open' : 'closed'}">
          <div class="review-cards-list">
            ${group.items.map(item => this.renderReviewCard(item)).join('')}
          </div>
        </div>
      </div>
    `;
  },

  renderReviewCard(item) {
    const isRawExpanded = this.state.expandedReviewIds.has(item.id);
    
    let sentimentBadge = '<span class="review-badge badge-neutral">중립</span>';
    if (item.ai_sentiment === 'POSITIVE') {
      sentimentBadge = '<span class="review-badge badge-positive">🟢 긍정 (EXPERIENCE)</span>';
    } else if (item.ai_sentiment === 'NEGATIVE') {
      sentimentBadge = '<span class="review-badge badge-negative">🔴 부정 (COMPLAINT)</span>';
    }

    return `
      <div class="voc-review-card ${item.lg_mentioned ? 'has-lg-mention' : ''}" id="rev-${item.id}">
        <div class="review-card-top">
          <div class="review-badges-row">
            ${sentimentBadge}
            ${item.lg_mentioned ? `<span class="review-badge badge-lg-highlight">🌟 LG 직접 언급</span>` : ''}
            ${item.competitors && item.competitors.length > 0 ? `<span class="review-badge badge-competitor">⚔️ 타사: ${item.competitors.join(', ')}</span>` : ''}
            ${item.topic_tags ? item.topic_tags.map(t => `<span class="review-tag">#${CsvUtils.escapeHtml(t)}</span>`).join('') : ''}
          </div>
          <span class="review-date">${item.created_at ? item.created_at.slice(0, 10) : '2026-10-24'}</span>
        </div>

        <!-- 핵심 요약 (가장 강조) -->
        <div class="review-summary-area">
          <p class="review-kr-summary">${CsvUtils.escapeHtml(item.kr_summary || '(AI 요약 없음)')}</p>
        </div>

        <!-- 원문 토글 -->
        <div class="review-card-bottom">
          <button type="button" class="btn-toggle-raw" onclick="ResultsView.toggleRawContent('${item.id}', event)">
            ${isRawExpanded ? '영문 원문 접기 ▲' : '영문 원문 보기 ▼'}
          </button>
        </div>

        ${isRawExpanded ? `
          <div class="review-raw-box">
            <pre class="review-raw-pre"><code>${CsvUtils.escapeHtml(item.content)}</code></pre>
          </div>
        ` : ''}
      </div>
    `;
  }
};
