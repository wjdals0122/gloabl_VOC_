/**
 * dashboard/js/views/history_view.js
 * 3단계: 브라우저 로컬 수집 이력 화면 뷰 모듈
 * 
 * [표시 규칙 엄격 준수]
 * 1. "이 브라우저에 저장된 이력"이라고 명확히 표시
 * 2. 서버에서 파일을 다시 받을 수 있다고 보장하지 않음
 * 3. 새로고침 후에도 파일 다운로드가 가능하도록 로컬에 보관된 CSV 원문으로 다운로드 실행
 */

const HistoryView = {
  containerId: 'view-history-content',

  init() {
    this.render();
  },

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const list = HistoryStorage.getAll();

    let itemsHtml = '';
    if (list.length === 0) {
      itemsHtml = `
        <div class="glass-panel text-center py-5">
          <div class="empty-icon">📁</div>
          <h3>저장된 수집 이력이 없습니다.</h3>
          <p>새로운 수집을 진행하면 이 브라우저의 로컬 스토리지에 결과가 자동으로 보관됩니다.</p>
        </div>
      `;
    } else {
      itemsHtml = list.map((item, idx) => {
        const dateStr = new Date(item.timestamp).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        const modeBadge = item.isDemo
          ? `<span class="badge badge-neutral">[시뮬레이션]</span>`
          : `<span class="badge badge-success">실제 수집</span>`;

        const csvSize = item.rawCsv ? `${(item.rawCsv.length / 1024).toFixed(1)} KB` : '0 KB';

        return `
          <div class="history-item-card glass-panel" id="hist-card-${item.id}">
            <div class="history-card-header">
              <div class="header-left">
                <span class="history-index">#${idx + 1}</span>
                <span class="badge badge-country">${item.country}</span>
                <strong class="history-product">${CsvUtils.escapeHtml(item.product)}</strong>
                ${modeBadge}
              </div>
              <div class="header-right">
                <span class="history-date">${dateStr}</span>
                <span class="history-size">CSV 크기: ${csvSize}</span>
              </div>
            </div>

            <div class="history-card-body">
              <div class="history-meta-info">
                <span>수집된 출처 수: <strong>${item.sourcesCount}개</strong></span>
                <span class="history-storage-tag">💾 브라우저 로컬 영구 보관됨</span>
              </div>
              <div class="history-actions">
                <button class="btn btn-sm btn-primary" onclick="HistoryView.loadToDashboard('${item.id}')">
                  📊 결과 대시보드로 불러오기
                </button>
                <button class="btn btn-sm btn-outline" onclick="HistoryView.downloadCsv('${item.id}')">
                  💾 CSV 파일 다시 다운로드
                </button>
                <button class="btn btn-sm btn-danger-outline" onclick="HistoryView.deleteHistoryItem('${item.id}')">
                  삭제
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="history-page-header">
        <div class="notice-callout warning">
          <div class="callout-icon">📌</div>
          <div class="callout-text">
            <strong>이 브라우저에 저장된 이력입니다.</strong>
            <p>현재 백엔드는 완료 파일 재다운로드 URL이나 서버 세션 스토리지를 영구 보관하지 않습니다. 따라서 본 대시보드는 <strong>이 브라우저의 로컬 스토리지에 CSV 원본을 보관</strong>하여 브라우저 새로고침이나 재방문 시에도 언제든 파일을 다시 내려받을 수 있도록 지원합니다.</p>
          </div>
        </div>

        <div class="history-top-bar">
          <div class="bar-left">
            <h3>로컬 수집 세션 기록 <span class="counter">(${list.length}건)</span></h3>
          </div>
          <div class="bar-right">
            <button class="btn btn-outline btn-sm" onclick="HistoryView.clearAllHistory()" ${list.length === 0 ? 'disabled' : ''}>
              🗑️ 전체 이력 비우기
            </button>
          </div>
        </div>
      </div>

      <div class="history-items-container">
        ${itemsHtml}
      </div>
    `;
  },

  loadToDashboard(id) {
    const item = HistoryStorage.getById(id);
    if (!item) {
      alert('해당 이력을 찾을 수 없습니다.');
      return;
    }

    App.navigateToTab('tab-results');
    ResultsView.loadFromHistory(item);
  },

  downloadCsv(id) {
    const item = HistoryStorage.getById(id);
    if (!item || !item.rawCsv) {
      alert('다운로드할 CSV 원본이 로컬 저장소에 존재하지 않습니다.');
      return;
    }

    const filename = `scraped_voc_${item.country}_${item.product.replace(/\s+/g, '_')}_${item.id}.csv`;
    CsvUtils.downloadCsvText(item.rawCsv, filename);
  },

  deleteHistoryItem(id) {
    if (!confirm('이 수집 이력을 로컬에서 삭제하시겠습니까?')) return;
    HistoryStorage.deleteItem(id);
    this.render();
  },

  clearAllHistory() {
    if (!confirm('브라우저에 보관된 모든 수집 이력을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    HistoryStorage.clearAll();
    this.render();
  }
};
