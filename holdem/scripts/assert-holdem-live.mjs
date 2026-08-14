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
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

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

// The version is READ OUT OF THE SOURCE, not written here. A constant copied
// into this file is correct until somebody bumps the protocol, at which point
// the gate either fails on a good deploy or — worse, if it were written as a
// floor — passes a server the client cannot speak to. There is one number and
// this reads it.
function protocolVersion() {
  const src = readFileSync(join(HERE, "..", "shared", "src", "protocol.ts"), "utf8");
  const m = src.match(/export const PROTOCOL_VERSION\s*=\s*(\d+)/);
  if (!m) {
    bad("could not read PROTOCOL_VERSION out of shared/src/protocol.ts");
    return null;
  }
  return Number(m[1]);
}

const WANT_V = protocolVersion();

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

let html = "";
try {
  const res = await fetch(PAGES);
  html = await res.text();
  res.ok ? ok(`the site answers (HTTP ${res.status})`) : bad(`the site returned HTTP ${res.status}`);
} catch (e) {
  bad(`the site is unreachable: ${e.message}`);
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

if (!builtEntry) {
  bad("the build produced no hashed JS entry to look for");
} else if (!html) {
  bad("no HTML was served, so nothing could be matched against the build");
} else if (html.includes(builtEntry)) {
  ok(`the served page references THIS build (${builtEntry})`);
} else {
  bad(`the served page does not reference ${builtEntry} — it is serving an older build`);
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
    bad(`${rel} is SERVED but does not match the build (truncated or stale)`);
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
