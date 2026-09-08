#!/usr/bin/env node
/**
 * How long until the page STOPS CHANGING - measured N times, with a control.
 *
 *   node scripts/repro/repro-speed-index.mjs --control
 *   node scripts/repro/repro-speed-index.mjs --url https://ellaz.fun/ --runs 10
 *
 * WHY THIS IS COMMITTED AND NOT A SCRATCH SCRIPT
 *
 * On 2026-09-08 a PageSpeed run on `/` read Speed Index 4.0 s. Four runs the day
 * before, against IDENTICAL live bytes, read 4.1 / 1.3 / 1.3 / 1.0. A single
 * number out of this instrument is not evidence - a distribution is, and a
 * distribution nobody can re-run is not one either. The runs behind
 * `docs/performance-and-cls.md` were ad hoc in a scratch dir and are gone.
 *
 * WHAT SPEED INDEX IS. Not when the page starts drawing: how long until it stops
 * changing. Lighthouse compares every filmstrip frame with the LAST one, so a
 * page that reaches its final pixels late scores badly however early it drew.
 * `/` reaches them late on purpose - it paints an emitted text document, then
 * the app, then 27 more tiles as the lazy catalogue lands, then their art.
 *
 * THE CONTROL IS THE WHOLE POINT. `--control` serves two pages differing in ONE
 * way: FAST fills the viewport immediately, LATE fills it with the identical
 * image after the server has held that image for `LATE_MS`. The harness must
 * read a markedly higher Speed Index on LATE. If it does not, it cannot see a
 * late paint, and every number it prints is worthless - so it exits 1 and says
 * so. Ten runs that all read 1.2 s are indistinguishable from a broken harness
 * without this. Arms run interleaved F/L/F/L, because a non-interleaved
 * differential measures the arm ORDER as much as the arm.
 * (`.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`)
 *
 * VERSION. Lighthouse is pinned below, and the version is PRINTED from each
 * run's own JSON rather than assumed - a number belongs to the toolchain that
 * produced it. 13.4.1 is what pagespeed.web.dev itself reported on 2026-09-08.
 *
 * THE PER-RUN TABLE IS PRINTED, NEVER ONLY THE MEDIAN. A probe in this repo has
 * already reported a healthy median over a defect that fired on one load in
 * three (`docs/performance-and-cls.md`, the room's boot shift).
 */

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const LIGHTHOUSE = "lighthouse@13.4.1";

/** WE launch Chrome, and Lighthouse ATTACHES to it with `--port`.
 *
 *  Not a preference: `npx lighthouse`'s own chrome-launcher reports "Unable to
 *  connect to Chrome" under WSL, every time, and did so again on 2026-09-08
 *  before this was written. The cost of owning the browser is that we must not
 *  leak one, so: an ephemeral debugging port (`--remote-debugging-port=0`, read
 *  back out of the profile's own `DevToolsActivePort`, so nothing can collide
 *  with a dev server or another session), a fresh profile per run, and a kill by
 *  RESOLVED PID of our own process group in a `finally` - never by pattern.
 *  `~/.claude/rules/process/safety-rules.md` forbids pattern kills, and a
 *  `pgrep | head -1` in this repo has already killed a Chrome RENDERER while
 *  leaving the browser up. */
const CHROME_FLAGS = [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-sync",
  "--disable-extensions",
];

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Kill our own process group by resolved pid. Chrome spawns renderers; killing
 *  the group takes them with it, and targeting the group we created cannot
 *  reach anything we did not start. */
function killTree(pid) {
  if (!pid) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
  sleepSync(400);
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    /* already gone */
  }
}

/** A fresh headless Chrome on an ephemeral port. Returns the port it actually
 *  chose, read from the profile - never a port we picked. */
function launchChrome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "si-chrome-"));
  const child = spawn("google-chrome", [...CHROME_FLAGS, "--remote-debugging-port=0", `--user-data-dir=${dir}`, "about:blank"], {
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  const portFile = path.join(dir, "DevToolsActivePort");
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const first = fs.readFileSync(portFile, "utf8").split("\n")[0].trim();
      if (first) return { port: Number(first), pid: child.pid, dir };
    } catch {
      /* not written yet */
    }
    sleepSync(100);
  }
  killTree(child.pid);
  throw new Error("chrome did not report a debugging port within 30 s");
}

/** The control's planted delay, and the separation it must produce. 2,500 ms is
 *  well inside the trace: the request is still in flight, so Lighthouse keeps
 *  recording rather than stopping at network idle - a `setTimeout` swap with no
 *  pending request can end AFTER the filmstrip does, and then the control fails
 *  for a reason that has nothing to do with the instrument. */
const LATE_MS = 2500;
const MIN_SEPARATION_MS = 1000;
const CONTROL_PORT = 5176;
const CONTROL_RUNS = 2;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const has = (name) => process.argv.includes(`--${name}`);

/** One Lighthouse run. Returns metrics, or throws - never a zero standing in for
 *  a failure. Three states, never two: a run that could not be judged is an
 *  error, not a fast page. */
function runOnce(url, outDir, tag) {
  const json = path.join(outDir, `${tag}.json`);
  const chrome = launchChrome();
  let r;
  try {
    r = spawnSync(
      "npx",
      [
        "--yes",
        LIGHTHOUSE,
        url,
        "--output=json",
        `--output-path=${json}`,
        "--only-categories=performance",
        "--quiet",
        `--port=${chrome.port}`,
      ],
      { stdio: ["ignore", "pipe", "pipe"], timeout: 240_000, encoding: "utf8" },
    );
  } finally {
    killTree(chrome.pid);
    try {
      fs.rmSync(chrome.dir, { recursive: true, force: true });
    } catch {
      /* a temp profile we created microseconds ago; nothing here is recoverable state */
    }
  }
  if (r.status !== 0 || !fs.existsSync(json)) {
    const why = (r.stderr || r.stdout || `exit ${r.status}`).toString().trim().slice(-600);
    throw new Error(`lighthouse failed on ${url}\n${why}`);
  }
  const lhr = JSON.parse(fs.readFileSync(json, "utf8"));
  const num = (id) => {
    const v = lhr.audits?.[id]?.numericValue;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(`audit ${id} produced no number on ${url} - cannot judge this run`);
    }
    return v;
  };
  const score = lhr.categories?.performance?.score;
  if (typeof score !== "number") throw new Error(`no performance score on ${url}`);

  const frames = lhr.audits?.["screenshot-thumbnails"]?.details?.items ?? [];
  for (const [i, f] of frames.entries()) {
    const b64 = String(f.data ?? "").split(",")[1];
    if (!b64) continue;
    const ms = String(Math.round(f.timing ?? 0)).padStart(5, "0");
    fs.writeFileSync(path.join(outDir, `${tag}-frame${String(i).padStart(2, "0")}-${ms}ms.jpg`), Buffer.from(b64, "base64"));
  }
  const final = lhr.audits?.["final-screenshot"]?.details?.data;
  if (final) fs.writeFileSync(path.join(outDir, `${tag}-final.jpg`), Buffer.from(String(final).split(",")[1], "base64"));

  return {
    score: Math.round(score * 100),
    fcp: num("first-contentful-paint"),
    lcp: num("largest-contentful-paint"),
    tbt: num("total-blocking-time"),
    cls: num("cumulative-layout-shift"),
    si: num("speed-index"),
    frames: frames.length,
    lhVersion: lhr.lighthouseVersion ?? "?",
    chrome: lhr.environment?.hostUserAgent ?? "?",
  };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const secs = (ms) => `${(ms / 1000).toFixed(2)}s`;

function tree() {
  const sha = spawnSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" });
  const dirty = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });
  const n = (dirty.stdout ?? "").trim().split("\n").filter(Boolean).length;
  return `${(sha.stdout ?? "?").trim()}${n ? ` (+${n} dirty)` : ""}`;
}

function table(rows) {
  const out = ["", "run  score     FCP     LCP      TBT     CLS      SI", "---  -----  ------  ------  -------  ------  ------"];
  for (const [i, m] of rows.entries()) {
    out.push(
      `${String(i + 1).padStart(3)}  ${String(m.score).padStart(5)}  ` +
        `${secs(m.fcp).padStart(6)}  ${secs(m.lcp).padStart(6)}  ` +
        `${`${Math.round(m.tbt)}ms`.padStart(7)}  ${m.cls.toFixed(3).padStart(6)}  ${secs(m.si).padStart(6)}`,
    );
  }
  return out.join("\n");
}

/* ---------------------------------------------------------------- control -- */

const PAGE = (src) => `<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>control</title>
<style>html,body{margin:0;background:#fff}img{display:block;width:100vw;height:100vh}</style>
<img src="${src}" alt="">
`;

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="412" height="823"><rect width="412" height="823" fill="#c2185b"/></svg>`;

/** Two pages, ONE variable: whether the server holds the image. Same markup,
 *  same bytes, same viewport fill. */
/** THE SERVER RUNS IN ITS OWN PROCESS, and that is not tidiness.
 *
 *  `spawnSync` blocks node's event loop for the whole Lighthouse run, so a
 *  server living in THIS process can never answer the request Chrome makes to
 *  it. First version did exactly that: Chrome asked, nothing replied, Lighthouse
 *  sat until the 240 s timeout, and the harness printed `lighthouse failed on
 *  http://127.0.0.1:5176/fast - exit null`. That reads as a Lighthouse fault and
 *  is a fault in the control's own plumbing - the shape
 *  `.claude/rules/a-diagnostic-that-truncates-what-it-compares.md` collects. */
function serveControl(port) {
  const server = http.createServer((req, res) => {
    const send = (type, body) => {
      res.writeHead(200, { "content-type": type, "cache-control": "no-store", connection: "close" });
      res.end(body);
    };
    if (req.url?.startsWith("/fast")) return send("text/html; charset=utf-8", PAGE("/img-fast.svg"));
    if (req.url?.startsWith("/late")) return send("text/html; charset=utf-8", PAGE("/img-late.svg"));
    if (req.url?.startsWith("/img-fast")) return send("image/svg+xml", SVG);
    if (req.url?.startsWith("/img-late")) return void setTimeout(() => send("image/svg+xml", SVG), LATE_MS);
    res.writeHead(404, { connection: "close" }).end();
  });
  return new Promise((ok, no) => {
    server.once("error", no);
    server.listen(port, "127.0.0.1", () => ok(server));
  });
}

const waitForPort = async (port, ms = 10_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const up = await new Promise((ok) => {
      const req = http.get({ host: "127.0.0.1", port, path: "/fast", timeout: 800 }, (res) => {
        res.resume();
        ok(res.statusCode === 200);
      });
      req.on("error", () => ok(false));
      req.on("timeout", () => {
        req.destroy();
        ok(false);
      });
    });
    if (up) return true;
    await new Promise((ok) => setTimeout(ok, 150));
  }
  return false;
};

async function control(outDir) {
  console.log(`\ncontrol: FAST fills the viewport at once; LATE fills it with the SAME image`);
  console.log(`         after the server holds it for ${LATE_MS} ms. One variable.`);
  console.log(`         arms interleaved F/L/F/L, ${CONTROL_RUNS} each, port ${CONTROL_PORT}\n`);

  const server = spawn(process.execPath, [new URL(import.meta.url).pathname, "--serve-control", String(CONTROL_PORT)], {
    stdio: "ignore",
    detached: true,
  });
  server.unref();
  if (!(await waitForPort(CONTROL_PORT))) {
    killTree(server.pid);
    console.error(`ERROR: the control server never answered on 127.0.0.1:${CONTROL_PORT}.`);
    console.error("       Nothing was measured. This is the harness, not the site.");
    return 2;
  }
  const fast = [];
  const late = [];
  try {
    for (let i = 0; i < CONTROL_RUNS; i += 1) {
      fast.push(runOnce(`http://127.0.0.1:${CONTROL_PORT}/fast`, outDir, `control-fast-${i + 1}`));
      late.push(runOnce(`http://127.0.0.1:${CONTROL_PORT}/late`, outDir, `control-late-${i + 1}`));
    }
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    return 2;
  } finally {
    killTree(server.pid);
  }

  const f = median(fast.map((m) => m.si));
  const l = median(late.map((m) => m.si));
  console.log("FAST arm" + table(fast));
  console.log("\nLATE arm" + table(late));
  console.log(`\n  FAST median SI  ${secs(f)}`);
  console.log(`  LATE median SI  ${secs(l)}`);
  console.log(`  separation      ${Math.round(l - f)} ms   (must exceed ${MIN_SEPARATION_MS} ms)\n`);

  if (l - f < MIN_SEPARATION_MS) {
    console.error("CONTROL FAILED - this harness cannot see a late paint.");
    console.error("Every Speed Index number it prints is worthless. Do not quote one.");
    return 1;
  }
  console.log("CONTROL PASSED - the harness separates a late paint from an early one.\n");
  return 0;
}

/* ------------------------------------------------------------------- main -- */

async function main() {
  if (has("serve-control")) {
    const port = Number(arg("serve-control", String(CONTROL_PORT)));
    await serveControl(port);
    return new Promise(() => {}); // serve until killed
  }

  const outDir = arg("out", path.join(os.tmpdir(), `si-${Date.now()}`));
  fs.mkdirSync(outDir, { recursive: true });

  if (has("control")) {
    const code = await control(outDir);
    console.log(`frames + json: ${outDir}`);
    return code;
  }

  const url = arg("url", "https://ellaz.fun/");
  const runs = Number(arg("runs", "10"));
  if (!Number.isInteger(runs) || runs < 1) {
    console.error("--runs must be a positive integer");
    return 2;
  }

  const rows = [];
  for (let i = 0; i < runs; i += 1) {
    process.stderr.write(`  run ${i + 1}/${runs} ...\r`);
    try {
      rows.push(runOnce(url, outDir, `run-${String(i + 1).padStart(2, "0")}`));
    } catch (e) {
      console.error(`\nERROR on run ${i + 1}: ${e.message}`);
      return 2;
    }
  }
  process.stderr.write("                    \r");

  const si = rows.map((m) => m.si);
  const lo = Math.min(...si);
  const hi = Math.max(...si);

  console.log(`\npopulation:  ${url}`);
  console.log(`runs:        ${rows.length}`);
  console.log(`lighthouse:  ${rows[0].lhVersion}   (pinned ${LIGHTHOUSE})`);
  console.log(`chrome:      ${rows[0].chrome}`);
  console.log(`date:        ${new Date().toISOString()}`);
  console.log(`tree:        ${tree()}`);
  console.log(table(rows));
  console.log(`\n  Speed Index  median ${secs(median(si))}   min ${secs(lo)}   max ${secs(hi)}   spread ${(hi / lo).toFixed(1)}x`);
  console.log(`  score        median ${median(rows.map((m) => m.score))}   min ${Math.min(...rows.map((m) => m.score))}   max ${Math.max(...rows.map((m) => m.score))}`);
  console.log(`\n  READ THE PER-RUN COLUMN, NOT ONLY THE MEDIAN.`);
  console.log(`  frames + json: ${outDir}\n`);
  return 0;
}

main().then((c) => process.exit(c), (e) => {
  console.error(e);
  process.exit(2);
});
