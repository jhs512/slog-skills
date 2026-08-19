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

## 사용 예시

### 최초 셋업 (apiKey 연동)

```
/slog:setup
```

> 브라우저가 뜨면 카카오 로그인만 직접 하면 됩니다. 이후 Claude가 apiKey를 추출해 `~/.slog/apiKey.secret`에 저장하고 계정 연결을 확인해 줍니다.

자연어로도 트리거됩니다:

```
slog 연동해줘
```

### 글 작성

```
슬로그에 "코틀린 코루틴 정리" 글 써서 올려줘. mermaid 다이어그램 포함해서.
```

```
이 저장소의 README 내용을 슬로그 글로 정리해서 비공개로 올려줘
```

### 글 조회/검색

```
내 슬로그 글 목록 보여줘 (임시저장 포함)
```

```
슬로그에서 "코루틴" 검색해줘
```

### 글 수정

```
슬로그 14300번 글에서 오타 고치고, 마지막에 참고 링크 섹션 추가해줘
```

> 수정 시 Claude가 원문을 먼저 받아 백업하고, slog 에디터 문법(커스텀 펜스·surl 링크·PPT 블록 등)을 깨뜨리지 않는지 검토한 뒤 PUT 합니다.

### 글 공개/삭제

```
14300번 글 공개로 바꿔줘 (목록 노출 포함)
```

```
14300번 글 삭제해줘
```

> 삭제는 되돌릴 수 없어 제목·id 확인 후 실행됩니다.

## 인증 방식

모든 API 요청: `Authorization: Bearer {apiKey}` (또는 쿠키 `apiKey`). 자세한 내용은 `skills/posts/references/api.md`.

기본 대상은 운영 서버(`https://api.slog.gg`)이며, 로컬 개발 서버를 쓰려면 `~/.slog/baseUrl`에 `http://localhost:8080`을 저장하면 됩니다.
