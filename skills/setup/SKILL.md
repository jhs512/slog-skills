---
name: setup
description: slog(slog.gg) API 인증 셋업 — apiKey를 확보해 slog CLI에 등록·검증. "slog 로그인/연동/셋업/인증", slog 글 CRUD 시 인증 실패할 때 사용. 브라우저 카카오 로그인 쿠키 추출 또는 username/password 로그인 지원.
---

# slog API 인증 셋업

목표: `slog auth verify`가 성공하는 상태. apiKey는 UUID이며 로그아웃해도 만료되지 않는다.

```bash
SLOG='node "${CLAUDE_PLUGIN_ROOT}/cli/slog.mjs"'
```

대상이 로컬 개발 서버면 이후 모든 명령에 `SLOG_BASE_URL=http://localhost:8080` 환경변수를 붙인다 (기본은 운영 `https://api.slog.gg`).

## 0. 이미 연동돼 있는지 확인

```bash
$SLOG auth verify
```

성공(`OK: 이름 ...`)이면 셋업 끝. 실패하면 아래로.

## 방법 1: username/password 로그인 (계정에 비밀번호가 있는 경우)

에이전트가 비밀번호를 대신 입력받지 않는다. **사용자가 직접** 실행하게 안내:

```bash
$SLOG auth login --username <아이디> --password <비밀번호>
```

성공 시 apiKey가 `~/.slog/apiKey.secret`에 저장된다.

## 방법 2: 브라우저 카카오 로그인 + 쿠키 추출 (기본)

slog는 주로 카카오 소셜 로그인을 쓴다. `apiKey` 쿠키는 **httpOnly라 페이지 JS(`document.cookie`)로는 못 읽는다.** DevTools 프로토콜 기반 브라우저 도구(chrome-devtools MCP 등)로 **네트워크 요청 헤더에서 추출**한다.

1. 브라우저 도구로 `https://www.slog.gg` (로컬이면 `http://localhost:3000`) 를 연다.
2. **사용자에게 카카오 로그인을 직접 해달라고 요청한다.** (아이디·비밀번호 입력 대행 금지)
3. 로그인 확인 후 페이지를 새로고침해 백엔드 API 요청이 발생하게 한다.
4. 네트워크 요청 중 백엔드 도메인(예: `api.slog.gg`)으로 가는 요청의 **요청 헤더 `Cookie`** 에서 `apiKey=<UUID>` 값을 읽는다.
5. 등록 + 검증:

```bash
$SLOG auth set-key <추출한 UUID>    # 저장 후 자동으로 verify까지 수행
```

주의:
- 키 값을 채팅 응답에 전체 출력하지 말 것(앞 8자 정도만).
- 브라우저 도구가 별도 프로필로 뜨는 경우 기존 세션이 없으므로 그 창에서 로그인해야 한다.

## ~/.slog 디렉터리 구조 (CLI가 자동 관리)

```
~/.slog/
  apiKey.secret        # 인증 키 (절대 커밋 금지)
  baseUrl              # (선택) 대상 서버 오버라이드
  docs/<id>.md         # pull한 작업본 (+ <id>.base.md, <id>.meta.json)
  logs/YYYY-MM.jsonl   # 모든 CLI 명령 실행 히스토리 (비밀값은 마스킹됨)
  backup/<id>/         # pull/push/delete 시점의 콘텐츠 스냅샷 (덮어쓰기·삭제 전 자동 백업)
```

히스토리 조회: `$SLOG log [--tail N]`, 글별 백업 목록: `$SLOG log <id> --backups`.

## 보안 수칙

- `~/.slog/apiKey.secret`을 git에 커밋하지 않는다.
- 키를 로그·채팅·커밋 메시지에 노출하지 않는다.
- 키 유출 의심 시 API로 키 회전이 불가능하므로 사용자에게 알린다.
