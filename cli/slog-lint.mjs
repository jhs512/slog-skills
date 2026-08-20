#!/usr/bin/env node
// slog 본문 사전 점검 — 발행 전에 돌린다.
// 사용: node slog-lint.mjs <파일.md> [<파일.md> ...]
//
// 저장·푸시는 성공하지만 렌더가 깨지는 것들을 잡는다.
// 종료코드: 문제가 있으면 1, 없으면 0.

import { readFileSync } from "node:fs";

const HL_LANGS = new Set([
  "sql", "bash", "sh", "js", "javascript", "ts", "typescript", "python", "py",
  "java", "kotlin", "go", "rust", "c", "cpp", "json", "yaml", "yml", "html", "css", "diff",
]);
const CUSTOM = new Set(["uml", "plantuml", "mermaid", "youtube", "chart", "katex", "math", "codepen"]);
const OK_HTML = new Set(["details", "/details", "summary", "/summary", "br", "div", "/div", "pre", "/pre", "code", "/code", "iframe", "/iframe"]);

function lint(path) {
  const src = readFileSync(path, "utf8");
  const lines = src.split("\n");
  const problems = [];
  const add = (line, code, msg) => problems.push({ line, code, msg });

  // 펜스 상태를 추적하며 훑는다
  let fence = null; // null | {lang, line}
  const fenceLangs = [];
  lines.forEach((l, idx) => {
    const n = idx + 1;
    const m = /^```([A-Za-z0-9_+-]*)/.exec(l);
    if (m) {
      if (fence) fence = null;
      else { fence = { lang: m[1] || "", line: n }; fenceLangs.push(fence.lang || "(없음)"); }
      return;
    }
    const inRawFence = fence && !HL_LANGS.has(fence.lang) && !CUSTOM.has(fence.lang);

    // 1) 홑 물결표 — 취소선이 열려 뒤쪽 전체가 취소선이 된다
    if (!fence) {
      const tildes = (l.match(/~/g) || []).length;
      if (tildes > 0 && !/~~[^~]+~~/.test(l)) {
        add(n, "TILDE", `홑 물결표 ${tildes}개 — "5만~20만" 대신 "5만에서 20만"으로`);
      }
    }

    // 2) 하이라이팅 안 되는 펜스 / 본문의 HTML 유사 태그
    if (!fence || inRawFence) {
      for (const t of l.matchAll(/<(\/?[A-Za-z][A-Za-z0-9]*)(?=[\s>])/g)) {
        const tag = t[1].toLowerCase();
        if (OK_HTML.has(tag)) continue;
        // 인라인 코드 안이면 안전
        const before = l.slice(0, t.index);
        const ticks = (before.match(/`/g) || []).length;
        if (ticks % 2 === 1) continue;
        add(n, "RAWTAG", `<${t[1]}> 가 원시 HTML로 해석될 수 있음 (${fence ? `\`\`\`${fence.lang || "언어없음"} 펜스 안` : "본문"})`);
      }
    }

    // 3) ASCII 밑줄 표기 — 학습자에게 안 읽힌다
    if (/\^\^\^/.test(l)) add(n, "CARET", "^^^ 밑줄 표기 — 표나 문장으로 바꿀 것");
  });

  if (fence) add(fence.line, "FENCE", `닫히지 않은 코드펜스 (\`\`\`${fence.lang || ""})`);

  // 4) details 안 코드펜스 구조
  for (const d of src.matchAll(/<details([^>]*)>([\s\S]*?)<\/details>/g)) {
    const attrs = d[1], body = d[2];
    const at = src.slice(0, d.index).split("\n").length;
    if (/raw-id=/.test(attrs) && !/```/.test(body)) {
      add(at, "RAWID", "raw-id 블록에 코드펜스가 없음 — raw 서빙이 404가 된다");
    }
  }

  // 5) 강 번호 연속성 (있을 때만)
  const nums = [...src.matchAll(/^# (\d+)강/gm)].map((x) => +x[1]);
  if (nums.length > 1) {
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] !== nums[i - 1] + 1) {
        add(0, "SEQ", `강 번호가 끊김: ${nums[i - 1]}강 다음이 ${nums[i]}강`);
      }
    }
  }

  return { path, problems, stats: { lines: lines.length, bytes: Buffer.byteLength(src), fences: fenceLangs.length, lessons: nums.length } };
}

let bad = 0;
for (const p of process.argv.slice(2)) {
  const { problems, stats } = lint(p);
  const head = `${p}  (${stats.lines}줄 / ${Math.round(stats.bytes / 1024)}KB / 펜스 ${stats.fences}개${stats.lessons ? ` / 강 ${stats.lessons}개` : ""})`;
  if (problems.length === 0) {
    console.log(`OK   ${head}`);
  } else {
    bad = 1;
    console.log(`FAIL ${head}`);
    for (const q of problems) console.log(`     ${q.line ? `${q.line}행` : "전체"}  [${q.code}] ${q.msg}`);
  }
}
process.exit(bad);
