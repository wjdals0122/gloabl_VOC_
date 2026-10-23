/**
 * dashboard/js/views/source_view.js
 * 1단계: 출처 탐색 및 선택 화면 뷰 모듈
 * 
 * [표시 규칙 엄격 준수]
 * 1. category는 유형 배지로 표시
 * 2. description은 한 줄 설명으로 표시 (없으면 '사이트 설명 미확인'으로 표시, 임의 날조 절대 금지)
 * 3. product_match, review_status, review_count 없으면 각각 '미확인'으로 표시
 * 4. Google 검색 연동 확인 전까지 실제 모드에서는 'Google 검색 결과' 대신 '후보 출처'로 표시
 * 5. 실제 모드에서 API 미분리 시 '출처 탐색 API 연결 필요' 경고 배너 명시
 */

const SourceView = {
  containerId: 'view-sources-content',
  
  // 현재 뷰 상태
  state: {
    country: 'US',
    product: 'LG CordZero A9X',
    discoveredSources: [],
    selectedSourceIds: new Set(),
    isSearching: false,
    apiErrorNotice: null
  },

  init() {
    this.bindEvents();
    // 초기 로드 시 데모 모드이면 시뮬레이션 출처 1차 탐색
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
    }

    // 추천 제품 클릭 칩
    document.querySelectorAll('.product-suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prod = chip.dataset.product;
        if (prod) {
          const pInput = document.getElementById('input-product');
          if (pInput) pInput.value = prod;
          this.state.product = prod;
          this.handleSearch();
        }
      });
    });

    // 출처 목록 CSV 다운로드 버튼
    const downloadSourcesBtn = document.getElementById('btn-download-sources-csv');
    if (downloadSourcesBtn) {
      downloadSourcesBtn.addEventListener('click', () => this.downloadSourcesCsv());
    }

    // 선택 출처 수집 단계로 이동 버튼
    const proceedBtn = document.getElementById('btn-proceed-collection');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => this.proceedToCollection());
    }
  },

  async handleSearch() {
    const country = this.state.country || 'US';
    const product = this.state.product ? this.state.product.trim() : 'LG CordZero A9X';

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
      this.state.apiErrorNotice = e.message || '출처 탐색 중 예외가 발생했습니다.';
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
    const filename = `voc_target_sites_${this.state.country}_${this.state.product.replace(/\s+/g, '_')}.csv`;
    CsvUtils.downloadCsvText(csv, filename);
  },

  proceedToCollection() {
    const selected = this.getSelectedSources();
    if (selected.length === 0) {
      alert('수집을 진행할 출처를 최소 1개 이상 선택해주세요.');
      return;
    }

    // 전역 상태에 선택 정보 전달 후 수집 탭으로 전환
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

    // 모드에 따른 헤더 표기 규칙
    // 실제 모드: '후보 출처' (Google 검색 결과라는 명칭 사용 금지)
    // 데모 모드: '[시뮬레이션] 후보 출처 목록'
    const sectionTitle = AppConfig.isDemoMode
      ? '<span class="demo-tag">[시뮬레이션]</span> 후보 출처 목록'
      : '후보 출처 목록 <span class="sub-tag">(AI 탐색 기반 후보지)</span>';

    // API 미연결 안내 배너
    let bannerHtml = '';
    if (this.state.apiErrorNotice) {
      bannerHtml = `
        <div class="api-warning-banner" role="alert">
          <div class="warning-icon">⚠️</div>
          <div class="warning-content">
            <h4>${CsvUtils.escapeHtml(this.state.apiErrorNotice)}</h4>
            <p>현재 n8n 워크플로우는 <strong>후보지 생성부터 수집까지 단일 Webhook</strong>으로 묶여 있어 '출처 탐색'에 직접 연결하면 전체 스크래핑이 자동 실행됩니다.<br>
            팀원이 <code>POST /webhook/discover-voc-sources</code> 엔드포인트를 분리 배포할 때까지 실제 모드에서는 탐색 호출을 보호합니다. 상단에서 <strong>[데모 모드]</strong>로 전환하시면 출처 선택 흐름을 시연해보실 수 있습니다.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="App.toggleDemoMode(true)">데모 모드로 전환하여 테스트</button>
        </div>
      `;
    }

    if (this.state.isSearching) {
      container.innerHTML = `
        ${bannerHtml}
        <div class="loading-state-box">
          <div class="spinner"></div>
          <p>현지 후보 출처 목록을 탐색 중입니다...</p>
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
          <td colspan="8" class="empty-cell">
            ${this.state.apiErrorNotice ? '출처 탐색 API 연동 대기 중입니다.' : '조건에 맞는 후보 출처를 탐색해주세요.'}
          </td>
        </tr>
      `;
    } else {
      tableRowsHtml = sources.map((s, idx) => {
        const id = s.source_id || `src_${idx}`;
        const isChecked = this.state.selectedSourceIds.has(id);
        
        // 규칙 1: 사이트명 옆에 category 유형 배지 표시
        const categoryBadge = `<span class="badge badge-category">${CsvUtils.escapeHtml(s.category || 'Review/Community')}</span>`;
        
        // 규칙 2: description 없으면 '사이트 설명 미확인' 표기 (임의 날조 금지)
        const descText = s.description 
          ? `<span class="desc-text">${CsvUtils.escapeHtml(s.description)}</span>`
          : `<span class="desc-unverified">사이트 설명 미확인</span>`;

        // 규칙 3: product_match, review_status, review_count 없으면 각각 '미확인' 표기
        const matchBadge = s.product_match 
          ? `<span class="badge badge-success">${CsvUtils.escapeHtml(s.product_match)}</span>` 
          : `<span class="badge badge-unverified">미확인</span>`;

        const statusBadge = s.review_status 
          ? `<span class="badge badge-info">${CsvUtils.escapeHtml(s.review_status)}</span>` 
          : `<span class="badge badge-unverified">미확인</span>`;

        const countBadge = s.review_count 
          ? `<span class="badge badge-neutral">${CsvUtils.escapeHtml(s.review_count)}</span>` 
          : `<span class="badge badge-unverified">미확인</span>`;

        return `
          <tr class="${isChecked ? 'row-selected' : ''}">
            <td class="col-checkbox">
              <input type="checkbox" id="chk-${id}" ${isChecked ? 'checked' : ''} onchange="SourceView.toggleSource('${id}', this.checked)">
            </td>
            <td class="col-site">
              <div class="site-header">
                <strong>${CsvUtils.escapeHtml(s.site_name || 'Site')}</strong>
                ${categoryBadge}
              </div>
            </td>
            <td class="col-url">
              <a href="${CsvUtils.escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="link-external" title="원본 사이트 열기">
                ${CsvUtils.escapeHtml(s.url)}
                <span class="ext-icon">↗</span>
              </a>
            </td>
            <td class="col-desc">
              ${descText}
            </td>
            <td class="col-meta text-center">${matchBadge}</td>
            <td class="col-meta text-center">${statusBadge}</td>
            <td class="col-meta text-center">${countBadge}</td>
          </tr>
        `;
      }).join('');
    }

    container.innerHTML = `
      ${bannerHtml}
      
      <div class="source-list-card glass-panel">
        <div class="card-header-flex">
          <div class="header-left">
            <h3 class="section-title">${sectionTitle}</h3>
            <span class="selection-counter">선택된 출처: <strong>${selectedCount}</strong> / ${totalCount}개</span>
          </div>
          <div class="header-right">
            <button class="btn btn-outline btn-sm" id="btn-download-sources-csv" ${totalCount === 0 ? 'disabled' : ''}>
              📥 출처 목록 CSV 다운로드
            </button>
            <button class="btn btn-primary btn-sm" id="btn-proceed-collection" ${selectedCount === 0 ? 'disabled' : ''}>
              🚀 선택 출처 수집 단계로 이동 (${selectedCount}개)
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="voc-data-table">
            <thead>
              <tr>
                <th class="col-checkbox">
                  <input type="checkbox" id="chk-master" ${isAllSelected ? 'checked' : ''} ${totalCount === 0 ? 'disabled' : ''} onchange="SourceView.toggleSelectAll(this.checked)">
                </th>
                <th class="col-site">출처 사이트명 & 유형</th>
                <th class="col-url">수집 대상 URL</th>
                <th class="col-desc">사이트 한 줄 설명</th>
                <th class="col-meta text-center">제품 일치</th>
                <th class="col-meta text-center">리뷰 존재</th>
                <th class="col-meta text-center">리뷰 수</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>

        <div class="card-footer-note">
          <p>ℹ️ <strong>출처 정보 필터링 안내</strong>: 실제 n8n 워크플로우에 <code>selected_sources</code> 파라미터가 수신되면, 여기서 체크된 URL 목록만 선별 스크래핑을 수행합니다. 미확인 항목은 백엔드 크롤러가 사이트 접속 후 정밀 판정하기 전까지 임의로 추정하지 않습니다.</p>
        </div>
      </div>
    `;

    // 이벤트 재바인딩
    const reDownloadBtn = document.getElementById('btn-download-sources-csv');
    if (reDownloadBtn) reDownloadBtn.addEventListener('click', () => this.downloadSourcesCsv());

    const reProceedBtn = document.getElementById('btn-proceed-collection');
    if (reProceedBtn) reProceedBtn.addEventListener('click', () => this.proceedToCollection());
  }
};
