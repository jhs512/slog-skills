---
name: setup
description: slog(slog.gg) API 인증 셋업 — apiKey를 확보해 ~/.slog/apiKey.secret에 저장하고 검증. "slog 로그인/연동/셋업/인증", slog 글 CRUD 시 apiKey가 없을 때 사용. 브라우저 카카오 로그인에서 쿠키 추출 또는 username/password 로그인 지원.
---

# slog API 인증 셋업

목표: 유효한 apiKey를 `~/.slog/apiKey.secret`에 저장한다. apiKey는 UUID 문자열이며 로그아웃해도 만료되지 않는다.

Base URL: 기본 `https://api.slog.gg`. 로컬 개발 서버 대상이면 `~/.slog/baseUrl`에 `http://localhost:8080`을 저장하고 이후 그 값을 사용.

## 0. 이미 있는지 확인

```bash
cat ~/.slog/apiKey.secret 2>/dev/null | head -c 8   # 앞 8자만 확인 (전체 출력 금지)
```

있으면 바로 검증(§3)으로 간다. 유효하면 셋업 종료.

## 1-A. 방법 1: username/password 로그인 (계정에 비밀번호가 있는 경우)

사용자에게 확인 후, **사용자가 직접** 아래를 실행하게 한다 (에이전트가 비밀번호를 입력받지 않는다):

```bash
mkdir -p ~/.slog
curl -s -X POST "https://api.slog.gg/member/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"아이디","password":"비밀번호"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['data']['apiKey'])" \
  > ~/.slog/apiKey.secret
```

주의: 이 로그인 요청에는 `Authorization` 헤더를 붙이면 안 된다(무효 헤더가 있으면 401).

## 1-B. 방법 2: 브라우저 카카오 로그인 + 쿠키 추출 (기본)

slog는 주로 카카오 소셜 로그인을 쓴다. `apiKey` 쿠키는 **httpOnly라서 페이지 JS(`document.cookie`)로는 못 읽는다.** DevTools 프로토콜 기반 브라우저 도구(chrome-devtools MCP 등)로 **네트워크 요청 헤더에서 추출**해야 한다.

절차:

1. 브라우저 도구로 `https://www.slog.gg` (로컬이면 `http://localhost:3000`) 를 연다.
2. **사용자에게 카카오 로그인을 직접 해달라고 요청한다.** (로그인·비밀번호 입력은 절대 대행하지 않는다)
3. 로그인 완료 확인 후 페이지를 새로고침(또는 아무 글이나 이동)해서 백엔드 API 요청이 발생하게 한다.
4. 네트워크 요청 목록에서 백엔드(base URL 도메인, 예: `api.slog.gg`)로 가는 요청을 하나 골라 **요청 헤더의 `Cookie`** 를 읽는다.
5. `apiKey=<UUID>` 값을 추출해 저장:

```bash
mkdir -p ~/.slog
printf '%s' '<추출한 UUID>' > ~/.slog/apiKey.secret
```

주의:
- 추출한 키 값을 채팅 응답에 전체 출력하지 말 것 (앞 8자 정도만).
- 브라우저 도구가 별도 프로필로 뜨는 경우(chrome-devtools MCP 등) 기존 로그인 세션이 없으므로 그 창에서 로그인해야 한다.

## 3. 검증

```bash
KEY=$(cat ~/.slog/apiKey.secret)
curl -s -o /dev/null -w "%{http_code}" "https://api.slog.gg/member/api/v1/auth/me" \
  -H "Authorization: Bearer $KEY"
```

- `200` → 성공. `curl -s .../auth/me -H "Authorization: Bearer $KEY"`로 닉네임을 받아 "OO 계정으로 연결됨"이라고 알려준다.
- `401` → 키가 잘못됨. §1로 돌아가 재시도.

## 4. 보안 수칙

- `apiKey.secret`은 절대 git에 커밋하지 않는다. 저장 위치가 저장소 안이라면 `.gitignore`에 추가.
- 키를 로그·채팅·커밋 메시지에 노출하지 않는다.
- 키가 유출됐다고 판단되면 현재로선 API로 키 회전이 불가능하므로 사용자에게 알린다.
