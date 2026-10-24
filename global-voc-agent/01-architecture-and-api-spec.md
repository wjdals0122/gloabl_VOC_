# 01-architecture-and-api-spec.md: 글로벌 VOC 수집기 API 규격 및 연동 가이드

> **문서 버전**: v2.0.0 (출처 목록 간소화 및 2단계 분리 아키텍처)  
> **상태**: 🟡 백엔드 엔드포인트 분리 작업 대기 중 (인터페이스 합의안)

---

## 1. 아키텍처 개요

### 1.1 현재 워크플로우 한계 (`global_voc_scraper_workflow.json`)
현재 n8n 워크플로우는 단일 Webhook(`POST /collect-global-voc`)으로 **후보 탐색부터 스크래핑까지 일괄 실행**합니다.  
사용자가 원하는 사이트만 선별하여 수집할 수 있도록 **[1단계: 출처 탐색]**과 **[2단계: 선택 출처 수집]** 2개의 독립 엔드포인트로 분리해야 합니다.

### 1.2 목표 2단계 연동 흐름
1. **[1단계] 출처 탐색**:
   - 프론트엔드가 국가코드와 제품명을 `POST /webhook/discover-voc-sources`로 전달
   - 백엔드는 후보 출처 목록 JSON 반환 (`site_name`, `category`, `url`, `description`)
2. **[2단계] 선택 출처 수집**:
   - 사용자가 체크한 출처 URL 배열을 `POST /webhook/collect-selected-sources`로 전달
   - 백엔드는 선택된 사이트만 ScrapingAnt로 스크래핑 후 결과 CSV 바이너리 파일 반환

---

## 2. API 엔드포인트 세부 규격

### 2.1 [엔드포인트 1] 후보 출처 탐색 (`discoverSources`)
* **Method**: `POST`
* **Path**: `/api/voc/discover-sources` (n8n Webhook: `/webhook/discover-voc-sources`)
* **Headers**: `Content-Type: application/json`

#### 요청 본문 (Request Body)
```json
{
  "country": "US",
  "product": "OLED TV G4"
}
```

#### 응답 본문 (Response Body - 200 OK)
```json
{
  "status": "success",
  "sources": [
    {
      "source_id": "src_us_bestbuy_01",
      "site_name": "Best Buy US",
      "category": "가전 판매점",
      "url": "https://www.bestbuy.com/site/reviews/oled-tv-g4",
      "description": "북미 대표 전자제품 리테일 실사용자 리뷰 및 평점"
    },
    {
      "source_id": "src_us_reddit_02",
      "site_name": "Reddit r/OLED",
      "category": "커뮤니티",
      "url": "https://www.reddit.com/r/OLED/comments/g4_review",
      "description": "실제 테크 유저 및 게이머 화질, 번인 실사용 토론"
    }
  ]
}
```

---

### 2.2 [엔드포인트 2] 선택 출처 수집 실행 (`collectSelectedSources`)
* **Method**: `POST`
* **Path**: `/api/voc/collect-selected-sources` (n8n Webhook: `/webhook/collect-selected-sources`)
* **Headers**: `Content-Type: application/json`
* **Response**: Binary CSV Attachment (`text/csv; charset=utf-8`)

#### 요청 본문 (Request Body)
```json
{
  "country": "US",
  "product": "OLED TV G4",
  "selected_sources": [
    {
      "source_id": "src_us_bestbuy_01",
      "url": "https://www.bestbuy.com/site/reviews/oled-tv-g4",
      "site_name": "Best Buy US"
    }
  ]
}
```

#### 서버 측 격리 설정 (클라이언트 전송 금지)
- `api_key`: n8n/서버 환경변수로 주입
- `proxy_type`: datacenter / residential
- `extraction_type`: markdown

---

## 3. 결과 CSV 필드 명세

| 컬럼명 | 설명 | 대시보드 표시 위치 |
| :--- | :--- | :--- |
| `country` | 수집 대상 국가 | 결과 요약 메타 |
| `product` | 타겟 제품명 | 헤더 및 결과 메타 |
| `site_name` | 출처 사이트명 | 카드 헤더 및 요약 테이블 |
| `source_url` | 스크래핑 대상 URL | 페이지 열기 링크 |
| `proxy_type` | 프록시 유형 | 기술 정보 섹션 |
| `extraction_type` | 추출 모드 | 기술 정보 섹션 |
| `status_code` | HTTP 응답 코드 | 200 수신 (원문 수신됨) 배지 |
| `voc_content` | 스크래핑된 원문 텍스트 | 사이트별 본문 프리뷰 (접이식) |
