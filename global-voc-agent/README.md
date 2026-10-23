# 글로벌 VOC 수집기 대시보드 (Global VOC Collector Agent)

ScrapingAnt 및 AI 워크플로우를 기반으로 구현된 **출처 선택형 다국가 고객 리뷰(VOC) 수집·분석 대시보드**입니다.

---

## 📌 주요 특징 및 구현 원칙

본 대시보드는 첨부된 `global_voc_scraper_workflow.json`의 현재 워크플로우와 향후 분리 예정인 2단계 아키텍처에 맞춰 설계되었습니다.

1. **검색과 수집 요청의 분리**:
   - `discoverSources`: 국가·제품을 전달하고 후보 출처 목록을 수신
   - `collectSelectedSources`: 국가·제품·선택 출처 URL 목록을 전달하고 결과 CSV를 수신
   - 현재 단일 일괄 Webhook(`collect-global-voc`)을 출처 검색 버튼에 오연결하지 않도록 방어 설계
   - 실제 모드에서는 `출처 탐색 API 연결 필요` 안내를 표시하며, 데모 모드에서 출처 선택 흐름을 사전 검증 가능
2. **출처 데이터 표기 규격**:
   - 사이트명 옆에 `category`를 유형 배지로 표시
   - `description`을 한 줄 설명으로 표시 (누락 시 '사이트 설명 미확인' 표기, 임의 날조 금지)
   - `product_match`, `review_status`, `review_count` 누락 시 각각 '미확인'으로 정직하게 표기
   - Google 검색 연동 확인 전까지 실제 모드에서는 '후보 출처'로 표기
3. **보안 및 서버 격리 설계**:
   - ScrapingAnt `proxy_type`, `extraction_type`, `extract_properties`는 서버 측 설정으로 분리
   - ScrapingAnt API Key는 프론트엔드 코드, 브라우저 스토리지, 요청 본문에 절대 노출하지 않고 서버/n8n 환경변수로 격리
4. **결과 데이터 표시 (사이트별 수집 결과)**:
   - 탭 1: **사이트별 수집 내용** (사이트명, URL, HTTP 상태 코드, voc_content 아코디언 및 상세 패널)
   - 탭 2: **출처·처리 결과 요약** (HTTP 상태, 프록시, 추출 모드, 바이트 크기)
   - 평점/작성일 등 구조화 데이터는 백엔드 정형 파서 제공 전까지 임의 표시 금지
   - HTTP 200 수신을 '리뷰 추출 성공'으로 단정하지 않고 '원문 수신됨'으로 명확히 구분
   - 외부 HTML 실행 방지 XSS 새니타이징 적용
5. **정직한 4대 진행 상태 표시**:
   - 실제 모드에서는 `요청 전`, `요청 처리 중`, `응답 수신 완료`, `요청 실패` 4가지 상태만 표시 (가짜 % 진행률, 가짜 시간 카운트다운 금지)
   - 데모 모드의 상세 상태는 `[시뮬레이션]` 라벨 명시
6. **파일 다운로드 및 영구 로컬 이력**:
   - 백엔드가 반환하는 바이너리 CSV 응답을 받아 `수집 결과 CSV`로 브라우저 즉시 다운로드
   - 화면에 표시된 출처 데이터를 기반으로 `출처 목록 CSV` 생성 다운로드
   - `이 브라우저에 저장된 이력`임을 명시하고, 새로고침 후에도 다운로드가 가능하도록 CSV 원문 텍스트를 로컬 스토리지에 보관
7. **팀원 인수인계 문서 완비**:
   - `01-architecture-and-api-spec.md` 파일 및 대시보드 상단 `[📘 API 연동 규격서]` 모달 제공

---

## 🚀 빠른 시작 (Quick Start)

### 실행 방법
외부 라이브러리 설치 없이 Node.js 기본 내장 모듈로 바로 구동됩니다:

```bash
cd "AI Agent/global-voc-agent"
node server.js
```

브라우저에서 `http://localhost:3005` 접속.

---

## 📂 프로젝트 구조

```
AI Agent/global-voc-agent/
├── 01-architecture-and-api-spec.md      # 팀원 전달용 API 연동 규격서
├── global_voc_scraper_workflow.json     # 첨부된 원본 n8n 워크플로우
├── server.js                            # 정적 서빙 및 로컬 테스트용 Mock 서버
├── package.json                         # 프로젝트 메타데이터
├── README.md                            # 본 문서
└── dashboard/
    ├── index.html                       # 대시보드 메인 HTML5
    ├── css/
    │   └── style.css                    # 프리미엄 다크 테마 & 글래스모피즘 스타일시트
    └── js/
        ├── config.js                    # API 엔드포인트 및 서버 격리 설정
        ├── storage.js                   # 브라우저 로컬 스토리지 수집 이력 관리
        ├── mock_data.js                 # 데모 모드 시뮬레이션 데이터셋
        ├── csv_exporter.js              # CSV 파서 및 안전 다운로드 유틸
        ├── api.js                       # 분리된 API 연결 계층 (discover/collect)
        ├── views/
        │   ├── source_view.js           # 1단계 출처 탐색/선택 뷰
        │   ├── results_view.js          # 2단계 수집 실행/결과 뷰
        │   ├── history_view.js          # 3단계 브라우저 수집 이력 뷰
        │   └── api_docs_view.js         # API 규격서 모달 뷰
        └── app.js                       # 전역 오케스트레이터
```
