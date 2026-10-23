/**
 * dashboard/js/storage.js
 * 브라우저 로컬 저장소 기반 수집 이력 관리 모듈
 * 
 * [원칙]
 * 1. "이 브라우저에 저장된 이력"으로 명확히 표시하며 서버 재다운로드를 보장하지 않습니다.
 * 2. 새로고침 후에도 파일 다운로드가 가능하도록 CSV 원문 텍스트 전체를 로컬에 영구 보관합니다.
 */

const HistoryStorage = {
  STORAGE_KEY: 'global_voc_collection_history_v1',

  /**
   * 모든 수집 이력 조회
   */
  getAll() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('[Storage] 이력 조회 오류:', e);
      return [];
    }
  },

  /**
   * 신규 수집 결과 이력 저장
   * @param {Object} item 
   * {
   *   id: string,
   *   timestamp: string,
   *   country: string,
   *   product: string,
   *   sourcesCount: number,
   *   selectedSources: Array,
   *   isDemo: boolean,
   *   rawCsv: string (CSV 원문 텍스트)
   * }
   */
  saveItem(item) {
    try {
      const list = this.getAll();
      const newItem = {
        id: item.id || `hist_${Date.now()}`,
        timestamp: item.timestamp || new Date().toISOString(),
        country: item.country || 'US',
        product: item.product || 'Unknown',
        sourcesCount: item.sourcesCount || 0,
        selectedSources: item.selectedSources || [],
        isDemo: Boolean(item.isDemo),
        rawCsv: item.rawCsv || '' // 새로고침 후에도 CSV 다운로드를 보장하기 위해 원문 저장
      };

      // 최신순으로 맨 앞에 추가, 최대 25건 유지 (스토리지 용량 관리)
      list.unshift(newItem);
      if (list.length > 25) {
        list.pop();
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      return newItem;
    } catch (e) {
      console.error('[Storage] 이력 저장 실패:', e);
      // 용량 초과(QuotaExceededError) 시 오래된 항목 일부 정리 후 재시도
      try {
        const list = this.getAll().slice(0, 10);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      } catch (err) {}
      return null;
    }
  },

  /**
   * 특정 이력 삭제
   */
  deleteItem(id) {
    const list = this.getAll().filter(item => item.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    return list;
  },

  /**
   * 전체 이력 초기화
   */
  clearAll() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  /**
   * 특정 ID의 이력 조회
   */
  getById(id) {
    return this.getAll().find(item => item.id === id) || null;
  }
};
