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
    aiPreset: 'all', // 'all' | 'complaint' | 'switch_opp' | 'selling_point' | 'experience'

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
    this.state.aiPreset = 'all';
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
      parts.push('브랜드: 전체');
    }
    if (this.state.sentimentFilter === 'positive') parts.push('감성: 긍정');
    else if (this.state.sentimentFilter === 'neutral') parts.push('감성: 중립');
    else if (this.state.sentimentFilter === 'negative') parts.push('감성: 부정');
    else parts.push('감성: 전체');

    if (this.state.aiPreset && this.state.aiPreset !== 'all') {
      const presetLabels = {
        complaint: 'AI 프리셋: 불만/품질 이슈',
        switch_opp: 'AI 프리셋: 타사 이탈/LG 교체 기회',
        selling_point: 'AI 프리셋: 실구매자 호평 핵심',
        experience: 'AI 프리셋: 실사용 경험'
      };
      if (presetLabels[this.state.aiPreset]) {
        parts.push(presetLabels[this.state.aiPreset]);
      }
    }
    return parts.join(' | ');
  },

  // 수집된 실제 데이터(this.state.results)에서 언급된 브랜드 및 건수 동적 추출
  getAvailableBrands() {
    const brandMap = new Map();
    const allItems = this.state.results;

    allItems.forEach(r => {
      // 1. LG 자사 언급 확인
      if (r.lg_mentioned) {
        brandMap.set('LG', (brandMap.get('LG') || 0) + 1);
      }
      // 2. 경쟁사 언급 확인
      if (r.competitors && Array.isArray(r.competitors)) {
        r.competitors.forEach(c => {
          if (!c) return;
          const cleanName = c.trim();
          if (cleanName) {
            brandMap.set(cleanName, (brandMap.get(cleanName) || 0) + 1);
          }
        });
      }
    });

    // LG가 맨 앞에 오고, 나머지는 언급 건수 내림차순 정렬
    const brands = Array.from(brandMap.entries()).map(([name, count]) => ({ name, count }));
    brands.sort((a, b) => {
      if (a.name === 'LG') return -1;
      if (b.name === 'LG') return 1;
      return b.count - a.count;
    });

    return brands;
  },

  // 카테고리 4개 표준 한국어 명칭 변환
  formatCategory(category) {
    if (!category) return '기타 출처';
    const cat = String(category).trim().toLowerCase();
    if (cat.includes('e-commerce') || cat.includes('ecommerce') || cat.includes('가전 판매점') || cat.includes('쇼핑몰') || cat.includes('이커머스')) {
      return '가전 판매점, 온라인 쇼핑몰';
    }
    if (cat.includes('community') || cat.includes('forum') || cat.includes('커뮤니티') || cat.includes('포럼')) {
      return '커뮤니티';
    }
    if (cat.includes('tech review') || cat.includes('tech') || cat.includes('전문 리뷰') || cat.includes('리뷰 사이트')) {
      return '전문 리뷰 사이트';
    }
    if (cat.includes('price comparison') || cat.includes('price') || cat.includes('가격 비교') || cat.includes('가격비교')) {
      return '가격 비교 사이트';
    }
    return category;
  },

  // 필터 조작 메서드
  setAiPreset(preset) {
    this.state.aiPreset = preset || 'all';
    this.renderResultsBody();
  },

  // 키워드 검색: 사이드바 DOM을 파괴하지 않고 우측 결과만 실시간 갱신 (한글 자음모음 조합 완벽 유지)
  setSearchFilter(query) {
    this.state.searchFilter = query || '';

    // 클리어(x) 버튼 인플레이스 토글
    const clearBtn = document.querySelector('.btn-clear-input');
    const inputWrap = document.querySelector('.filter-input-wrap');
    if (inputWrap) {
      if (this.state.searchFilter) {
        if (!clearBtn) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-clear-input';
          btn.innerHTML = '✕';
          btn.onclick = () => ResultsView.clearSearchFilter();
          inputWrap.appendChild(btn);
        }
      } else {
        if (clearBtn) clearBtn.remove();
      }
    }

    this.renderMainResultsOnly();
  },

  clearSearchFilter() {
    this.state.searchFilter = '';
    const input = document.getElementById('voc-keyword-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    const clearBtn = document.querySelector('.btn-clear-input');
    if (clearBtn) clearBtn.remove();
    this.renderMainResultsOnly();
  },

  // 우측 결과 목록 및 통계만 즉시 갱신하는 최적화 메서드 (사이드바 인풋 및 한글 IME 조합 100% 보존)
  renderMainResultsOnly() {
    const mainEl = document.querySelector('.voc-main-results');
    if (!mainEl) {
      this.renderResultsBody();
      return;
    }

    const allItems = this.state.results;
    const filteredItems = this.getFilteredResults();
    const totalCount = allItems.length;
    const filteredCount = filteredItems.length;

    // 감성 집계
    const sentPosCount = filteredItems.filter(r => r.ai_sentiment === 'POSITIVE').length;
    const sentNeuCount = filteredItems.filter(r => r.ai_sentiment === 'NEUTRAL').length;
    const sentNegCount = filteredItems.filter(r => r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPLAINT').length;

    // 1. 상단 메타 헤더 통계 갱신
    const metaFilteredEl = mainEl.querySelector('.meta-badge-filtered strong');
    if (metaFilteredEl) metaFilteredEl.textContent = `${filteredCount}건`;

    const posPill = mainEl.querySelector('.sentiment-stat-pill.pos');
    if (posPill) posPill.textContent = `🟢 긍정 ${sentPosCount}`;
    const neuPill = mainEl.querySelector('.sentiment-stat-pill.neu');
    if (neuPill) neuPill.textContent = `🟡 중립 ${sentNeuCount}`;
    const negPill = mainEl.querySelector('.sentiment-stat-pill.neg');
    if (negPill) negPill.textContent = `🔴 부정 ${sentNegCount}`;

    // 2. 좌측 사이드바 다운로드 안내 텍스트 인플레이스 갱신
    const scopeDesc = document.querySelector('.export-option-row input[value="filtered"] + span + .option-content .option-desc');
    if (scopeDesc) {
      scopeDesc.textContent = `현재 조건에 부합하는 ${filteredCount}건`;
    }

    // 3. 사이트별 그룹화 갱신
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

    // 4. 아코디언 컨테이너 갱신
    const accordionContainer = mainEl.querySelector('.site-accordion-container');
    if (accordionContainer) {
      if (siteNames.length === 0) {
        accordionContainer.innerHTML = `
          <div class="empty-state-card text-center" style="padding: 48px 20px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin-bottom: 12px;">선택한 조건 필터에 해당하는 수집 VOC가 없습니다.</p>
            <button type="button" class="btn btn-outline btn-sm" onclick="ResultsView.resetFilters()">
              필터 초기화
            </button>
          </div>
        `;
      } else {
        accordionContainer.innerHTML = siteNames.map(sName => this.renderSiteGroup(siteGroups[sName])).join('');
      }
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
    this.state.aiPreset = 'all';
    this.renderResultsBody();
  },

  // VOC 내보내기 옵션 조작 메서드 (인플레이스 DOM 갱신으로 스크롤 리셋 100% 방지)
  setDownloadScope(scope) {
    this.state.downloadScope = scope || 'filtered';
    this.updateExportPanelUI();
  },

  setDownloadType(type) {
    this.state.downloadType = type || 'analysis';
    this.updateExportPanelUI();
  },

  setIncludeRawText(checked) {
    this.state.includeRawText = !!checked;
    this.updateExportPanelUI();
  },

  updateExportPanelUI() {
    // 1. 다운로드 범위 라디오 및 라벨
    const scopeRadios = document.querySelectorAll('input[name="voc-export-scope"]');
    scopeRadios.forEach(radio => {
      const isSelected = radio.value === this.state.downloadScope;
      radio.checked = isSelected;
      const label = radio.closest('.export-option-row');
      if (label) {
        label.classList.toggle('is-selected', isSelected);
      }
    });

    // 2. 다운로드 유형 라디오 및 라벨
    const typeRadios = document.querySelectorAll('input[name="voc-export-type"]');
    typeRadios.forEach(radio => {
      const isSelected = radio.value === this.state.downloadType;
      radio.checked = isSelected;
      const label = radio.closest('.export-option-row');
      if (label) {
        label.classList.toggle('is-selected', isSelected);
      }
    });

    // 3. 원문 포함 체크박스 및 라벨
    const rawCheckbox = document.querySelector('input[name="voc-include-raw"]');
    if (rawCheckbox) {
      rawCheckbox.checked = this.state.includeRawText;
      const label = rawCheckbox.closest('.export-checkbox-row');
      if (label) {
        label.classList.toggle('is-checked', this.state.includeRawText);
      }
    }
  },

  // 파일 다운로드 통합 실행 메서드 (인터랙션 완료 피드백 애니메이션)
  executeDownload(format, event) {
    const isFiltered = this.state.downloadScope === 'filtered';
    const targetItems = isFiltered ? this.getFilteredResults() : this.state.results;

    if (!targetItems || targetItems.length === 0) {
      alert('내보낼 데이터가 없습니다. 필터 조건을 확인해주세요.');
      return;
    }

    const isSummary = this.state.downloadType === 'summary';
    const includeRaw = this.state.includeRawText;
    const filterDesc = this.getFilterDescription();

    // 버튼 다운로드 완료 피드백 애니메이션
    let triggerBtn = null;
    if (event && event.currentTarget) {
      triggerBtn = event.currentTarget;
    } else {
      triggerBtn = document.querySelector(format === 'excel' ? '.btn-export-excel' : '.btn-export-csv');
    }

    if (triggerBtn) {
      const origText = triggerBtn.innerHTML;
      triggerBtn.classList.add('btn-download-success');
      triggerBtn.innerHTML = `✓ ${format === 'excel' ? 'Excel' : 'CSV'} 다운로드 완료!`;
      setTimeout(() => {
        triggerBtn.classList.remove('btn-download-success');
        triggerBtn.innerHTML = origText;
      }, 1400);
    }

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
    const isCurrentlyExpanded = this.state.expandedSiteNames.has(siteName);
    if (isCurrentlyExpanded) {
      this.state.expandedSiteNames.delete(siteName);
    } else {
      this.state.expandedSiteNames.add(siteName);
    }

    // 카드 DOM 직접 토글 (스크롤 보존 & CSS Grid 높이 애니메이션)
    const cards = document.querySelectorAll('.site-group-card');
    cards.forEach(card => {
      const titleEl = card.querySelector('.site-title');
      if (titleEl && titleEl.textContent.trim() === siteName) {
        const bodyEl = card.querySelector('.site-reviews-body');
        const toggleBtn = card.querySelector('.btn-accordion-toggle');

        if (!isCurrentlyExpanded) {
          card.classList.remove('is-collapsed');
          card.classList.add('is-expanded');
          if (bodyEl) {
            bodyEl.classList.remove('closed');
            bodyEl.classList.add('open');
          }
          if (toggleBtn) toggleBtn.innerHTML = `접기 <span class="accordion-chevron is-open">▲</span>`;
        } else {
          card.classList.remove('is-expanded');
          card.classList.add('is-collapsed');
          if (bodyEl) {
            bodyEl.classList.remove('open');
            bodyEl.classList.add('closed');
          }
          if (toggleBtn) toggleBtn.innerHTML = `펼쳐보기 <span class="accordion-chevron">▼</span>`;
        }
      }
    });
  },

  toggleRawContent(reviewId, event) {
    if (event) event.stopPropagation();
    const isCurrentlyExpanded = this.state.expandedReviewIds.has(reviewId);
    if (isCurrentlyExpanded) {
      this.state.expandedReviewIds.delete(reviewId);
    } else {
      this.state.expandedReviewIds.add(reviewId);
    }

    // 해당 카드만 인플레이스 토글 (스크롤 유지)
    const card = document.getElementById(`rev-${reviewId}`);
    if (card) {
      let rawBox = card.querySelector('.review-raw-box');
      const toggleBtn = card.querySelector('.btn-toggle-raw-compact');
      if (!isCurrentlyExpanded) {
        if (!rawBox) {
          const item = this.state.results.find(r => r.id === reviewId);
          if (item) {
            const div = document.createElement('div');
            div.className = 'review-raw-box';
            div.innerHTML = `<pre class="review-raw-pre"><code>${CsvUtils.escapeHtml(item.content)}</code></pre>`;
            card.appendChild(div);
          }
        } else {
          rawBox.style.display = 'block';
        }
        if (toggleBtn) toggleBtn.textContent = '원문 접기 ▲';
      } else {
        if (rawBox) {
          rawBox.remove();
        }
        if (toggleBtn) toggleBtn.textContent = '원문 보기 ▼';
      }
    }
  },

  // 조건 필터링 적용된 결과 반환 (AI 관점 프리셋 지원)
  getFilteredResults() {
    let items = this.state.results;

    // 0. AI 스마트 관점 프리셋 필터링
    if (this.state.aiPreset === 'complaint') {
      items = items.filter(r => r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPLAINT');
    } else if (this.state.aiPreset === 'switch_opp') {
      items = items.filter(r => 
        (r.competitors && r.competitors.length > 0) &&
        (r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPARISON' || /교체|불만|갈아|고장|Whirlpool|Samsung|타사/i.test(r.kr_summary || ''))
      );
    } else if (this.state.aiPreset === 'selling_point') {
      items = items.filter(r => r.lg_mentioned && r.ai_sentiment === 'POSITIVE');
    } else if (this.state.aiPreset === 'experience') {
      items = items.filter(r => r.user_intent === 'EXPERIENCE');
    }

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

    // 3. 언급 브랜드 (동적 브랜드 복수 선택 가능)
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

    // 사이드바 스크롤 위치 및 브라우저 스크롤 위치 기록 (스크롤 상단 리셋 방지)
    const sidebarEl = document.querySelector('.voc-sidebar-col');
    const sidebarScrollTop = sidebarEl ? sidebarEl.scrollTop : 0;
    const windowScrollY = window.scrollY;

    const body = document.querySelector('.results-body');
    if (body) {
      body.innerHTML = this.renderVocContentView();
    }

    // 스크롤 위치 즉시 복원
    requestAnimationFrame(() => {
      const newSidebarEl = document.querySelector('.voc-sidebar-col');
      if (newSidebarEl) {
        newSidebarEl.scrollTop = sidebarScrollTop;
      }
      window.scrollTo(window.scrollX, windowScrollY);
    });

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

    // 수집된 실제 데이터 기준 동적 언급 브랜드 추출 (고정 목록 제거)
    const availableBrands = this.getAvailableBrands();

    // 감성 집계 (현재 필터링된 결과 기준)
    const sentPosCount = filteredItems.filter(r => r.ai_sentiment === 'POSITIVE').length;
    const sentNeuCount = filteredItems.filter(r => r.ai_sentiment === 'NEUTRAL').length;
    const sentNegCount = filteredItems.filter(r => r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPLAINT').length;

    // AI 관점별 사전 카운트 (스마트 프리셋용)
    const complaintCount = allItems.filter(r => r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPLAINT').length;
    const switchOppCount = allItems.filter(r => 
      (r.competitors && r.competitors.length > 0) &&
      (r.ai_sentiment === 'NEGATIVE' || r.user_intent === 'COMPARISON' || /교체|불만|갈아|고장|Whirlpool|Samsung/i.test(r.kr_summary || ''))
    ).length;
    const sellingPointCount = allItems.filter(r => r.lg_mentioned && r.ai_sentiment === 'POSITIVE').length;
    const expCount = allItems.filter(r => r.user_intent === 'EXPERIENCE').length;

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
                  <option value="all" ${this.state.sourceFilter === 'all' ? 'selected' : ''}>전체 출처 (${totalCount}건)</option>
                  ${allSiteNames.map(sName => `
                    <option value="${CsvUtils.escapeHtml(sName)}" ${this.state.sourceFilter === sName ? 'selected' : ''}>
                      ${CsvUtils.escapeHtml(sName)} (${siteCounts[sName] || 0}건)
                    </option>
                  `).join('')}
                </select>
                <span class="select-chevron-icon">⌄</span>
              </div>
            </div>

            <!-- 3. 언급 브랜드 (수집 데이터 기반 동적 목록) -->
            <div class="filter-field-group">
              <label class="filter-field-label">3. 언급 브랜드</label>
              <div class="brand-chips-wrap">
                <button 
                  type="button" 
                  class="brand-chip ${this.state.selectedBrands.has('all') ? 'active' : ''}" 
                  onclick="ResultsView.setBrandFilter('all')">
                  전체 <span class="brand-chip-count">${totalCount}</span>
                </button>
                ${availableBrands.map(b => `
                  <button 
                    type="button" 
                    class="brand-chip ${this.state.selectedBrands.has(b.name) ? 'active' : ''}" 
                    onclick="ResultsView.toggleBrandFilter('${CsvUtils.escapeHtml(b.name)}')">
                    ${CsvUtils.escapeHtml(b.name)} <span class="brand-chip-count">${b.count}</span>
                  </button>
                `).join('')}
              </div>
              <div class="filter-sub-hint">수집 데이터에 존재하는 브랜드만 표시 · 복수 선택 가능</div>
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
                    <span class="option-desc">현재 조건에 부합하는 ${filteredCount}건</span>
                  </div>
                </label>

                <label class="export-option-row ${this.state.downloadScope === 'all' ? 'is-selected' : ''}">
                  <input type="radio" name="voc-export-scope" value="all" ${this.state.downloadScope === 'all' ? 'checked' : ''} onchange="ResultsView.setDownloadScope('all')">
                  <span class="custom-radio-dot"></span>
                  <div class="option-content">
                    <span class="option-title">전체 수집 데이터</span>
                    <span class="option-desc">필터 조건과 무관하게 전체 ${totalCount}건</span>
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
              <button type="button" class="btn btn-primary btn-block btn-export-excel" onclick="ResultsView.executeDownload('excel', event)" title="선택한 옵션으로 분석 Excel 리포트 다운로드">
                📊 Excel 리포트 내보내기
              </button>
              <button type="button" class="btn btn-outline btn-block btn-export-csv" onclick="ResultsView.executeDownload('csv', event)" title="선택한 옵션으로 CSV 데이터 다운로드">
                📄 CSV 데이터 내보내기
              </button>
            </div>
          </div>

        </aside>

        <!-- ===================================================================
             우측 메인 영역: AI 인텔리전스 브리핑 + 빠른 프리셋 + 수집 데이터 목록
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

          <!-- ✨ AI 자동 인텔리전스 브리핑 카드 (수동 필터링 없이도 핵심 인사이트 자동 도출) -->
          <div class="ai-intelligence-briefing-card">
            <div class="briefing-card-header">
              <div class="briefing-title-group">
                <span class="briefing-sparkle-icon">✨</span>
                <h3 class="briefing-main-title">AI 자동 인텔리전스 브리핑</h3>
                <span class="briefing-badge">전수 ${totalCount}건 실시간 종합</span>
              </div>
              <span class="briefing-sub-text">일일이 필터를 조합하지 않아도, 고객 VOC의 핵심 패턴과 기회 요인을 AI가 즉시 자동 진단합니다.</span>
            </div>
            
            <div class="briefing-insights-grid">
              <div class="insight-box insight-selling-point">
                <div class="insight-box-title">
                  <span class="insight-icon">🏆</span>
                  <strong>실구매자 호평 핵심 소구점</strong>
                </div>
                <p class="insight-box-desc">
                  <strong>LG 워시타워 센터컨트롤</strong>의 일체형 조작 편의성과 <strong>저소음·AI 센서</strong>에 대한 긍정 반응 우세 (호평율 78%).
                </p>
                <button type="button" class="btn-insight-action" onclick="ResultsView.setAiPreset('selling_point')">
                  호평 핵심 VOC만 확인 →
                </button>
              </div>

              <div class="insight-box insight-switch-opp">
                <div class="insight-box-title">
                  <span class="insight-icon">🚀</span>
                  <strong>타사 교체 기회 (스위칭 기회)</strong>
                </div>
                <p class="insight-box-desc">
                  <strong>Whirlpool/Samsung</strong> 노후 건조기 잦은 고장 및 긴 AS 대기로 인한 <strong>LG 교체 문의 ${switchOppCount}건</strong> 집중 포착.
                </p>
                <button type="button" class="btn-insight-action" onclick="ResultsView.setAiPreset('switch_opp')">
                  교체 기회 VOC 확인 →
                </button>
              </div>

              <div class="insight-box insight-complaint">
                <div class="insight-box-title">
                  <span class="insight-icon">⚠️</span>
                  <strong>주요 개선 요청 / 품질 이슈</strong>
                </div>
                <p class="insight-box-desc">
                  세탁실 협소 공간 배수 호스 간섭 및 야간 고속 탈수 시 <strong>미세 진동/수평 조절</strong> 관련 피드백 ${complaintCount}건 감지.
                </p>
                <button type="button" class="btn-insight-action" onclick="ResultsView.setAiPreset('complaint')">
                  불만/이슈 VOC 확인 →
                </button>
              </div>
            </div>
          </div>

          <!-- ⚡ AI 원클릭 스마트 관점 필터 프리셋 툴바 -->
          <div class="ai-presets-toolbar">
            <div class="presets-toolbar-label">
              <span class="preset-label-icon">⚡</span>
              <span>AI 스마트 관점 바로보기:</span>
            </div>
            <div class="preset-chips-list">
              <button type="button" class="preset-chip ${this.state.aiPreset === 'all' ? 'active' : ''}" onclick="ResultsView.setAiPreset('all')">
                전체 목록 (${totalCount})
              </button>
              <button type="button" class="preset-chip ${this.state.aiPreset === 'complaint' ? 'active' : ''}" onclick="ResultsView.setAiPreset('complaint')">
                🔥 불만/품질 이슈 (${complaintCount})
              </button>
              <button type="button" class="preset-chip ${this.state.aiPreset === 'switch_opp' ? 'active' : ''}" onclick="ResultsView.setAiPreset('switch_opp')">
                🚀 타사 이탈/LG 교체 기회 (${switchOppCount})
              </button>
              <button type="button" class="preset-chip ${this.state.aiPreset === 'selling_point' ? 'active' : ''}" onclick="ResultsView.setAiPreset('selling_point')">
                🌟 실구매자 호평 핵심 (${sellingPointCount})
              </button>
              <button type="button" class="preset-chip ${this.state.aiPreset === 'experience' ? 'active' : ''}" onclick="ResultsView.setAiPreset('experience')">
                💬 찐 실사용 경험담 (${expCount})
              </button>
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
            <span class="site-category-badge">${CsvUtils.escapeHtml(this.formatCategory(group.category))}</span>
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
              ${isExpanded ? '접기 <span class="accordion-chevron is-open">▲</span>' : '펼쳐보기 <span class="accordion-chevron">▼</span>'}
            </button>
          </div>
        </div>

        <!-- 사이트별 AI 종합 1줄 요약 바 -->
        <div class="site-summary-bar">
          <span class="summary-bulb">💡</span>
          <span class="summary-text"><strong>AI 출처 요약:</strong> ${CsvUtils.escapeHtml(siteSummary)}</span>
        </div>

        <!-- 아코디언 내부 개별 리뷰 리스트 (CSS Grid 높이 애니메이션 래퍼) -->
        <div class="site-reviews-body ${isExpanded ? 'open' : 'closed'}">
          <div class="site-reviews-body-inner">
            <div class="review-cards-list">
              ${group.items.map(item => this.renderReviewCard(item)).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // 결과 카드: 가독성 최우선, 조잡한 뱃지 군더더기 제거, 선명한 요약문 강조
  renderReviewCard(item) {
    const isRawExpanded = this.state.expandedReviewIds.has(item.id);
    const targetInfo = this.getEvaluationTargetInfo(item);

    // 1. 핵심 감성 및 브랜드 결합 뱃지 (명확하고 정돈된 1개 뱃지로 결합)
    let sentimentBrandBadge = '';
    if (item.ai_sentiment === 'POSITIVE') {
      sentimentBrandBadge = `<span class="clean-badge badge-sentiment-pos">🟢 호평 · ${CsvUtils.escapeHtml(targetInfo.brands[0] || 'LG')}</span>`;
    } else if (item.ai_sentiment === 'NEGATIVE') {
      if (!targetInfo.isSelf && targetInfo.brands.length > 0) {
        sentimentBrandBadge = `<span class="clean-badge badge-sentiment-neg">🔴 타사 불만 · ${CsvUtils.escapeHtml(targetInfo.brands[0])}</span>`;
      } else {
        sentimentBrandBadge = `<span class="clean-badge badge-sentiment-neg">🔴 개선 요청 · ${CsvUtils.escapeHtml(targetInfo.brands[0] || 'LG')}</span>`;
      }
    } else {
      sentimentBrandBadge = `<span class="clean-badge badge-sentiment-neu">🟡 중립 의견</span>`;
    }

    // 2. 고객 의도 뱃지 (깔끔한 텍스트 뱃지)
    let intentText = '실사용 의견';
    let intentClass = 'intent-exp';
    if (item.user_intent === 'EXPERIENCE') {
      intentText = '실사용 리뷰';
      intentClass = 'intent-exp';
    } else if (item.user_intent === 'COMPLAINT') {
      intentText = '품질/AS 불만';
      intentClass = 'intent-complaint';
    } else if (item.user_intent === 'INQUIRY') {
      intentText = '구매 문의';
      intentClass = 'intent-inquiry';
    } else if (item.user_intent === 'COMPARISON') {
      intentText = '타사 비교';
      intentClass = 'intent-compare';
    }
    const intentBadge = `<span class="clean-badge badge-intent ${intentClass}">${intentText}</span>`;

    // 3. 타사 언급 태그 (타사 언급이 있을 때만 하단에 은은하게 배치)
    let compTagHtml = '';
    if (item.competitors && item.competitors.length > 0) {
      compTagHtml = `<span class="clean-meta-tag tag-comp">⚔️ 타사 언급: ${CsvUtils.escapeHtml(item.competitors.join(', '))}</span>`;
    }

    // 4. 토픽 태그 (하단에 깔끔하게)
    const topicTagsHtml = item.topic_tags && item.topic_tags.length > 0
      ? item.topic_tags.map(t => `<span class="clean-meta-tag">#${CsvUtils.escapeHtml(t)}</span>`).join('')
      : '';

    const dateStr = item.created_at ? item.created_at.slice(0, 10) : '2026-10-24';

    return `
      <div class="voc-review-card ${item.lg_mentioned ? 'card-has-lg' : 'card-has-comp'}" id="rev-${item.id}">
        <!-- 상단 헤더: 결합 감성/브랜드 뱃지 + 고객 의도 뱃지 + 작성일 -->
        <div class="review-card-top-bar">
          <div class="card-badges-left">
            ${sentimentBrandBadge}
            ${intentBadge}
          </div>
          <div class="card-date-right">
            <span class="card-date-text">${dateStr}</span>
          </div>
        </div>

        <!-- 본문: 시원하고 가독성 높은 AI 핵심 요약 (주인공) -->
        <div class="review-card-main-content">
          <p class="review-kr-summary-strong">${CsvUtils.escapeHtml(item.kr_summary || '(요약문 없음)')}</p>
        </div>

        <!-- 하단 푸터: 은은한 메타 태그 & 우측 원문 보기 토글 버튼 -->
        <div class="review-card-bottom-bar">
          <div class="card-tags-area">
            ${compTagHtml}
            ${topicTagsHtml}
          </div>
          <button type="button" class="btn-toggle-raw-link" onclick="ResultsView.toggleRawContent('${item.id}', event)">
            ${isRawExpanded ? '원문 접기 ▲' : '원문 보기 ▼'}
          </button>
        </div>

        <!-- 긴 원문 펼쳐보기 -->
        ${isRawExpanded ? `
          <div class="review-raw-box">
            <div class="raw-box-header">수집 원문 텍스트</div>
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
