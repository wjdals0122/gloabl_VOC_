/**
 * dashboard/js/views/scheduled_reports_view.js
 * 정기 모니터링 및 Slack 변동 알림 관리 뷰
 * 
 * [현직자 워크플로우 전면 반영]
 * 1. 주간 단위 타겟 국가 및 키워드(예: 폴란드 LG 워시콤보) 정기 모니터링
 * 2. 1주일 사이 신규 VOC 수집 및 감성/키워드 변동 발생 시 Slack 자동 알림
 * 3. 변동이 없을 경우 불필요한 알림 피로 방지 (변동 없음 기록)
 * 4. 모니터링 타겟에서 원클릭으로 대시보드 결과 뷰(tab-results) 직접 연동
 * 5. 실시간 변동 체크 및 슬랙 리치 메시지 프리뷰 모달 제공
 */

const ScheduledReportsView = {
  storageKey: 'voc_scheduled_monitoring_v3',

  // 현직자 실사용 기준 기본 모니터링 타겟 데이터
  defaultData: [
    {
      id: 'mon-lg-001',
      country: 'PL',
      countryName: '폴란드 (PL)',
      product: 'LG 워시콤보',
      scheduleLine1: '매주 월요일 오전',
      scheduleLine2: '09:00 (KST)',
      frequency: 'weekly-mon-0900',
      slackChannel: '#voc-europe-alerts',
      notifyOnChangeOnly: true,
      includeDashboardLink: true,
      isActive: true,
      deltaStatus: 'changed', // 'changed' | 'unchanged' | 'warning'
      deltaCount: 18,
      deltaSummary: '신규 VOC 18건 감지 (긍정 72%)',
      lastRunDate: '2026-10-26 09:00',
      lastRunStatusText: 'Slack 알림 전송 완료',
      nextRunDate: '2026-11-02 (월)',
      nextRunTime: '09:00',
      topKeywords: ['인버터 DD', '건조 성능', '공간 절약', '소음 적음'],
      positivePct: 72,
      createdAt: '2026-10-12'
    },
    {
      id: 'mon-lg-002',
      country: 'US',
      countryName: '미국 (US)',
      product: 'LG OLED evo G4',
      scheduleLine1: '매주 월요일 오전',
      scheduleLine2: '09:00 (KST)',
      frequency: 'weekly-mon-0900',
      slackChannel: '#voc-us-tv-monitoring',
      notifyOnChangeOnly: true,
      includeDashboardLink: true,
      isActive: true,
      deltaStatus: 'unchanged',
      deltaCount: 0,
      deltaSummary: '변동 없음 (신규 VOC 0건)',
      lastRunDate: '2026-10-26 09:00',
      lastRunStatusText: '변동 없어 알림 생략',
      nextRunDate: '2026-11-02 (월)',
      nextRunTime: '09:00',
      topKeywords: ['화질 선명', '시야각', '밝기 향상'],
      positivePct: 81,
      createdAt: '2026-10-15'
    },
    {
      id: 'mon-lg-003',
      country: 'DE',
      countryName: '독일 (DE)',
      product: 'LG gram Pro 16',
      scheduleLine1: '매주 월요일 오전',
      scheduleLine2: '09:00 (KST)',
      frequency: 'weekly-mon-0900',
      slackChannel: '#voc-germany-alerts',
      notifyOnChangeOnly: true,
      includeDashboardLink: true,
      isActive: true,
      deltaStatus: 'warning',
      deltaCount: 9,
      deltaSummary: '신규 VOC 9건 (부정 이슈 1건 감지)',
      lastRunDate: '2026-10-26 09:00',
      lastRunStatusText: 'Slack 알림 전송 완료',
      nextRunDate: '2026-11-02 (월)',
      nextRunTime: '09:00',
      topKeywords: ['초경량 휴대성', '배터리 지속', '팬 소음'],
      positivePct: 64,
      createdAt: '2026-10-18'
    }
  ],

  state: {
    reports: [],
    isSubmitting: false,
    checkingId: null,
    previewItem: null,
    toastMessage: null,
    toastType: 'success',
    toastTimer: null
  },

  init() {
    this.loadFromStorage();
    this.updateHeaderBadge();
    this.render();
    this.bindGlobalKeyEvents();
  },

  bindGlobalKeyEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.previewItem) {
        this.closeSlackModal();
      }
    });
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
    }, 4000);
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
    const changedCount = this.state.reports.filter(r => r.deltaStatus === 'changed' || r.deltaStatus === 'warning').length;

    container.innerHTML = `
      <!-- 헤더 및 기능 안내 (정기 모니터링 & Slack 알림) -->
      <div class="scheduled-hero-header">
        <h2 class="scheduled-hero-title">정기 추이 모니터링 및 Slack 변동 알림</h2>
        <p class="scheduled-hero-subtitle">
          설정한 국가와 키워드를 주간 단위로 자동 추적하고, 새로운 VOC나 감성 추이 등 변동 사항이 감지되면<br>
          Slack으로 즉시 알림을 전송하여 대시보드에서 바로 분석 결과를 확인할 수 있습니다.
        </p>
      </div>

      <!-- 상단: 신규 정기 모니터링 등록 폼 카드 -->
      <div class="scheduled-card scheduled-form-card">
        <div class="form-card-header">
          <h3 class="card-section-title">신규 모니터링 타겟 등록</h3>
          <p class="card-section-desc">타겟 국가와 키워드를 등록하면, 정해진 주기에 맞춰 VOC 수집 및 변동 감지가 자동으로 실행됩니다.</p>
        </div>

        <form id="form-new-schedule" class="schedule-form" onsubmit="ScheduledReportsView.handleRegister(event)">
          <div class="schedule-form-grid">
            <!-- 1. 대상 국가 -->
            <div class="form-field">
              <label class="field-label" for="sched-country">수집 대상 국가 <span class="required">*</span></label>
              <select id="sched-country" class="input-select" required>
                <option value="PL" selected>폴란드 (PL)</option>
                <option value="US">미국 (US)</option>
                <option value="DE">독일 (DE)</option>
                <option value="UK">영국 (UK)</option>
                <option value="JP">일본 (JP)</option>
                <option value="FR">프랑스 (FR)</option>
                <option value="KR">대한민국 (KR)</option>
              </select>
            </div>

            <!-- 2. 대상 키워드/제품명 -->
            <div class="form-field">
              <label class="field-label" for="sched-product">모니터링 키워드 <span class="required">*</span></label>
              <input type="text" id="sched-product" class="input-text" placeholder="예: LG 워시콤보, LG OLED evo G4" value="LG 워시콤보" required>
            </div>

            <!-- 3. 자동 분석 및 추적 주기 -->
            <div class="form-field">
              <label class="field-label" for="sched-frequency">자동 분석 및 추적 주기 <span class="required">*</span></label>
              <select id="sched-frequency" class="input-select">
                <option value="weekly-mon-0900" selected>매주 월요일 오전 09:00 (주간 모니터링 권장)</option>
                <option value="weekly-fri-1800">매주 금요일 오후 18:00 (주간 마감 점검)</option>
                <option value="daily-0900">매일 오전 09:00 (데일리 신속 트래킹)</option>
                <option value="biweekly-mon-0900">격주 월요일 오전 09:00 (격주 트렌드 점검)</option>
              </select>
            </div>

            <!-- 4. Slack 알림 채널/웹훅 -->
            <div class="form-field">
              <label class="field-label" for="sched-slack-channel">Slack 알림 수신 채널 <span class="required">*</span></label>
              <input type="text" id="sched-slack-channel" class="input-text" placeholder="예: #voc-europe-alerts" value="#voc-europe-alerts" required>
            </div>
          </div>

          <!-- 알림 옵션 행 -->
          <div class="schedule-options-row">
            <span class="options-label">알림 조건 설정:</span>
            <label class="option-checkbox-label">
              <input type="checkbox" id="sched-opt-change-only" checked>
              <span>신규 VOC 수집 또는 주요 감성 변동 시에만 Slack 알림 전송</span>
            </label>
          </div>

          <!-- 하단 등록 버튼 -->
          <div class="form-submit-row">
            <button type="submit" class="btn-register-schedule" ${this.state.isSubmitting ? 'disabled' : ''}>
              ${this.state.isSubmitting ? '등록 처리 중...' : '정기 모니터링 등록'}
            </button>
          </div>
        </form>
      </div>

      <!-- 하단: 정기 모니터링 타겟 관리 내역 -->
      <div class="scheduled-section-container">
        <div class="scheduled-section-header">
          <div class="header-left">
            <h3 class="section-title">정기 모니터링 타겟 관리</h3>
          </div>
          <div class="list-summary-stats">
            <span class="stat-item">전체 <strong>${totalCount}</strong>개 타겟</span>
            <span class="stat-divider">/</span>
            <span class="stat-item active-stat">정상 가동 중 <strong>${activeCount}</strong>개</span>
            <span class="stat-divider">/</span>
            <span class="stat-item" style="color: #0284c7;">금주 변동 감지 <strong>${changedCount}</strong>건</span>
          </div>
        </div>

        <div class="scheduled-table-card">
          ${this.renderTableContent()}
        </div>
      </div>

      <!-- Slack 알림 메시지 프리뷰 모달 컨테이너 -->
      <div id="slack-preview-modal-root"></div>
    `;
  },

  renderTableContent() {
    if (this.state.reports.length === 0) {
      return `
        <div class="empty-state-box">
          <div class="empty-icon">📡</div>
          <h4 class="empty-title">등록된 모니터링 타겟이 없습니다</h4>
          <p class="empty-desc">위 입력 폼에서 원하는 국가와 키워드를 입력하고 정기 모니터링을 등록해보세요.</p>
        </div>
      `;
    }

    return `
      <div class="table-responsive-wrapper">
        <table class="schedule-data-table">
          <thead>
            <tr>
              <th class="th-status" style="width: 70px; padding-left: 20px; text-align: center;">가동 상태</th>
              <th class="th-target" style="min-width: 175px;">모니터링 대상</th>
              <th class="th-schedule" style="width: 140px;">추적 주기</th>
              <th class="th-delta" style="min-width: 205px;">주간 변동 감지 상태</th>
              <th class="th-slack" style="min-width: 165px;">Slack 알림 채널</th>
              <th class="th-last-run" style="width: 175px;">최근 자동 갱신 이력</th>
              <th class="th-actions" style="width: 195px; text-align: center;">대시보드 및 관리</th>
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
    const isChecking = this.state.checkingId === item.id;
    const countryNames = {
      'PL': '폴란드 (PL)',
      'US': '미국 (US)',
      'DE': '독일 (DE)',
      'UK': '영국 (UK)',
      'JP': '일본 (JP)',
      'FR': '프랑스 (FR)',
      'KR': '대한민국 (KR)'
    };
    const cName = countryNames[item.country] || item.countryName || item.country;

    const scheduleLine1 = item.scheduleLine1 || '매주 월요일 오전';
    const scheduleLine2 = item.scheduleLine2 || '09:00 (KST)';
    const nextDate = item.nextRunDate || '2026-11-02 (월)';
    const nextTime = item.nextRunTime || '09:00';
    const lastDate = item.lastRunDate || '2026-10-26 09:00';
    const lastStatus = item.lastRunStatusText || 'Slack 알림 전송 완료';

    // 변동 감지 뱃지 스타일
    let deltaBadgeHtml = '';
    if (item.deltaStatus === 'changed') {
      deltaBadgeHtml = `
        <span class="delta-pill delta-changed" title="신규 VOC가 수집되어 Slack 알림이 전송되었습니다">
          <span class="delta-dot"></span>
          <span class="delta-text">${CsvUtils.escapeHtml(item.deltaSummary || '신규 VOC 감지')}</span>
        </span>
      `;
    } else if (item.deltaStatus === 'warning') {
      deltaBadgeHtml = `
        <span class="delta-pill delta-warning" title="부정적 VOC 이슈가 감지되어 긴급 Slack 알림이 전송되었습니다">
          <span class="delta-dot"></span>
          <span class="delta-text">${CsvUtils.escapeHtml(item.deltaSummary || '부정 이슈 감지')}</span>
        </span>
      `;
    } else {
      deltaBadgeHtml = `
        <span class="delta-pill delta-unchanged" title="지난 주간과 동일한 수준이며 신규 VOC 변동이 없습니다">
          <span class="delta-dot"></span>
          <span class="delta-text">${CsvUtils.escapeHtml(item.deltaSummary || '변동 없음')}</span>
        </span>
      `;
    }

    const slackChannel = item.slackChannel || '#voc-europe-alerts';

    return `
      <tr class="schedule-row ${item.isActive ? 'row-active' : 'row-paused'}" id="row-${item.id}">
        <!-- 1. 상태 토글 -->
        <td class="td-status" style="padding-left: 20px; text-align: center;">
          <label class="switch-toggle" title="${item.isActive ? '클릭하여 일시정지' : '클릭하여 가동 재개'}">
            <input type="checkbox" ${item.isActive ? 'checked' : ''} onchange="ScheduledReportsView.toggleActive('${item.id}', this.checked)">
            <span class="switch-slider"></span>
          </label>
        </td>

        <!-- 2. 모니터링 대상 (국가 뱃지 + 키워드 + 국가명) -->
        <td class="td-target">
          <div class="target-row">
            <span class="country-pill-badge">${CsvUtils.escapeHtml(item.country)}</span>
            <strong class="product-title">${CsvUtils.escapeHtml(item.product)}</strong>
          </div>
          <div class="target-sub-info">${cName}</div>
        </td>

        <!-- 3. 추적 주기 -->
        <td class="td-schedule">
          <div class="schedule-text-box">
            <span class="sched-icon-box" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </span>
            <div class="schedule-lines">
              <span class="line-primary">${CsvUtils.escapeHtml(scheduleLine1)}</span>
              <span class="line-secondary">${CsvUtils.escapeHtml(scheduleLine2)}</span>
            </div>
          </div>
        </td>

        <!-- 4. 주간 변동 감지 상태 -->
        <td class="td-delta">
          <div class="delta-container">
            ${deltaBadgeHtml}
          </div>
        </td>

        <!-- 5. Slack 알림 채널 -->
        <td class="td-slack">
          <div class="slack-channel-wrap">
            <span class="slack-chip" title="Slack 알림 채널: ${CsvUtils.escapeHtml(slackChannel)}">
              <span class="slack-hash">#</span>
              <span class="slack-name">${CsvUtils.escapeHtml(slackChannel.replace(/^#/, ''))}</span>
            </span>
          </div>
        </td>

        <!-- 6. 최근 자동 갱신 이력 -->
        <td class="td-last-run">
          <div class="last-run-lines">
            <span class="last-date">${CsvUtils.escapeHtml(lastDate)}</span>
            <span class="last-status">${CsvUtils.escapeHtml(lastStatus)}</span>
          </div>
        </td>

        <!-- 7. 액션 버튼 (대시보드 결과 보기 / Slack 미리보기 / 삭제) -->
        <td class="td-actions" style="text-align: center;">
          <div class="action-btn-group">
            <button type="button" class="btn-action-dashboard" onclick="ScheduledReportsView.openDashboardView('${item.country}', '${CsvUtils.escapeHtml(item.product)}')" title="이 키워드의 최신 VOC 분석 결과 대시보드로 이동합니다">
              대시보드 보기 ↗
            </button>
            <button type="button" class="btn-action-slack" onclick="ScheduledReportsView.openSlackPreview('${item.id}')" title="Slack으로 전송된 알림 메시지 미리보기">
              Slack 미리보기
            </button>
            <button type="button" class="btn-action-delete" onclick="ScheduledReportsView.deleteItem('${item.id}')" title="이 모니터링을 삭제합니다">
              삭제
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  openDashboardView(country, product) {
    if (typeof App !== 'undefined' && App.navigateToTab) {
      this.showToast(`[${country}] ${product} 대시보드 분석 화면으로 이동합니다.`, 'info');
      App.navigateToTab('tab-results', {
        country: country,
        keyword: product,
        autoStart: true,
        period: '1m',
        channel: 'all'
      });
    }
  },

  triggerCheck(id) {
    const item = this.state.reports.find(r => r.id === id);
    if (!item) return;

    this.state.checkingId = id;
    this.render();

    // 1.2초간 가상 크롤링 및 변동 분석 시뮬레이션
    setTimeout(() => {
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ` +
                      `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      // 신규 변동 무작위 시뮬레이션
      const randomCount = Math.floor(Math.random() * 25) + 3;
      item.deltaStatus = 'changed';
      item.deltaCount = randomCount;
      item.deltaSummary = `신규 VOC ${randomCount}건 감지 (긍정 75%)`;
      item.lastRunDate = timeStr;
      item.lastRunStatusText = 'Slack 알림 전송 완료';

      this.saveToStorage();
      this.state.checkingId = null;
      this.render();

      this.showToast(`✅ [${item.country}] ${item.product} 자동 분석 완료: 신규 VOC ${randomCount}건이 감지되어 ${item.slackChannel}로 Slack 알림을 발송했습니다.`, 'success');
      this.openSlackPreview(id);
    }, 1200);
  },

  openSlackPreview(id) {
    const item = this.state.reports.find(r => r.id === id);
    if (!item) return;

    this.state.previewItem = item;
    const modalRoot = document.getElementById('slack-preview-modal-root');
    if (!modalRoot) return;

    const countryNames = {
      'PL': '폴란드 (PL)',
      'US': '미국 (US)',
      'DE': '독일 (DE)',
      'UK': '영국 (UK)',
      'JP': '일본 (JP)',
      'FR': '프랑스 (FR)',
      'KR': '대한민국 (KR)'
    };
    const cName = countryNames[item.country] || item.country;
    const keywordsText = (item.topKeywords && item.topKeywords.length > 0)
      ? item.topKeywords.join(', ')
      : '인버터 DD, 건조 성능, 공간 절약';

    const positiveRate = item.positivePct || 72;

    modalRoot.innerHTML = `
      <div class="slack-preview-backdrop" onclick="ScheduledReportsView.handleBackdropClick(event)">
        <div class="slack-preview-modal" role="dialog" aria-modal="true" aria-labelledby="slack-modal-title">
          <!-- 모달 상단 슬랙 윈도우 바 -->
          <div class="slack-modal-topbar">
            <div class="slack-topbar-left">
              <span class="slack-app-logo">#</span>
              <span class="slack-channel-title" id="slack-modal-title">${CsvUtils.escapeHtml(item.slackChannel || '#voc-europe-alerts')}</span>
              <span class="slack-channel-badge">봇 알림 전용</span>
            </div>
            <button type="button" class="slack-modal-close" onclick="ScheduledReportsView.closeSlackModal()" aria-label="닫기">
              ✕
            </button>
          </div>

          <!-- 슬랙 메시지 본문 -->
          <div class="slack-modal-body">
            <div class="slack-message-bubble">
              <div class="slack-avatar-col">
                <div class="slack-bot-avatar">LG</div>
              </div>
              <div class="slack-content-col">
                <div class="slack-header-meta">
                  <strong class="slack-bot-name">LG Global VOC Intelligence Bot</strong>
                  <span class="slack-app-tag">APP</span>
                  <span class="slack-timestamp">오늘 오전 09:00 (주간 자동 분석)</span>
                </div>

                <div class="slack-lead-text">
                  🔔 <strong>[주간 VOC 변동 감지 알림]</strong>
                </div>

                <!-- 슬랙 리치 어태치먼트 카드 -->
                <div class="slack-attachment-card ${item.deltaStatus === 'warning' ? 'attach-warning' : 'attach-success'}">
                  <div class="slack-attach-header">
                    <span class="attach-flag">🌐</span>
                    <strong class="attach-title">${cName} | ${CsvUtils.escapeHtml(item.product)}</strong>
                  </div>

                  <p class="slack-attach-desc">
                    설정된 주간 자동 분석 주기에 따라 신규 데이터가 갱신되었습니다.
                    ${item.deltaStatus === 'unchanged' 
                      ? '지난 주 대비 새로운 VOC 변동 사항이 없습니다.' 
                      : `지난 주 대비 <strong>신규 VOC ${item.deltaCount || 18}건</strong>이 추가 수집되었으며, 긍정 감성 비중은 <strong>${positiveRate}%</strong>입니다.`}
                  </p>

                  <div class="slack-stats-grid">
                    <div class="slack-stat-box">
                      <span class="stat-label">신규 수집 VOC</span>
                      <strong class="stat-val ${item.deltaCount > 0 ? 'text-green' : ''}">+${item.deltaCount || 18}건</strong>
                    </div>
                    <div class="slack-stat-box">
                      <span class="stat-label">긍정 감성 비중</span>
                      <strong class="stat-val">${positiveRate}%</strong>
                    </div>
                    <div class="slack-stat-box stat-span-2">
                      <span class="stat-label">주목 키워드</span>
                      <span class="stat-keywords">${CsvUtils.escapeHtml(keywordsText)}</span>
                    </div>
                  </div>

                  <div class="slack-attach-footer">
                    <button type="button" class="btn-slack-cta" onclick="ScheduledReportsView.openDashboardFromSlack('${item.country}', '${CsvUtils.escapeHtml(item.product)}')">
                      📊 대시보드에서 최신 추이 확인하기 ↗
                    </button>
                    <span class="slack-hint-text">대시보드 바로가기 링크 첨부 완료</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 모달 하단 액션 바 -->
          <div class="slack-modal-footer">
            <span class="footer-tip">💡 ESC 키를 누르거나 바깥을 클릭하여 닫을 수 있습니다.</span>
            <button type="button" class="btn-slack-close" onclick="ScheduledReportsView.closeSlackModal()">
              닫기
            </button>
          </div>
        </div>
      </div>
    `;
  },

  handleBackdropClick(event) {
    if (event.target.classList.contains('slack-preview-backdrop')) {
      this.closeSlackModal();
    }
  },

  closeSlackModal() {
    this.state.previewItem = null;
    const modalRoot = document.getElementById('slack-preview-modal-root');
    if (modalRoot) {
      modalRoot.innerHTML = '';
    }
  },

  openDashboardFromSlack(country, product) {
    this.closeSlackModal();
    this.openDashboardView(country, product);
  },

  handleRegister(event) {
    event.preventDefault();
    if (this.state.isSubmitting) return;

    const countryEl = document.getElementById('sched-country');
    const productEl = document.getElementById('sched-product');
    const freqEl = document.getElementById('sched-frequency');
    const slackEl = document.getElementById('sched-slack-channel');
    const optChangeEl = document.getElementById('sched-opt-change-only');

    const country = countryEl ? countryEl.value : 'PL';
    const product = productEl ? productEl.value.trim() : '';
    const freqVal = freqEl ? freqEl.value : 'weekly-mon-0900';
    let slackChannel = slackEl ? slackEl.value.trim() : '#voc-europe-alerts';
    if (!slackChannel.startsWith('#')) {
      slackChannel = '#' + slackChannel;
    }

    if (!product) {
      alert('모니터링 키워드를 입력해주세요.');
      if (productEl) productEl.focus();
      return;
    }

    this.state.isSubmitting = true;
    this.render();

    setTimeout(() => {
      let line1 = '매주 월요일 오전';
      let line2 = '09:00 (KST)';
      if (freqVal === 'weekly-fri-1800') {
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
        'PL': '폴란드 (PL)',
        'US': '미국 (US)',
        'DE': '독일 (DE)',
        'UK': '영국 (UK)',
        'JP': '일본 (JP)',
        'FR': '프랑스 (FR)',
        'KR': '대한민국 (KR)'
      };

      const newReport = {
        id: 'mon-' + Date.now().toString(36),
        country: country,
        countryName: countryNames[country] || country,
        product: product,
        scheduleLine1: line1,
        scheduleLine2: line2,
        frequency: freqVal,
        slackChannel: slackChannel,
        notifyOnChangeOnly: optChangeEl ? optChangeEl.checked : true,
        includeDashboardLink: true,
        isActive: true,
        deltaStatus: 'changed',
        deltaCount: 12,
        deltaSummary: '신규 VOC 12건 감지 (분석 준비 완료)',
        lastRunDate: '신규 등록 (대기 중)',
        lastRunStatusText: '다음 주기에 자동 분석',
        nextRunDate: '2026-11-02 (월)',
        nextRunTime: '09:00',
        topKeywords: ['신규 모델 반응', '고객 사용 경험', '성능 만족도'],
        positivePct: 70,
        createdAt: new Date().toISOString().slice(0, 10)
      };

      this.state.reports.unshift(newReport);
      this.saveToStorage();

      this.state.isSubmitting = false;
      this.render();
      this.showToast(`[${country}] ${product} 정기 모니터링이 등록되었습니다. 주간 변동 발생 시 ${slackChannel}로 알림이 전송됩니다.`, 'success');
    }, 350);
  },

  toggleActive(id, isActive) {
    const item = this.state.reports.find(r => r.id === id);
    if (!item) return;

    item.isActive = isActive;
    this.saveToStorage();
    this.render();

    const statusMsg = isActive ? '가동을 재개했습니다.' : '일시정지 처리되었습니다.';
    this.showToast(`[${item.product}] 모니터링이 ${statusMsg}`, 'info');
  },

  deleteItem(id) {
    const item = this.state.reports.find(r => r.id === id);
    if (!item) return;

    if (!confirm(`[${item.country}] ${item.product} 모니터링 타겟을 삭제하시겠습니까?`)) {
      return;
    }

    this.state.reports = this.state.reports.filter(r => r.id !== id);
    this.saveToStorage();
    this.render();
    this.showToast('모니터링 타겟이 삭제되었습니다.', 'info');
  }
};

// 전역 별칭 부여
window.ScheduledMonitoringView = ScheduledReportsView;
