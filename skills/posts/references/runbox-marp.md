# 런박스와 Marp 작성

2026-11-03 슬로그 저장소의 실제 파서와 공식 작성 문서를 대조했다. 기능을 확장하거나 문법이 맞지 않을 때 아래 원본을 다시 확인한다. 글 CRUD는 기존 slog CLI로 수행한다.

- [런박스 작성법과 지원 범위](https://github.com/jhs512/slog-app/blob/main/docs/code-lab.md)
- [실행 펜스 판별기](https://github.com/jhs512/slog-app/blob/main/front/src/lib/codeLab/lab.ts)
- [Marp 작성법](https://github.com/jhs512/slog-app/blob/main/docs/marp.md)
- [Marp 문서·블록 판별기](https://github.com/jhs512/slog-app/blob/main/front/src/lib/business/marpSource.ts)

## 런박스: 코드를 글 안에서 실행하기

일반 `java`, `python`, `js` 펜스는 코드 표시만 한다. 실행 버튼이 필요하면 여는 펜스의 언어 뒤에 `run`을 붙인다. 버튼을 누르면 같은 페이지의 런박스가 열리고 원문을 한 번 실행한다. 수정 후에는 실행 버튼으로 재실행한다.

| 여는 펜스의 정보 문자열 | 용도와 패널 |
|---|---|
| `html run` | 코드·렌더링·실시간 DOM·콘솔 |
| `js run`, `javascript run` | JavaScript 브라우저 실행: 코드·콘솔·입력 |
| `ts run`, `typescript run` | TypeScript의 타입을 지운 뒤 실행. 타입 검사 기능은 아님 |
| `c run` | C 실행과 메모리 추적·콘솔·입력 |
| `cpp run`, `c++ run`, `cxx run` | C++ 실행과 메모리 추적·콘솔·입력 |
| `python run`, `py run` | Python 실행과 메모리 추적·콘솔·입력 |
| `java run` | Java 실행과 메모리 추적·콘솔·입력 |
| `js memory`, `javascript memory` | JavaScript 메모리 추적. 일반 `js run`과 다른 모드 |
| `react-starter-1` | React 실행: 렌더링·DOM·React VDOM·콘솔. 별도 `run` 불필요 |
| `react-tailwind-starter-1` | React 스타터킷에 Tailwind 추가. 별도 `run` 불필요 |

Java는 `public class Main`의 `main`에서 시작한다. 예제는 한 파일로 구성하고, HTML의 CSS·스크립트도 같은 문서에 넣는다. C·C++·Python·Java의 메모리 시각화는 학습용 실행 기록이며 실제 RAM 주소나 완전한 언어·라이브러리 구현으로 설명하지 않는다.

````markdown
```java run
public class Main {
    public static void main(String[] args) {
        int[] values = {2, 4};
        System.out.println(values[0] + values[1]);
    }
}
```

```js memory
const original = [1, 2];
const alias = original;
alias.push(3);
console.log(original.length);
```

```react-starter-1
import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```
````

입력은 **입력 패널에 실행 전에 적는 선입력**이다. C `scanf`·`getchar`, C++ `cin`, Python `input`·`sys.stdin`, Java `Scanner(System.in)`, JS·TS `prompt()`로 읽는다. 실행 중 사용자에게 입력을 물어보는 대화형 예제로 작성하지 않는다.

- `js run`은 비동기·타이머 실행용이다. `js memory`는 DOM·async·generator를 추적하지 않는 메모리 학습용이다.
- 지원하지 않는 `rust run`, `go run`이나 없는 스타터킷 버전을 실행 가능하다고 쓰지 않는다. 현재는 실행 대신 안내가 나온다.
- 코드는 브라우저에서 실행되며 언어별 런타임의 첫 다운로드가 필요할 수 있다. 닫았다 다시 열면 원문과 초기 입력·출력으로 돌아간다. 수정 코드·입력·출력을 글에 자동 저장하지 않는다.
- 별도의 런박스 만들기 화면은 `/runbox`다. 글 안에 실행 블록을 넣을 때는 위 펜스를 사용한다.

저장 후 실제 뷰어에서 실행 버튼이 생겼는지 확인하고, 예제를 열어 출력·렌더링·필요한 메모리 패널을 확인한다. 수정·재실행과 닫은 뒤 원문 복원도 확인한다. 버튼이 보인 것만으로 실행 검증 완료라고 보고하지 않는다.

## Marp: 마크다운 발표 자료

일반 글에 발표 덱을 넣을 때는 `marp` 코드펜스를 사용한다. 슬라이드 구분선 `---`와 Marp frontmatter는 펜스 **안**에 둔다. 다음 예제의 내부 코드 블록은 `~~~`로 감싸 바깥 펜스와 구분한다.

````markdown
```marp
---
marp: true
theme: default
size: 16:9
paginate: true
---

# 배열과 참조

첫 번째 슬라이드

---

## 같은 배열을 가리켜요

~~~javascript
const a = [1, 2];
const b = a;
~~~
```
````

- 공식 테마는 `default`, `gaia`, `uncover`, 크기는 `16:9`·`4:3`이다. 보통 `marp` 펜스 하나가 덱 하나다.
- **글 전체를 Marp 문서로 만들 때만** 글 원문의 맨 앞에 `---`로 감싼 `marp: true` frontmatter를 둔다. 일반 글에 슬라이드를 추가하는 요청이면 펜스 형식을 택해 본문을 보존한다.
- 작성 메뉴 `/marp`의 미리보기는 저장되지 않는다. 보관하려면 글 본문에 넣고 CLI로 저장한다. 수정 중 미리보기와 마지막 저장본의 발표 링크는 구분한다.
- PDF·PPTX 내보내기가 지원된다고 안내하지 않는다. 기존 `<details ppt-id>`·PPT 발표 링크는 Marp와 별개로 유지한다.

### 발표 링크와 고정 식별자

- `/p/{글번호}/marp`: 덱이 하나면 바로 열고 여러 개면 목록을 보여 준다.
- `/p/{글번호}/marp/document`: 글 전체 Marp 문서.
- `/p/{글번호}/marp/block-1`: 첫 번째 Marp 펜스. 순서를 바꾸면 식별자가 바뀔 수 있다.
- 슬라이드 번호는 발표 URL 끝의 `#2`처럼 지정한다.

고정 링크가 필요하면 글 안에서 고유한 영문·숫자·밑줄·하이픈 1~64자의 `marp-id`를 사용한다. 실제로 만든 식별자로 링크하고 임의의 덱 번호를 추측하지 않는다.

```markdown
<details marp-id="array-intro">
<summary>배열 소개</summary>

---
marp: true
theme: default
---

# 배열 소개

---

## 다음 슬라이드

</details>
```

이 덱의 발표 경로는 `/p/{글번호}/marp/array-intro`다. 기존 `<div markdown="1">` 래퍼도 지원하지만 위 형식에는 필요 없다.

저장 후 실제 글의 **Marp 보기**와 발표 페이지에서 슬라이드 수·이전/다음 이동·내부 코드 표시를 확인한다. 여러 덱이면 각 덱의 링크가 맞는지도 확인한다.
