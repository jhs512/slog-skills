#!/usr/bin/env node
// slog CLI — slog(slog.gg) 글 CRUD + pull/push 동기화(3-way 병합) 도구
// Node 18+ 필요(내장 fetch). 의존성 없음.
//
// 사용법: node slog.mjs <command> [args]  (자세한 것은 `help` 명령)

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const SLOG_DIR = path.join(os.homedir(), ".slog");
const DOCS_DIR = path.join(SLOG_DIR, "docs");
const LOGS_DIR = path.join(SLOG_DIR, "logs");
const BACKUP_DIR = path.join(SLOG_DIR, "backup");

// ---------- 로그 / 백업 (히스토리) ----------

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "");
}

// 모든 명령 실행을 ~/.slog/logs/YYYY-MM.jsonl 에 append (히스토리)
function logEvent(event) {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    const file = path.join(LOGS_DIR, `${new Date().toISOString().slice(0, 7)}.jsonl`);
    fs.appendFileSync(
      file,
      JSON.stringify({ at: new Date().toISOString(), baseUrl: baseUrl(), ...event }) + "\n",
      "utf-8",
    );
  } catch {}
}

// 로그에 비밀값이 남지 않게 argv를 마스킹
function sanitizedArgv() {
  const argv = process.argv.slice(2);
  return argv.map((a, i) => {
    const prev = argv[i - 1];
    if (prev === "--password" || prev === "set-key") return "***";
    return a;
  });
}

// 내용을 덮어쓰기/삭제하기 전 ~/.slog/backup/<id>/<timestamp>-<label>.md 스냅샷
function backupContent(id, content, label) {
  try {
    const dir = path.join(BACKUP_DIR, String(id));
    fs.mkdirSync(dir, { recursive: true });
    const p = path.join(dir, `${nowStamp()}-${label}.md`);
    fs.writeFileSync(p, content, "utf-8");
    return p;
  } catch {
    return null;
  }
}

// ---------- 공통 ----------

function die(msg, code = 1) {
  logEvent({ cmd: sanitizedArgv(), result: "error", error: msg });
  console.error(`ERROR: ${msg}`);
  process.exit(code);
}

function readFileTrim(p) {
  try {
    return fs.readFileSync(p, "utf-8").trim();
  } catch {
    return null;
  }
}

function baseUrl() {
  return (
    process.env.SLOG_BASE_URL ||
    readFileTrim(path.join(SLOG_DIR, "baseUrl")) ||
    "https://api.slog.gg"
  );
}

function apiKey() {
  const key =
    process.env.SLOG_API_KEY || readFileTrim(path.join(SLOG_DIR, "apiKey.secret"));
  if (!key) die("apiKey가 없습니다. `slog auth set-key <key>` 또는 setup 스킬을 먼저 실행하세요.");
  return key;
}

// RsData 래핑(POST/PUT/DELETE)과 비래핑(GET)을 모두 처리해 순수 데이터를 반환한다.
async function api(method, apiPath, body, { auth = true } = {}) {
  const headers = {};
  if (auth) headers["Authorization"] = `Bearer ${apiKey()}`;
  if (body !== undefined) headers["Content-Type"] = "application/json; charset=utf-8";
  // 주의: Origin 헤더를 붙이면 서버가 403을 준다. fetch는 기본으로 안 붙이므로 그대로 둔다.
  const res = await fetch(baseUrl() + apiPath, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    const msg = json?.msg ? `${json.resultCode} ${json.msg}` : text.slice(0, 300);
    die(`${method} ${apiPath} -> HTTP ${res.status}: ${msg}`);
  }
  if (json && typeof json === "object" && "resultCode" in json && "data" in json) {
    return json.data; // RsData
  }
  return json;
}

function metaPath(id) {
  return path.join(DOCS_DIR, `${id}.meta.json`);
}
function workingPath(id) {
  return path.join(DOCS_DIR, `${id}.md`);
}
function basePath(id) {
  return path.join(DOCS_DIR, `${id}.base.md`);
}

function saveSnapshot(post) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.writeFileSync(workingPath(post.id), post.content, "utf-8");
  fs.writeFileSync(basePath(post.id), post.content, "utf-8");
  writeMeta(post);
}

function writeMeta(post) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.writeFileSync(
    metaPath(post.id),
    JSON.stringify(
      {
        id: post.id,
        title: post.title,
        published: post.published,
        listed: post.listed,
        modifiedAt: post.modifiedAt,
        baseUrl: baseUrl(),
      },
      null,
      2,
    ),
    "utf-8",
  );
}

function readMeta(id) {
  const raw = readFileTrim(metaPath(id));
  if (!raw) return null;
  return JSON.parse(raw);
}

function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      rest.push(a);
    }
  }
  return { flags, rest };
}

function toBool(v, name) {
  if (v === true || v === "true") return true;
  if (v === "false") return false;
  die(`--${name} 값은 true 또는 false여야 합니다.`);
}

// ---------- 명령 ----------

async function cmdAuth(args) {
  const sub = args[0];
  if (sub === "set-key") {
    const key = args[1] || die("사용법: slog auth set-key <apiKey>");
    fs.mkdirSync(SLOG_DIR, { recursive: true });
    fs.writeFileSync(path.join(SLOG_DIR, "apiKey.secret"), key, "utf-8");
    console.log(`저장됨: ~/.slog/apiKey.secret (${key.slice(0, 8)}...)`);
    return cmdAuth(["verify"]);
  }
  if (sub === "login") {
    const { flags } = parseFlags(args.slice(1));
    if (!flags.username || !flags.password)
      die("사용법: slog auth login --username <id> --password <pw>");
    // 로그인 요청에는 Authorization 헤더를 붙이면 안 된다.
    const data = await api(
      "POST",
      "/member/api/v1/auth/login",
      { username: flags.username, password: flags.password },
      { auth: false },
    );
    fs.mkdirSync(SLOG_DIR, { recursive: true });
    fs.writeFileSync(path.join(SLOG_DIR, "apiKey.secret"), data.apiKey, "utf-8");
    console.log(`로그인 성공: ${data.item?.name ?? flags.username} — apiKey 저장됨`);
    return;
  }
  if (sub === "verify" || sub === undefined) {
    const me = await api("GET", "/member/api/v1/auth/me");
    console.log(`OK: ${me.name} (@${me.username}, id ${me.id}) — ${baseUrl()}`);
    return;
  }
  die("사용법: slog auth [verify|set-key <key>|login --username <id> --password <pw>]");
}

async function cmdList(args) {
  const { flags } = parseFlags(args);
  const params = new URLSearchParams();
  if (flags.kw) params.set("kw", String(flags.kw));
  if (flags.page) params.set("page", String(flags.page));
  if (flags.sort) params.set("sort", String(flags.sort));
  params.set("pageSize", String(flags["page-size"] ?? 30));
  const p = flags.mine ? "/post/api/v1/posts/mine" : "/post/api/v1/posts";
  const page = await api("GET", `${p}?${params}`);
  const rows = page.content.map((post) => ({
    id: post.id,
    state: !post.published ? "비공개" : !post.listed ? "미노출" : "공개",
    title: post.title,
    modifiedAt: post.modifiedAt,
  }));
  console.log(
    JSON.stringify(
      { total: page.pageable.totalElements, page: page.pageable.pageNumber, posts: rows },
      null,
      2,
    ),
  );
}

async function cmdGet(args) {
  const { flags, rest } = parseFlags(args);
  const id = rest[0] || die("사용법: slog get <id> [--content]");
  const post = await api("GET", `/post/api/v1/posts/${id}`);
  if (flags.content) {
    process.stdout.write(post.content);
    return;
  }
  const { content, ...meta } = post;
  console.log(JSON.stringify({ ...meta, contentLength: content.length }, null, 2));
}

async function cmdPull(args) {
  const { rest } = parseFlags(args);
  const id = rest[0] || die("사용법: slog pull <id>");
  const post = await api("GET", `/post/api/v1/posts/${id}`);
  backupContent(post.id, post.content, "pull");
  saveSnapshot(post);
  console.log(`pulled: ${workingPath(post.id)}`);
  console.log(
    JSON.stringify(
      { id: post.id, title: post.title, published: post.published, listed: post.listed, modifiedAt: post.modifiedAt },
      null,
      2,
    ),
  );
}

// 3-way 병합: git merge-file 사용. 성공 시 병합 결과 문자열, 충돌 시 { conflict: true, merged } 반환.
function threeWayMerge(workingFile, baseFile, serverFile) {
  try {
    const merged = execFileSync(
      "git",
      ["merge-file", "-p", "-L", "local", "-L", "base", "-L", "server", workingFile, baseFile, serverFile],
      { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
    );
    return { conflict: false, merged };
  } catch (e) {
    if (e.status && e.status > 0 && typeof e.stdout === "string") {
      return { conflict: true, merged: e.stdout }; // 충돌 마커 포함 결과
    }
    return null; // git 없음 등
  }
}

async function doPut(id, meta, content, flags, serverContent) {
  if (serverContent !== undefined) backupContent(id, serverContent, "pre-push-server");
  backupContent(id, content, "pushed");
  const body = {
    title: flags.title !== undefined ? String(flags.title) : meta.title,
    content,
  };
  if (flags.published !== undefined) body.published = toBool(flags.published, "published");
  if (flags.listed !== undefined) body.listed = toBool(flags.listed, "listed");
  const dto = await api("PUT", `/post/api/v1/posts/${id}`, body);
  // 푸시 성공 → base/메타를 서버 상태로 갱신
  fs.writeFileSync(basePath(id), content, "utf-8");
  writeMeta({ ...dto, id: Number(id) });
  console.log(`pushed: ${id}번 글 (modifiedAt ${dto.modifiedAt}, ${dto.published ? (dto.listed ? "공개" : "미노출") : "비공개"})`);
}

// 서버가 엔드포인트에 따라 초 이하 자릿수를 다르게 돌려준다(나노초 vs 마이크로초, 반올림됨).
// 문자열 비교하면 같은 시각인데도 "서버 변경"으로 오탐하므로,
// 나노초 정수로 바꾼 뒤 더 거친 쪽 정밀도로 반올림해서 비교한다.
function sameModified(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const parse = (t) => {
    const m = String(t).match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})$/);
    if (!m) return null;
    const ms = Date.parse(m[1] + m[3]);
    if (Number.isNaN(ms)) return null;
    const frac = (m[2] || "").slice(0, 9).padEnd(9, "0");
    return { ns: BigInt(ms) * 1000000n + BigInt(frac), digits: (m[2] || "").length };
  };
  const x = parse(a), y = parse(b);
  if (!x || !y) return false;
  const unit = 10n ** BigInt(9 - Math.min(x.digits, y.digits, 9));
  const round = (n) => (n + unit / 2n) / unit;
  return round(x.ns) === round(y.ns);
}

async function cmdPush(args) {
  const { flags, rest } = parseFlags(args);
  const id = rest[0] || die("사용법: slog push <id> [--title t] [--published true|false] [--listed true|false] [--force]");
  const meta = readMeta(id) || die(`${id}번 글의 로컬 메타가 없습니다. 먼저 \`slog pull ${id}\` 하세요.`);
  const working = readFileTrim(workingPath(id));
  if (working === null) die(`작업 파일이 없습니다: ${workingPath(id)}`);
  if (working.length < 2) die("content는 2자 이상이어야 합니다.");

  const server = await api("GET", `/post/api/v1/posts/${id}`);

  if (!sameModified(server.modifiedAt, meta.modifiedAt) && !flags.force) {
    // 서버가 우리가 아는 것보다 최신 → 병합 필요
    const serverFile = path.join(DOCS_DIR, `${id}.server.md`);
    fs.writeFileSync(serverFile, server.content, "utf-8");

    const result = threeWayMerge(workingPath(id), basePath(id), serverFile);

    if (result && !result.conflict) {
      // 자동 병합 성공 → 병합 결과를 작업 파일에 반영하고 그대로 푸시
      fs.writeFileSync(workingPath(id), result.merged, "utf-8");
      fs.unlinkSync(serverFile);
      console.log(`서버 변경 감지(${meta.modifiedAt} -> ${server.modifiedAt}) → 자동 3-way 병합 성공, 푸시합니다.`);
      logEvent({ cmd: sanitizedArgv(), result: "auto-merged", id: Number(id) });
      return doPut(id, { ...meta, title: server.title }, result.merged.trim(), flags, server.content);
    }

    if (result && result.conflict) {
      // 충돌 → 작업 파일에 충돌 마커를 남기고, base를 서버 상태로 갱신해 재푸시가 fast-forward 되게 한다
      fs.writeFileSync(workingPath(id), result.merged, "utf-8");
      fs.writeFileSync(basePath(id), server.content, "utf-8");
      writeMeta(server);
      fs.unlinkSync(serverFile);
      logEvent({ cmd: sanitizedArgv(), result: "conflict", id: Number(id) });
      console.error(`CONFLICT: 서버가 더 최신이며 자동 병합에 실패했습니다.`);
      console.error(`- ${workingPath(id)} 에 충돌 마커(<<<<<<< local / >>>>>>> server)를 남겼습니다.`);
      console.error(`- 마커를 해소한 뒤 다시 \`slog push ${id}\` 하세요.`);
      process.exit(3);
    }

    // git merge-file 사용 불가 → 수동 병합 안내
    console.error(`CONFLICT: 서버가 더 최신입니다(${meta.modifiedAt} -> ${server.modifiedAt}).`);
    console.error(`- 서버본: ${serverFile}`);
    console.error(`- 내 작업본: ${workingPath(id)}  / 공통 조상: ${basePath(id)}`);
    console.error(`- 세 파일을 비교해 작업본에 병합한 뒤 \`slog push ${id} --force\` 하세요.`);
    process.exit(3);
  }

  if (!sameModified(server.modifiedAt, meta.modifiedAt) && flags.force) {
    console.log(`경고: 서버 변경(${server.modifiedAt})을 무시하고 강제 덮어씁니다.`);
  }

  return doPut(id, { ...meta, title: server.title }, working, flags, server.content);
}

async function cmdCreate(args) {
  const { flags } = parseFlags(args);
  const title = flags.title || die("사용법: slog create --title <제목> (--content <본문> | --content-file <파일>) [--published true] [--listed true]");
  let content = flags.content;
  if (flags["content-file"]) content = fs.readFileSync(String(flags["content-file"]), "utf-8");
  if (!content || String(content).trim().length < 2) die("content는 2자 이상이어야 합니다 (--content 또는 --content-file).");
  const body = { title: String(title), content: String(content) };
  if (flags.published !== undefined) body.published = toBool(flags.published, "published");
  if (flags.listed !== undefined) body.listed = toBool(flags.listed, "listed");
  const dto = await api("POST", "/post/api/v1/posts", body);
  // 이후 push 워크플로를 쓸 수 있게 스냅샷 저장
  const post = await api("GET", `/post/api/v1/posts/${dto.id}`);
  saveSnapshot(post);
  console.log(JSON.stringify({ id: dto.id, url: `${frontUrl()}/p/${dto.id}`, published: dto.published, listed: dto.listed }, null, 2));
}

function frontUrl() {
  const b = baseUrl();
  if (b.includes("localhost:8080")) return "http://localhost:3000";
  return "https://www.slog.gg";
}

async function cmdTemp() {
  const post = await api("POST", "/post/api/v1/posts/temp");
  saveSnapshot(post);
  console.log(JSON.stringify({ id: post.id, title: post.title, file: workingPath(post.id) }, null, 2));
}

async function cmdDelete(args) {
  const { flags, rest } = parseFlags(args);
  const id = rest[0] || die("사용법: slog delete <id> --yes");
  const post = await api("GET", `/post/api/v1/posts/${id}`);
  if (!flags.yes) {
    die(`삭제는 되돌릴 수 없습니다. 대상 확인: [${post.id}] "${post.title}" — 진행하려면 --yes를 붙이세요.`, 2);
  }
  backupContent(id, post.content, "deleted");
  await api("DELETE", `/post/api/v1/posts/${id}`);
  for (const f of [workingPath(id), basePath(id), metaPath(id)]) {
    try { fs.unlinkSync(f); } catch {}
  }
  console.log(`deleted: ${id}`);
}

async function cmdStatus(args) {
  const { rest } = parseFlags(args);
  const id = rest[0] || die("사용법: slog status <id>");
  const meta = readMeta(id) || die(`로컬 메타 없음. \`slog pull ${id}\` 먼저.`);
  const server = await api("GET", `/post/api/v1/posts/${id}`);
  const working = readFileTrim(workingPath(id)) ?? "";
  const base = readFileTrim(basePath(id)) ?? "";
  console.log(
    JSON.stringify(
      {
        id: Number(id),
        localChanged: working !== base,
        serverChanged: !sameModified(server.modifiedAt, meta.modifiedAt),
        localModifiedAt: meta.modifiedAt,
        serverModifiedAt: server.modifiedAt,
      },
      null,
      2,
    ),
  );
}

function cmdLog(args) {
  const { flags, rest } = parseFlags(args);
  const n = Number(flags.tail ?? 20);
  const id = rest[0]; // 옵션: 특정 글 히스토리만
  if (id && flags.backups) {
    const dir = path.join(BACKUP_DIR, String(id));
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
    console.log(files.length ? files.map((f) => path.join(dir, f)).join("\n") : "(백업 없음)");
    return;
  }
  const files = fs.existsSync(LOGS_DIR) ? fs.readdirSync(LOGS_DIR).sort() : [];
  const lines = [];
  for (const f of files.slice(-2)) {
    lines.push(...fs.readFileSync(path.join(LOGS_DIR, f), "utf-8").trim().split("\n"));
  }
  const filtered = id
    ? lines.filter((l) => {
        try {
          const e = JSON.parse(l);
          return e.id === Number(id) || (Array.isArray(e.cmd) && e.cmd.includes(String(id)));
        } catch {
          return false;
        }
      })
    : lines;
  console.log(filtered.slice(-n).join("\n") || "(로그 없음)");
}

function help() {
  console.log(`slog CLI — slog(slog.gg) 글 CRUD/동기화

인증:
  slog auth verify                             현재 apiKey 검증(계정 표시)
  slog auth set-key <apiKey>                   apiKey 저장(~/.slog/apiKey.secret)
  slog auth login --username <id> --password <pw>

조회:
  slog list [--mine] [--kw <검색어>] [--page N] [--sort CREATED_AT|CREATED_AT_ASC|MODIFIED_AT|MODIFIED_AT_ASC]
  slog get <id> [--content]                    메타 JSON / --content면 본문 원문 출력

수정 워크플로 (pull -> 파일 편집 -> push):
  slog pull <id>                               ~/.slog/docs/<id>.md 로 받기(+base 스냅샷)
  slog status <id>                             로컬/서버 변경 여부 확인
  slog push <id> [--title t] [--published true|false] [--listed true|false] [--force]
      서버가 pull 시점보다 최신이면: 자동 3-way 병합 시도 -> 충돌 시 작업 파일에
      충돌 마커를 남기고 종료코드 3. 마커 해소 후 다시 push.

생성/삭제:
  slog create --title <제목> (--content <본문> | --content-file <파일>) [--published true] [--listed true]
  slog temp                                    임시글 생성/재사용 후 pull
  slog delete <id> --yes

히스토리:
  slog log [<id>] [--tail N]                   명령 실행 로그(~/.slog/logs/*.jsonl)
  slog log <id> --backups                      글별 콘텐츠 백업 목록(~/.slog/backup/<id>/)
  모든 pull/push/delete는 자동으로 로그가 남고, 덮어쓰기·삭제 전 내용은 백업된다.

환경: SLOG_API_KEY, SLOG_BASE_URL (기본 https://api.slog.gg, 파일 ~/.slog/baseUrl 로도 지정 가능)`);
}

// ---------- main ----------

const [cmd, ...args] = process.argv.slice(2);
const commands = {
  auth: cmdAuth,
  list: cmdList,
  get: cmdGet,
  pull: cmdPull,
  push: cmdPush,
  create: cmdCreate,
  temp: cmdTemp,
  delete: cmdDelete,
  status: cmdStatus,
  log: cmdLog,
  help: () => help(),
};

if (!cmd || !commands[cmd]) {
  help();
  process.exit(cmd ? 1 : 0);
}
await commands[cmd](args);
if (cmd !== "help") logEvent({ cmd: sanitizedArgv(), result: "ok" });
