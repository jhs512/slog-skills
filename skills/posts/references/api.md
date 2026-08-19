# slog REST API 레퍼런스 (글 CRUD)

Base URL: 운영 `https://api.slog.gg` / 로컬 dev `http://localhost:8080`

## 인증

- **권장(스크립트)**: `Authorization: Bearer {apiKey}` — apiKey 단독. accessToken 관리 불필요.
- 헤더 전체 형식은 `Authorization: Bearer {apiKey} {accessToken}` (공백 구분 2개)이지만 accessToken은 생략 가능.
- 쿠키 방식도 가능: `Cookie: apiKey={apiKey}; accessToken=EMPTY` — 단, `Authorization` 헤더가 있으면 쿠키는 무시됨.
- apiKey는 UUID 문자열. 로그아웃해도 무효화되지 않음(회원 탈퇴/키 회전 전까지 유효).
- **`Origin` 헤더를 절대 붙이지 말 것.** POST/PUT/DELETE에 임의 Origin이 있으면 `403-2 허용되지 않은 출처` 에러. curl은 기본으로 안 붙이므로 그냥 두면 됨.

## 응답 래핑 규칙 (중요)

- **GET(조회) → 래핑 없이 DTO/PageDto 그대로 반환**
- **POST/PUT/DELETE(변경) → `RsData` 래핑**: `{ "resultCode": "201-1", "msg": "...", "data": {...} }`
- HTTP 상태코드는 `resultCode`의 앞자리(예: 글 생성은 **201**).
- 에러도 RsData 형태: `{"resultCode":"401-1","msg":"로그인 후 이용해주세요."}` 등.

## 엔드포인트

### 글 목록(전체 공개글) — `GET /post/api/v1/posts`

- 쿼리: `page`(1-base, 기본 1), `pageSize`(기본 30, **최대 30**), `kw`(전문검색), `sort`(`CREATED_AT`|`CREATED_AT_ASC`|`MODIFIED_AT`|`MODIFIED_AT_ASC`)
- 인증 불필요. `published=true AND listed=true`인 글만.
- 응답: `PageDto<PostDto>` = `{ content: [...], pageable: { pageNumber, pageSize, offset, totalElements, totalPages, numberOfElements, sorted } }`
- `PostDto`: `id, createdAt, modifiedAt, authorId, authorName, authorProfileImgUrl, title, published, listed, likesCount, commentsCount, hitCount, actorHasLiked` — **content 없음**

### 내 글 목록 — `GET /post/api/v1/posts/mine`

- 인증 필수. 파라미터/응답은 전체 목록과 동일.
- published/listed 무관하게 **임시저장·비공개 글 전부 포함**.

### 단건 조회 — `GET /post/api/v1/posts/{id}`

- 응답: `PostWithContentDto` (래핑 없음) = PostDto 필드 + `content`, `actorCanModify`, `actorCanDelete`
- 비공개(`published=false`) 글은 작성자/관리자만 조회 가능(아니면 403-3). 없는 id는 404-1.
- 선택 쿼리 `lastModifiedAt`(ISO-8601): 그 이후 수정이 없으면 `304` 빈 본문.

### 생성 — `POST /post/api/v1/posts`

바디(JSON):

| 필드 | 필수 | 검증 | 기본값 |
|---|---|---|---|
| `title` | ✅ | 2~100자 | — |
| `content` | ✅ | 2자 이상(상한 없음) | — |
| `published` | ❌ | boolean | `false` |
| `listed` | ❌ | boolean | `false` |

- 응답: `RsData<PostDto>`, HTTP **201**, `resultCode="201-1"`.
- `title`/`content` 키를 JSON에서 생략하면 `400-1 요청 본문이 올바르지 않습니다`.

### 수정 — `PUT /post/api/v1/posts/{id}`

- 바디는 생성과 동일하되 `published`/`listed`는 **null(생략)이면 기존 값 유지**. `title`/`content`는 항상 전체 덮어쓰기.
- **작성자 본인만 가능**(관리자도 불가). 403-1.
- 정규화: `published=false`로 바꾸면 `listed`는 자동 `false`.
- 응답: `RsData<PostDto>`, 200.

### 삭제 — `DELETE /post/api/v1/posts/{id}`

- 작성자 또는 관리자. 응답: `RsData<Void>` (`data: null`), 200.

### 임시글 생성/조회 — `POST /post/api/v1/posts/temp`

- 바디 없음. 인증 필수.
- 내 글 중 `title=="임시글" && published==false`인 가장 오래된 글을 반환(200), 없으면 새로 생성(201, `title="임시글"`, `content="임시글 입니다."`, published=false, listed=false).
- 응답: `RsData<PostWithContentDto>`
- **프론트 작성 패턴**: temp로 id 확보 → `PUT /posts/{id}`로 실제 title/content + `published/listed` 설정.

### 부가

- `POST /post/api/v1/posts/{id}/hit` — 조회수 증가(비인증 가능, 본인 글은 미증가). `RsData<{hitCount}>`
- `POST /post/api/v1/posts/{id}/like` — 좋아요 토글(인증). `RsData<{liked, likesCount}>`

### 댓글 — `/post/api/v1/posts/{postId}/comments`

| 메서드 | 경로 | 바디 | 응답 | 권한 |
|---|---|---|---|---|
| GET | `` | — | `List<PostCommentDto>` (래핑 없음) | 공개글이면 비인증 가능 |
| GET | `/{id}` | — | `PostCommentDto` (래핑 없음) | 동일 |
| POST | `` | `{content}` 2~100자 | `RsData<PostCommentDto>` 201 | 인증 |
| PUT | `/{id}` | `{content}` 2~100자 | `RsData<Void>` | 작성자 |
| DELETE | `/{id}` | — | `RsData<Void>` | 작성자/관리자 |

### 인증 관련

- `POST /member/api/v1/auth/login` — 바디 `{username, password}` (각 2~30자). 응답 `RsData<{item, apiKey, accessToken}>`. **이 요청에는 Authorization 헤더를 붙이지 말 것**(무효 헤더가 있으면 401-3으로 실패).
- `GET /member/api/v1/auth/me` — 현재 인증 회원 정보(래핑 없음). **apiKey 검증용으로 사용.**
- `DELETE /member/api/v1/auth/logout` — 쿠키만 삭제, apiKey는 계속 유효.

## published vs listed

- `published`: 접근 권한. `false`면 작성자/관리자 외 단건 조회도 403.
- `listed`: 공개 목록 노출 여부. `published=true, listed=false` = 링크 아는 사람만 보는 unlisted.
- 임시저장 = `published=false`.

## 함정 체크리스트

1. GET은 래핑 없음, 변경 계열은 RsData — 파싱 분기 필수.
2. 글 생성 응답은 HTTP 201.
3. `Origin` 헤더 금지.
4. `pageSize` 최대 30 (초과 값은 서버가 잘라냄).
5. 작성 후 목록에 안 보이면 `published`/`listed` 둘 다 true인지 확인.
6. 운영 서버에는 Swagger 미노출 — 이 문서가 스펙의 근거.
7. 이미지 업로드 API 없음 — 본문 이미지는 외부 URL을 마크다운으로 직접 삽입.
