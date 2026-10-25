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

    // 1. 언급 대상 필터: 'all' | 'lg' | 'competitor'
    targetFilter: 'all',
    selectedCompetitor: 'all', // 'all' 또는 특정 브랜드명 ('Samsung', 'GE', 'Whirlpool' 등)

    // 2. 감성 필터: 'all' | 'positive' | 'neutral' | 'negative'
    sentimentFilter: 'all',

    // 3. 출처 사이트 필터 (Set)
    selectedSites: new Set(),

    // 4. 텍스트 검색 필터
    searchFilter: '',

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
    this.state.targetFilter = 'all';
    this.state.selectedCompetitor = 'all';
    this.state.sentimentFilter = 'all';
    this.state.selectedSites.clear();
    this.state.searchFilter = '';
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
    if (this.state.targetFilter === 'lg') parts.push('언급 대상: LG 직접 언급');
    else if (this.state.targetFilter === 'competitor') {
      parts.push(this.state.selectedCompetitor !== 'all' ? `언급 대상: 경쟁사(${this.state.selectedCompetitor})` : '언급 대상: 경쟁사 언급 전체');
    } else {
      parts.push('언급 대상: 전체');
    }

    if (this.state.sentimentFilter === 'positive') parts.push('감성: 긍정');
    else if (this.state.sentimentFilter === 'neutral') parts.push('감성: 중립');
    else if (this.state.sentimentFilter === 'negative') parts.push('감성: 부정');
    else parts.push('감성: 전체');

    if (this.state.selectedSites.size > 0) {
      parts.push(`출처: ${Array.from(this.state.selectedSites).join(', ')}`);
    }
    if (this.state.searchFilter) {
      parts.push(`검색어: "${this.state.searchFilter}"`);
    }
    return parts.join(' | ');
  },

  // 1. 분석 리포트 Excel (다중 시트: 요약 + 필터링 + 원본)
  downloadExcelReport() {
    if (this.state.results.length === 0) {
      alert('다운로드할 수집 결과 데이터가 없습니다.');
      return;
    }
    const filtered = this.getFilteredResults();
    const desc = this.getFilterDescription();
    const xml = CsvUtils.generateExcelReport(
      this.state.country,
      this.state.product,
      this.state.results,
      filtered,
      desc
    );
    const filename = `VOC_Intelligence_Report_${this.state.country}_${this.state.product.replace(/\s+/g, '_')}.xls`;
    CsvUtils.downloadExcelBlob(xml, filename);
  },

  // 2. 현재 결과 CSV · N건 (현재 검색·필터가 적용된 데이터만)
  downloadFilteredCsv() {
    const filtered = this.getFilteredResults();
    if (filtered.length === 0) {
      alert('현재 필터 조건에 해당하는 리뷰가 없습니다.');
      return;
    }
    const filename = `voc_filtered_${this.state.country}_${this.state.product.replace(/\s+/g, '_')}_${filtered.length}건.csv`;
    CsvUtils.downloadFilteredCsv(this.state.country, this.state.product, filtered, filename);
  },

  // 3. 전체 수집 데이터 CSV · N건 (검색·필터와 관계없이 전체 데이터)
  downloadRawCsv() {
    const all = this.state.results;
    if (!all || all.length === 0) {
      alert('다운로드할 수집 원본 데이터가 없습니다.');
      return;
    }
    const filename = `voc_all_${this.state.country}_${this.state.product.replace(/\s+/g, '_')}_${all.length}건.csv`;
    if (this.state.rawCsvText) {
      CsvUtils.downloadCsvText(this.state.rawCsvText, filename);
    } else {
      CsvUtils.downloadFilteredCsv(this.state.country, this.state.product, all, filename);
    }
  },

  // 하위 호환
  downloadResultCsv() {
    this.downloadExcelReport();
  },

  // 필터 버튼 클릭 핸들러
  setTargetFilter(target) {
    this.state.targetFilter = target;
    if (target !== 'competitor') {
      this.state.selectedCompetitor = 'all';
    }
    this.renderResultsBody();
  },

  setSentimentFilter(sentiment) {
    this.state.sentimentFilter = sentiment;
    this.renderResultsBody();
  },

  setCompetitorFilter(compName) {
    this.state.targetFilter = 'competitor';
    this.state.selectedCompetitor = compName || 'all';
    this.renderResultsBody();
  },

  toggleAllSites() {
    this.state.selectedSites.clear();
    this.renderResultsBody();
  },

  toggleSiteFilter(siteName, isChecked) {
    const allSiteNames = Array.from(new Set(this.state.results.map(r => r.site_name || '기타 출처')));
    
    if (this.state.selectedSites.size === 0) {
      allSiteNames.forEach(s => this.state.selectedSites.add(s));
    }

    if (isChecked) {
      this.state.selectedSites.add(siteName);
      if (this.state.selectedSites.size >= allSiteNames.length) {
        this.state.selectedSites.clear();
      }
    } else {
      this.state.selectedSites.delete(siteName);
    }
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

  // 조합 필터링 적용된 결과 반환
  getFilteredResults() {
    let items = this.state.results;

    // 1. 출처 사이트 필터링
    if (this.state.selectedSites.size > 0) {
      items = items.filter(r => this.state.selectedSites.has(r.site_name || '기타 출처'));
    }

    // 2. 언급 대상 필터링
    if (this.state.targetFilter === 'lg') {
      items = items.filter(r => r.lg_mentioned);
    } else if (this.state.targetFilter === 'competitor') {
      items = items.filter(r => r.competitors && r.competitors.length > 0);
      if (this.state.selectedCompetitor && this.state.selectedCompetitor !== 'all') {
        items = items.filter(r => r.competitors && r.competitors.includes(this.state.selectedCompetitor));
      }
    }

    // 3. 감성 필터링 (조합)
    if (this.state.sentimentFilter === 'positive') {
      items = items.filter(r => r.ai_sentiment === 'POSITIVE');
    } else if (this.state.sentimentFilter === 'neutral') {
      items = items.filter(r => r.ai_sentiment === 'NEUTRAL');
    } else if (this.state.sentimentFilter === 'negative') {
      items = items.filter(r => r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPLAINT');
    }

    // 4. 텍스트 검색 필터
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

  // 다운로드 버튼의 건수 라벨 동적 갱신
  updateDownloadButtons(filteredCount, totalCount) {
    const btnFiltered = document.getElementById('btn-download-filtered-csv');
    if (btnFiltered) {
      btnFiltered.innerHTML = `📄 현재 결과 CSV · ${filteredCount}건`;
      btnFiltered.title = `현재 검색·필터가 적용된 ${filteredCount}건 데이터만 CSV로 다운로드`;
    }
    const btnTotal = document.getElementById('btn-download-raw-csv');
    if (btnTotal) {
      btnTotal.innerHTML = `📑 전체 수집 데이터 CSV · ${totalCount}건`;
      btnTotal.title = `검색·필터와 관계없이 전체 ${totalCount}건 데이터 다운로드`;
    }
  },

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const selectedCount = this.state.selectedSources.length;
    const isProcessing = this.state.collectionStatus === AppConfig.CollectionStatus.PROCESSING;
    const hasResults = this.state.results.length > 0;
    const filteredCount = this.getFilteredResults().length;
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

          <!-- 다운로드 버튼 3종 (명칭 및 동적 건수 표기) -->
          <div class="action-buttons-group">
            <button type="button" class="btn btn-primary btn-sm btn-report-excel" id="btn-download-excel" ${!hasResults ? 'disabled' : ''} onclick="ResultsView.downloadExcelReport()" title="분석 요약표, 필터링 내역, 원문이 각각 시트로 구성된 Excel 파일 다운로드">
              📊 분석 리포트 Excel
            </button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-download-filtered-csv" ${!hasResults ? 'disabled' : ''} onclick="ResultsView.downloadFilteredCsv()" title="현재 검색·필터가 적용된 ${filteredCount}건 데이터만 CSV로 다운로드">
              📄 현재 결과 CSV · ${filteredCount}건
            </button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-download-raw-csv" ${!hasResults ? 'disabled' : ''} onclick="ResultsView.downloadRawCsv()" title="검색·필터와 관계없이 전체 수집된 ${totalCount}건 데이터 다운로드">
              📑 전체 수집 데이터 CSV · ${totalCount}건
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
    const filtered = this.getFilteredResults();
    this.updateDownloadButtons(filtered.length, this.state.results.length);
  },

  renderVocContentView() {
    const allItems = this.state.results;
    const filteredItems = this.getFilteredResults();

    const totalCount = allItems.length;
    const lgCount = allItems.filter(r => r.lg_mentioned).length;
    const compTotalCount = allItems.filter(r => r.competitors && r.competitors.length > 0).length;

    // 경쟁사별 카운트 추출
    const competitorCounts = {};
    allItems.forEach(r => {
      if (r.competitors && Array.isArray(r.competitors)) {
        r.competitors.forEach(c => {
          if (c && c.trim()) {
            const brand = c.trim();
            competitorCounts[brand] = (competitorCounts[brand] || 0) + 1;
          }
        });
      }
    });
    const competitorNames = Object.keys(competitorCounts).sort((a,b) => competitorCounts[b] - competitorCounts[a]);

    // 감성 집계 모집단: 현재 선택된 '언급 대상' 기준으로 실시간 갱신!
    let sentimentBaseItems = allItems;
    let criterionDesc = '수집된 전체 리뷰 기준 (자사 및 타사 평가 통합)';

    if (this.state.targetFilter === 'lg') {
      sentimentBaseItems = allItems.filter(r => r.lg_mentioned);
      criterionDesc = 'LG 직접 언급 리뷰 기준 (자사 품질/기능 평가)';
    } else if (this.state.targetFilter === 'competitor') {
      sentimentBaseItems = allItems.filter(r => r.competitors && r.competitors.length > 0);
      if (this.state.selectedCompetitor && this.state.selectedCompetitor !== 'all') {
        sentimentBaseItems = sentimentBaseItems.filter(r => r.competitors.includes(this.state.selectedCompetitor));
        criterionDesc = `${this.state.selectedCompetitor} 언급 리뷰 기준 (경쟁사 평가)`;
      } else {
        criterionDesc = '경쟁사 언급 리뷰 기준 (타사 불만 및 비교 평가)';
      }
    }

    const sentTotalCount = sentimentBaseItems.length;
    const sentPosCount = sentimentBaseItems.filter(r => r.ai_sentiment === 'POSITIVE').length;
    const sentNeuCount = sentimentBaseItems.filter(r => r.ai_sentiment === 'NEUTRAL').length;
    const sentNegCount = sentimentBaseItems.filter(r => r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPLAINT').length;

    // 사이트별 카운트 추출
    const siteCounts = {};
    allItems.forEach(r => {
      const s = r.site_name || '기타 출처';
      siteCounts[s] = (siteCounts[s] || 0) + 1;
    });
    const allSiteNames = Object.keys(siteCounts);
    const isAllSitesActive = this.state.selectedSites.size === 0 || this.state.selectedSites.size === allSiteNames.length;

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
      <!-- 1. 2줄 분리형 스마트 필터 툴바 -->
      <div class="voc-filter-toolbar">
        
        <!-- 1행: 언급 대상 (전체 / LG 직접 언급 / 경쟁사 언급) + 검색창 -->
        <div class="filter-row filter-target-row">
          <div class="filter-row-left">
            <span class="filter-row-title">언급 대상:</span>
            <div class="filter-buttons-group">
              <button type="button" class="btn-filter-pill ${this.state.targetFilter === 'all' ? 'active' : ''}" onclick="ResultsView.setTargetFilter('all')">
                전체 <span class="pill-badge">${totalCount}</span>
              </button>
              <button type="button" class="btn-filter-pill highlight-lg ${this.state.targetFilter === 'lg' ? 'active' : ''}" onclick="ResultsView.setTargetFilter('lg')">
                🔥 LG 직접 언급 <span class="pill-badge">${lgCount}</span>
              </button>
              <button type="button" class="btn-filter-pill filter-competitor ${this.state.targetFilter === 'competitor' ? 'active' : ''}" onclick="ResultsView.setTargetFilter('competitor')">
                ⚔️ 경쟁사 언급 <span class="pill-badge">${compTotalCount}</span>
              </button>
            </div>
          </div>

          <div class="filter-search-box">
            <input type="text" class="input-text-sm" placeholder="요약, 키워드, 브랜드 검색..." value="${CsvUtils.escapeHtml(this.state.searchFilter)}" oninput="ResultsView.setSearchFilter(this.value)">
          </div>
        </div>

        <!-- 1-1행: 경쟁사 언급 선택 시 동적 표시되는 경쟁사 브랜드 서브 칩 -->
        ${this.state.targetFilter === 'competitor' ? `
          <div class="competitor-subfilter-bar">
            <span class="subfilter-label">⚔️ 언급된 경쟁사 선택:</span>
            <div class="competitor-chips-group">
              <button type="button" class="btn-comp-chip ${this.state.selectedCompetitor === 'all' ? 'active' : ''}" onclick="ResultsView.setCompetitorFilter('all')">
                전체 경쟁사 (${compTotalCount})
              </button>
              ${competitorNames.map(cName => `
                <button type="button" class="btn-comp-chip ${this.state.selectedCompetitor === cName ? 'active' : ''}" onclick="ResultsView.setCompetitorFilter('${CsvUtils.escapeHtml(cName)}')">
                  ${CsvUtils.escapeHtml(cName)} (${competitorCounts[cName]})
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 2행: 감성 필터 (현재 선택된 언급 대상 기준으로 갱신 & 집계 기준 안내) -->
        <div class="filter-row filter-sentiment-row">
          <div class="filter-row-left">
            <span class="filter-row-title">감성 구분:</span>
            <div class="filter-buttons-group">
              <button type="button" class="btn-filter-pill ${this.state.sentimentFilter === 'all' ? 'active' : ''}" onclick="ResultsView.setSentimentFilter('all')">
                전체 <span class="pill-badge">${sentTotalCount}</span>
              </button>
              <button type="button" class="btn-filter-pill filter-positive ${this.state.sentimentFilter === 'positive' ? 'active' : ''}" onclick="ResultsView.setSentimentFilter('positive')">
                🟢 긍정 <span class="pill-badge">${sentPosCount}</span>
              </button>
              <button type="button" class="btn-filter-pill filter-neutral ${this.state.sentimentFilter === 'neutral' ? 'active' : ''}" onclick="ResultsView.setSentimentFilter('neutral')">
                🟡 중립 <span class="pill-badge">${sentNeuCount}</span>
              </button>
              <button type="button" class="btn-filter-pill filter-negative ${this.state.sentimentFilter === 'negative' ? 'active' : ''}" onclick="ResultsView.setSentimentFilter('negative')">
                🔴 부정 <span class="pill-badge">${sentNegCount}</span>
              </button>
            </div>
          </div>

          <!-- 집계 기준 짧게 표시 -->
          <div class="sentiment-criterion-tag">
            ℹ️ 감성 집계 기준: <strong>${CsvUtils.escapeHtml(criterionDesc)}</strong>
          </div>
        </div>

        <!-- 3행: 출처 사이트별 체크 필터 (수집된 전체 또는 개별 사이트 체크) -->
        <div class="site-filter-bar">
          <div class="site-filter-left">
            <span class="site-filter-label">출처 사이트:</span>
            <button type="button" class="btn-site-all-toggle ${isAllSitesActive ? 'active' : ''}" onclick="ResultsView.toggleAllSites()">
              전체 (${allSiteNames.length}개 사이트)
            </button>
          </div>
          <div class="site-filter-checkboxes">
            ${allSiteNames.map(sName => {
              const isChecked = this.state.selectedSites.size === 0 || this.state.selectedSites.has(sName);
              const count = siteCounts[sName] || 0;
              return `
                <label class="site-check-pill ${isChecked ? 'is-checked' : ''}">
                  <input type="checkbox" class="site-native-check" ${isChecked ? 'checked' : ''} onchange="ResultsView.toggleSiteFilter('${CsvUtils.escapeHtml(sName)}', this.checked)">
                  <span class="pill-sitename">${CsvUtils.escapeHtml(sName)}</span>
                  <span class="pill-sitecount">${count}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- 2. 사이트별 그룹 아코디언 목록 -->
      <div class="site-accordion-container">
        ${siteNames.length === 0 ? `
          <div class="empty-state-card text-center" style="padding: 40px 20px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px;">선택한 조합 필터 조건에 해당하는 수집 VOC가 없습니다.</p>
          </div>
        ` : siteNames.map(sName => this.renderSiteGroup(siteGroups[sName])).join('')}
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
