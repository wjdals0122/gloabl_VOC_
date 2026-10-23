# 01-architecture-and-api-spec.md: 글로벌 VOC 수집기 API 규격 및 연동 가이드

> **문서 버전**: v2.1.0 (입력값 규칙 확정, 검색 URL 방식, 서버 고정 설정 정리)  
> **상태**: 🟡 백엔드(n8n) 2단계 엔드포인트 분리 작업 중 (인터페이스 합의안)  
> **변경 원칙**: 필드 이름·형식을 바꿀 때는 **이 문서를 먼저 수정·커밋하고 상대 담당자에게 알린다.** 이 문서에 적힌 내용이 정답이다.

---

## 0. 변경 이력

| 버전 | 변경 내용 | 영향 받는 쪽 |
| :--- | :--- | :--- |
| v2.1.0 | `country`는 ISO 2자리 코드로 고정 (드롭다운 선택) | 대시보드 |
| v2.1.0 | `product` 자유 입력 허용 (제품군 또는 모델명), 최대 80자 | 대시보드, n8n |
| v2.1.0 | `extraction_type`을 클라이언트가 선택해 전송 (2단계 요청에 추가) | 대시보드, n8n |
| v2.1.0 | `proxy_type`은 서버에서 `residential`로 고정, 클라이언트 전송 금지 | n8n |
| v2.1.0 | 1단계 응답의 `url`은 홈페이지가 아닌 **사이트 내 검색 결과 페이지 URL**, `search_query` 필드 추가 | 대시보드, n8n |
| v2.1.0 | 로그인이 필요한 SNS 출처 제외 규칙 추가 | n8n |
| v2.1.0 | 결과 CSV의 `status_code` 해석 기준 추가 | 대시보드 |

---

## 1. 아키텍처 개요

### 1.1 목표 2단계 연동 흐름
1. **[1단계] 출처 탐색**: 대시보드가 국가 코드와 제품명을 `POST /webhook/discover-voc-sources`로 전달하면, n8n이 AI로 후보 출처를 찾아 JSON 목록으로 반환한다.
2. **[2단계] 선택 출처 수집**: 사용자가 체크한 출처와 `extraction_type`을 `POST /webhook/collect-selected-sources`로 전달하면, n8n이 선택된 사이트만 ScrapingAnt로 스크래핑하고 결과 CSV를 반환한다.

### 1.2 n8n 내부 처리 흐름

```
[1단계] Webhook → 국가/제품 정리 → AI 사이트 탐색 → 결과 정규화·필터링 → JSON 응답
[2단계] Webhook → 선택 출처 목록 → Python 스크래퍼(ScrapingAnt) → 결과 CSV 변환·저장 → CSV 응답
```

- **Python 스크래퍼**: `scrapper_code.py` 기반. 각 출처 URL에 `proxy_type`, `proxy_country`, `x-api-key`, `extraction_type`을 적용해 ScrapingAnt API를 호출한다.
- **API 키**: n8n Python runner 컨테이너의 환경변수(`SCRAPINGANT_API_KEY`)에서만 읽는다. 워크플로우, Webhook 요청, 대시보드 어디에도 키를 두지 않는다.

### 1.3 현재 구현 상태 (테스트용 단일 파이프라인)
현재 n8n에는 두 단계를 한 번에 실행하는 테스트용 Webhook(`POST /webhook/collect-global-voc`)이 있다. 이 파이프라인으로 각 단계의 출력 형식을 먼저 검증한 뒤, 위 두 엔드포인트로 나눈다.

| 단계 | 현재 테스트 파이프라인의 노드 |
| :--- | :--- |
| 1단계 | 1. Webhook → 2. 수집할 국가/제품 설정 → 3. AI 탐색 → 3. 사이트 목록 정규화 → 4·5. 사이트 리스트 CSV 생성·저장 |
| 2단계 | 6. CSV 로드 → 7. Python 스크래퍼 → 8·9. 결과 CSV 변환·저장 → 10. Webhook 응답 |

---

## 2. 공통 입력값 규칙

| 필드 | 형식 | 규칙 |
| :--- | :--- | :--- |
| `country` | 문자열, **ISO 3166-1 alpha-2 대문자 2자리** (예: `US`, `JP`, `DE`) | 대시보드는 **드롭다운으로 선택**하게 하고 코드값을 전송한다. 화면 표시는 "일본"처럼 하되 전송값은 `JP`. ScrapingAnt의 `proxy_country`에 그대로 쓰이므로 `일본`, `Japan` 같은 값은 스크래핑 단계에서 실패한다. |
| `product` | 문자열, 1~80자 | **자유 입력**. 제품군(예: `세탁건조기`, `OLED TV`) 또는 정확한 모델명(예: `WD25DB8995BZ`, `OLED65G4`) 모두 허용. 서버는 앞뒤 공백을 제거하고 80자까지만 사용한다. |
| `extraction_type` | `general` \| `markdown` \| `extended` | 2단계 요청에서만 사용. 생략 시 `markdown`. (`extract`는 `extract_properties` 지원 후 추가 예정) |

- 모든 요청은 **`Content-Type: application/json`** 헤더와 함께 JSON 본문으로 보낸다. 헤더가 없으면 n8n이 본문을 문자열로 받아 값을 읽지 못한다.

---

## 3. API 엔드포인트 세부 규격

### 3.1 [엔드포인트 1] 후보 출처 탐색 (`discoverSources`)
* **Method**: `POST`
* **Path**: `/api/voc/discover-sources` (n8n Webhook: `/webhook/discover-voc-sources`)
* **Headers**: `Content-Type: application/json`

#### 요청 본문 (Request Body)
```json
{
  "country": "JP",
  "product": "세탁건조기"
}
```

#### 응답 본문 (Response Body - 200 OK)
```json
{
  "status": "success",
  "sources": [
    {
      "source_id": "src_jp_01",
      "site_name": "Kakaku.com",
      "category": "Price Comparison",
      "url": "https://kakaku.com/search_results/%E6%B4%97%E6%BF%AF%E4%B9%BE%E7%87%A5%E6%A9%9F/",
      "search_query": "洗濯乾燥機",
      "description": "일본 소비자들이 구매 전 가장 많이 참고하는 가격비교·리뷰 사이트"
    },
    {
      "source_id": "src_jp_02",
      "site_name": "Reddit",
      "category": "Community/Forum",
      "url": "https://www.reddit.com/search/?q=%E6%B4%97%E6%BF%AF%E4%B9%BE%E7%87%A5%E6%A9%9F",
      "search_query": "洗濯乾燥機",
      "description": "실사용자 장단점 토론 커뮤니티"
    }
  ]
}
```

| 필드 | 설명 |
| :--- | :--- |
| `source_id` | 출처 식별자. n8n이 `src_{국가코드 소문자}_{순번 2자리}` 형식으로 생성 |
| `site_name` | 사이트 이름 |
| `category` | `E-commerce` \| `Community/Forum` \| `Tech Review` \| `Price Comparison` |
| `url` | **사이트 내 검색 결과 페이지 URL** (검색어 URL 인코딩 완료). 홈페이지 URL은 반환하지 않는다. |
| `search_query` | 해당 사이트에서 검색에 사용한 검색어. 제품군은 현지어로 번역, 모델명은 그대로 사용 |
| `description` | 이 국가에서 이 제품 VOC 수집에 적합한 이유 (한국어 한 문장). AI 출력의 `reason`을 n8n이 `description`으로 매핑 |

#### 출처 선정 규칙 (n8n 책임)
1. **국가 일치**: 요청한 국가의 현지 사이트 또는 해당 국가 도메인/언어 버전만 포함한다. (예: JP → `amazon.co.jp`, `kakaku.com`)
2. **제품 관련성**: 제품 카테고리와 맞는 사이트만 포함한다. (예: 가전 제품에 화장품 리뷰 사이트 제외)
3. **SNS 제외**: 로그인 없이 내용을 볼 수 없는 SNS는 제외한다. 프롬프트 지시와 별개로 **코드에서 도메인 차단 목록으로 한 번 더 걸러낸다.**
   - 차단 도메인: `twitter.com`, `x.com`, `facebook.com`, `fb.com`, `instagram.com`, `tiktok.com`, `threads.net`, `linkedin.com`, `pinterest.com`, `snapchat.com`, `line.me`, `weibo.com`, `weixin.qq.com`
4. **커뮤니티 허용**: 로그인 없이 읽을 수 있는 커뮤니티·포럼·리뷰·이커머스·가격비교 사이트는 포함한다.
5. **결과 개수**: 7~10개 목표. 필터링 후 0개면 에러를 반환한다.

---

### 3.2 [엔드포인트 2] 선택 출처 수집 실행 (`collectSelectedSources`)
* **Method**: `POST`
* **Path**: `/api/voc/collect-selected-sources` (n8n Webhook: `/webhook/collect-selected-sources`)
* **Headers**: `Content-Type: application/json`
* **Response**: Binary CSV Attachment (`text/csv; charset=utf-8`)

#### 요청 본문 (Request Body)
```json
{
  "country": "JP",
  "product": "세탁건조기",
  "extraction_type": "markdown",
  "selected_sources": [
    {
      "source_id": "src_jp_01",
      "url": "https://kakaku.com/search_results/%E6%B4%97%E6%BF%AF%E4%B9%BE%E7%87%A5%E6%A9%9F/",
      "site_name": "Kakaku.com"
    }
  ]
}
```

#### 서버 측 고정 설정 (클라이언트 전송 금지)
| 항목 | 값 / 위치 |
| :--- | :--- |
| `api_key` | n8n Python runner 컨테이너 환경변수 `SCRAPINGANT_API_KEY` |
| `proxy_type` | `residential` 고정 |
| `proxy_country` | 요청의 `country` 값을 그대로 사용 |
| 결과 파일 저장 경로 | `/data/shared/` 하위 (n8n 파일 접근 허용 경로) |

---

## 4. 결과 CSV 필드 명세

| 컬럼명 | 설명 | 대시보드 표시 위치 |
| :--- | :--- | :--- |
| `country` | 수집 대상 국가 코드 | 결과 요약 메타 |
| `product` | 타겟 제품명 (사용자 입력값) | 헤더 및 결과 메타 |
| `site_name` | 출처 사이트명 | 카드 헤더 및 요약 테이블 |
| `source_url` | 스크래핑 대상 URL (검색 결과 페이지) | 페이지 열기 링크 |
| `proxy_type` | 프록시 유형 (항상 `residential`) | 기술 정보 섹션 |
| `extraction_type` | 추출 모드 | 기술 정보 섹션 |
| `status_code` | ScrapingAnt 응답 코드 | 상태 배지 (아래 표 참고) |
| `voc_content` | 스크래핑된 본문 (`extraction_type`에 따라 HTML / 마크다운 / 텍스트) | 사이트별 본문 프리뷰 (접이식) |

### 4.1 `status_code` 해석 기준
사이트 하나가 실패해도 나머지는 계속 수집하며, 실패한 행도 CSV에 포함된다.

| 코드 | 의미 | 대시보드 표시 예시 |
| :--- | :--- | :--- |
| `200` | 수집 성공 | 수집 완료 |
| `403` | API 키 오류 (서버 설정 문제) | 서버 설정 오류 |
| `422` | 요청 거부. 예: 현재 ScrapingAnt 플랜에서 허용되지 않는 도메인 | 수집 불가 사이트 |
| `500` | 네트워크 오류 또는 대상 사이트 응답 실패 | 일시적 오류 |

---

## 5. 알려진 제약 사항
- **검색 결과 페이지 ≠ 리뷰 페이지**: 1단계 `url`은 검색 결과 페이지라서 리뷰 본문이 일부만 담길 수 있다. 개별 리뷰 페이지까지 수집하는 기능은 추후 단계에서 검토한다.
- **ScrapingAnt 무료 플랜 도메인 제한**: Amazon 같은 대형 도메인은 무료 플랜에서 `422`로 거부된다. 플랜 변경 전까지는 해당 출처가 `422`로 기록된다.
