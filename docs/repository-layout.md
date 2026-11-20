# 저장소 경로와 워크플로우 배포 기준

신규 import의 기준은 `workflows/n8n/`의 4개 JSON입니다. `최종`이라는 작업 상태명 대신 실행 플랫폼과 역할을 경로에 명시합니다.

| 이전 위치 | 현재 위치 |
| --- | --- |
| `최종/[시트 1] 마스터 컨트롤러 ... (1).json` | `workflows/n8n/01-master-controller.json` |
| `최종/[시트 2] Reddit 전용 2-Depth 수집기 (Apify 연동).json` | `workflows/n8n/02-reddit-collector.json` |
| `최종/[시트 3] 재귀 크롤러 (리뷰 나올 때까지 탐색).json` | `workflows/n8n/03-recursive-web-crawler.json` |
| `최종/[시트 4_ YouTube 수집기].json` | `workflows/n8n/04-youtube-collector.json` |
| `최종/AI노드_시스템프롬프트_정리.md` | `docs/ai-system-prompts.md` |
| `docker-compose.yml` | `infra/n8n/docker-compose.yml` |
| `.env.example` | `infra/n8n/.env.example` |

루트에 있던 시트 1~3의 이전 JSON, `sheet1-master-controller.json`, `sheet1-1depth-split.js`, `sheet3-input-prep.js`, `sheet3-page-prep.js`, `sheet3-result.js`를 정리했습니다. 워크플로우에서 실제 실행하는 코드는 JSON의 Code 노드 안에 있습니다. 별도 작업 파일 `sheet1-ai-prompt.txt`, `sheet1-final-merge.js`도 최종본 기준 정리 대상에 포함됩니다.

`test-scrape.js`는 존재하지 않는 `sheet3-recursive-crawler.json`을 참조해 제거했습니다. 현재 파일의 기본 검증은 `node tools/validate-workflows.mjs`로 실행합니다. 이 검사는 유료 수집 API를 호출하지 않습니다.

배포용 JSON에서 인스턴스·버전 식별자, Credentials 바인딩, 고정 실행 데이터와 개인 메일 주소를 정리했습니다. 하위 워크플로우 ID는 import 후 다시 선택하고, Credentials와 알림 주소를 설정해야 합니다. 원본의 Code 본문과 노드 연결은 유지합니다.

`global-voc-agent/` 전체와 `docs/images/`는 기존 대시보드 호환성을 위해 경로와 내용을 유지합니다. 여기에는 대시보드 서버, 패키지 설정, 연동 규격서, 기존 README와 그 문서가 참조하는 레거시 워크플로우가 포함됩니다. 루트 README의 기존 대시보드 소개 부분도 그대로 보존합니다.
