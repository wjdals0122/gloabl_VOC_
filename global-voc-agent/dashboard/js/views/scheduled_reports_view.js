/**
 * dashboard/js/views/scheduled_reports_view.js
 * 정기 리포트 예약 및 자동 이메일 발송 관리 뷰
 * 
 * [피그마 최종 디자인 반영]
 * 1. 헤더 안내 배지 제거 및 문구 개행/단어 정밀 반영
 * 2. 신규 등록 카드: 스텝 넘버 제거, 옵션 문구 간소화 ('AI 요약 및 분석'), 우측 정렬 버튼 ('정기 리포트 예약 등록')
 * 3. 관리 내역 영역: 외부 섹션 헤더 배치, 스텝 넘버 제거, 우측 상태 배지
 * 4. 테이블 셀: 토글 스위치 단독 노출, 발송 주기 2줄 표시, 다음 실행 블루 필 2줄 표시, 아이콘 정돈
 * 5. 로컬스토리지 영구 보관 및 실시간 테스트 발송 시뮬레이션
 */

const ScheduledReportsView = {
  storageKey: 'voc_scheduled_reports',

  // 피그마 디자인 기준 기본 샘플 데이터
  defaultData: [
    {
      id: 'rep-lg-001',
      country: 'US',
      countryName: '미국 (US)',
      product: 'LG OLED evo G4',
      scheduleLine1: '매주 월요일 오전',
      scheduleLine2: '09:00 (KST)',
      frequency: 'weekly',
      emails: ['global-voc@lge.com', 'us-tv-pm@lge.com'],
      includeAiSummary: true,
      includeCsvAttachment: true,
      isActive: true,
      lastRunDate: '2026-10-20 09:00 (발송',
      lastRunStatusText: '완료)',
      nextRunDate: '2026-10-27 (월)',
      nextRunTime: '09:00',
      createdAt: '2026-10-14'
    },
    {
      id: 'rep-lg-002',
      country: 'DE',
      countryName: '독일 (DE)',
      product: 'LG gram Pro 16',
      scheduleLine1: '매주 월요일 오전',
      scheduleLine2: '09:00 (KST)',
      frequency: 'weekly',
      emails: ['eu-pc-marketing@lge.com'],
      includeAiSummary: true,
      includeCsvAttachment: true,
      isActive: true,
      lastRunDate: '2026-10-20 09:00 (발송',
      lastRunStatusText: '완료)',
      nextRunDate: '2026-10-27 (월)',
      nextRunTime: '09:00',
      createdAt: '2026-10-18'
    }
  ],

  state: {
    reports: [],
    isSubmitting: false,
    testingId: null,
    toastMessage: null,
    toastType: 'success',
    toastTimer: null
  },

  init() {
    this.loadFromStorage();
    this.updateHeaderBadge();
    this.render();
  },

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        this.state.reports = JSON.parse(raw);
      } else {
        this.state.reports = JSON.parse(JSON.stringify(this.defaultData));
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('[ScheduledReportsView] 로컬스토리지 로드 실패, 기본값 사용', e);
      this.state.reports = JSON.parse(JSON.stringify(this.defaultData));
    }
  },

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state.reports));
      this.updateHeaderBadge();
    } catch (e) {
      console.warn('[ScheduledReportsView] 로컬스토리지 저장 실패', e);
    }
  },

  updateHeaderBadge() {
    const badge = document.getElementById('nav-scheduled-badge');
    if (!badge) return;
    const activeCount = this.state.reports.filter(r => r.isActive).length;
    badge.textContent = activeCount;
    badge.style.display = activeCount > 0 ? 'inline-flex' : 'none';
  },

  showToast(message, type = 'success') {
    if (this.state.toastTimer) clearTimeout(this.state.toastTimer);
    this.state.toastMessage = message;
    this.state.toastType = type;
    this.renderToast();

    this.state.toastTimer = setTimeout(() => {
      this.state.toastMessage = null;
      this.renderToast();
    }, 3800);
  },

  renderToast() {
    let toastEl = document.getElementById('scheduled-toast-container');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'scheduled-toast-container';
      toastEl.className = 'scheduled-toast-container';
      document.body.appendChild(toastEl);
    }

    if (!this.state.toastMessage) {
      toastEl.innerHTML = '';
      toastEl.style.display = 'none';
      return;
    }

    toastEl.style.display = 'block';
    const icon = this.state.toastType === 'success' ? '✅' : (this.state.toastType === 'error' ? '⚠️' : 'ℹ️');
    toastEl.innerHTML = `
      <div class="scheduled-toast ${this.state.toastType}">
        <span class="toast-icon">${icon}</span>
        <span class="toast-text">${CsvUtils.escapeHtml(this.state.toastMessage)}</span>
      </div>
    `;
  },

  render() {
    const container = document.getElementById('view-scheduled-content');
    if (!container) return;

    const activeCount = this.state.reports.filter(r => r.isActive).length;
    const totalCount = this.state.reports.length;

    container.innerHTML = `
      <!-- 헤더 및 기능 안내 (피그마: 상단 배지 제거, 2줄 서브텍스트) -->
      <div class="scheduled-hero-header">
        <h2 class="scheduled-hero-title">정기 리포트 예약 및 자동 발송</h2>
        <p class="scheduled-hero-subtitle">
          국가와 제품을 설정하면, 매주 정해진 시간에 글로벌 VOC를 자동 수집·분석해<br>
          담당자 이메일로 리포트를 발송합니다.
        </p>
      </div>

      <!-- 상단: 신규 정기 예약 등록 폼 카드 (피그마: 스텝 넘버 제거, 구분선 제거, 우측 정렬 버튼) -->
      <div class="scheduled-card scheduled-form-card">
        <div class="form-card-header">
          <h3 class="card-section-title">신규 정기 리포트 등록</h3>
          <p class="card-section-desc">지정한 일정에 맞춰 백그라운드 크롤링 및 AI 분석 리포트 생성이 실행됩니다.</p>
        </div>

        <form id="form-new-schedule" class="schedule-form" onsubmit="ScheduledReportsView.handleRegister(event)">
          <div class="schedule-form-grid">
            <!-- 1. 대상 국가 -->
            <div class="form-field">
              <label class="field-label" for="sched-country">수집 대상 국가 <span class="required">*</span></label>
              <select id="sched-country" class="input-select" required>
                <option value="US" selected>미국 (US)</option>
                <option value="DE">독일 (DE)</option>
                <option value="UK">영국 (UK)</option>
                <option value="JP">일본 (JP)</option>
                <option value="PL">폴란드 (PL)</option>
                <option value="FR">프랑스 (FR)</option>
                <option value="KR">대한민국 (KR)</option>
              </select>
            </div>

            <!-- 2. 대상 제품명 -->
            <div class="form-field">
              <label class="field-label" for="sched-product">수집 대상 제품명 <span class="required">*</span></label>
              <input type="text" id="sched-product" class="input-text" placeholder="예: LG OLED evo G4" value="LG OLED evo G4" required>
            </div>

            <!-- 3. 발송 주기 및 시간 (기본값: 매주 월요일 09:00) -->
            <div class="form-field">
              <label class="field-label" for="sched-frequency">발송 주기 및 시간 <span class="required">*</span></label>
              <select id="sched-frequency" class="input-select">
                <option value="mon-0900" selected>매주 월요일 오전 09:00 (기본 권장)</option>
                <option value="fri-1800">매주 금요일 오후 18:00 (주간 마감)</option>
                <option value="daily-0900">매일 오전 09:00 (데일리 모니터링)</option>
                <option value="biweekly-mon-0900">격주 월요일 오전 09:00 (격주 보고)</option>
              </select>
            </div>

            <!-- 4. 수신 이메일 주소 -->
            <div class="form-field">
              <label class="field-label" for="sched-email">수신 이메일 주소 <span class="required">*</span></label>
              <input type="text" id="sched-email" class="input-text" placeholder="예: product.mktg@lge.com (쉼표로 복수 입력 가능)">
            </div>
          </div>

          <!-- 리포트 포함 옵션 (피그마 문구: AI 요약 및 분석) -->
          <div class="schedule-options-row">
            <span class="options-label">포함 옵션:</span>
            <label class="option-checkbox-label">
              <input type="checkbox" id="sched-opt-ai" checked>
              <span>AI 요약 및 분석</span>
            </label>
            <label class="option-checkbox-label">
              <input type="checkbox" id="sched-opt-csv" checked>
              <span>원문 수집 CSV 데이터 파일 첨부</span>
            </label>
          </div>

          <!-- 하단 등록 버튼 (피그마: 힌트 문구 없이 우측 정렬, 아이콘 없는 심플 버튼) -->
          <div class="form-submit-row">
            <button type="submit" class="btn-register-schedule" ${this.state.isSubmitting ? 'disabled' : ''}>
              ${this.state.isSubmitting ? '등록 처리 중...' : '정기 리포트 예약 등록'}
            </button>
          </div>
        </form>
      </div>

      <!-- 하단: 정기 수집 및 발송 내역 관리 (피그마: 카드 밖 섹션 헤더 + 테이블 카드 분리) -->
      <div class="scheduled-section-container">
        <div class="scheduled-section-header">
          <div class="header-left">
            <h3 class="section-title">정기 수집 및 발송 내역 관리</h3>
          </div>
          <div class="list-summary-stats">
            <span class="stat-item">전체 <strong>${totalCount}</strong>건</span>
            <span class="stat-divider">·</span>
            <span class="stat-item active-stat">정상 가동 중 <strong>${activeCount}</strong>건</span>
          </div>
        </div>

        <div class="scheduled-table-card">
          ${this.renderTableContent()}
        </div>
      </div>
    `;
  },

  renderTableContent() {
    if (this.state.reports.length === 0) {
      return `
        <div class="empty-state-box">
          <div class="empty-icon">📅</div>
          <h4 class="empty-title">등록된 정기 리포트가 없습니다</h4>
          <p class="empty-desc">위 입력 폼에서 원하는 국가와 제품명을 입력하고 정기 리포트 예약을 등록해보세요.</p>
        </div>
      `;
    }

    return `
      <div class="table-responsive-wrapper">
        <table class="schedule-data-table">
          <thead>
            <tr>
              <th class="th-status" style="width: 90px; padding-left: 24px;">가동 상태</th>
              <th class="th-target" style="width: 220px;">수집 대상</th>
              <th class="th-schedule" style="width: 170px;">발송 주기</th>
              <th class="th-email" style="min-width: 210px;">수신 이메일</th>
              <th class="th-next-run" style="width: 150px; text-align: center;">다음 실행 예정</th>
              <th class="th-last-run" style="width: 180px;">최근 발송 이력</th>
              <th class="th-actions" style="width: 170px; text-align: center;">관리</th>
            </tr>
          </thead>
          <tbody>
            ${this.state.reports.map(r => this.renderTableRow(r)).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderTableRow(item) {
    const isTesting = this.state.testingId === item.id;
    const countryNames = {
      'US': '미국 (US)',
      'DE': '독일 (DE)',
      'UK': '영국 (UK)',
      'JP': '일본 (JP)',
      'PL': '폴란드 (PL)',
      'FR': '프랑스 (FR)',
      'KR': '대한민국 (KR)'
    };
    const cName = countryNames[item.country] || item.countryName || item.country;

    // 이메일 배열 정제
    let emailArray = [];
    if (Array.isArray(item.emails)) {
      emailArray = item.emails;
    } else if (typeof item.emails === 'string') {
      emailArray = item.emails.split(',').map(s => s.trim()).filter(Boolean);
    }

    const scheduleLine1 = item.scheduleLine1 || '매주 월요일 오전';
    const scheduleLine2 = item.scheduleLine2 || '09:00 (KST)';
    const nextDate = item.nextRunDate || '2026-10-27 (월)';
    const nextTime = item.nextRunTime || '09:00';
    const lastDate = item.lastRunDate || '2026-10-20 09:00 (발송';
    const lastStatus = item.lastRunStatusText || '완료)';

    return `
      <tr class="schedule-row ${item.isActive ? 'row-active' : 'row-paused'}" id="row-${item.id}">
        <!-- 1. 상태 토글 (피그마: 텍스트 없이 스위치만) -->
        <td class="td-status" style="padding-left: 24px;">
          <label class="switch-toggle" title="${item.isActive ? '클릭하여 일시정지' : '클릭하여 가동 재개'}">
            <input type="checkbox" ${item.isActive ? 'checked' : ''} onchange="ScheduledReportsView.toggleActive('${item.id}', this.checked)">
            <span class="switch-slider"></span>
          </label>
        </td>

        <!-- 2. 수집 대상 (피그마: US 배지 + 제품명 볼드 + 아래 국가명) -->
        <td class="td-target">
          <div class="target-row">
            <span class="country-pill-badge">${CsvUtils.escapeHtml(item.country)}</span>
            <strong class="product-title">${CsvUtils.escapeHtml(item.product)}</strong>
          </div>
          <div class="target-sub-info">${cName}</div>
        </td>

        <!-- 3. 발송 주기 (피그마: 아이콘 + 2줄 텍스트) -->
        <td class="td-schedule">
          <div class="schedule-text-box">
            <span class="sched-icon-box" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </span>
            <div class="schedule-lines">
              <span class="line-primary">${CsvUtils.escapeHtml(scheduleLine1)}</span>
              <span class="line-secondary">${CsvUtils.escapeHtml(scheduleLine2)}</span>
            </div>
          </div>
        </td>

        <!-- 4. 수신 이메일 (피그마: 개별 이메일 칩) -->
        <td class="td-email">
          <div class="email-list">
            ${emailArray.map(em => `
              <span class="email-chip" title="${CsvUtils.escapeHtml(em)}">
                <span class="email-icon">✉️</span>
                <span>${CsvUtils.escapeHtml(em)}</span>
              </span>
            `).join('')}
          </div>
        </td>

        <!-- 5. 다음 실행 예정 (피그마: 부드러운 블루 컨테이너 2줄) -->
        <td class="td-next-run">
          <div class="next-run-pill ${item.isActive ? 'active-run' : 'paused-run'}">
            <span class="next-date">${item.isActive ? CsvUtils.escapeHtml(nextDate) : '일시정지됨'}</span>
            <span class="next-time">${item.isActive ? CsvUtils.escapeHtml(nextTime) : '-'}</span>
          </div>
        </td>

        <!-- 6. 최근 발송 이력 (피그마: 2줄 회색 텍스트) -->
        <td class="td-last-run">
          <div class="last-run-lines">
            <span class="last-date">${CsvUtils.escapeHtml(lastDate)}</span>
            <span class="last-status">${CsvUtils.escapeHtml(lastStatus)}</span>
          </div>
        </td>

        <!-- 7. 액션 버튼 (피그마: [즉시 테스트] [삭제]) -->
        <td class="td-actions" style="text-align: center;">
          <div class="action-btn-group">
            <button type="button" class="btn-action-test" onclick="ScheduledReportsView.triggerTestSend('${item.id}')" ${isTesting ? 'disabled' : ''} title="지금 즉시 테스트 데이터를 수집하여 등록된 이메일로 발송 테스트합니다">
              ${isTesting ? '발송 중...' : '즉시 테스트'}
            </button>
            <button type="button" class="btn-action-delete" onclick="ScheduledReportsView.deleteReport('${item.id}')" title="이 예약을 삭제합니다">
              삭제
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  handleRegister(event) {
    event.preventDefault();
    if (this.state.isSubmitting) return;

    const countryEl = document.getElementById('sched-country');
    const productEl = document.getElementById('sched-product');
    const freqEl = document.getElementById('sched-frequency');
    const emailEl = document.getElementById('sched-email');
    const optAiEl = document.getElementById('sched-opt-ai');
    const optCsvEl = document.getElementById('sched-opt-csv');

    const country = countryEl ? countryEl.value : 'US';
    const product = productEl ? productEl.value.trim() : '';
    const freqVal = freqEl ? freqEl.value : 'mon-0900';
    const emailInput = emailEl ? emailEl.value.trim() : '';

    if (!product) {
      alert('수집 대상 제품명을 입력해주세요.');
      if (productEl) productEl.focus();
      return;
    }

    const emailList = emailInput
      ? emailInput.split(',').map(s => s.trim()).filter(Boolean)
      : ['voc-notify@lge.com'];

    this.state.isSubmitting = true;
    this.render();

    setTimeout(() => {
      let line1 = '매주 월요일 오전';
      let line2 = '09:00 (KST)';
      if (freqVal === 'fri-1800') {
        line1 = '매주 금요일 오후';
        line2 = '18:00 (KST)';
      } else if (freqVal === 'daily-0900') {
        line1 = '매일 오전';
        line2 = '09:00 (KST)';
      } else if (freqVal === 'biweekly-mon-0900') {
        line1 = '격주 월요일 오전';
        line2 = '09:00 (KST)';
      }

      const countryNames = {
        'US': '미국 (US)',
        'DE': '독일 (DE)',
        'UK': '영국 (UK)',
        'JP': '일본 (JP)',
        'PL': '폴란드 (PL)',
        'FR': '프랑스 (FR)',
        'KR': '대한민국 (KR)'
      };

      const newReport = {
        id: 'rep-' + Date.now().toString(36),
        country: country,
        countryName: countryNames[country] || country,
        product: product,
        scheduleLine1: line1,
        scheduleLine2: line2,
        frequency: freqVal,
        emails: emailList,
        includeAiSummary: optAiEl ? optAiEl.checked : true,
        includeCsvAttachment: optCsvEl ? optCsvEl.checked : true,
        isActive: true,
        lastRunDate: '신규 등록 (대기',
        lastRunStatusText: '중)',
        nextRunDate: '2026-10-27 (월)',
        nextRunTime: '09:00',
        createdAt: new Date().toISOString().slice(0, 10)
      };

      this.state.reports.unshift(newReport);
      this.saveToStorage();

      this.state.isSubmitting = false;
      this.render();
      this.showToast(`[${country}] ${product} 정기 리포트 예약이 성공적으로 등록되었습니다.`, 'success');
    }, 400);
  },

  toggleActive(id, isActive) {
    const item = this.state.reports.find(r => r.id === id);
    if (!item) return;

    item.isActive = isActive;
    this.saveToStorage();
    this.render();

    const statusMsg = isActive ? '가동을 재개했습니다.' : '일시정지 처리되었습니다.';
    this.showToast(`[${item.product}] 정기 리포트가 ${statusMsg}`, 'info');
  },

  triggerTestSend(id) {
    const item = this.state.reports.find(r => r.id === id);
    if (!item) return;

    this.state.testingId = id;
    this.render();

    // 1.2초간 가상 크롤링 및 발송 시뮬레이션
    setTimeout(() => {
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ` +
                      `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      item.lastRunDate = `${timeStr} (테스트 발송`;
      item.lastRunStatusText = '완료)';
      this.saveToStorage();

      this.state.testingId = null;
      this.render();
      const emailText = Array.isArray(item.emails) ? item.emails.join(', ') : item.emails;
      this.showToast(`✅ [테스트 발송 완료] ${item.country} ${item.product} VOC 리포트가 ${emailText}로 성공적으로 발송되었습니다.`, 'success');
    }, 1200);
  },

  deleteReport(id) {
    const item = this.state.reports.find(r => r.id === id);
    if (!item) return;

    if (!confirm(`[${item.country}] ${item.product} 정기 리포트 예약을 삭제하시겠습니까?`)) {
      return;
    }

    this.state.reports = this.state.reports.filter(r => r.id !== id);
    this.saveToStorage();
    this.render();
    this.showToast('정기 리포트 예약이 삭제되었습니다.', 'info');
  }
};
