/**
 * dashboard/js/views/scheduled_reports_view.js
 * 정기 리포트 예약 및 자동 이메일 발송 관리 뷰
 * 
 * [주요 기능]
 * 1. 국가, 제품, 발송 주기(기본: 매주 월요일 오전 09:00), 수신 이메일 설정 및 신규 예약 등록
 * 2. 신청한 정기 수집 리포트 내역 목록 조회 (활성 토글, 다음 실행 시간, 최근 발송 이력)
 * 3. 즉시 테스트 발송 시뮬레이션 및 알림
 * 4. localStorage 영구 보관 (새로고침 시 유지)
 */

const ScheduledReportsView = {
  storageKey: 'voc_scheduled_reports',

  // 기본 샘플 데이터 (초기 진입 시 빈 화면 대신 실감나는 현황 제공)
  defaultData: [
    {
      id: 'rep-lg-001',
      country: 'US',
      countryName: '미국 (US)',
      product: 'LG OLED evo G4',
      scheduleLabel: '매주 월요일 오전 09:00 (KST)',
      scheduleDay: '1', // 월요일
      scheduleTime: '09:00',
      frequency: 'weekly',
      emails: 'global-voc@lge.com, us-tv-pm@lge.com',
      includeAiSummary: true,
      includeCsvAttachment: true,
      isActive: true,
      lastRunAt: '2026-10-20 09:00 (발송 완료)',
      lastRunCount: 5,
      lastRunStatus: 'success',
      nextRunAt: '2026-10-27 (월) 09:00',
      createdAt: '2026-10-14'
    },
    {
      id: 'rep-lg-002',
      country: 'DE',
      countryName: '독일 (DE)',
      product: 'LG gram Pro 16',
      scheduleLabel: '매주 월요일 오전 09:00 (KST)',
      scheduleDay: '1',
      scheduleTime: '09:00',
      frequency: 'weekly',
      emails: 'eu-pc-marketing@lge.com',
      includeAiSummary: true,
      includeCsvAttachment: true,
      isActive: true,
      lastRunAt: '2026-10-20 09:00 (발송 완료)',
      lastRunCount: 4,
      lastRunStatus: 'success',
      nextRunAt: '2026-10-27 (월) 09:00',
      createdAt: '2026-10-18'
    }
  ],

  state: {
    reports: [],
    isSubmitting: false,
    testingId: null,
    toastMessage: null,
    toastType: 'success', // 'success' | 'info' | 'error'
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
        this.state.reports = [...this.defaultData];
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('[ScheduledReportsView] 로컬스토리지 로드 실패, 기본값 사용', e);
      this.state.reports = [...this.defaultData];
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
      <!-- 헤더 및 기능 안내 -->
      <div class="scheduled-hero-header">
        <div class="scheduled-hero-badge">
          <span class="badge-icon">⏰</span>
          <span>주간 자동화 인텔리전스</span>
        </div>
        <h2 class="scheduled-hero-title">정기 리포트 예약 및 자동 발송</h2>
        <p class="scheduled-hero-subtitle">
          국가와 제품을 설정해두면 매주 정해진 시간에 글로벌 VOC를 자동으로 수집·분석하여 담당자 이메일로 리포트를 발송합니다.
        </p>
      </div>

      <!-- 상단: 신규 정기 예약 등록 폼 카드 -->
      <div class="scheduled-card scheduled-form-card">
        <div class="card-section-header">
          <div class="header-left">
            <span class="header-step-num">1</span>
            <div>
              <h3 class="card-section-title">신규 정기 리포트 등록</h3>
              <p class="card-section-desc">지정한 일정에 맞춰 백그라운드 크롤링 및 AI 분석 리포트 생성이 실행됩니다.</p>
            </div>
          </div>
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
              <input type="text" id="sched-product" class="input-text" placeholder="예: LG OLED evo G4, LG gram Pro 16" value="LG OLED evo G4" required>
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
              <input type="text" id="sched-email" class="input-text" placeholder="예: product.mktg@lge.com (쉼표로 복수 입력 가능)" required>
            </div>
          </div>

          <!-- 리포트 포함 옵션 -->
          <div class="schedule-options-row">
            <span class="options-label">포함 옵션:</span>
            <label class="option-checkbox-label">
              <input type="checkbox" id="sched-opt-ai" checked>
              <span>AI 핵심 요약 & 긍·부정 피드백 분석</span>
            </label>
            <label class="option-checkbox-label">
              <input type="checkbox" id="sched-opt-csv" checked>
              <span>원문 수집 CSV 데이터 파일 첨부</span>
            </label>
          </div>

          <!-- 하단 등록 버튼 -->
          <div class="form-submit-row">
            <div class="form-submit-hint">
              <span>💡 등록 즉시 스케줄러에 등록되며, 아래 관리 목록에서 언제든 일시정지 또는 테스트 발송이 가능합니다.</span>
            </div>
            <button type="submit" class="btn btn-primary btn-register-schedule" ${this.state.isSubmitting ? 'disabled' : ''}>
              ${this.state.isSubmitting ? '등록 처리 중...' : '⏰ 정기 리포트 예약 등록'}
            </button>
          </div>
        </form>
      </div>

      <!-- 하단: 신청 내역 목록 카드 -->
      <div class="scheduled-card scheduled-list-card">
        <div class="card-section-header list-header">
          <div class="header-left">
            <span class="header-step-num">2</span>
            <div>
              <h3 class="card-section-title">정기 수집 및 발송 내역 관리</h3>
              <p class="card-section-desc">현재 등록된 자동화 스케줄 내역입니다. 활성화 상태를 변경하거나 테스트 발송을 진행할 수 있습니다.</p>
            </div>
          </div>
          <div class="list-summary-stats">
            <span class="stat-item">전체 <strong>${totalCount}</strong>건</span>
            <span class="stat-divider">·</span>
            <span class="stat-item active-stat">정상 가동 중 <strong>${activeCount}</strong>건</span>
          </div>
        </div>

        ${this.renderTableContent()}
      </div>
    `;

    this.bindTableEvents();
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
              <th class="th-status" style="width: 90px; text-align: center;">가동 상태</th>
              <th class="th-target" style="width: 220px;">수집 대상</th>
              <th class="th-schedule" style="width: 170px;">발송 주기</th>
              <th class="th-email" style="min-width: 200px;">수신 이메일</th>
              <th class="th-next-run" style="width: 160px;">다음 실행 예정</th>
              <th class="th-last-run" style="width: 170px;">최근 발송 이력</th>
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
    const cName = countryNames[item.country] || item.country;

    return `
      <tr class="schedule-row ${item.isActive ? 'row-active' : 'row-paused'}" id="row-${item.id}">
        <!-- 1. 상태 토글 -->
        <td class="td-status" style="text-align: center;">
          <label class="switch-toggle" title="${item.isActive ? '클릭하여 일시정지' : '클릭하여 가동 재개'}">
            <input type="checkbox" ${item.isActive ? 'checked' : ''} onchange="ScheduledReportsView.toggleActive('${item.id}', this.checked)">
            <span class="switch-slider"></span>
          </label>
          <div class="status-label-sub">${item.isActive ? '<span class="text-success">가동 중</span>' : '<span class="text-muted">일시정지</span>'}</div>
        </td>

        <!-- 2. 수집 대상 -->
        <td class="td-target">
          <div class="target-row">
            <span class="country-pill-badge">${CsvUtils.escapeHtml(item.country)}</span>
            <strong class="product-title">${CsvUtils.escapeHtml(item.product)}</strong>
          </div>
          <div class="target-sub-info">${cName}</div>
        </td>

        <!-- 3. 발송 주기 -->
        <td class="td-schedule">
          <div class="schedule-text">
            <span class="sched-icon">🔄</span>
            <span>${CsvUtils.escapeHtml(item.scheduleLabel)}</span>
          </div>
        </td>

        <!-- 4. 수신 이메일 -->
        <td class="td-email">
          <div class="email-list">
            ${item.emails.split(',').map(em => `<span class="email-chip" title="${CsvUtils.escapeHtml(em.trim())}">✉️ ${CsvUtils.escapeHtml(em.trim())}</span>`).join('')}
          </div>
        </td>

        <!-- 5. 다음 실행 예정 -->
        <td class="td-next-run">
          <div class="next-run-badge ${item.isActive ? 'active-run' : 'paused-run'}">
            <span class="time-text">${item.isActive ? CsvUtils.escapeHtml(item.nextRunAt) : '가동 중지됨'}</span>
          </div>
        </td>

        <!-- 6. 최근 발송 이력 -->
        <td class="td-last-run">
          <div class="last-run-info">
            <span class="last-run-date">${CsvUtils.escapeHtml(item.lastRunAt || '발송 이력 없음')}</span>
          </div>
        </td>

        <!-- 7. 액션 버튼 -->
        <td class="td-actions" style="text-align: center;">
          <div class="action-btn-group">
            <button type="button" class="btn btn-xs btn-outline btn-test-send" onclick="ScheduledReportsView.triggerTestSend('${item.id}')" ${isTesting ? 'disabled' : ''} title="지금 즉시 테스트 데이터를 수집하여 등록된 이메일로 발송 테스트합니다">
              ${isTesting ? '발송 중...' : '⚡ 즉시 테스트'}
            </button>
            <button type="button" class="btn btn-xs btn-outline-danger btn-delete-sched" onclick="ScheduledReportsView.deleteReport('${item.id}')" title="이 예약을 삭제합니다">
              삭제
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  bindTableEvents() {
    // 필요한 추가 이벤트 바인딩
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
    const emails = emailEl ? emailEl.value.trim() : '';

    if (!product) {
      alert('수집 대상 제품명을 입력해주세요.');
      if (productEl) productEl.focus();
      return;
    }

    if (!emails) {
      alert('리포트를 수신할 이메일 주소를 입력해주세요.');
      if (emailEl) emailEl.focus();
      return;
    }

    // 간단한 이메일 형식 체크
    if (!emails.includes('@')) {
      alert('올바른 이메일 주소 형식을 입력해주세요.');
      if (emailEl) emailEl.focus();
      return;
    }

    this.state.isSubmitting = true;
    this.render();

    setTimeout(() => {
      let scheduleLabel = '매주 월요일 오전 09:00 (KST)';
      if (freqVal === 'fri-1800') scheduleLabel = '매주 금요일 오후 18:00 (KST)';
      else if (freqVal === 'daily-0900') scheduleLabel = '매일 오전 09:00 (KST)';
      else if (freqVal === 'biweekly-mon-0900') scheduleLabel = '격주 월요일 오전 09:00 (KST)';

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
        scheduleLabel: scheduleLabel,
        frequency: freqVal,
        emails: emails,
        includeAiSummary: optAiEl ? optAiEl.checked : true,
        includeCsvAttachment: optCsvEl ? optCsvEl.checked : true,
        isActive: true,
        lastRunAt: '신규 등록 (대기 중)',
        lastRunCount: 0,
        lastRunStatus: 'pending',
        nextRunAt: '2026-10-27 (월) 09:00',
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
                      `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

      item.lastRunAt = `${timeStr} (테스트 발송 완료)`;
      item.lastRunStatus = 'success';
      this.saveToStorage();

      this.state.testingId = null;
      this.render();
      this.showToast(`✅ [테스트 발송 완료] ${item.country} ${item.product} VOC 리포트가 ${item.emails}로 성공적으로 발송되었습니다.`, 'success');
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
