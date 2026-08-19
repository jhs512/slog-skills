# slog 에디터/콘텐츠 문법 완전 가이드

slog에는 WYSIWYG 에디터가 없다. 글 본문(`content`)은 **GFM 마크다운 원문 문자열**을 그대로 저장하며, Toast UI Viewer가 렌더 시점에 아래 문법을 해석한다. API로 글을 쓸 때는 이 문서의 문법만 사용하면 프론트에서 그대로 렌더된다. HTML/JSON 래핑, 전처리 저장 없음.

## 1. 표준 마크다운 (GFM)

헤딩, 리스트, 표, 인용, 체크박스(`- [ ]`), 취소선, 자동링크, 이미지 `![alt](url)`, 수평선 전부 지원.

- **코드 하이라이팅**: ` ```java `, ` ```kotlin ` 등 Prism 전 언어.
- **표 셀 병합**: `@cols=2:내용`, `@rows=2:내용` (toast-ui table-merged-cell 문법).
- **이미지 업로드 API는 없다.** 이미지는 외부 호스팅 URL만 가능: `![alt](https://...)`

## 2. 커스텀 블록 (다이어그램/임베드)

아래 언어 태그의 코드펜스는 렌더 직전 자동으로 커스텀 블록으로 변환된다. **여는 펜스 뒤 즉시 개행** 필수. `$$tag ... $$` 형태로 직접 써도 되지만, 코드펜스 형태가 GitHub/에디터 하이라이팅이 돼서 권장.

| 펜스 언어 | 기능 | 렌더 방식 |
|---|---|---|
| `uml`, `plantuml` | PlantUML | plantuml.com SVG 이미지 |
| `mermaid` | Mermaid | mermaid.ink SVG 이미지 |
| `youtube` | 유튜브 임베드 | iframe |
| `chart` | Toast UI Chart | 차트 렌더 |
| `codepen` | CodePen 임베드 | iframe |
| `katex`, `math` | 수식(블록) | math.vercel.app 이미지 |

### 예시

PlantUML:

    ```plantuml
    @startuml
    Alice -> Bob: Hello
    @enduml
    ```

Mermaid:

    ```mermaid
    flowchart TD
      A --> B
    ```

유튜브 — ID만 쓰거나 전체 URL 허용. 쿼리로 `max-width`(기본 800), `margin-left`/`margin-right`(기본 auto) 조절:

    ```youtube
    https://www.youtube.com/watch?v=dQw4w9WgXcQ?max-width=600
    ```

CodePen — `height`(기본 400), `width`(기본 100%, 단위 없으면 px):

    ```codepen
    https://codepen.io/user/embed/abcdef?height=500
    ```

수식 — **블록만 지원. 인라인 `$x$`는 렌더 안 됨(그냥 텍스트)**:

    ```math
    E = mc^2
    ```

차트 — CSV + 빈 줄 + 옵션 라인:

    ```chart
    ,강남,강북
    1월,21,23
    2월,31,17

    type: column
    title: 월별 매출
    x.title: 월
    y.title: 매출
    width: 700
    height: 400
    ```

### 숨김 블록

- `$$hide ... $$` — 뷰어에서 완전히 숨김(원문/raw에는 남음). 메모·주석 용도.
- `$$ppt`, `$$config` — 역시 숨김 처리되는 레거시 블록. **새 글에 쓰지 말 것.**

## 3. `surl:` 내부 링크 약식 표기

렌더 시 절대 경로로 치환된다. `{현재글}`은 지금 보고 있는 글 id.

| 작성 | 결과 |
|---|---|
| `[텍스트](surl:14300)` | `/p/14300` |
| `[텍스트](surl:14300#헤딩-id)` | `/p/14300#헤딩-id` |
| `[텍스트](surl:ppt/1)` | `/p/{현재글}/ppt/1` |
| `[텍스트](surl:ppt/1#3)` | `/p/{현재글}/ppt/1#3` (3번째 슬라이드) |
| `[텍스트](surl:14300/ppt/2)` | `/p/14300/ppt/2` |
| `[텍스트](surl:raw/1)` / `[텍스트](surl:14300/raw/1)` | raw 아티팩트 링크 |

주의: `surl:{id}` 단독 형태는 **숫자 id만** 인식.

### 헤딩 앵커 규칙

헤딩 id = 헤딩 텍스트에서 **공백만 `-`로 치환**(한글·대소문자·특수문자 유지). `## 목표 지점` → `#목표-지점`. 목차(TOC)는 **h1~h3만** 수집 — h4 이하는 목차에 안 뜬다.

## 4. PPT (슬라이드 덱) 문법

`<details ppt-id="...">` 블록이 `/p/{id}/ppt/{pptId}` 슬라이드 덱이 된다. 슬라이드 구분은 `---`. **`<details>` 다음과 `</details>` 앞에 빈 줄 필수**(빈 줄 없으면 안쪽이 마크다운으로 파싱되지 않음).

```markdown
<details ppt-id="1">
<summary>슬라이드 덱 제목</summary>

첫 슬라이드 내용

---

둘째 슬라이드 내용

</details>
```

- 글 상세에 자동으로 "PPT 보기" 버튼이 뜬다. URL 해시 `#2` = 2번째 슬라이드.
- PPT 렌더 시 자동 변형: PlantUML에 `left to right direction`, mermaid stateDiagram에 `direction LR`이 주입됨.
- Marp 프론트매터(`marp:` 포함 `---` 블록)가 맨 앞에 있으면 자동 제거됨.

## 5. Raw 아티팩트 문법

`<details raw-id="...">` 안의 **첫 코드펜스**가 `/p/{id}/raw/{rawId}`에서 펜스 벗겨진 원본으로 서빙된다. Content-Type은 펜스 언어 기준: `json`/`yaml`/`yml`/`xml`/`html`/`csv`, 그 외는 text/plain.

```markdown
<details raw-id="1">
<summary>Postman Collection</summary>

```json
{ "name": "x", "value": 1 }
```

</details>
```

**호스트 주의**: raw 아티팩트는 프론트(`https://www.slog.gg`)가 서빙한다. API 호스트(`api.slog.gg`)로 요청하면 404다.

```
https://www.slog.gg/p/{id}/raw/{rawId}   → 해당 details 안 첫 코드펜스의 원문
https://www.slog.gg/p/{id}/raw           → 글 본문 전체를 text/plain 마크다운으로
```

독자에게 `curl` 명령을 안내할 때 호스트를 틀리면 그대로 404가 나가므로 반드시 `www.slog.gg` 로 쓴다.

### `<details>` 안 코드펜스 (실측 확인됨)

표준 형태 그대로 쓰면 된다 — `<summary>` 뒤와 `</details>` 앞에 **빈 줄**을 두고, 안에 코드펜스를 넣는다.

```
<details raw-id="1">
<summary>전체 설치 SQL (펼쳐보기)</summary>

​```sql
CREATE OR REPLACE FUNCTION a() ...
​```

</details>
```

이러면 접기/펼치기와 Prism 하이라이팅이 정상 동작하고, `www.slog.gg/p/{id}/raw/1` 로 원문도 서빙된다.

> 참고: 2026-08 이전 뷰어에는 `<details>` 안 내용이 밖으로 빠져나가 **빈 토글**이 되는 버그가 있었다. 지금은 수정됐다. 혹시 접기가 안 되는 글을 보면 뷰어 버전을 의심할 것 — 본문을 고칠 문제가 아니다.

**`raw-id` 는 코드펜스만 인식한다.** `<pre><code>` 로 쓰면 `No fenced code block` 404가 난다.

## 6. `# 요약` 컨벤션 (SEO)

본문이 정확히 `# 요약`으로 시작하면, 다음 빈 줄/헤딩까지의 내용(선행 `- ` 제거)이 메타 description이 된다. 없으면 본문 앞 157자 자동 추출. 잘 쓰인 글은 이 패턴으로 시작한다:

```markdown
# 요약

- 이 글의 한 줄 요약

## 본론 시작
...
```

## 7. 원시 HTML 정책

- `<details>`, `<summary>`, `<div>`, `<br>` 등 원시 HTML 허용.
- `<details>` 안에 마크다운을 쓰려면 여닫는 태그 주변에 **빈 줄** 필수.
- iframe은 속성 화이트리스트만 살아남음: `src, width, height, allow, allowfullscreen, frameborder, scrolling, class`. (`onload` 등은 제거)
- 외부 링크(`http(s)://`, `//`)는 자동 `target="_blank"`.

## 8. 하지 말 것 (체크리스트)

1. 인라인 수식 `$x$`, `$$...$$` 수학 표기 — 미지원. `math` 펜스만.
2. **본문 맨 앞에 ` ```yml ` 또는 `$$config` 블록 금지** — `/vscode` 에디터가 설정 헤더로 오인 파싱한다. title/published/listed는 API 필드로만 전달.
3. `<details>` 안 빈 줄 누락 — 안쪽 마크다운이 파싱되지 않는다. 여닫는 태그 주변에 빈 줄을 둘 것.
4. h4 이하 헤딩에 앵커/목차 의존 금지.
5. footnote, admonition/callout, 프론트매터, `[[위키링크]]`, 태그/시리즈 문법 — 전부 미지원.
6. 이미지 업로드 시도 금지 — 외부 URL만.
7. **홑 물결표(`~`) 주의.** `5만~20만` 처럼 하나만 쓰면 취소선이 열려 **뒤쪽 문서 전체가 취소선**이 된다. 범위는 `5만 개에서 20만 개` 처럼 풀어 쓰거나 `-` 를 쓴다. 저장·푸시 단계에서 에러가 안 나므로 발행 후 브라우저로 봐야만 잡힌다.

> **참고 (해결된 이슈)**: 2026-08 이전 뷰어에는 ` ```text ` 과 언어 없는 ` ``` ` 펜스 안의 `<s>`, `<img>`, `<iframe>` 이 원시 HTML로 해석되는 버그가 있었다(Prism 미등록 언어라 이스케이프 경로를 안 탔음). 지금은 수정됐고, 배포본에서 모든 펜스가 안전한 것을 확인했다. 옛 글에서 취소선이 번져 보이면 그건 본문 문제가 아니다.

발행 후 점검 습관: 긴 글은 푸시한 뒤 브라우저에서 `document.querySelectorAll("s, del, strike").length` 가 0인지 한 번 확인할 것.

## 9. 수정 시 안전 수칙

- 글 실시간 반영: PUT 성공 시 열려 있는 뷰어들에 웹소켓으로 즉시 반영된다. 별도 조치 불필요.
- 수정은 title/content **전체 덮어쓰기**다. 반드시 먼저 GET으로 원문을 받아 그 위에서 편집하고, 원문의 커스텀 블록($$·펜스·details·surl)을 깨뜨리지 않았는지 위 문법 기준으로 검토 후 PUT.
