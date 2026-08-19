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

### 삭제

`$SLOG delete <id>` 를 먼저 실행하면 대상 제목을 보여주며 거부한다(안전장치). **사용자에게 제목·id를 확인받은 뒤** `--yes`를 붙여 실행. 되돌릴 수 없다.

## 알아두기

- `published`=접근 권한(false면 본인 외 403), `listed`=목록 노출. 비공개로 바꾸면 listed는 자동 false.
- title 2~100자, content 2자 이상(상한 없음).
- 수정은 작성자 본인만 가능(관리자도 불가).
- 이미지 업로드 API 없음 — 본문 이미지는 외부 URL만.
- PUT 성공 시 열려 있는 브라우저 뷰어에 실시간 반영된다.
- REST API 원시 스펙(CLI를 우회해야 하는 특수한 경우만): [references/api.md](references/api.md)
