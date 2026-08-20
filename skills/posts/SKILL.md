---
name: posts
description: slog(slog.gg) 블로그 글 CRUD — 번들된 slog CLI로 글 생성/조회/수정/삭제/목록/검색. "슬로그에 글 써줘/올려줘", "slog 글 수정/삭제", "내 글 목록" 등의 요청에 사용. 본문 작성·수정 전 에디터 문법 레퍼런스 필수 참조.
---

# slog 글 CRUD

모든 작업은 번들된 CLI로 수행한다. 직접 curl/fetch를 짜지 말 것 — 병합·충돌 감지·RsData 파싱이 CLI에 들어 있다.

```bash
SLOG='node "${CLAUDE_PLUGIN_ROOT}/cli/slog.mjs"'   # 이하 $SLOG로 표기
```

(플러그인이 아닌 수동 클론 환경이면 저장소의 `cli/slog.mjs` 경로를 그대로 사용. Node 18+ 필요, 의존성 없음.)

## 사전 조건

`$SLOG auth verify`가 실패하면 **setup 스킬**(slog:setup)을 먼저 실행.

## 명령 요약

```
$SLOG auth verify                       # 계정 확인
$SLOG list [--mine] [--kw 검색어]        # 목록/검색 (mine=임시·비공개 포함)
$SLOG get <id> [--content]              # 메타 / 본문 원문
$SLOG pull <id>                         # ~/.slog/docs/<id>.md 로 받기
$SLOG status <id>                       # 로컬/서버 변경 여부
$SLOG push <id> [--title t] [--published true|false] [--listed true|false] [--force]
$SLOG create --title 제목 --content-file 파일 [--published true] [--listed true]
$SLOG temp                              # 임시글 생성/재사용
$SLOG delete <id> --yes
```

대상 서버는 기본 운영(`https://api.slog.gg`), 로컬 개발은 `SLOG_BASE_URL=http://localhost:8080`.

## 워크플로

### 새 글 작성

1. **먼저 [references/editor.md](references/editor.md)를 읽고** slog 문법으로 본문 파일을 작성한다. `# 요약` 컨벤션 시작 권장.
2. `$SLOG create --title "..." --content-file 본문.md`
   - 사용자가 공개 여부를 명시하지 않았으면 플래그 없이(비공개) 만들고, 출력된 URL을 보여준 뒤 공개 여부를 물어라. 공개는 `--published true --listed true`.
3. create는 자동으로 pull까지 해두므로 이어서 수정하려면 `~/.slog/docs/<id>.md`를 편집 후 push.

### 글 수정 (pull → 편집 → push)

1. `$SLOG pull <id>` → `~/.slog/docs/<id>.md`
2. **[references/editor.md](references/editor.md) 문법 기준으로** 파일을 편집. 기존 커스텀 블록(펜스·`$$hide`·`<details ppt-id>`·`surl:` 링크)을 깨뜨리지 않았는지 검토.
3. `$SLOG push <id>` — 공개 상태를 바꿀 때만 `--published/--listed` 추가.

**충돌 처리 (push가 알아서 감지한다):**

- 서버가 pull 시점보다 최신이면 CLI가 자동 3-way 병합을 시도한다. 성공 시 그대로 푸시됨.
- 자동 병합 실패 시 **종료코드 3** + 작업 파일에 `<<<<<<< local / >>>>>>> server` 충돌 마커가 남는다. 마커를 읽고 양쪽 의도를 살려 해소한 뒤 다시 `$SLOG push <id>`.
- `--force`는 서버 변경을 버리고 덮어쓴다 — **사용자가 명시적으로 요구할 때만.**
- 오래 전에 pull한 파일을 편집하기 전에는 `$SLOG status <id>`로 서버 변경 여부를 먼저 확인하면 충돌을 줄일 수 있다.

### 긴 글·연재 작성

수천 줄짜리 글이나 여러 편으로 나뉘는 연재를 쓸 때 실제로 깨졌던 것들이다.

**본문을 셸 히어독으로 만들지 마라.** 백틱·`$`·따옴표가 섞인 마크다운은 셸 인용을 자주 깨뜨린다. 파일에 쓴 뒤 `cat a.md b.md > 작업파일` 로 이어붙여라. 붙인 뒤 크기와 섹션 수를 세어 손실이 없는지 확인한다.

**출력은 지어내지 말고 실제로 실행해서 붙여라.** 코드 예제가 있는 글이면 검증용 환경(도커 컨테이너 등)을 먼저 띄우고, 글에 실을 모든 명령을 거기서 돌려 나온 출력을 그대로 옮긴다. 설치 절차를 싣는다면 **빈 상태에서 처음부터 설치해보고** 실제로 되는지 확인한다.

**장·강 번호를 바꾸면 상호참조가 조용히 깨진다.** 글을 확장하거나 절을 삽입하기 전에 먼저 세어라.

```bash
grep -o '[0-9]*강' 작업파일 | sort -u        # 자체 참조
grep -o '[0-9]권 [0-9]*강' 다른글            # 다른 글이 가리키는 참조
```

번호를 재배치했으면 **다른 글에서 이 글을 가리키는 참조도** 전부 갱신해야 한다. 참조는 링크가 아니라 그냥 텍스트라 깨져도 아무 에러가 안 난다.

**절 삽입은 번호를 밀지 않는 방법을 먼저 검토하라.** 앞에 새 내용을 넣어야 한다면, 번호 없는 명명 절(`# 시작하기 전에`, `# 0부`)로 두면 기존 번호와 참조를 하나도 안 건드린다.

**독자용 설치 명령은 실제로 받아서 실행해봐라.** `<details raw-id>` 로 배포하는 SQL·스크립트는 `www.slog.gg/p/{id}/raw/{rawId}` 를 실제로 받아 빈 환경에 부어보고 확인한다(호스트 주의는 5절 참고).

### 발행 전 자동 점검 (린트)

**푸시하기 전에 반드시 돌린다.** 저장·푸시는 성공하지만 렌더가 깨지는 것들을 잡아준다.

```bash
node "${CLAUDE_PLUGIN_ROOT}/cli/slog-lint.mjs" ~/.slog/docs/<id>.md
```

문제가 없으면 `OK`, 있으면 행 번호와 함께 `FAIL` 을 내고 종료코드 1을 준다.

| 코드 | 무엇을 잡나 |
|---|---|
| `TILDE` | 홑 물결표 — 취소선이 열려 뒤쪽 전체가 취소선이 된다 (`~~진짜 취소선~~` 은 통과) |
| `RAWTAG` | 하이라이팅 안 되는 펜스나 본문의 `<s>` 같은 태그 (인라인 코드·sql/bash 펜스는 통과) |
| `CARET` | `^^^` ASCII 밑줄 표기 — 학습자에게 안 읽힌다. 표로 바꿀 것 |
| `FENCE` | 닫히지 않은 코드펜스 |
| `RAWID` | `raw-id` 블록에 코드펜스가 없음 — raw 서빙이 404가 된다 |
| `SEQ` | `# N강` 번호가 끊김 |

**문서로 규칙을 적어두는 것만으로는 안 지켜진다.** 실제로 이 규칙들을 문서화한 뒤에도 물결표를 네 편의 글에 53개 다시 넣었다. 사람도 에이전트도 마찬가지이니 **기계가 검사하게 하라.**

### 발행 후 렌더 점검 (긴 글은 필수)

**저장·푸시가 성공해도 렌더가 깨질 수 있다.** API는 200을 주고 CLI도 조용하다. 브라우저로 열어 아래를 확인하라.

| 확인 | 방법 | 깨졌을 때 원인 |
|---|---|---|
| 취소선 전파 | `document.querySelectorAll('s, del, strike').length` 가 0 | 홑 물결표(`~`) — 8절 참고 |
| 깨진 이미지 | `[...document.querySelectorAll('img')].filter(i => i.naturalWidth === 0).length` 가 0 | 다이어그램 문법 오류 |
| `<details>` 내용 | `document.querySelector('details').querySelector('pre')` 가 있는지 | 5절 참고 |
| 펜스 노출 | 본문에 ` ``` ` 문자열이 보이지 않는지 | 커스텀 블록 파싱 실패 |
| 차트 | `document.querySelectorAll('canvas').length` | `chart` 블록 문법 오류 |

**깨진 이미지는 한 번 더 확인하라.** `plantuml.com`, `mermaid.ink` 는 외부 서비스라 일시적으로 로드에 실패한다. 새로고침해서 여전히 `naturalWidth === 0` 일 때만 문법 문제로 판단한다. 이미지 URL을 직접 받아 200이 오는지 보면 확실하다.

### 삭제

`$SLOG delete <id>` 를 먼저 실행하면 대상 제목을 보여주며 거부한다(안전장치). **사용자에게 제목·id를 확인받은 뒤** `--yes`를 붙여 실행. 되돌릴 수 없다.

## 알아두기

- `published`=접근 권한(false면 본인 외 403), `listed`=목록 노출. 비공개로 바꾸면 listed는 자동 false.
- title 2~100자, content 2자 이상(상한 없음).
- 수정은 작성자 본인만 가능(관리자도 불가).
- 이미지 업로드 API 없음 — 본문 이미지는 외부 URL만.
- PUT 성공 시 열려 있는 브라우저 뷰어에 실시간 반영된다.
- REST API 원시 스펙(CLI를 우회해야 하는 특수한 경우만): [references/api.md](references/api.md)
