/**
 * dashboard/js/views/source_view.js
 * 1단계: 출처 탐색 및 선택 화면 뷰 모듈
 * 
 * [요구사항 반영]
 * 1. 추천 키워드 및 버튼 완전 제거
 * 2. 제품 일치, 리뷰 존재, 리뷰 수 3개 열 완전 제거
 * 3. 4대 핵심 열 구성: 선택 / 사이트명 및 유형 / 사이트 설명 / 원문 링크
 * 4. 사이트명은 굵고 선명하게 (배경 검은 띠 제거), 사이트 유형은 차분한 보조 텍스트로 바로 아래 배치
 * 5. 사이트 설명은 충분한 너비와 자연스러운 줄바꿈, 미등록 시 '설명 미등록' 표기
 * 6. 원문 링크는 '페이지 열기 ↗'로 표시, 마우스 호버 시 전체 URL 툴팁 제공
 * 7. 목록 상단: '수집할 출처 선택', '전체 N개 중 M개 선택됨', 우측 '출처 목록 다운로드'
 * 8. 목록 하단 우측: '총 N개 선택됨' 문구와 '선택한 출처로 다음 단계' 주요 버튼
 */

const SourceView = {
  containerId: 'view-sources-content',

  state: {
    country: 'US',
    product: 'LG OLED evo G4',
    discoveredSources: [],
    selectedSourceIds: new Set(),
    isSearching: false,
    apiErrorNotice: null
  },

  init() {
    this.bindEvents();
    if (AppConfig.isDemoMode) {
      this.handleSearch();
    } else {
      this.state.apiErrorNotice = '출처 탐색 API 연결 필요 (백엔드에서 discoverSources 엔드포인트 분리 작업 진행 중)';
      this.render();
    }
  },

  bindEvents() {
    const searchBtn = document.getElementById('btn-discover-sources');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.handleSearch());
    }

    const instantBtn = document.getElementById('btn-instant-collect');
    if (instantBtn) {
      instantBtn.addEventListener('click', () => this.handleInstantCollect());
    }

    const countrySelect = document.getElementById('input-country');
    if (countrySelect) {
      countrySelect.addEventListener('change', (e) => {
        this.state.country = e.target.value;
      });
    }

    const productInput = document.getElementById('input-product');
    if (productInput) {
      productInput.addEventListener('input', (e) => {
        this.state.product = e.target.value;
      });
      // 엔터키 입력 시 검색 실행
      productInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleSearch();
        }
      });
    }
  },

  handleInstantCollect() {
    const country = this.state.country || 'US';
    const product = this.state.product ? this.state.product.trim() : 'LG OLED evo G4';

    // 2단계 결과 탭으로 이동 후 즉시 n8n Webhook 일괄 수집 시작
    App.navigateToTab('tab-results');
    ResultsView.startInstantCollection(country, product);
  },

  async handleSearch() {
    const country = this.state.country || 'US';
    const product = this.state.product ? this.state.product.trim() : 'LG OLED evo G4';

    this.state.isSearching = true;
    this.state.apiErrorNotice = null;
    this.render();

    try {
      const res = await VocApiClient.discoverSources(country, product);

      if (res.success) {
        this.state.discoveredSources = res.sources || [];
        // 기본적으로 전체 출처 선택
        this.state.selectedSourceIds = new Set(this.state.discoveredSources.map((s, idx) => s.source_id || `src_${idx}`));
        this.state.apiErrorNotice = null;
      } else {
        this.state.discoveredSources = [];
        this.state.selectedSourceIds = new Set();
        this.state.apiErrorNotice = res.message || '출처 탐색 API 연결 필요';
      }
    } catch (e) {
      this.state.discoveredSources = [];
      this.state.selectedSourceIds = new Set();
      this.state.apiErrorNotice = e.message || '출처 탐색 중 오류가 발생했습니다.';
    } finally {
      this.state.isSearching = false;
      this.render();
    }
  },

  toggleSelectAll(checked) {
    if (checked) {
      this.state.selectedSourceIds = new Set(this.state.discoveredSources.map((s, idx) => s.source_id || `src_${idx}`));
    } else {
      this.state.selectedSourceIds.clear();
    }
    this.render();
  },

  toggleSource(id, checked) {
    if (checked) {
      this.state.selectedSourceIds.add(id);
    } else {
      this.state.selectedSourceIds.delete(id);
    }
    this.render();
  },

  downloadSourcesCsv() {
    if (this.state.discoveredSources.length === 0) {
      alert('다운로드할 출처 목록 데이터가 없습니다.');
      return;
    }
    const csv = CsvUtils.generateSourcesCsv(this.state.country, this.state.product, this.state.discoveredSources);
    const filename = `voc_sources_${this.state.country}_${this.state.product.replace(/\s+/g, '_')}.csv`;
    CsvUtils.downloadCsvText(csv, filename);
  },

  proceedToCollection() {
    const selected = this.getSelectedSources();
    if (selected.length === 0) {
      alert('수집할 출처를 최소 1개 이상 선택해주세요.');
      return;
    }

    App.navigateToTab('tab-results', {
      country: this.state.country,
      product: this.state.product,
      selectedSources: selected
    });
  },

  getSelectedSources() {
    return this.state.discoveredSources.filter((s, idx) => {
      const id = s.source_id || `src_${idx}`;
      return this.state.selectedSourceIds.has(id);
    });
  },

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // 실제 모드 API 미연결 안내 배너
    let bannerHtml = '';
    if (this.state.apiErrorNotice) {
      bannerHtml = `
        <div class="api-notice-bar" role="alert">
          <div class="notice-icon">ℹ️</div>
          <div class="notice-text">
            <strong>${CsvUtils.escapeHtml(this.state.apiErrorNotice)}</strong>
            <p>백엔드에서 탐색 및 수집 엔드포인트 분리 배포 전까지 실제 모드에서는 조회를 보류합니다. 상단 우측 [설정]에서 데모 모드로 전환하시면 전체 수집 흐름을 시연해보실 수 있습니다.</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="App.toggleDemoMode(true)">데모 모드로 전환</button>
        </div>
      `;
    }

    if (this.state.isSearching) {
      container.innerHTML = `
        ${bannerHtml}
        <div class="loading-state-card">
          <div class="spinner"></div>
          <p>후보 출처를 탐색하고 있습니다...</p>
        </div>
      `;
      return;
    }

    const sources = this.state.discoveredSources;
    const totalCount = sources.length;
    const selectedCount = this.state.selectedSourceIds.size;
    const isAllSelected = totalCount > 0 && selectedCount === totalCount;

    let tableRowsHtml = '';
    if (totalCount === 0) {
      tableRowsHtml = `
        <tr>
          <td colspan="4" class="empty-cell">
            ${this.state.apiErrorNotice ? '출처 탐색 API 연결 대기 중입니다.' : '조건을 입력하고 [출처 찾기]를 클릭하세요.'}
          </td>
        </tr>
      `;
    } else {
      tableRowsHtml = sources.map((s, idx) => {
        const id = s.source_id || `src_${idx}`;
        const isChecked = this.state.selectedSourceIds.has(id);
        
        // 사이트 유형 (한국어 보조 텍스트)
        const categoryLabel = s.category || '기타 웹사이트';
        
        // 사이트 설명 (설명 없으면 '설명 미등록')
        const descText = s.description 
          ? `<span class="site-desc-text">${CsvUtils.escapeHtml(s.description)}</span>`
          : `<span class="site-desc-empty">설명 미등록</span>`;

        return `
          <tr class="${isChecked ? 'row-selected' : ''}">
            <td class="col-checkbox">
              <input type="checkbox" id="chk-${id}" ${isChecked ? 'checked' : ''} onchange="SourceView.toggleSource('${id}', this.checked)" aria-label="${CsvUtils.escapeHtml(s.site_name)} 선택">
            </td>
            <td class="col-site-info">
              <div class="site-name-wrap">
                <span class="site-name">${CsvUtils.escapeHtml(s.site_name || '사이트')}</span>
                <span class="site-category">${CsvUtils.escapeHtml(categoryLabel)}</span>
              </div>
            </td>
            <td class="col-site-desc">
              ${descText}
            </td>
            <td class="col-site-link">
              <a href="${CsvUtils.escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="link-open-page" title="${CsvUtils.escapeHtml(s.url)}">
                페이지 열기 ↗
              </a>
            </td>
          </tr>
        `;
      }).join('');
    }

    container.innerHTML = `
      ${bannerHtml}

      <div class="source-table-card">
        <!-- 테이블 상단 헤더: 제목, 카운터, CSV 다운로드 버튼 -->
        <div class="table-top-bar">
          <div class="top-bar-left">
            <h2 class="table-title">수집할 출처 선택</h2>
            <span class="selection-summary">전체 ${totalCount}개 중 <strong>${selectedCount}개</strong> 선택됨</span>
          </div>
          <div class="top-bar-right">
            <button type="button" class="btn btn-outline btn-sm" id="btn-download-sources-csv" ${totalCount === 0 ? 'disabled' : ''}>
              출처 목록 다운로드
            </button>
          </div>
        </div>

        <!-- 4대 핵심 정보 테이블: 선택 / 사이트명 및 유형 / 사이트 설명 / 원문 링크 -->
        <div class="table-responsive">
          <table class="voc-data-table">
            <thead>
              <tr>
                <th class="col-checkbox">
                  <input type="checkbox" id="chk-master" ${isAllSelected ? 'checked' : ''} ${totalCount === 0 ? 'disabled' : ''} onchange="SourceView.toggleSelectAll(this.checked)" aria-label="전체 출처 선택">
                </th>
                <th class="col-site-info">사이트명 및 유형</th>
                <th class="col-site-desc">사이트 설명</th>
                <th class="col-site-link">원문</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- 테이블 하단 바: 하단 우측 '총 N개 선택됨' 및 '선택한 출처로 다음 단계' 버튼 -->
        <div class="table-bottom-bar">
          <div class="bottom-bar-left">
            <span class="bottom-note">※ 선택된 사이트에 대해서만 VOC 원문 텍스트 수집이 진행됩니다.</span>
          </div>
          <div class="bottom-bar-right">
            <span class="bottom-counter">총 <strong>${selectedCount}개</strong> 선택됨</span>
            <button type="button" class="btn btn-primary" id="btn-proceed-collection" ${selectedCount === 0 ? 'disabled' : ''}>
              선택한 출처로 다음 단계
            </button>
          </div>
        </div>
      </div>
    `;

    // 이벤트 바인딩
    const downloadBtn = document.getElementById('btn-download-sources-csv');
    if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadSourcesCsv());

    const proceedBtn = document.getElementById('btn-proceed-collection');
    if (proceedBtn) proceedBtn.addEventListener('click', () => this.proceedToCollection());
  }
};
