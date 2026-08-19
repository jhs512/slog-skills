# slog-skills

[slog(slog.gg)](https://www.slog.gg) 블로그 자동화를 위한 Claude Code 스킬 그룹(플러그인 `slog`).

## 설치

```
/plugin marketplace add jhs512/slog-skills
/plugin install slog@slog-skills
```

## 스킬

| 스킬 | 용도 |
|---|---|
| `slog:setup` | apiKey 확보(카카오 로그인 쿠키 추출 또는 로그인 API) → `~/.slog/apiKey.secret` 저장·검증 |
| `slog:posts` | 글 생성/조회/수정/삭제/목록/검색. slog 에디터 문법(references/editor.md)과 REST API 스펙(references/api.md) 포함 |

## 인증 방식

모든 API 요청: `Authorization: Bearer {apiKey}` (또는 쿠키 `apiKey`). 자세한 내용은 `skills/posts/references/api.md`.
