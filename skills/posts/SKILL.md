---
name: posts
description: slog(slog.gg) 블로그 글 CRUD — 글 생성/조회/수정/삭제/목록/검색을 REST API로 수행. "슬로그에 글 써줘/올려줘", "slog 글 수정/삭제", "내 글 목록" 등의 요청에 사용. 수정 전 에디터 문법 레퍼런스 필수 참조.
---

# slog 글 CRUD

## 사전 조건

apiKey가 필요하다. 아래 순서로 찾고, 없으면 **setup 스킬**(slog:setup)을 먼저 실행하라.

1. 환경변수 `SLOG_API_KEY`
2. `~/.slog/apiKey.secret` 파일 (내용 = apiKey 한 줄)

Base URL: 기본 `https://api.slog.gg`. `~/.slog/baseUrl` 파일이 있으면 그 값 사용 (로컬 개발: `http://localhost:8080`).

## 인증 방법

모든 요청에 헤더 하나만 붙인다:

```
Authorization: Bearer {apiKey}
```

- **`Origin` 헤더를 붙이지 말 것** (붙이면 403). curl 기본 동작이면 안전.
- apiKey 값을 채팅/로그에 그대로 출력하지 말 것.

## 핵심 규칙 (틀리기 쉬움)

1. **GET 응답은 DTO 그대로, POST/PUT/DELETE 응답은 `{resultCode, msg, data}` (RsData) 래핑** — 파싱 분기 필수.
2. 글 생성 성공은 HTTP **201**.
3. `title` 2~100자, `content` 2자 이상 — 둘 다 필수(생략하면 400).
4. PUT은 title/content **전체 덮어쓰기**. `published`/`listed`는 생략하면 기존 값 유지.
5. `published=false`면 `listed`도 자동 false. 목록에 뜨려면 둘 다 true.
6. 상세 스펙: [references/api.md](references/api.md)

## 워크플로

### 새 글 작성

1. **먼저 [references/editor.md](references/editor.md)를 읽고** 본문을 slog 문법으로 작성한다. `# 요약` 컨벤션으로 시작하는 것을 권장.
2. `POST /post/api/v1/posts` — body `{title, content, published, listed}`.
   - 사용자가 공개 여부를 명시하지 않았으면 **`published:false`(비공개)로 만들고 URL을 알려준 뒤 공개 여부를 물어라.** 공개 글 게시는 외부 공개 행위다.
3. 응답 `data.id`로 URL 안내: `https://www.slog.gg/p/{id}`

### 글 수정 (가장 주의)

1. `GET /post/api/v1/posts/{id}` 로 현재 원문(`content`)을 받는다.
2. 수정 전 원문을 로컬에 백업한다 (`~/.slog/backup/{id}/{timestamp}.md`).
3. **[references/editor.md](references/editor.md) 문법 기준으로** 원문 위에서 편집한다. 기존 커스텀 블록(` ```mermaid `, `$$hide`, `<details ppt-id>`, `surl:` 링크, `# 요약` 등)을 깨뜨리지 않았는지 검토.
4. `PUT /post/api/v1/posts/{id}` — `{title, content}` (published/listed는 바꿀 때만 포함).
5. 수정은 작성자 본인만 가능(관리자도 불가).

### 조회/목록/검색

- 단건: `GET /posts/{id}` (비공개 글은 본인만). 본문 전체를 마크다운으로 읽으려면 프론트의 `GET https://www.slog.gg/p/{id}/raw`도 가능.
- 내 글 전부(임시/비공개 포함): `GET /posts/mine?page=1&pageSize=30`
- 공개 글 검색: `GET /posts?kw=검색어` (공백=AND, `OR`, `-제외`, `"구문"`, `영문*`)

### 삭제

`DELETE /posts/{id}` — **되돌릴 수 없다. 반드시 사용자에게 글 제목·id를 보여주고 확인받은 뒤 실행.**

### 임시글

`POST /posts/temp` (바디 없음) — 기존 임시글 재사용 또는 신규 생성 후 id 반환. 이후 PUT으로 내용 채움. 프론트 에디터와 같은 흐름이 필요할 때만 사용하고, 일반적인 API 작성은 `POST /posts` 한 번이면 된다.

## 빠른 예시

```bash
KEY=$(cat ~/.slog/apiKey.secret)
BASE=https://api.slog.gg

# 작성 (비공개)
curl -s -X POST "$BASE/post/api/v1/posts" \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"title":"제목","content":"# 요약\n\n- 한 줄 요약\n\n## 본문\n\n내용","published":false,"listed":false}'

# 조회 → 수정
curl -s "$BASE/post/api/v1/posts/123" -H "Authorization: Bearer $KEY"
curl -s -X PUT "$BASE/post/api/v1/posts/123" \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"title":"제목2","content":"수정된 본문"}'
```
