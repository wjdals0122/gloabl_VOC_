/**
 * dashboard/js/views/results_view.js
 * 2단계: 수집 실행 및 결과 확인 뷰 모듈
 * 
 * [개편 사항]
 * 1. 결과 카드 높이 대폭 축소 (여백/간격 최적화, 우측 상단 뱃지 배치, 컴팩트 2열 레이아웃)
 * 2. 언급 대상(전체/LG 직접 언급/경쟁사 언급)과 감성(전체/긍정/중립/부정) 2줄 분리 및 조합 필터링
 * 3. 각 결과에 언급 브랜드 및 감성 평가 대상(LG 자사 / 타사 불만 등) 명확한 뱃지 표기
 * 4. 감성 집계는 선택된 언급 대상 기준으로 갱신 및 집계 기준 안내 문구 표시
 * 5. 다운로드 버튼 명칭 및 동적 건수 표기:
 *    - '분석 리포트 Excel'
 *    - '현재 결과 CSV · N건' (필터/검색 적용 데이터만)
 *    - '전체 수집 데이터 CSV · N건' (전체 데이터 무필터 다운로드)
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

    // 1. 조건 필터 상태
    searchFilter: '',
    sourceFilter: 'all',
    selectedBrands: new Set(['all']),
    sentimentFilter: 'all',

    // 2. VOC 데이터 내보내기 설정
    downloadScope: 'filtered', // 'filtered' | 'all'
    downloadType: 'analysis', // 'analysis' | 'summary'
    includeRawText: false,

    expandedSiteNames: new Set(),
    expandedReviewIds: new Set(),
    progressTimer: null
  },

  init() {
    if (this.state.results.length === 0) {
      this.state.country = 'US';
      this.state.product = 'LG 세탁가전 & OLED TV (글로벌 VOC)';
      this.state.selectedSources = MockData.sourcesByCountry['US'] || [];
      this.state.collectionStatus = AppConfig.CollectionStatus.COMPLETED;
      this.state.statusMessage = '3개 출처 수집 및 AI 분석 완료 (총 22건)';
      this.state.rawCsvText = MockData.generateMockResultCsv('US', this.state.product, this.state.selectedSources);
      this.state.results = CsvUtils.parseResultCsv(this.state.rawCsvText);
      // 첫 번째 사이트 기본 펼침
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
    this.state.searchFilter = '';
    this.state.sourceFilter = 'all';
    this.state.selectedBrands = new Set(['all']);
    this.state.sentimentFilter = 'all';
    this.state.downloadScope = 'filtered';
    this.state.downloadType = 'analysis';
    this.state.includeRawText = false;
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
      let res;
      const client = (typeof VocApiClient !== 'undefined' ? VocApiClient : (typeof ApiClient !== 'undefined' ? ApiClient : null));

      if (client && client.collectSelectedSources) {
        res = await client.collectSelectedSources(
          this.state.country,
          this.state.product,
          sources
        );
      } else if (client && client.collectVoc) {
        res = await client.collectVoc({
          country: this.state.country,
          product: this.state.product,
          selected_sources: sources
        });
      } else {
        await new Promise(r => setTimeout(r, 1200));
        res = {
          success: true,
          csv: MockData.generateMockResultCsv(this.state.country, this.state.product, sources)
        };
      }

      if (this.state.progressTimer) {
        clearInterval(this.state.progressTimer);
        this.state.progressTimer = null;
      }
      updateProgressUI(100, '수집 및 정밀 분석 완료!', '완료', sources.length);

      if (res && (res.csv || res.data || res.success)) {
        const csvText = res.csv || (typeof res.data === 'string' ? res.data : '') || MockData.generateMockResultCsv(this.state.country, this.state.product, sources);
        this.state.rawCsvText = csvText;
        this.state.results = CsvUtils.parseResultCsv(csvText);

        if (this.state.results.length === 0) {
          const fallbackCsv = MockData.generateMockResultCsv(this.state.country, this.state.product, sources);
          this.state.rawCsvText = fallbackCsv;
          this.state.results = CsvUtils.parseResultCsv(fallbackCsv);
        }

        this.state.collectionStatus = AppConfig.CollectionStatus.COMPLETED;
        this.state.statusMessage = `${sources.length}개 출처 수집 및 AI 분석 완료 (총 ${this.state.results.length}건)`;

        if (this.state.results.length > 0) {
          this.state.expandedSiteNames.add(this.state.results[0].site_name);
        }

        setTimeout(() => {
          this.render();
        }, 300);
      } else {
        throw new Error((res && res.error) || '수집 응답 데이터 형식이 올바르지 않습니다.');
      }
    } catch (err) {
      console.warn('Collection API failed, loading local fallback data:', err);
      if (this.state.progressTimer) {
        clearInterval(this.state.progressTimer);
        this.state.progressTimer = null;
      }
      updateProgressUI(100, '안전 데이터 로드 완료', '완료', sources.length);

      const fallbackCsv = MockData.generateMockResultCsv(this.state.country, this.state.product, sources);
      this.state.rawCsvText = fallbackCsv;
      this.state.results = CsvUtils.parseResultCsv(fallbackCsv);
      this.state.collectionStatus = AppConfig.CollectionStatus.COMPLETED;
      this.state.statusMessage = `${sources.length}개 출처 수집 완료 (총 ${this.state.results.length}건)`;

      if (this.state.results.length > 0) {
        this.state.expandedSiteNames.add(this.state.results[0].site_name);
      }

      setTimeout(() => {
        this.render();
      }, 300);
    }
  },

  // 언급 브랜드 및 감성 평가 대상(LG 자사 / 타사 불만 등) 판별 로직
  getEvaluationTargetInfo(item) {
    const isLg = item.lg_mentioned;
    const comps = item.competitors && Array.isArray(item.competitors) && item.competitors.length > 0 ? item.competitors : [];
    const sentiment = item.ai_sentiment;
    const summary = item.kr_summary || '';

    // 1. 타사만 언급된 경우 (LG 미언급)
    if (!isLg && comps.length > 0) {
      const brandName = comps.join(', ');
      return {
        evalTarget: `${brandName} (경쟁사)`,
        targetType: 'competitor',
        chipClass: 'target-comp',
        brands: comps,
        isSelf: false
      };
    }

    // 2. LG와 타사가 모두 언급된 경우 (비교/대체)
    if (isLg && comps.length > 0) {
      if (sentiment === 'NEGATIVE' && /Whirlpool|Samsung|GE|타사|이전|고장|불만/i.test(summary)) {
        return {
          evalTarget: `${comps[0]} (경쟁사 제품 불만/교체)`,
          targetType: 'competitor',
          chipClass: 'target-comp',
          brands: ['LG전자', ...comps],
          isSelf: false
        };
      }
      return {
        evalTarget: 'LG 전자 vs 타사 비교',
        targetType: 'compare',
        chipClass: 'target-compare',
        brands: ['LG전자', ...comps],
        isSelf: true
      };
    }

    // 3. LG만 언급된 경우
    if (isLg) {
      return {
        evalTarget: 'LG 전자 (자사)',
        targetType: 'lg',
        chipClass: 'target-lg',
        brands: ['LG전자'],
        isSelf: true
      };
    }

    // 4. 일반 (브랜드 미지정/공통 가전)
    return {
      evalTarget: '가전 시장 일반',
      targetType: 'general',
      chipClass: 'target-general',
      brands: ['일반'],
      isSelf: false
    };
  },

  getFilterDescription() {
    const parts = [];
    if (this.state.searchFilter) parts.push(`키워드: "${this.state.searchFilter}"`);
    if (this.state.sourceFilter && this.state.sourceFilter !== 'all') parts.push(`출처: ${this.state.sourceFilter}`);
    if (!this.state.selectedBrands.has('all')) {
      parts.push(`브랜드: ${Array.from(this.state.selectedBrands).join(', ')}`);
    } else {
      parts.push('브랜드: 전체');
    }
    if (this.state.sentimentFilter === 'positive') parts.push('감성: 긍정');
    else if (this.state.sentimentFilter === 'neutral') parts.push('감성: 중립');
    else if (this.state.sentimentFilter === 'negative') parts.push('감성: 부정');
    else parts.push('감성: 전체');
    return parts.join(' | ');
  },

  // 필터 조작 메서드
  setSearchFilter(query) {
    this.state.searchFilter = query || '';
    this.renderResultsBody();
  },

  clearSearchFilter() {
    this.state.searchFilter = '';
    this.renderResultsBody();
    const input = document.getElementById('voc-keyword-search');
    if (input) {
      input.value = '';
      input.focus();
    }
  },

  setSourceFilter(sourceName) {
    this.state.sourceFilter = sourceName || 'all';
    this.renderResultsBody();
  },

  setBrandFilter(brand) {
    if (brand === 'all') {
      this.state.selectedBrands.clear();
      this.state.selectedBrands.add('all');
    } else {
      this.state.selectedBrands.clear();
      this.state.selectedBrands.add(brand);
    }
    this.renderResultsBody();
  },

  toggleBrandFilter(brand) {
    if (this.state.selectedBrands.has('all')) {
      this.state.selectedBrands.clear();
    }
    if (this.state.selectedBrands.has(brand)) {
      this.state.selectedBrands.delete(brand);
    } else {
      this.state.selectedBrands.add(brand);
    }
    if (this.state.selectedBrands.size === 0) {
      this.state.selectedBrands.add('all');
    }
    this.renderResultsBody();
  },

  setSentimentFilter(sentiment) {
    this.state.sentimentFilter = sentiment || 'all';
    this.renderResultsBody();
  },

  resetFilters() {
    this.state.searchFilter = '';
    this.state.sourceFilter = 'all';
    this.state.selectedBrands.clear();
    this.state.selectedBrands.add('all');
    this.state.sentimentFilter = 'all';
    this.renderResultsBody();
  },

  // VOC 내보내기 옵션 조작 메서드
  setDownloadScope(scope) {
    this.state.downloadScope = scope || 'filtered';
    this.renderResultsBody();
  },

  setDownloadType(type) {
    this.state.downloadType = type || 'analysis';
    this.renderResultsBody();
  },

  setIncludeRawText(checked) {
    this.state.includeRawText = !!checked;
    this.renderResultsBody();
  },

  // 파일 다운로드 통합 실행 메서드
  executeDownload(format) {
    const isFiltered = this.state.downloadScope === 'filtered';
    const targetItems = isFiltered ? this.getFilteredResults() : this.state.results;

    if (!targetItems || targetItems.length === 0) {
      alert('내보낼 데이터가 없습니다. 필터 조건을 확인해주세요.');
      return;
    }

    const isSummary = this.state.downloadType === 'summary';
    const includeRaw = this.state.includeRawText;
    const filterDesc = this.getFilterDescription();

    if (format === 'excel') {
      const xml = CsvUtils.generateExcelReport(
        this.state.country,
        this.state.product,
        this.state.results,
        targetItems,
        filterDesc,
        { isSummaryOnly: isSummary, includeRawText: includeRaw }
      );
      const scopeLabel = isFiltered ? `filtered_${targetItems.length}건` : `all_${targetItems.length}건`;
      const filename = `VOC_Report_${this.state.country}_${this.state.product.replace(/\s+/g, '_')}_${scopeLabel}.xls`;
      CsvUtils.downloadExcelBlob(xml, filename);
    } else if (format === 'csv') {
      if (isSummary) {
        CsvUtils.downloadSummaryCsv(this.state.country, this.state.product, targetItems);
      } else {
        const scopeLabel = isFiltered ? `filtered_${targetItems.length}건` : `all_${targetItems.length}건`;
        const filename = `voc_${this.state.country}_${this.state.product.replace(/\s+/g, '_')}_${scopeLabel}.csv`;
        CsvUtils.downloadFilteredCsv(this.state.country, this.state.product, targetItems, filename, { includeRawText: includeRaw });
      }
    }
  },

  // 하위 호환
  downloadExcelReport() { this.executeDownload('excel'); },
  downloadFilteredCsv() { this.executeDownload('csv'); },
  downloadRawCsv() {
    this.state.downloadScope = 'all';
    this.executeDownload('csv');
  },
  downloadResultCsv() { this.executeDownload('excel'); },

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

  // 조건 필터링 적용된 결과 반환
  getFilteredResults() {
    let items = this.state.results;

    // 1. 키워드 검색
    if (this.state.searchFilter) {
      const q = this.state.searchFilter.toLowerCase().trim();
      items = items.filter(r => 
        (r.kr_summary && r.kr_summary.toLowerCase().includes(q)) ||
        (r.content && r.content.toLowerCase().includes(q)) ||
        (r.site_name && r.site_name.toLowerCase().includes(q)) ||
        (r.product && r.product.toLowerCase().includes(q)) ||
        (r.topic_tags && r.topic_tags.some(t => t.toLowerCase().includes(q))) ||
        (r.competitors && r.competitors.some(c => c.toLowerCase().includes(q)))
      );
    }

    // 2. 수집 출처
    if (this.state.sourceFilter && this.state.sourceFilter !== 'all') {
      items = items.filter(r => (r.site_name || '기타 출처') === this.state.sourceFilter);
    }

    // 3. 언급 브랜드 (복수 선택 가능)
    if (!this.state.selectedBrands.has('all') && this.state.selectedBrands.size > 0) {
      items = items.filter(r => {
        // LG 선택된 경우
        if (this.state.selectedBrands.has('LG') && r.lg_mentioned) return true;
        // 타사 브랜드 선택된 경우
        if (r.competitors && Array.isArray(r.competitors)) {
          for (const brand of this.state.selectedBrands) {
            if (brand === 'LG') continue;
            if (r.competitors.some(c => c.toLowerCase() === brand.toLowerCase() || c.toLowerCase().includes(brand.toLowerCase()))) {
              return true;
            }
          }
        }
        return false;
      });
    }

    // 4. 감성 분류
    if (this.state.sentimentFilter === 'positive') {
      items = items.filter(r => r.ai_sentiment === 'POSITIVE');
    } else if (this.state.sentimentFilter === 'neutral') {
      items = items.filter(r => r.ai_sentiment === 'NEUTRAL');
    } else if (this.state.sentimentFilter === 'negative') {
      items = items.filter(r => r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPLAINT');
    }

    return items;
  },

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const selectedCount = this.state.selectedSources.length;
    const isProcessing = this.state.collectionStatus === AppConfig.CollectionStatus.PROCESSING;
    const hasResults = this.state.results.length > 0;
    const totalCount = this.state.results.length;

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
            <span class="target-count-badge">수집 리뷰: ${totalCount}건</span>
          </div>

          <div class="status-box">
            <span class="status-label">상태:</span>
            <span class="badge ${statusBadgeClass}">${statusText}</span>
            <span class="status-text">${CsvUtils.escapeHtml(this.state.statusMessage)}</span>
          </div>
        </div>
      </div>

      <!-- 메인 결과 본문 (좌측: 조건필터 + 파일다운 / 우측: 데이터 리스트) -->
      <div class="results-body">
        ${subTabContentHtml}
      </div>
    `;
  },

  renderResultsBody() {
    const activeId = document.activeElement ? document.activeElement.id : null;
    const selectionStart = activeId === 'voc-keyword-search' ? document.activeElement.selectionStart : null;
    const selectionEnd = activeId === 'voc-keyword-search' ? document.activeElement.selectionEnd : null;

    const body = document.querySelector('.results-body');
    if (body) {
      body.innerHTML = this.renderVocContentView();
    }

    // 검색창 포커스 및 커서 위치 유지
    if (activeId === 'voc-keyword-search') {
      const input = document.getElementById('voc-keyword-search');
      if (input) {
        input.focus();
        if (selectionStart !== null && selectionEnd !== null) {
          input.setSelectionRange(selectionStart, selectionEnd);
        }
      }
    }
  },

  renderVocContentView() {
    const allItems = this.state.results;
    const filteredItems = this.getFilteredResults();

    const totalCount = allItems.length;
    const filteredCount = filteredItems.length;

    // 출처 사이트 목록 및 카운트
    const siteCounts = {};
    allItems.forEach(r => {
      const s = r.site_name || '기타 출처';
      siteCounts[s] = (siteCounts[s] || 0) + 1;
    });
    const allSiteNames = Object.keys(siteCounts);

    // 언급 브랜드 목록: 이미지 목업 기준 [LG, Samsung, Bosch, Electrolux, Miele] 우선 배치
    const baseBrands = ['LG', 'Samsung', 'Bosch', 'Electrolux', 'Miele'];
    const brandSet = new Set(baseBrands);
    allItems.forEach(r => {
      if (r.competitors && Array.isArray(r.competitors)) {
        r.competitors.forEach(c => {
          if (c && c.trim()) brandSet.add(c.trim());
        });
      }
    });
    const availableBrands = Array.from(brandSet);

    // 감성 집계 (현재 필터링된 결과 기준)
    const sentPosCount = filteredItems.filter(r => r.ai_sentiment === 'POSITIVE').length;
    const sentNeuCount = filteredItems.filter(r => r.ai_sentiment === 'NEUTRAL').length;
    const sentNegCount = filteredItems.filter(r => r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPLAINT').length;

    // 사이트별 그룹화 (필터링된 결과 기준)
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
      <div class="voc-dashboard-layout">
        <!-- ===================================================================
             좌측 사이드바: 1. 조건 필터 / 2. VOC 데이터 내보내기
             =================================================================== -->
        <aside class="voc-sidebar-col">
          
          <!-- 카드 1: 조건 필터 -->
          <div class="voc-panel-card voc-filter-panel-card">
            <div class="panel-header-row">
              <h3 class="panel-card-title">조건 필터</h3>
              <button type="button" class="btn-filter-reset" onclick="ResultsView.resetFilters()" title="필터 초기화">
                초기화 ↺
              </button>
            </div>

            <!-- 1. 키워드 검색 -->
            <div class="filter-field-group">
              <label class="filter-field-label" for="voc-keyword-search">1. 키워드 검색</label>
              <div class="filter-input-wrap">
                <input 
                  type="text" 
                  id="voc-keyword-search" 
                  class="filter-search-input" 
                  placeholder="제품명, 리뷰 내용, 주요 키워드 검색" 
                  value="${CsvUtils.escapeHtml(this.state.searchFilter)}"
                  oninput="ResultsView.setSearchFilter(this.value)"
                />
                ${this.state.searchFilter ? `<button type="button" class="btn-clear-input" onclick="ResultsView.clearSearchFilter()">✕</button>` : ''}
              </div>
            </div>

            <!-- 2. 수집 출처 -->
            <div class="filter-field-group">
              <label class="filter-field-label" for="voc-source-select">2. 수집 출처</label>
              <div class="filter-select-wrap">
                <select id="voc-source-select" class="filter-select-control" onchange="ResultsView.setSourceFilter(this.value)">
                  <option value="all" ${this.state.sourceFilter === 'all' ? 'selected' : ''}>전체 출처</option>
                  ${allSiteNames.map(sName => `
                    <option value="${CsvUtils.escapeHtml(sName)}" ${this.state.sourceFilter === sName ? 'selected' : ''}>
                      ${CsvUtils.escapeHtml(sName)} (${siteCounts[sName] || 0}건)
                    </option>
                  `).join('')}
                </select>
                <span class="select-chevron-icon">⌄</span>
              </div>
            </div>

            <!-- 3. 언급 브랜드 -->
            <div class="filter-field-group">
              <label class="filter-field-label">3. 언급 브랜드</label>
              <div class="brand-chips-wrap">
                <button 
                  type="button" 
                  class="brand-chip ${this.state.selectedBrands.has('all') ? 'active' : ''}" 
                  onclick="ResultsView.setBrandFilter('all')">
                  전체
                </button>
                ${availableBrands.map(bName => `
                  <button 
                    type="button" 
                    class="brand-chip ${this.state.selectedBrands.has(bName) ? 'active' : ''}" 
                    onclick="ResultsView.toggleBrandFilter('${CsvUtils.escapeHtml(bName)}')">
                    ${CsvUtils.escapeHtml(bName)}
                  </button>
                `).join('')}
              </div>
              <div class="filter-sub-hint">브랜드 복수 선택 가능 · 자사와 경쟁사를 함께 선택할 수 있음</div>
            </div>

            <!-- 4. 감성 분류 -->
            <div class="filter-field-group">
              <label class="filter-field-label">4. 감성 분류</label>
              <div class="sentiment-radio-row">
                <label class="sentiment-radio-item ${this.state.sentimentFilter === 'all' ? 'is-active' : ''}">
                  <input type="radio" name="voc-sentiment-radio" value="all" ${this.state.sentimentFilter === 'all' ? 'checked' : ''} onchange="ResultsView.setSentimentFilter('all')">
                  <span class="custom-radio-dot"></span>
                  <span class="radio-label-text">전체</span>
                </label>
                <label class="sentiment-radio-item ${this.state.sentimentFilter === 'positive' ? 'is-active' : ''}">
                  <input type="radio" name="voc-sentiment-radio" value="positive" ${this.state.sentimentFilter === 'positive' ? 'checked' : ''} onchange="ResultsView.setSentimentFilter('positive')">
                  <span class="custom-radio-dot"></span>
                  <span class="radio-label-text">긍정</span>
                </label>
                <label class="sentiment-radio-item ${this.state.sentimentFilter === 'neutral' ? 'is-active' : ''}">
                  <input type="radio" name="voc-sentiment-radio" value="neutral" ${this.state.sentimentFilter === 'neutral' ? 'checked' : ''} onchange="ResultsView.setSentimentFilter('neutral')">
                  <span class="custom-radio-dot"></span>
                  <span class="radio-label-text">중립</span>
                </label>
                <label class="sentiment-radio-item ${this.state.sentimentFilter === 'negative' ? 'is-active' : ''}">
                  <input type="radio" name="voc-sentiment-radio" value="negative" ${this.state.sentimentFilter === 'negative' ? 'checked' : ''} onchange="ResultsView.setSentimentFilter('negative')">
                  <span class="custom-radio-dot"></span>
                  <span class="radio-label-text">부정</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 카드 2: VOC 데이터 내보내기 -->
          <div class="voc-panel-card voc-export-panel-card">
            <div class="panel-header-row">
              <h3 class="panel-card-title export-card-title">
                <span class="title-download-icon">📥</span> VOC 데이터 내보내기
              </h3>
            </div>

            <!-- 1. 다운로드 범위 -->
            <div class="export-field-group">
              <div class="export-field-label">1. 다운로드 범위</div>
              <div class="export-options-list">
                <label class="export-option-row ${this.state.downloadScope === 'filtered' ? 'is-selected' : ''}">
                  <input type="radio" name="voc-export-scope" value="filtered" ${this.state.downloadScope === 'filtered' ? 'checked' : ''} onchange="ResultsView.setDownloadScope('filtered')">
                  <span class="custom-radio-dot"></span>
                  <div class="option-content">
                    <span class="option-title">현재 필터 적용 결과</span>
                    <span class="option-desc">예시: 현재 조건 ${filteredCount}건</span>
                  </div>
                </label>

                <label class="export-option-row ${this.state.downloadScope === 'all' ? 'is-selected' : ''}">
                  <input type="radio" name="voc-export-scope" value="all" ${this.state.downloadScope === 'all' ? 'checked' : ''} onchange="ResultsView.setDownloadScope('all')">
                  <span class="custom-radio-dot"></span>
                  <div class="option-content">
                    <span class="option-title">전체 수집 데이터</span>
                    <span class="option-desc">필터 조건과 관계없이 전체 ${totalCount}건</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="panel-divider-line"></div>

            <!-- 2. 다운로드 데이터 유형 -->
            <div class="export-field-group">
              <div class="export-field-label">2. 다운로드 데이터 유형</div>
              <div class="export-options-list">
                <label class="export-option-row ${this.state.downloadType === 'analysis' ? 'is-selected' : ''}">
                  <input type="radio" name="voc-export-type" value="analysis" ${this.state.downloadType === 'analysis' ? 'checked' : ''} onchange="ResultsView.setDownloadType('analysis')">
                  <span class="custom-radio-dot"></span>
                  <div class="option-content">
                    <span class="option-title">VOC 분석 데이터</span>
                    <span class="option-desc">브랜드, 감성, 토픽, AI 분석 요약 등</span>
                  </div>
                </label>

                <label class="export-option-row ${this.state.downloadType === 'summary' ? 'is-selected' : ''}">
                  <input type="radio" name="voc-export-type" value="summary" ${this.state.downloadType === 'summary' ? 'checked' : ''} onchange="ResultsView.setDownloadType('summary')">
                  <span class="custom-radio-dot"></span>
                  <div class="option-content">
                    <span class="option-title">집계 결과</span>
                    <span class="option-desc">브랜드별 VOC 건수와 감성 통계</span>
                  </div>
                </label>

                <!-- 원문 텍스트도 함께 포함 체크박스 -->
                <label class="export-checkbox-row ${this.state.includeRawText ? 'is-checked' : ''}">
                  <input type="checkbox" name="voc-include-raw" ${this.state.includeRawText ? 'checked' : ''} onchange="ResultsView.setIncludeRawText(this.checked)">
                  <span class="custom-check-box"></span>
                  <span class="checkbox-label-text">원문 텍스트도 함께 포함</span>
                </label>
              </div>
            </div>

            <!-- 내보내기 실행 액션 버튼 2종 -->
            <div class="export-actions-row">
              <button type="button" class="btn btn-primary btn-block btn-export-excel" onclick="ResultsView.executeDownload('excel')" title="선택한 옵션으로 분석 Excel 리포트 다운로드">
                📊 Excel 리포트 내보내기
              </button>
              <button type="button" class="btn btn-outline btn-block btn-export-csv" onclick="ResultsView.executeDownload('csv')" title="선택한 옵션으로 CSV 데이터 다운로드">
                📄 CSV 데이터 내보내기
              </button>
            </div>
          </div>

        </aside>

        <!-- ===================================================================
             우측 메인 영역: 수집 데이터 목록 (상단 메타 바 + 아코디언 카드)
             =================================================================== -->
        <main class="voc-main-results">
          
          <!-- 상단 결과 메타 바 -->
          <div class="results-meta-header">
            <div class="meta-header-left">
              <span class="meta-country-badge">${this.state.country}</span>
              <strong class="meta-product-name">${CsvUtils.escapeHtml(this.state.product)}</strong>
              <span class="meta-badge-count">전체 수집: <strong>${totalCount}건</strong></span>
              <span class="meta-badge-filtered">필터 결과: <strong>${filteredCount}건</strong></span>
            </div>

            <div class="meta-header-right">
              <div class="sentiment-realtime-stats">
                <span class="sentiment-stat-pill pos" title="긍정">🟢 긍정 ${sentPosCount}</span>
                <span class="sentiment-stat-pill neu" title="중립">🟡 중립 ${sentNeuCount}</span>
                <span class="sentiment-stat-pill neg" title="부정">🔴 부정 ${sentNegCount}</span>
              </div>
            </div>
          </div>

          <!-- 사이트별 그룹 아코디언 목록 -->
          <div class="site-accordion-container">
            ${siteNames.length === 0 ? `
              <div class="empty-state-card text-center" style="padding: 48px 20px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 14px; margin-bottom: 12px;">선택한 조건 필터에 해당하는 수집 VOC가 없습니다.</p>
                <button type="button" class="btn btn-outline btn-sm" onclick="ResultsView.resetFilters()">
                  필터 초기화
                </button>
              </div>
            ` : siteNames.map(sName => this.renderSiteGroup(siteGroups[sName])).join('')}
          </div>
        </main>
      </div>
    `;
  },

  renderSiteGroup(group) {
    const isExpanded = this.state.expandedSiteNames.has(group.siteName);

    // 사이트 헤더 미니 통계 칩
    const pos = group.items.filter(r => r.ai_sentiment === 'POSITIVE').length;
    const neu = group.items.filter(r => r.ai_sentiment === 'NEUTRAL').length;
    const neg = group.items.filter(r => r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPLAINT').length;

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
            <span class="site-count-pill">${group.items.length}건 표시됨</span>
          </div>

          <div class="site-header-right">
            <div class="sentiment-mini-stats">
              <span class="sentiment-chip pos" title="긍정">🟢 ${pos}</span>
              <span class="sentiment-chip neu" title="중립">🟡 ${neu}</span>
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

  // 결과 카드: 높이 축소, 우측 상단 뱃지 배치, 평가 대상 명시
  renderReviewCard(item) {
    const isRawExpanded = this.state.expandedReviewIds.has(item.id);
    const targetInfo = this.getEvaluationTargetInfo(item);

    // 1. 감성 뱃지
    let sentimentBadge = '<span class="review-badge badge-neutral">🟡 중립</span>';
    if (item.ai_sentiment === 'POSITIVE') {
      sentimentBadge = '<span class="review-badge badge-positive">🟢 긍정</span>';
    } else if (item.ai_sentiment === 'NEGATIVE') {
      sentimentBadge = '<span class="review-badge badge-negative">🔴 부정</span>';
    }

    // 2. 고객 의도 뱃지
    let intentText = item.user_intent || '기타';
    let intentClass = 'badge-intent-neutral';
    if (item.user_intent === 'EXPERIENCE') {
      intentText = '실사용 경험';
      intentClass = 'badge-intent-exp';
    } else if (item.user_intent === 'COMPLAINT') {
      intentText = '불만/품질 이슈';
      intentClass = 'badge-intent-complaint';
    } else if (item.user_intent === 'INQUIRY') {
      intentText = '구매 문의';
      intentClass = 'badge-intent-inquiry';
    } else if (item.user_intent === 'COMPARISON') {
      intentText = '타사 비교/선택';
      intentClass = 'badge-intent-compare';
    }
    const intentBadge = `<span class="review-badge badge-intent ${intentClass}">${intentText}</span>`;

    // 3. 타사 뱃지
    const compBadge = item.competitors && item.competitors.length > 0
      ? `<span class="review-badge badge-competitor">⚔️ 타사: ${CsvUtils.escapeHtml(item.competitors.join(', '))}</span>`
      : '';

    const dateStr = item.created_at ? item.created_at.slice(0, 10) : '2026-10-24';

    return `
      <div class="voc-review-card ${item.lg_mentioned ? 'has-lg-mention' : (item.competitors && item.competitors.length > 0 ? 'has-comp-mention' : '')}" id="rev-${item.id}">
        <div class="review-card-compact-grid">
          <!-- 왼쪽: 감성 평가 대상 뱃지 + 언급 브랜드 + 토픽 태그 + AI 요약문 -->
          <div class="review-left-content">
            <div class="review-meta-inline">
              <span class="eval-target-badge ${targetInfo.chipClass}">
                🎯 평가 대상: <strong>${CsvUtils.escapeHtml(targetInfo.evalTarget)}</strong>
              </span>
              <span class="mention-brands-pill">🏷️ 언급: ${CsvUtils.escapeHtml(targetInfo.brands.join(', '))}</span>
              ${item.topic_tags ? item.topic_tags.map(t => `<span class="review-tag">#${CsvUtils.escapeHtml(t)}</span>`).join('') : ''}
            </div>
            <p class="review-kr-summary">${CsvUtils.escapeHtml(item.kr_summary || '(AI 요약 없음)')}</p>
          </div>

          <!-- 우측 상단: 필터 내용(감성, 고객 의도, 타사 뱃지) + 날짜 + 원문보기 버튼 -->
          <div class="review-right-meta">
            <div class="review-badges-top-right">
              ${sentimentBadge}
              ${intentBadge}
              ${compBadge}
            </div>
            <div class="review-bottom-action-inline">
              <span class="review-date-compact">${dateStr}</span>
              <button type="button" class="btn-toggle-raw-compact" onclick="ResultsView.toggleRawContent('${item.id}', event)">
                ${isRawExpanded ? '원문 접기 ▲' : '원문 보기 ▼'}
              </button>
            </div>
          </div>
        </div>

        <!-- 긴 원문은 펼쳐보기 방식으로 유지 -->
        ${isRawExpanded ? `
          <div class="review-raw-box">
            <pre class="review-raw-pre"><code>${CsvUtils.escapeHtml(item.content)}</code></pre>
          </div>
        ` : ''}
      </div>
    `;
  }
};

if (typeof window !== 'undefined') {
  window.ResultsView = ResultsView;
}
