/**
 * dashboard/js/views/api_docs_view.js
 * API 연동 규격서 모달
 */

const ApiDocsView = {
  openModal() {
    const old = document.getElementById('modal-api-docs');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-api-docs';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-dialog modal-xl">
        <div class="modal-header">
          <div>
            <h3>글로벌 VOC 수집기 API 규격서 (팀원 전달용)</h3>
            <p class="modal-subtext">백엔드 및 n8n 워크플로우 엔지니어와 합의 예정인 인터페이스 규격입니다.</p>
          </div>
          <button type="button" class="modal-close" onclick="ApiDocsView.closeModal()">&times;</button>
        </div>

        <div class="modal-body api-docs-body">
          <div class="notice-callout mb-3">
            <strong>현재 백엔드 상태와의 구분</strong>
            <p>현재 워크플로우(<code>global_voc_scraper_workflow.json</code>)는 <strong>단일 Webhook(<code>POST /collect-global-voc</code>)</strong>으로 후보 탐색부터 수집까지 한 번에 실행합니다.<br>
            아래 명세는 사용자의 출처 선택 기능을 지원하기 위해 백엔드가 2개의 엔드포인트로 분리해야 할 목표 규격입니다.</p>
          </div>

          <!-- 엔드포인트 1 -->
          <div class="api-doc-section">
            <div class="section-badge-header">
              <span class="badge badge-info">POST</span>
              <code>/api/voc/discover-sources</code>
            </div>
            <h4>1. 후보 출처 탐색 (discoverSources)</h4>
            <p class="section-desc">국가 코드와 제품명을 전달받아 스크래핑 후보 사이트 목록을 반환합니다.</p>

            <div class="code-block-wrapper">
              <div class="code-block-header">
                <span>요청 본문 (Request Body JSON)</span>
                <button type="button" class="btn btn-xs btn-outline" onclick="ApiDocsView.copyCode('code-discover-req')">복사</button>
              </div>
              <pre><code id="code-discover-req">{
  "country": "US",
  "product": "OLED TV G4"
}</code></pre>
            </div>

            <div class="code-block-wrapper mt-2">
              <div class="code-block-header">
                <span>응답 본문 (Response Body JSON - 200 OK)</span>
                <button type="button" class="btn btn-xs btn-outline" onclick="ApiDocsView.copyCode('code-discover-res')">복사</button>
              </div>
              <pre><code id="code-discover-res">{
  "status": "success",
  "sources": [
    {
      "source_id": "src_us_bestbuy_01",
      "site_name": "Best Buy US",
      "category": "가전 판매점",
      "url": "https://www.bestbuy.com/site/reviews/oled-tv-g4",
      "description": "북미 대표 전자제품 리테일 실사용자 리뷰"
    },
    {
      "source_id": "src_us_reddit_02",
      "site_name": "Reddit r/OLED",
      "category": "커뮤니티",
      "url": "https://www.reddit.com/r/OLED/comments/g4_review",
      "description": "실제 게이머 및 테크 유저 실사용 평가"
    }
  ]
}</code></pre>
            </div>
          </div>

          <hr class="doc-divider">

          <!-- 엔드포인트 2 -->
          <div class="api-doc-section">
            <div class="section-badge-header">
              <span class="badge badge-info">POST</span>
              <code>/api/voc/collect-selected-sources</code>
            </div>
            <h4>2. 선택 출처 수집 실행 (collectSelectedSources)</h4>
            <p class="section-desc">체크된 출처 목록만 서버로 전달하여 ScrapingAnt 수집을 실행하고 최종 CSV 파일을 반환합니다.</p>

            <div class="code-block-wrapper">
              <div class="code-block-header">
                <span>요청 본문 (Request Body JSON)</span>
                <button type="button" class="btn btn-xs btn-outline" onclick="ApiDocsView.copyCode('code-collect-req')">복사</button>
              </div>
              <pre><code id="code-collect-req">{
  "country": "US",
  "product": "OLED TV G4",
  "selected_sources": [
    {
      "source_id": "src_us_bestbuy_01",
      "url": "https://www.bestbuy.com/site/reviews/oled-tv-g4",
      "site_name": "Best Buy US"
    }
  ]
}</code></pre>
            </div>

            <div class="code-block-wrapper mt-2">
              <div class="code-block-header">
                <span>응답 규격 (CSV 바이너리 다운로드)</span>
              </div>
              <pre><code>HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="scraped_voc_results.csv"

country,product,site_name,source_url,proxy_type,extraction_type,status_code,voc_content
US,"OLED TV G4","Best Buy US","https://www.bestbuy.com/...",datacenter,markdown,200,"## Customer Reviews..."</code></pre>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" onclick="ApiDocsView.closeModal()">닫기</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  closeModal() {
    const modal = document.getElementById('modal-api-docs');
    if (modal) modal.remove();
  },

  copyCode(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
      alert('클립보드에 복사되었습니다.');
    });
  }
};
