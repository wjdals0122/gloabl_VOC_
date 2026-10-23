/**
 * dashboard/js/views/api_docs_view.js
 * API 연결 규격서 및 팀원 인수인계 가이드 모달 뷰
 * 
 * [원칙]
 * 1. 출처 탐색 및 선택 출처 수집 요청/응답 예시 제공
 * 2. 현재 CSV 결과 필드 및 추가 구현 필요 항목 명시
 * 3. '합의 예정인 인터페이스'와 '현재 실제 백엔드에 존재하는 기능'을 명확히 구분
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
            <h3>📘 글로벌 VOC 수집기 API 연결 규격서 (팀원 전달용)</h3>
            <p class="modal-subtext">백엔드 및 n8n 워크플로우 엔지니어와 합의 예정인 인터페이스 규격서입니다.</p>
          </div>
          <button class="modal-close" onclick="ApiDocsView.closeModal()">&times;</button>
        </div>

        <div class="modal-body api-docs-body">
          <div class="notice-callout danger mb-3">
            <div class="callout-icon">⚠️</div>
            <div class="callout-text">
              <strong>중요: 합의 예정 인터페이스와 현재 백엔드 상태 구분</strong>
              <p>현재 워크플로우(<code>global_voc_scraper_workflow.json</code>)는 <strong>단일 Webhook(<code>POST /collect-global-voc</code>)</strong>으로 후보 사이트 생성부터 스크래핑까지 일괄 실행하고 최종 CSV를 반환합니다.<br>
              아래 작성된 <code>discoverSources</code> 및 <code>collectSelectedSources</code> 엔드포인트는 <strong>출처 선택형 UI를 위해 팀원이 2개로 분리 구현해야 하는 신규 규격</strong>이며, 아직 실제 백엔드에 존재하지 않습니다.</p>
            </div>
          </div>

          <!-- 섹션 1: discoverSources -->
          <div class="api-doc-section">
            <div class="section-badge-header">
              <span class="http-badge post">POST</span>
              <code>/api/voc/discover-sources</code>
              <span class="sub-label">(n8n Webhook: <code>/webhook/discover-voc-sources</code>)</span>
            </div>
            <h4>1. 후보 출처 탐색 (discoverSources)</h4>
            <p class="section-desc">국가 코드와 타겟 제품명을 전달하여 스크래핑 후보가 되는 현지 리뷰/커뮤니티/이커머스 URL 목록을 조회합니다.</p>

            <div class="code-block-wrapper">
              <div class="code-block-header">
                <span>요청 본문 (Request Body JSON)</span>
                <button class="btn btn-xs btn-outline" onclick="ApiDocsView.copyCode('code-discover-req')">복사</button>
              </div>
              <pre><code id="code-discover-req">{
  "country": "US",
  "product": "OLED TV G4"
}</code></pre>
            </div>

            <div class="code-block-wrapper mt-2">
              <div class="code-block-header">
                <span>응답 본문 (Response Body JSON - 200 OK)</span>
                <button class="btn btn-xs btn-outline" onclick="ApiDocsView.copyCode('code-discover-res')">복사</button>
              </div>
              <pre><code id="code-discover-res">{
  "status": "success",
  "sources": [
    {
      "source_id": "src_us_bestbuy_01",
      "site_name": "Best Buy US",
      "url": "https://www.bestbuy.com/site/reviews/oled-tv-g4",
      "category": "E-Commerce",
      "description": "북미 대표 전자제품 리테일 실사용자 리뷰",
      "product_match": "확인",
      "review_status": "확인",
      "review_count": "1,420건"
    },
    {
      "source_id": "src_us_reddit_02",
      "site_name": "Reddit r/OLED",
      "url": "https://www.reddit.com/r/OLED/comments/g4_review",
      "category": "Community/Forum",
      "description": "실제 게이머 및 테크 유저 번인/화질 실사용 평가",
      "product_match": "확인",
      "review_status": "확인",
      "review_count": "340건"
    }
  ]
}</code></pre>
            </div>
          </div>

          <hr class="doc-divider">

          <!-- 섹션 2: collectSelectedSources -->
          <div class="api-doc-section">
            <div class="section-badge-header">
              <span class="http-badge post">POST</span>
              <code>/api/voc/collect-selected-sources</code>
              <span class="sub-label">(n8n Webhook: <code>/webhook/collect-selected-sources</code>)</span>
            </div>
            <h4>2. 선택 출처 수집 실행 (collectSelectedSources)</h4>
            <p class="section-desc">사용자가 체크박스로 선택한 출처들만 백엔드로 전달하여 ScrapingAnt로 스크래핑을 실행하고 최종 CSV 파일을 반환합니다.</p>

            <div class="code-block-wrapper">
              <div class="code-block-header">
                <span>요청 본문 (Request Body JSON)</span>
                <button class="btn btn-xs btn-outline" onclick="ApiDocsView.copyCode('code-collect-req')">복사</button>
              </div>
              <pre><code id="code-collect-req">{
  "country": "US",
  "product": "OLED TV G4",
  "selected_sources": [
    {
      "source_id": "src_us_bestbuy_01",
      "url": "https://www.bestbuy.com/site/reviews/oled-tv-g4",
      "site_name": "Best Buy US"
    },
    {
      "source_id": "src_us_reddit_02",
      "url": "https://www.reddit.com/r/OLED/comments/g4_review",
      "site_name": "Reddit r/OLED"
    }
  ]
}</code></pre>
            </div>

            <div class="code-block-wrapper mt-2">
              <div class="code-block-header">
                <span>응답 규격 (Response Format)</span>
              </div>
              <pre><code>HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="scraped_voc_results.csv"

country,product,site_name,source_url,proxy_type,extraction_type,status_code,voc_content
US,"OLED TV G4","Best Buy US","https://www.bestbuy.com/...",datacenter,markdown,200,"## Customer Reviews..."</code></pre>
            </div>
          </div>

          <hr class="doc-divider">

          <!-- 섹션 3: 현재 CSV 결과 필드 명세 -->
          <div class="api-doc-section">
            <h4>3. 현재 워크플로우 CSV 결과 필드 명세</h4>
            <table class="voc-data-table mt-2">
              <thead>
                <tr>
                  <th>필드명</th>
                  <th>타입</th>
                  <th>설명</th>
                  <th>대시보드 표시 원칙</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>country</code></td>
                  <td>string</td>
                  <td>수집 국가코드 (예: US, JP, DE, PL)</td>
                  <td>출처·처리 결과 탭</td>
                </tr>
                <tr>
                  <td><code>product</code></td>
                  <td>string</td>
                  <td>타겟 제품명</td>
                  <td>헤더 및 메타 요약</td>
                </tr>
                <tr>
                  <td><code>site_name</code></td>
                  <td>string</td>
                  <td>출처 사이트명</td>
                  <td>카드 타이틀 및 요약 테이블</td>
                </tr>
                <tr>
                  <td><code>source_url</code></td>
                  <td>string</td>
                  <td>스크래핑 대상 URL</td>
                  <td>외부 열기 링크 (XSS 방지)</td>
                </tr>
                <tr>
                  <td><code>proxy_type</code></td>
                  <td>string</td>
                  <td>ScrapingAnt 프록시 유형 (datacenter/residential)</td>
                  <td>서버 설정 메타 배지</td>
                </tr>
                <tr>
                  <td><code>extraction_type</code></td>
                  <td>string</td>
                  <td>추출 모드 (markdown/extended/extract)</td>
                  <td>서버 설정 메타 배지</td>
                </tr>
                <tr>
                  <td><code>status_code</code></td>
                  <td>number</td>
                  <td>HTTP 응답 상태 코드 (200, 403, 500 등)</td>
                  <td>HTTP 200이라도 '리뷰 추출 성공'으로 해석하지 않고 '원문 수신됨'으로 정직하게 표기</td>
                </tr>
                <tr>
                  <td><code>voc_content</code></td>
                  <td>string</td>
                  <td>스크래핑된 본문 텍스트 (Markdown / Text)</td>
                  <td>HTML Escape 처리 후 접이식 아코디언 및 상세 모달로 안전하게 표시</td>
                </tr>
              </tbody>
            </table>
          </div>

          <hr class="doc-divider">

          <!-- 섹션 4: 백엔드 팀원 추가 구현 대기 항목 -->
          <div class="api-doc-section">
            <h4>4. 백엔드 팀원 추가 구현 요구사항 (Checklist)</h4>
            <ul class="checklist-box">
              <li><strong>1. Webhook 2개 분리</strong>: 현재의 단일 워크플로우를 <code>discover-voc-sources</code>(후보 탐색)와 <code>collect-selected-sources</code>(선택 수집) 2개로 분리</li>
              <li><strong>2. selected_sources 수신 및 필터링</strong>: 파이썬 스크래퍼(Node 7)에서 전체 CSV를 읽는 대신 Webhook 본문의 <code>selected_sources</code> 목록만 순회하도록 변경</li>
              <li><strong>3. 보안 격리</strong>: ScrapingAnt API Key를 프론트엔드로부터 전달받지 않고 n8n 환경변수(<code>$env.SCRAPINGANT_API_KEY</code>)로 고정 주입</li>
              <li><strong>4. 출처 메타데이터 보강</strong>: 사이트 탐색 노드에서 <code>description</code>, <code>product_match</code>, <code>review_status</code>, <code>review_count</code> 필드를 JSON에 추가</li>
              <li><strong>5. 비동기 Polling(Job ID) 구조 (선택)</strong>: 장기 작업 처리를 위해 즉시 <code>job_id</code>를 반환하고 진행 상태를 폴링하는 API 구축</li>
            </ul>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline btn-sm" onclick="ApiDocsView.downloadSpecMarkdown()">
            💾 명세서 마크다운(.md) 파일 저장
          </button>
          <button class="btn btn-secondary btn-sm" onclick="ApiDocsView.closeModal()">닫기</button>
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
  },

  downloadSpecMarkdown() {
    const link = document.createElement('a');
    link.href = '01-architecture-and-api-spec.md';
    link.download = '01-architecture-and-api-spec.md';
    link.click();
  }
};
