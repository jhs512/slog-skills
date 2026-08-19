# slog-skills

[slog(slog.gg)](https://www.slog.gg) 블로그 자동화를 위한 Claude Code 스킬 그룹(플러그인 `slog`).

## 설치

```
/plugin marketplace add jhs512/slog-skills
/plugin install slog@slog-skills
```

## 구조

- **`cli/slog.mjs`** — 실제 동작을 담당하는 CLI (Node 18+, 의존성 없음). 인증, CRUD, pull/push 동기화, **modifiedAt 기반 충돌 감지 + git 3-way 자동 병합**(충돌 시 마커 남기고 종료코드 3), **히스토리**(모든 명령 `~/.slog/logs/*.jsonl` 기록 + 덮어쓰기·삭제 전 `~/.slog/backup/<id>/` 자동 백업)까지 세밀한 로직은 전부 여기에.
- **스킬은 CLI 위의 얇은 층** — 언제 어떤 명령을 쓰는지, 본문을 어떤 문법으로 쓰는지만 안내.

| 스킬 | 용도 |
|---|---|
| `slog:setup` | apiKey 확보(카카오 로그인 쿠키 추출 또는 `slog auth login`) → CLI에 등록·검증 |
| `slog:posts` | `slog` CLI로 글 생성/조회/수정/삭제/목록/검색. slog 에디터 문법(references/editor.md) 포함 |

### CLI 단독 사용

```bash
node cli/slog.mjs help
node cli/slog.mjs auth set-key <apiKey>
node cli/slog.mjs pull 14300        # ~/.slog/docs/14300.md
# ...파일 편집...
node cli/slog.mjs push 14300        # 서버가 더 최신이면 자동 3-way 병합, 충돌 시 마커+exit 3
```

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
