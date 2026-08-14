#!/usr/bin/env node
// The deploy gate. Runs in the same job as the deploy and reds the run.
//
//   node scripts/assert-holdem-live.mjs <worker-url> <pages-url> [dist-dir]
//
// Every other gate in this repo reads a directory on disk. This one reads the
// NETWORK, because a Worker on Cloudflare's edge is a place none of them can
// see — the whole argument in
// .claude/rules/a-second-published-artifact-needs-its-own-gate.md.
//
// The three things it will not accept, each of which has burned this repo:
//
//   1. "every asset 200s" — true of a completely stale site, where the old
//      HTML and old assets agree with each other and nothing of this deploy
//      arrived. So each asset is compared by SHA-256 against the dist/ that
//      was just built, never by status or length. An 80%-truncated chunk is a
//      200 with a plausible length and a syntax error on import.
//
//   2. "the page loads" — true of a client whose VITE_SERVER_URL was never
//      set, which renders perfectly and connects to nothing. The bundle is
//      searched for the worker's own origin.
//
//   3. "the worker answers" — true of a Worker whose Durable Object binding is
//      broken, since the root route never touches one. So this opens a real
//      socket to a real room and requires a welcome back.
//
// Node builtins only: a gate that must install 400 packages before it can tell
// you the site is down fails for its own reasons.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { protocolVersion } from "./protocolVersion.mjs";

const [, , WORKER, PAGES, DIST = "client/dist"] = process.argv;
if (!WORKER || !PAGES) {
  console.error("usage: assert-holdem-live.mjs <worker-url> <pages-url> [dist-dir]");
  process.exit(2);
}

const problems = [];
const ok = (m) => console.log(`  ok   ${m}`);
const bad = (m) => {
  console.log(`  FAIL ${m}`);
  problems.push(m);
};

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// The version is READ OUT OF THE SOURCE, never written here — see
// protocolVersion.mjs. A copy is correct until somebody bumps the protocol, at
// which point the gate either fails on a good deploy or, written as a floor,
// passes a server the client cannot speak to.
let WANT_V = null;
try {
  WANT_V = protocolVersion();
} catch (e) {
  bad(e.message);
}

// ---------------------------------------------------------------- the worker

console.log(`worker ${WORKER}`);

try {
  const res = await fetch(WORKER, { redirect: "manual" });
  res.ok ? ok(`worker answers (HTTP ${res.status})`) : bad(`worker returned HTTP ${res.status}`);
} catch (e) {
  bad(`worker unreachable: ${e.message}`);
}

// A room, over the real API. This is the first thing that touches a Durable
// Object — the root route above proves only that the script deployed.
let code = null;
try {
  const res = await fetch(`${WORKER}/api/create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ maxSeats: 6, sb: 1, bb: 2, startingStack: 200 }),
  });
  const body = await res.json().catch(() => ({}));
  code = body.code ?? null;
  code
    ? ok(`created a real table (${code}) — the Durable Object binding works`)
    : bad(`could not create a table (HTTP ${res.status})`);
} catch (e) {
  bad(`create failed: ${e.message}`);
}

// And a socket into it. Hibernation, attachments and storage all sit behind
// this one message; none of them is exercised by an HTTP route.
if (code && WANT_V !== null) {
  const welcomed = await new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    const timer = setTimeout(() => done({ err: "no welcome within 15s" }), 15_000);
    try {
      const ws = new WebSocket(`${WORKER.replace(/^http/, "ws")}/ws/${code}`);
      ws.onopen = () =>
        ws.send(JSON.stringify({ t: "hello", v: WANT_V, token: `gate-${Date.now()}-abcdefgh` }));
      ws.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.t === "welcome") {
          clearTimeout(timer);
          ws.close();
          done({ name: m.name, v: m.v });
        } else if (m.t === "err") {
          clearTimeout(timer);
          ws.close();
          done({ err: `${m.code}: ${m.msg}` });
        }
      };
      ws.onerror = () => {
        clearTimeout(timer);
        done({ err: "socket error" });
      };
    } catch (e) {
      clearTimeout(timer);
      done({ err: e.message });
    }
  });

  if (welcomed.err) bad(`websocket into the table: ${welcomed.err}`);
  else if (welcomed.v !== WANT_V)
    bad(`server speaks protocol v${welcomed.v}, this build expects v${WANT_V}`);
  else if (!welcomed.name?.adj || !welcomed.name?.noun) bad("welcome carried no pooled name");
  else ok(`socket joined and was named ${welcomed.name.adj} ${welcomed.name.noun}`);
}

// ----------------------------------------------------------------- the pages

console.log(`pages  ${PAGES}`);

/**
 * Wait for the Pages origin to start answering, up to ~90s.
 *
 * A pages.dev hostname created moments ago is not resolvable yet — the FIRST
 * deploy of a new project answers 522 for a minute or two while the edge
 * catches up, and everything downstream then fails as a cascade: no HTML means
 * "does not reference this build" and every asset reads as not served. Three
 * red lines, one cause, none of them a defect.
 *
 * Reporting that as a failed deploy is how a gate earns a reputation for crying
 * wolf, and a gate people ignore protects nothing. So: retry, but BOUNDED and
 * LOUD — it prints each attempt, and if the wait was needed it says so, because
 * "the site took 40s to come up" is information rather than noise.
 *
 * 522/523/524 and a connection error are the only retryable answers. A 404 or a
 * 500 is the site telling us something true, and waiting will not change it.
 */
async function fetchWhenWarm(url, budgetMs = 90_000) {
  const RETRYABLE = new Set([521, 522, 523, 524]);
  const started = Date.now();
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      const res = await fetch(url);
      if (!RETRYABLE.has(res.status)) return { res, attempt, waitedMs: Date.now() - started };
      if (Date.now() - started >= budgetMs) return { res, attempt, waitedMs: Date.now() - started };
      console.log(`  ...  HTTP ${res.status}, the edge is still coming up (attempt ${attempt})`);
    } catch (e) {
      if (Date.now() - started >= budgetMs) return { err: e, attempt, waitedMs: Date.now() - started };
      console.log(`  ...  ${e.message}, retrying (attempt ${attempt})`);
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
}

// Every built artifact must be SERVED and byte-identical. Not "referenced by
// the HTML" — a lazy chunk is named inside another chunk, never in a document,
// which is how two game chunks 404'd on ellaz.fun behind a green gate.
let built = [];
try {
  built = walk(DIST).filter((p) => statSync(p).isFile());
} catch {
  bad(`no built output at ${DIST} to compare against`);
}

// The served DOCUMENT must name the assets this build produced. Asset hashes
// matching is not enough on its own: a fully stale site serves old HTML and old
// assets that agree with each other perfectly. Only the conjunction separates
// "the site works" from "MY build is live".
const builtEntry = built
  .map((p) => relative(DIST, p).split("\\").join("/"))
  .find((r) => r.startsWith("assets/") && r.endsWith(".js"));

/**
 * Wait for the edge to serve THIS build, not merely to answer.
 *
 * There are two different "not yet"s here and the gate needs both, which cost a
 * red run to learn:
 *
 *   1. the hostname does not resolve yet   -> 522, handled by fetchWhenWarm
 *   2. the hostname resolves and serves the PREVIOUS deployment -> 200, and
 *      every downstream check then reports a defect that does not exist
 *
 * `wrangler pages deploy` RETURNS BEFORE the new deployment is current at the
 * edge. Measured 2026-08-14: the gate ran ~1s after the deploy step exited and
 * got the old build; the same URL served the new one moments later. The deploy
 * was perfect and the run was red, and the line it printed — "it is serving an
 * older build" — was true-but-transient, which is worse than false, because it
 * names a real and serious failure mode.
 *
 * Polling for currency is what makes the check honest, and it does NOT make the
 * gate unfailable: a deploy that genuinely never lands never becomes current,
 * so it still fails — just at the end of the budget instead of instantly.
 */
// Overridable so a control can prove the failure path in seconds rather than
// two minutes. Never raise it in CI to paper over a deploy that does not land.
const BUDGET_MS = Number(process.env.LIVE_BUDGET_MS ?? 120_000);

async function fetchCurrent(url, entry, budgetMs = BUDGET_MS) {
  const started = Date.now();
  let attempt = 0;
  for (;;) {
    attempt += 1;
    const { res, err } = await fetchWhenWarm(url, Math.max(0, budgetMs - (Date.now() - started)));
    if (!err && res.ok) {
      const body = await res.text();
      if (!entry || body.includes(entry)) {
        return { html: body, attempt, waitedMs: Date.now() - started, current: true };
      }
      if (Date.now() - started >= budgetMs) {
        return { html: body, attempt, waitedMs: Date.now() - started, current: false };
      }
      console.log(`  ...  answering, but with an older build (attempt ${attempt}) — the edge has not caught up`);
    } else {
      if (Date.now() - started >= budgetMs) {
        return { html: "", attempt, waitedMs: Date.now() - started, current: false, err, status: res?.status };
      }
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
}

if (!builtEntry) {
  bad("the build produced no hashed JS entry to look for");
} else {
  const { html: body, attempt, waitedMs, current, err, status } = await fetchCurrent(PAGES, builtEntry);
  const secs = Math.round(waitedMs / 1000);
  if (err) {
    bad(`the site is unreachable after ${secs}s: ${err.message}`);
  } else if (!body) {
    bad(`the site returned HTTP ${status} after ${secs}s`);
  } else if (current) {
    ok(`the site answers, and serves THIS build (${builtEntry})${attempt > 1 ? ` — after ${secs}s and ${attempt} attempts` : ""}`);
  } else {
    bad(
      `the site never served ${builtEntry} within ${secs}s — it is still on an older build. ` +
        `The deploy step may have published to a different project or branch.`,
    );
  }
}

const docs = new Set([".html"]);
let compared = 0;
let mismatched = 0;

for (const file of built) {
  const rel = relative(DIST, file).split("\\").join("/");
  if (rel.startsWith(".")) continue;
  const isDoc = docs.has(rel.slice(rel.lastIndexOf(".")));

  let served;
  try {
    const res = await fetch(`${PAGES.replace(/\/$/, "")}/${rel}`);
    if (!res.ok) {
      bad(`${rel} is not being served (HTTP ${res.status})`);
      continue;
    }
    served = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    bad(`${rel} could not be fetched: ${e.message}`);
    continue;
  }

  compared += 1;
  // Documents are allowed to differ: a host may inject headers or rewrite the
  // trailing newline. Hashed assets may not — their whole contract is that the
  // name identifies the bytes.
  if (!isDoc && sha(served) !== sha(readFileSync(file))) {
    mismatched += 1;
    // Cloudflare Pages answers a MISSING asset with 200 and its fallback
    // document, so the `!res.ok` branch above never fires for one and the
    // honest cause ("this file is not deployed") arrives disguised as
    // "truncated or stale". Naming the two apart is the difference between
    // looking at the upload and looking at the bundler.
    const head = served.subarray(0, 200).toString("utf8").trimStart().toLowerCase();
    if (head.startsWith("<!doctype html") || head.startsWith("<html")) {
      bad(`${rel} is NOT DEPLOYED — the host answered with its fallback HTML page, not the file`);
    } else {
      bad(`${rel} is SERVED but does not match the build (truncated or stale)`);
    }
  }
}

if (compared === 0) bad("compared zero artifacts — this gate proved nothing");
else if (mismatched === 0) ok(`all ${compared} built artifacts served, byte-identical`);

// The trap this project can hit that ellaz cannot: a client with no server.
// The client falls back to "" when VITE_SERVER_URL is unset, which renders a
// perfect table that connects to the Pages origin and finds nothing there.
const bundle = built.find((p) => p.endsWith(".js"));
if (bundle) {
  const origin = new URL(WORKER).origin;
  const rel = relative(DIST, bundle).split("\\").join("/");
  const text = readFileSync(bundle, "utf8");
  if (text.includes(origin)) {
    ok(`the bundle points at ${origin}`);
  } else if (/localhost:\d+/.test(text)) {
    bad("the bundle still points at localhost — VITE_SERVER_URL was not set for this build");
  } else {
    bad(`the bundle names no server at all (checked ${rel})`);
  }
}

console.log("");
if (problems.length) {
  console.log(`HOLDEM LIVE FAIL — ${problems.length} problem(s)`);
  process.exit(1);
}
console.log("HOLDEM LIVE OK — the worker deals and the site serves this build");
