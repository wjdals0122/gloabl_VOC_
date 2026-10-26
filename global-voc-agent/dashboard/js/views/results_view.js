/**
 * dashboard/js/views/results_view.js
 * 2단계: 소셜 리스닝 & VOC 인텔리전스 대시보드
 * 
 * [요구사항 전면 반영]
 * 1. 상단 KPI 카드 5종 (총 언급량, 피크일, 일평균, 최다 언급 채널, 긍정 반응률)
 * 2. "추이": 검색한 키워드 언급량 추이 (시계열 인터랙티브 라인 차트, 채널별 멀티 라인, 피크일 하이라이트)
 * 3. "언급키워드 + 긍부정":
 *    - 전체 언급 키워드 태그 클러스터
 *    - 전체 긍정·부정 비율 (원/도넛 그래프)
 *    - 긍정 키워드 1~5순위
 *    - 부정 키워드 1~5순위
 * 4. "채널별 반응": 수집 채널별 비교 (커뮤니티 vs 제품리뷰 건수, 감성 분포, 주요 담론, 대표 반응)
 * 5. 하단: 수집된 상세 VOC 원문 데이터 (필터링, 카드 뷰, 분석 리포트 Excel/CSV 내보내기)
 */

const ResultsView = {
  containerId: 'view-results-content',

  state: {
    country: 'US',
    keyword: 'LG 워시콤보',
    period: '1m', // '7d' | '1m' | '3m' | '6m' | '1y'
    channel: 'all', // 'all' | 'community' | 'reviews'
    trendMode: 'daily', // 'daily' | 'weekly'
    
    // 분석 지표 캐시
    analyticsData: null,

    // VOC 원문 목록 데이터
    rawCsvText: '',
    results: [],

    // 필터링 상태
    searchFilter: '',
    sourceFilter: 'all',
    selectedBrands: new Set(['all']),
    sentimentFilter: 'all',

    // 내보내기 설정
    downloadScope: 'filtered',
    downloadType: 'analysis',
    includeRawText: false,

    expandedReviewIds: new Set(),
    trendChartInstance: null,
    sentimentChartInstance: null
  },

  init() {
    if (!this.state.analyticsData) {
      this.refreshAnalyticsData();
    }

    if (this.state.results.length === 0) {
      this.state.rawCsvText = MockData.generateMockResultCsv(this.state.country, this.state.keyword, []);
      this.state.results = CsvUtils.parseResultCsv(this.state.rawCsvText);
    }

    this.render();
  },

  setTarget(country, keyword, sources = [], autoStart = true, period = '1m', channel = 'all') {
    this.state.country = country || 'US';
    this.state.keyword = keyword || 'LG 워시콤보';
    this.state.period = period || '1m';
    this.state.channel = channel || 'all';
    this.state.searchFilter = '';
    this.state.sourceFilter = 'all';
    this.state.selectedBrands = new Set(['all']);
    this.state.sentimentFilter = 'all';

    this.refreshAnalyticsData();

    if (this.state.results.length === 0 || autoStart) {
      this.state.rawCsvText = MockData.generateMockResultCsv(this.state.country, this.state.keyword, sources);
      this.state.results = CsvUtils.parseResultCsv(this.state.rawCsvText);
    }

    this.render();
  },

  refreshAnalyticsData() {
    this.state.analyticsData = MockData.getDashboardAnalytics(
      this.state.keyword,
      this.state.period,
      this.state.channel
    );
  },

  setPeriod(period) {
    if (this.state.period === period) return;
    this.state.period = period;
    this.refreshAnalyticsData();
    this.render();
  },

  setChannel(channel) {
    if (this.state.channel === channel) return;
    this.state.channel = channel;
    this.refreshAnalyticsData();
    this.render();
  },

  setTrendMode(mode) {
    if (this.state.trendMode === mode) return;
    this.state.trendMode = mode;
    this.renderTrendChart();
  },

  selectKeywordTag(tagText) {
    const cleanWord = tagText.replace(/^#/, '').trim();
    this.state.searchFilter = cleanWord;
    const searchInput = document.getElementById('voc-search-input');
    if (searchInput) {
      searchInput.value = cleanWord;
    }
    this.renderVocListOnly();

    // VOC 원문 목록 영역으로 부드럽게 스크롤
    const vocSection = document.getElementById('section-voc-raw-list');
    if (vocSection) {
      vocSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  // --------------------------------------------------------------------------
  // 차트 렌더링 (Chart.js 라이프사이클 관리)
  // --------------------------------------------------------------------------
  renderCharts() {
    this.renderTrendChart();
    this.renderSentimentChart();
  },

  renderTrendChart() {
    const canvas = document.getElementById('chart-trend-canvas');
    if (!canvas) return;

    if (this.state.trendChartInstance) {
      this.state.trendChartInstance.destroy();
      this.state.trendChartInstance = null;
    }

    const trend = this.state.analyticsData ? this.state.analyticsData.trend : null;
    if (!trend) return;

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded. Fallback text rendered.');
      return;
    }

    const ctx = canvas.getContext('2d');
    const datasets = [];

    // 채널 조건에 따른 데이터셋 구성
    if (this.state.channel === 'all' || this.state.channel === 'community') {
      datasets.push({
        label: '커뮤니티',
        data: trend.commData,
        borderColor: '#84cc16', // 라임 그린 (레퍼런스 컬러)
        backgroundColor: 'rgba(132, 204, 22, 0.08)',
        borderWidth: 2.5,
        tension: 0.35,
        pointBackgroundColor: '#84cc16',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false
      });
    }

    if (this.state.channel === 'all' || this.state.channel === 'reviews') {
      datasets.push({
        label: '제품리뷰',
        data: trend.revData,
        borderColor: '#f59e0b', // 웜 앰버 (레퍼런스 컬러)
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderWidth: 2.5,
        tension: 0.35,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false
      });
    }

    if (this.state.channel === 'all') {
      datasets.unshift({
        label: '전체 언급량 (합계)',
        data: trend.totalData,
        borderColor: '#a50034', // LG 헤리티지 레드
        backgroundColor: 'rgba(165, 0, 52, 0.04)',
        borderWidth: 2,
        borderDash: [4, 4],
        tension: 0.35,
        pointBackgroundColor: '#a50034',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true
      });
    }

    this.state.trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 12, family: 'Pretendard, -apple-system, sans-serif' }
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            padding: 12,
            cornerRadius: 8,
            boxPadding: 6,
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${context.parsed.y}건`;
              },
              afterBody: function(contexts) {
                const total = contexts.reduce((sum, c) => sum + (c.parsed.y || 0), 0);
                return `──────────────────\n 총 언급량: ${total}건`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11, family: 'Pretendard, sans-serif' },
              color: '#64748b'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#f1f5f9',
              drawBorder: false
            },
            ticks: {
              font: { size: 11, family: 'Pretendard, sans-serif' },
              color: '#64748b',
              stepSize: 30
            }
          }
        }
      }
    });
  },

  renderSentimentChart() {
    const canvas = document.getElementById('chart-sentiment-doughnut');
    if (!canvas) return;

    if (this.state.sentimentChartInstance) {
      this.state.sentimentChartInstance.destroy();
      this.state.sentimentChartInstance = null;
    }

    const sentiment = this.state.analyticsData ? this.state.analyticsData.sentiment : null;
    if (!sentiment) return;

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded for doughnut.');
      return;
    }

    const ctx = canvas.getContext('2d');
    this.state.sentimentChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['긍정', '중립', '부정'],
        datasets: [{
          data: [sentiment.posCount, sentiment.neuCount, sentiment.negCount],
          backgroundColor: ['#10b981', '#94a3b8', '#ef4444'],
          hoverBackgroundColor: ['#059669', '#64748b', '#dc2626'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const val = context.parsed;
                const total = sentiment.posCount + sentiment.neuCount + sentiment.negCount;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${val}건 (${pct}%)`;
              }
            }
          }
        }
      }
    });
  },

  // --------------------------------------------------------------------------
  // VOC 목록 필터링 및 다운로드 로직
  // --------------------------------------------------------------------------
  getFilteredResults() {
    let items = this.state.results || [];

    // 1. 검색어 필터
    if (this.state.searchFilter) {
      const q = this.state.searchFilter.toLowerCase().trim();
      items = items.filter(item => {
        const text = `${item.kr_summary || ''} ${item.content || ''} ${item.site_name || ''} ${(item.topic_tags || []).join(' ')}`.toLowerCase();
        return text.includes(q);
      });
    }

    // 2. 브랜드 필터
    if (!this.state.selectedBrands.has('all')) {
      items = items.filter(item => {
        const info = this.getEvaluationTargetInfo(item);
        if (this.state.selectedBrands.has('lg') && info.targetType === 'lg') return true;
        if (this.state.selectedBrands.has('competitor') && info.targetType === 'competitor') return true;
        if (this.state.selectedBrands.has('compare') && info.targetType === 'compare') return true;
        return false;
      });
    }

    // 3. 감성 필터
    if (this.state.sentimentFilter !== 'all') {
      const target = this.state.sentimentFilter.toUpperCase();
      items = items.filter(item => String(item.ai_sentiment).toUpperCase() === target);
    }

    return items;
  },

  getEvaluationTargetInfo(item) {
    const isLg = item.lg_mentioned;
    const comps = item.competitors && Array.isArray(item.competitors) && item.competitors.length > 0 ? item.competitors : [];
    const sentiment = item.ai_sentiment;
    const summary = item.kr_summary || '';

    if (!isLg && comps.length > 0) {
      return {
        evalTarget: `${comps.join(', ')} (경쟁사)`,
        targetType: 'competitor',
        chipClass: 'target-comp'
      };
    }
    if (isLg && comps.length > 0) {
      return {
        evalTarget: 'LG vs 타사 비교',
        targetType: 'compare',
        chipClass: 'target-compare'
      };
    }
    if (isLg) {
      return {
        evalTarget: 'LG 전자 (자사)',
        targetType: 'lg',
        chipClass: 'target-lg'
      };
    }
    return {
      evalTarget: '가전 시장 일반',
      targetType: 'general',
      chipClass: 'target-general'
    };
  },

  toggleReviewExpand(reviewId) {
    if (this.state.expandedReviewIds.has(reviewId)) {
      this.state.expandedReviewIds.delete(reviewId);
    } else {
      this.state.expandedReviewIds.add(reviewId);
    }
    this.renderVocListOnly();
  },

  renderVocListOnly() {
    const listContainer = document.getElementById('voc-cards-container');
    const countEl = document.getElementById('voc-filtered-count-badge');
    if (!listContainer) return;

    const filtered = this.getFilteredResults();
    if (countEl) countEl.textContent = `${filtered.length}건`;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state-card text-center" style="padding: 40px 20px; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">선택한 조건 필터에 일치하는 수집 VOC가 없습니다.</p>
          <button type="button" class="btn btn-secondary btn-sm" onclick="ResultsView.resetFilters()">필터 초기화</button>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(item => this.renderVocCard(item)).join('');
  },

  renderVocCard(item) {
    const id = item.voc_id || `voc_${Math.random()}`;
    const isExpanded = this.state.expandedReviewIds.has(id);
    const targetInfo = this.getEvaluationTargetInfo(item);

    // 감성 라벨
    const sent = String(item.ai_sentiment || 'NEUTRAL').toUpperCase();
    let sentimentBadge = '<span class="badge-sent sent-neutral">● 중립</span>';
    if (sent === 'POSITIVE') {
      sentimentBadge = '<span class="badge-sent sent-positive">● 긍정</span>';
    } else if (sent === 'NEGATIVE') {
      sentimentBadge = '<span class="badge-sent sent-negative">● 부정</span>';
    }

    const summaryText = item.kr_summary || '요약 내용이 없습니다.';
    const contentText = item.content || '';
    const siteName = item.site_name || '온라인 채널';

    return `
      <div class="voc-premium-card" id="card-${id}">
        <div class="card-header-bar">
          <div class="card-left-tags">
            <span class="card-source-chip">${CsvUtils.escapeHtml(siteName)}</span>
            <span class="card-target-chip ${targetInfo.chipClass}">${CsvUtils.escapeHtml(targetInfo.evalTarget)}</span>
          </div>
          <div class="card-right-status">
            ${sentimentBadge}
          </div>
        </div>

        <div class="card-summary-line">
          ${CsvUtils.escapeHtml(summaryText)}
        </div>

        ${contentText ? `
          <div class="card-content-toggle-area">
            <button type="button" class="btn-toggle-raw" onclick="ResultsView.toggleReviewExpand('${id}')">
              ${isExpanded ? '▲ 원문 닫기' : '▼ 현지 원문 펼쳐보기'}
            </button>
            ${isExpanded ? `
              <div class="card-raw-box animate-fade-in">
                <div class="raw-label">수집 원문 (영어/현지어):</div>
                <div class="raw-text">${CsvUtils.escapeHtml(contentText)}</div>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  },

  resetFilters() {
    this.state.searchFilter = '';
    this.state.sourceFilter = 'all';
    this.state.selectedBrands.clear();
    this.state.selectedBrands.add('all');
    this.state.sentimentFilter = 'all';

    const searchInput = document.getElementById('voc-search-input');
    if (searchInput) searchInput.value = '';

    const brandRadios = document.querySelectorAll('input[name="filter-brand-radio"]');
    brandRadios.forEach(r => { r.checked = (r.value === 'all'); });

    const sentRadios = document.querySelectorAll('input[name="filter-sent-radio"]');
    sentRadios.forEach(r => { r.checked = (r.value === 'all'); });

    this.renderVocListOnly();
  },

  executeDownload(format) {
    const isFiltered = this.state.downloadScope === 'filtered';
    const targetItems = isFiltered ? this.getFilteredResults() : this.state.results;

    if (!targetItems || targetItems.length === 0) {
      alert('내보낼 데이터가 없습니다. 필터를 확인해주세요.');
      return;
    }

    const filename = `VOC_${this.state.keyword.replace(/\s+/g, '_')}_${this.state.period}_${Date.now()}`;

    if (format === 'csv') {
      const csvContent = CsvUtils.generateResultCsv(targetItems, this.state.includeRawText);
      CsvUtils.downloadCsvText(csvContent, `${filename}.csv`);
    } else {
      // 엑셀 분석 리포트 (요약 + 세부 VOC 2개 시트 구조)
      CsvUtils.downloadMultiSheetExcel(
        targetItems,
        this.state.analyticsData,
        `${filename}.xlsx`
      );
    }
  },

  // --------------------------------------------------------------------------
  // 메인 렌더링
  // --------------------------------------------------------------------------
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const data = this.state.analyticsData || MockData.getDashboardAnalytics(this.state.keyword, this.state.period, this.state.channel);
    const kpi = data.kpi;
    const trend = data.trend;
    const sentiment = data.sentiment;
    const posKeywords = data.positiveKeywords;
    const negKeywords = data.negativeKeywords;
    const allKeywords = data.allKeywords;
    const channelComp = data.channelComparison;

    container.innerHTML = `
      <div class="voc-intelligence-dashboard">

        <!-- ==================================================================
             1. 상단 컨텍스트 & 퀵 필터 바 (레퍼런스 이미지 헤더 스타일)
             ================================================================== -->
        <div class="dash-context-bar">
          <div class="context-left-info">
            <span class="context-keyword-tag">
              <span class="tag-icon">🔍</span> 주제어: <strong>${CsvUtils.escapeHtml(this.state.keyword)}</strong>
            </span>
            <span class="context-purpose-desc">
              분석 목적: <strong>${CsvUtils.escapeHtml(this.state.keyword)}</strong> 글로벌 고객 VOC 소셜 리스닝 분석
            </span>
          </div>

          <div class="context-right-controls">
            <!-- 기간 선택 버튼 그룹 -->
            <div class="btn-group-period" role="group" aria-label="조회 기간">
              <span class="period-date-display">${data.dateRangeText}</span>
              <button type="button" class="btn-period ${this.state.period === '7d' ? 'active' : ''}" onclick="ResultsView.setPeriod('7d')">최근 7일</button>
              <button type="button" class="btn-period ${this.state.period === '1m' ? 'active' : ''}" onclick="ResultsView.setPeriod('1m')">1개월</button>
              <button type="button" class="btn-period ${this.state.period === '3m' ? 'active' : ''}" onclick="ResultsView.setPeriod('3m')">3개월</button>
              <button type="button" class="btn-period ${this.state.period === '6m' ? 'active' : ''}" onclick="ResultsView.setPeriod('6m')">6개월</button>
              <button type="button" class="btn-period ${this.state.period === '1y' ? 'active' : ''}" onclick="ResultsView.setPeriod('1y')">12개월</button>
            </div>

            <!-- 채널 필터 토글 -->
            <div class="btn-group-channel" role="group" aria-label="수집 채널">
              <button type="button" class="btn-channel ${this.state.channel === 'all' ? 'active' : ''}" onclick="ResultsView.setChannel('all')">통합(전체)</button>
              <button type="button" class="btn-channel ${this.state.channel === 'community' ? 'active' : ''}" onclick="ResultsView.setChannel('community')">커뮤니티</button>
              <button type="button" class="btn-channel ${this.state.channel === 'reviews' ? 'active' : ''}" onclick="ResultsView.setChannel('reviews')">제품리뷰</button>
            </div>

            <button type="button" class="btn btn-outline btn-sm btn-change-query" onclick="App.navigateToTab('tab-sources')" title="새로운 키워드 또는 국가로 재검색">
              조건 변경
            </button>
          </div>
        </div>

        <!-- ==================================================================
             2. 상단 5대 핵심 메트릭 KPI 카드 그리드 (레퍼런스 이미지 카드 스타일)
             ================================================================== -->
        <div class="kpi-metrics-grid">
          <!-- 카드 1: 총 언급량 -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">총 언급량</span>
              <span class="kpi-tooltip" title="선택한 기간 내 수집된 유효 고객 리뷰 및 포스트 수">?</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-main-val">${Number(kpi.totalCount).toLocaleString()}<span>건</span></div>
              <div class="kpi-sub-text">
                <span class="trend-up">▲ 18.4%</span> 전월 동기 대비 증가
              </div>
            </div>
          </div>

          <!-- 카드 2: 피크일 -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">피크일</span>
              <span class="kpi-tooltip" title="기간 내 언급량이 가장 집중된 날짜">?</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-main-val val-peak">${kpi.peakDate}</div>
              <div class="kpi-sub-text">
                <strong>${kpi.peakCount}건</strong> · 평균의 2.2배
              </div>
              <!-- 미니 스파크라인 SVG -->
              <div class="kpi-sparkline">
                <svg viewBox="0 0 100 24" class="spark-svg">
                  <path d="M0,18 L15,16 L30,12 L45,14 L60,4 L75,15 L90,12 L100,20" fill="none" stroke="#a50034" stroke-width="2"/>
                  <circle cx="60" cy="4" r="3" fill="#a50034"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- 카드 3: 일평균 -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">일평균 언급량</span>
              <span class="kpi-tooltip" title="조회 기간 내 하루 평균 발생한 VOC 건수">?</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-main-val">${kpi.dailyAvg}<span>건</span></div>
              <div class="kpi-sub-text">
                평균 위 13일 · 아래 17일
              </div>
              <div class="kpi-minibars">
                <span class="bar b1"></span><span class="bar b2"></span><span class="bar b3"></span>
                <span class="bar b4 active"></span><span class="bar b5"></span><span class="bar b6"></span>
              </div>
            </div>
          </div>

          <!-- 카드 4: 최다 언급 채널 -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">최다 언급 채널</span>
              <span class="kpi-tooltip" title="가장 많은 반응이 수집된 주력 채널">?</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-main-val val-channel">${kpi.topChannel}</div>
              <div class="kpi-sub-text">
                점유율 <strong>${kpi.topChannelShare}</strong> 집중
              </div>
              <div class="kpi-share-bar">
                <div class="share-comm" style="width: 71%;" title="커뮤니티 71%"></div>
                <div class="share-rev" style="width: 29%;" title="제품리뷰 29%"></div>
              </div>
            </div>
          </div>

          <!-- 카드 5: 긍정 반응률 -->
          <div class="kpi-card highlight-kpi">
            <div class="kpi-header">
              <span class="kpi-title">긍정 반응률</span>
              <span class="kpi-tooltip" title="AI가 판별한 전체 고객 의견 중 긍정 비율">?</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-main-val val-pos">${kpi.posRate}%</div>
              <div class="kpi-sub-text">
                긍정 우세 (부정 ${kpi.negRate}%)
              </div>
              <div class="kpi-gauge-bar">
                <div class="gauge-fill" style="width: ${kpi.posRate}%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================================================================
             3. 섹션: "추이" - 검색한 키워드 언급량 추이 (레퍼런스 이미지 중앙)
             ================================================================== -->
        <div class="dash-section trend-section">
          <div class="trend-layout-grid">
            <!-- 좌측: 채널별 언급량 요약 카드 -->
            <div class="trend-left-summary">
              <div class="channel-vol-header">
                <h3 class="box-title">채널별 언급량</h3>
                <span class="help-icon" title="커뮤니티 및 제품리뷰 채널별 유효 언급량">?</span>
              </div>
              <div class="channel-vol-items">
                <div class="vol-item ${this.state.channel === 'community' || this.state.channel === 'all' ? 'active' : ''}">
                  <div class="vol-label">
                    <span class="dot-legend dot-comm"></span>
                    <span class="name">커뮤니티</span>
                  </div>
                  <div class="vol-figure">
                    <strong>${Number(channelComp.community.totalCount).toLocaleString()}건</strong>
                    <span class="pct">71.0%</span>
                  </div>
                </div>
                <div class="vol-item ${this.state.channel === 'reviews' || this.state.channel === 'all' ? 'active' : ''}">
                  <div class="vol-label">
                    <span class="dot-legend dot-rev"></span>
                    <span class="name">제품리뷰</span>
                  </div>
                  <div class="vol-figure">
                    <strong>${Number(channelComp.reviews.totalCount).toLocaleString()}건</strong>
                    <span class="pct">29.0%</span>
                  </div>
                </div>
              </div>
              <div class="trend-summary-notice">
                💡 피크일 <strong>${trend.peakLabel}</strong>에 신규 실사용 후기 및 콤보 모델 추천 질의가 집중되었습니다.
              </div>
            </div>

            <!-- 우측: Chart.js 시계열 라인 차트 컨테이너 -->
            <div class="trend-right-chart">
              <div class="chart-top-bar">
                <div class="chart-title-area">
                  <h3 class="box-title">언급량 추이</h3>
                  <span class="badge-ai-indicator">✨ AI 시계열</span>
                  <span class="chart-meta-stat">총 언급량 <strong>${Number(kpi.totalCount).toLocaleString()}건</strong> · 피크일 <strong>${trend.peakLabel}</strong> (${trend.peakCount}건)</span>
                </div>
                <div class="chart-actions">
                  <div class="btn-group-toggle">
                    <button type="button" class="btn-toggle-unit ${this.state.trendMode === 'daily' ? 'active' : ''}" onclick="ResultsView.setTrendMode('daily')">일별</button>
                    <button type="button" class="btn-toggle-unit ${this.state.trendMode === 'weekly' ? 'active' : ''}" onclick="ResultsView.setTrendMode('weekly')">주별</button>
                  </div>
                </div>
              </div>
              <!-- 캔버스 차트 -->
              <div class="chart-canvas-wrapper">
                <canvas id="chart-trend-canvas" height="230"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================================================================
             4. 섹션: "언급키워드 + 긍부정" (사용자 직접 요구)
             ================================================================== -->
        <div class="dash-section sentiment-keywords-section">
          <div class="section-title-wrap">
            <h3 class="section-title">📊 언급키워드 + 긍부정 분석</h3>
            <p class="section-sub">수집된 글로벌 VOC에서 고객들이 가장 많이 언급한 긍정·부정 키워드 Top 5와 전체 감성 비율입니다.</p>
          </div>

          <div class="sk-layout-grid">
            <!-- (1) 전체 긍정·부정 비율 (원/도넛 그래프) -->
            <div class="sk-card donut-card">
              <div class="card-head">
                <h4 class="card-head-title">전체 긍정·부정 비율</h4>
                <span class="help-icon" title="Gemini AI가 문맥을 분석하여 분류한 감성 지수">?</span>
              </div>
              <div class="donut-chart-container">
                <div class="donut-canvas-box">
                  <canvas id="chart-sentiment-doughnut" width="180" height="180"></canvas>
                  <div class="donut-center-text">
                    <span class="center-pct">${sentiment.posRate}%</span>
                    <span class="center-label">긍정 반응</span>
                  </div>
                </div>
                <div class="donut-legend-list">
                  <div class="legend-row">
                    <span class="legend-dot bg-pos"></span>
                    <span class="legend-name">긍정 (Positive)</span>
                    <span class="legend-count">${Number(sentiment.posCount).toLocaleString()}건</span>
                    <span class="legend-pct pct-pos">${sentiment.posRate}%</span>
                  </div>
                  <div class="legend-row">
                    <span class="legend-dot bg-neu"></span>
                    <span class="legend-name">중립 (Neutral)</span>
                    <span class="legend-count">${Number(sentiment.neuCount).toLocaleString()}건</span>
                    <span class="legend-pct pct-neu">${sentiment.neuRate}%</span>
                  </div>
                  <div class="legend-row">
                    <span class="legend-dot bg-neg"></span>
                    <span class="legend-name">부정 (Negative)</span>
                    <span class="legend-count">${Number(sentiment.negCount).toLocaleString()}건</span>
                    <span class="legend-pct pct-neg">${sentiment.negRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- (2) 긍정 키워드 1~5순위 & 부정 키워드 1~5순위 -->
            <div class="sk-card ranking-card">
              <div class="ranking-cols-grid">
                <!-- 긍정 키워드 Top 5 -->
                <div class="ranking-column pos-column">
                  <div class="col-head">
                    <span class="col-title"><span class="badge-icon-pos">👍</span> 긍정 키워드 1~5순위</span>
                    <span class="col-meta">비중 및 주요 평가</span>
                  </div>
                  <div class="ranking-list">
                    ${posKeywords.map(k => `
                      <div class="ranking-item" onclick="ResultsView.selectKeywordTag('${k.keyword}')" title="클릭 시 관련 VOC 필터링">
                        <div class="item-rank-wrap">
                          <span class="rank-badge rank-pos">${k.rank}</span>
                          <span class="item-keyword">${CsvUtils.escapeHtml(k.keyword)}</span>
                        </div>
                        <div class="item-stat-wrap">
                          <div class="bar-track">
                            <div class="bar-fill fill-pos" style="width: ${k.percent * 2.5}%;"></div>
                          </div>
                          <span class="item-count">${k.count}건 (${k.percent}%)</span>
                        </div>
                        <div class="item-desc">${CsvUtils.escapeHtml(k.desc)}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- 부정 키워드 Top 5 -->
                <div class="ranking-column neg-column">
                  <div class="col-head">
                    <span class="col-title"><span class="badge-icon-neg">👎</span> 부정 키워드 1~5순위</span>
                    <span class="col-meta">비중 및 개선 요구</span>
                  </div>
                  <div class="ranking-list">
                    ${negKeywords.map(k => `
                      <div class="ranking-item" onclick="ResultsView.selectKeywordTag('${k.keyword}')" title="클릭 시 관련 VOC 필터링">
                        <div class="item-rank-wrap">
                          <span class="rank-badge rank-neg">${k.rank}</span>
                          <span class="item-keyword">${CsvUtils.escapeHtml(k.keyword)}</span>
                        </div>
                        <div class="item-stat-wrap">
                          <div class="bar-track">
                            <div class="bar-fill fill-neg" style="width: ${k.percent * 1.8}%;"></div>
                          </div>
                          <span class="item-count">${k.count}건 (${k.percent}%)</span>
                        </div>
                        <div class="item-desc">${CsvUtils.escapeHtml(k.desc)}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- (3) 전체 언급 키워드 태그 클러스터 -->
          <div class="all-keywords-cluster-box">
            <div class="cluster-title">
              <span>🏷️ 전체 언급 키워드 (클릭하여 해당 VOC 바로 확인):</span>
            </div>
            <div class="cluster-tags-cloud">
              ${allKeywords.map(item => `
                <button type="button" class="cluster-tag-btn tag-${item.sentiment}" onclick="ResultsView.selectKeywordTag('${item.tag}')">
                  ${item.tag} <span class="tag-cnt">${item.count}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- ==================================================================
             5. 섹션: "채널별 반응" - 수집 채널별 비교 (사용자 직접 요구)
             ================================================================== -->
        <div class="dash-section channel-reaction-section">
          <div class="section-title-wrap">
            <h3 class="section-title">🌐 채널별 반응 비교 (커뮤니티 vs 제품리뷰)</h3>
            <p class="section-sub">비정형 고객 토론 채널(커뮤니티)과 정형 구매 평가 채널(제품리뷰) 간 반응 특성을 교차 분석합니다.</p>
          </div>

          <div class="channel-compare-grid">
            <!-- 커뮤니티 채널 카드 -->
            <div class="channel-card">
              <div class="ch-card-header">
                <div class="ch-title-wrap">
                  <span class="ch-icon">💬</span>
                  <div>
                    <h4 class="ch-name">${channelComp.community.channelName}</h4>
                    <span class="ch-sites">${channelComp.community.siteExamples}</span>
                  </div>
                </div>
                <div class="ch-vol-badge">
                  <strong>${Number(channelComp.community.totalCount).toLocaleString()}건</strong> (${channelComp.community.sharePercent}%)
                </div>
              </div>

              <!-- 감성 스펙트럼 미니 바 -->
              <div class="ch-sentiment-mini-bar">
                <div class="seg-pos" style="width: ${channelComp.community.posRate}%;" title="긍정 ${channelComp.community.posRate}%"></div>
                <div class="seg-neu" style="width: ${channelComp.community.neuRate}%;" title="중립 ${channelComp.community.neuRate}%"></div>
                <div class="seg-neg" style="width: ${channelComp.community.negRate}%;" title="부정 ${channelComp.community.negRate}%"></div>
              </div>
              <div class="ch-sentiment-labels">
                <span class="lbl-pos">긍정 ${channelComp.community.posRate}%</span>
                <span class="lbl-neu">중립 ${channelComp.community.neuRate}%</span>
                <span class="lbl-neg">부정 ${channelComp.community.negRate}%</span>
              </div>

              <!-- 주요 담론 -->
              <div class="ch-discourse-box">
                <div class="ch-sec-label">주요 논의 및 반응 성향:</div>
                <p class="ch-sec-desc">${channelComp.community.discourseSummary}</p>
              </div>

              <!-- 대표 키워드 태그 -->
              <div class="ch-tags-row">
                ${channelComp.community.keyTags.map(t => `<span class="ch-tag">${t}</span>`).join('')}
              </div>

              <!-- 대표 VOC 인용문 -->
              <div class="ch-quote-box">
                <div class="quote-icon">“</div>
                <div class="quote-text">${channelComp.community.representativeQuote}</div>
              </div>
            </div>

            <!-- 제품리뷰 채널 카드 -->
            <div class="channel-card">
              <div class="ch-card-header">
                <div class="ch-title-wrap">
                  <span class="ch-icon">⭐</span>
                  <div>
                    <h4 class="ch-name">${channelComp.reviews.channelName}</h4>
                    <span class="ch-sites">${channelComp.reviews.siteExamples}</span>
                  </div>
                </div>
                <div class="ch-vol-badge">
                  <strong>${Number(channelComp.reviews.totalCount).toLocaleString()}건</strong> (${channelComp.reviews.sharePercent}%)
                </div>
              </div>

              <!-- 감성 스펙트럼 미니 바 -->
              <div class="ch-sentiment-mini-bar">
                <div class="seg-pos" style="width: ${channelComp.reviews.posRate}%;" title="긍정 ${channelComp.reviews.posRate}%"></div>
                <div class="seg-neu" style="width: ${channelComp.reviews.neuRate}%;" title="중립 ${channelComp.reviews.neuRate}%"></div>
                <div class="seg-neg" style="width: ${channelComp.reviews.negRate}%;" title="부정 ${channelComp.reviews.negRate}%"></div>
              </div>
              <div class="ch-sentiment-labels">
                <span class="lbl-pos">긍정 ${channelComp.reviews.posRate}%</span>
                <span class="lbl-neu">중립 ${channelComp.reviews.neuRate}%</span>
                <span class="lbl-neg">부정 ${channelComp.reviews.negRate}%</span>
              </div>

              <!-- 주요 담론 -->
              <div class="ch-discourse-box">
                <div class="ch-sec-label">주요 논의 및 반응 성향:</div>
                <p class="ch-sec-desc">${channelComp.reviews.discourseSummary}</p>
              </div>

              <!-- 대표 키워드 태그 -->
              <div class="ch-tags-row">
                ${channelComp.reviews.keyTags.map(t => `<span class="ch-tag">${t}</span>`).join('')}
              </div>

              <!-- 대표 VOC 인용문 -->
              <div class="ch-quote-box">
                <div class="quote-icon">“</div>
                <div class="quote-text">${channelComp.reviews.representativeQuote}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================================================================
             6. 섹션: 수집된 상세 VOC 원문 데이터 및 내보내기
             ================================================================== -->
        <div class="dash-section voc-data-section" id="section-voc-raw-list">
          <div class="section-title-wrap section-title-flex">
            <div>
              <h3 class="section-title">📋 수집 상세 VOC 및 데이터 내보내기</h3>
              <p class="section-sub">AI 분석의 기초가 된 개별 고객 반응 원문과 감성 태그를 확인하고 엑셀/CSV로 다운로드합니다.</p>
            </div>
            <!-- 내보내기 버튼들 -->
            <div class="export-actions-wrap">
              <button type="button" class="btn btn-primary btn-sm btn-export-excel" onclick="ResultsView.executeDownload('xlsx')">
                📥 분석 리포트 Excel (.xlsx)
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-export-csv" onclick="ResultsView.executeDownload('csv')">
                📄 데이터 CSV (.csv)
              </button>
            </div>
          </div>

          <!-- VOC 필터 바 (검색창 + 브랜드 + 감성) -->
          <div class="voc-filter-toolbar">
            <div class="toolbar-search-box">
              <span class="search-icon">🔍</span>
              <input type="text" id="voc-search-input" class="input-text voc-search-input" 
                     placeholder="요약문, 원문, 태그 검색..." 
                     value="${CsvUtils.escapeHtml(this.state.searchFilter)}"
                     oninput="ResultsView.state.searchFilter = this.value; ResultsView.renderVocListOnly();">
            </div>

            <div class="toolbar-filter-radios">
              <!-- 언급 대상 -->
              <div class="filter-radio-group">
                <span class="radio-group-title">언급 대상:</span>
                <label class="radio-label">
                  <input type="radio" name="filter-brand-radio" value="all" ${this.state.selectedBrands.has('all') ? 'checked' : ''} 
                         onchange="ResultsView.state.selectedBrands.clear(); ResultsView.state.selectedBrands.add('all'); ResultsView.renderVocListOnly();"> 전체
                </label>
                <label class="radio-label">
                  <input type="radio" name="filter-brand-radio" value="lg" ${this.state.selectedBrands.has('lg') ? 'checked' : ''} 
                         onchange="ResultsView.state.selectedBrands.clear(); ResultsView.state.selectedBrands.add('lg'); ResultsView.renderVocListOnly();"> LG 직접 언급
                </label>
                <label class="radio-label">
                  <input type="radio" name="filter-brand-radio" value="competitor" ${this.state.selectedBrands.has('competitor') ? 'checked' : ''} 
                         onchange="ResultsView.state.selectedBrands.clear(); ResultsView.state.selectedBrands.add('competitor'); ResultsView.renderVocListOnly();"> 타사/비교 언급
                </label>
              </div>

              <!-- 감성 -->
              <div class="filter-radio-group">
                <span class="radio-group-title">감성:</span>
                <label class="radio-label">
                  <input type="radio" name="filter-sent-radio" value="all" ${this.state.sentimentFilter === 'all' ? 'checked' : ''} 
                         onchange="ResultsView.state.sentimentFilter = 'all'; ResultsView.renderVocListOnly();"> 전체
                </label>
                <label class="radio-label">
                  <input type="radio" name="filter-sent-radio" value="positive" ${this.state.sentimentFilter === 'positive' ? 'checked' : ''} 
                         onchange="ResultsView.state.sentimentFilter = 'positive'; ResultsView.renderVocListOnly();"> 긍정
                </label>
                <label class="radio-label">
                  <input type="radio" name="filter-sent-radio" value="neutral" ${this.state.sentimentFilter === 'neutral' ? 'checked' : ''} 
                         onchange="ResultsView.state.sentimentFilter = 'neutral'; ResultsView.renderVocListOnly();"> 중립
                </label>
                <label class="radio-label">
                  <input type="radio" name="filter-sent-radio" value="negative" ${this.state.sentimentFilter === 'negative' ? 'checked' : ''} 
                         onchange="ResultsView.state.sentimentFilter = 'negative'; ResultsView.renderVocListOnly();"> 부정
                </label>
              </div>

              <button type="button" class="btn-filter-reset" onclick="ResultsView.resetFilters()">초기화</button>
            </div>
          </div>

          <!-- VOC 카드 리스트 -->
          <div class="voc-list-header-meta">
            <span>수집 결과: <strong id="voc-filtered-count-badge" class="filtered-badge">${this.getFilteredResults().length}건</strong></span>
          </div>

          <div id="voc-cards-container" class="voc-cards-container">
            ${this.getFilteredResults().map(item => this.renderVocCard(item)).join('')}
          </div>
        </div>

      </div>
    `;

    // 비동기로 Chart.js 차트 렌더링
    setTimeout(() => {
      this.renderCharts();
    }, 50);
  }
};

if (typeof window !== 'undefined') {
  window.ResultsView = ResultsView;
}
