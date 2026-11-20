# global-voc-agent

대시보드, Mock API 서버, API 연동 규격서를 모아 둔 폴더입니다. 프로젝트 전체 설명은 [저장소 README](../README.md)를 참고하세요.

---

## 구성

```
global-voc-agent/
├── 01-architecture-and-api-spec.md   # 대시보드 ↔ n8n API 연동 규격서
├── global_voc_scraper_workflow.json  # 일괄 수집(CSV) 워크플로우
├── server.js                         # 대시보드 정적 서빙 + Mock API
├── package.json
└── dashboard/
    └── index.html                    # 통합 대시보드 (9개 화면, 단일 파일)
```

## 실행

```bash
cd global-voc-agent
node server.js
```

- 대시보드: http://localhost:3005/
- 특정 화면 바로 열기: http://localhost:3005/#/discover
- 외부 패키지 없이 Node.js 내장 모듈로 실행
- `dashboard/index.html`은 서버 없이 브라우저로 직접 열어도 동작

## 대시보드 화면

| 메뉴 | 주소 |
|---|---|
| 대시보드 | `#/dashboard` |
| 출처 탐색 | `#/discover` |
| 수집 결과 | `#/results` |
| 정기 모니터링 | `#/monitor` |
| 감성 분석 | `#/sentiment` |
| 추이 | `#/trend` |
| 영상 VoC | `#/video` |
| 설정 | `#/settings` |
| 계정 | `#/account` |

## Mock API

`server.js`는 대시보드 연동 규격과 같은 응답을 돌려줘서, n8n 백엔드 없이도 연동 흐름을 확인할 수 있습니다.

| Method · Path | 응답 |
|---|---|
| `POST /webhook/discover-voc-sources` | 후보 출처 목록 JSON |
| `POST /webhook/collect-selected-sources` | 수집 결과 CSV |

요청·응답 규격은 [`01-architecture-and-api-spec.md`](01-architecture-and-api-spec.md)를 따릅니다.

## 표시 원칙

- 진행 상태는 `요청 전` / `요청 처리 중` / `응답 수신 완료` / `요청 실패` 4가지로만 표시
- HTTP 200 수신을 "리뷰 추출 성공"으로 단정하지 않고 "원문 수신됨"으로 구분
- 응답에 없는 값은 추정하지 않고 `미확인`으로 표시
- API 키와 수집 설정(`proxy_type`, `extraction_type`)은 프론트엔드에 두지 않고 n8n에서만 관리
- 수집한 외부 텍스트는 이스케이프한 뒤 렌더링
