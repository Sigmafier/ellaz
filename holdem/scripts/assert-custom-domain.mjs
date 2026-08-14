#!/usr/bin/env node
// Is poker.ellaz.fun actually working?
//
//   node scripts/assert-custom-domain.mjs [host] [pages-host] [worker-url]
//
// Setting up a custom domain is a THREE-party job — Cloudflare Pages has to
// know the hostname, Hostinger has to publish the CNAME, and the Worker has to
// accept the new Origin — and each party can be right while another is wrong.
// The failures do not look alike and only one of them looks like a failure:
//
//   Pages not told, CNAME exists  -> Cloudflare error 1000/522. Obvious.
//   Pages told, CNAME missing     -> NXDOMAIN. Obvious.
//   Both done, Origin not allowed -> THE PAGE LOADS PERFECTLY and every
//                                    button 403s. Nothing about it reads as a
//                                    DNS or hosting problem, and it is the one
//                                    this project actually had.
//
// So the last check is the reason this file exists. It is also side-effect
// free: an OPTIONS preflight reveals the verdict in a header without creating
// a table, and the disallowed-origin control proves the check can say no.
//
// ARMED IN CI (`HOLDEM_CUSTOM_DOMAIN=1` in deploy-holdem.yml). It shipped
// advisory because the domain did not exist yet — a gate that is red from the
// day it lands is a gate people learn to ignore — and was enforced in the same
// change that made it pass, which is the other half of that rule
// (.claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md).
// Run it bare to see the state without failing anything.

import { Resolver } from "node:dns/promises";

const [, , HOST = "poker.ellaz.fun", PAGES = "ellaz-holdem.pages.dev", WORKER = "https://holdem-server.yatiroffer.workers.dev"] =
  process.argv;
const ARMED = process.env.HOLDEM_CUSTOM_DOMAIN === "1";

const problems = [];
const ok = (m) => console.log(`  ok   ${m}`);
const info = (m) => console.log(`  ...  ${m}`);
const bad = (m) => {
  problems.push(m);
  console.log(`  ${ARMED ? "FAIL" : "todo"} ${m}`);
};

const timeout = (ms) => AbortSignal.timeout(ms);

// ---------------------------------------------------------------------------
// 1. DNS. Use PUBLIC resolvers, not this machine's — a stale negative cache
//    locally would report a domain missing for minutes after it went live.
//
//    Ask each one SEPARATELY, and treat a hit from ANY of them as live.
//    `setServers([a, b])` looks like redundancy and is not: NXDOMAIN is a
//    real answer rather than a transport failure, so node stops at the first
//    resolver and never asks the second. Measured 2026-08-14, minutes after
//    the record was published — 1.1.1.1 still held the negative cache while
//    8.8.8.8 had the CNAME, and the gate reported "the CNAME has not been
//    created" over a domain that was already serving the correct build over
//    a valid certificate. A resolver disagreement IS propagation; reporting
//    it as an absent record sends somebody back to a panel they got right.
const RESOLVERS = [
  ["1.1.1.1", "cloudflare"],
  ["8.8.8.8", "google"],
  ["9.9.9.9", "quad9"],
];

async function askOne(ip) {
  const r = new Resolver();
  r.setServers([ip]);
  const out = { cname: null, addrs: [] };
  try {
    out.cname = (await r.resolveCname(HOST))[0]?.replace(/\.$/, "") ?? null;
  } catch {
    /* no CNAME is not fatal on its own — an A record would also serve */
  }
  try {
    out.addrs = await r.resolve4(HOST).catch(() => r.resolve6(HOST));
  } catch {
    /* an empty list is the answer */
  }
  return out;
}

const answers = await Promise.all(RESOLVERS.map(([ip]) => askOne(ip)));
const seen = answers.filter((a) => a.addrs.length > 0);
const dnsLive = seen.length > 0;
const cname = answers.find((a) => a.cname)?.cname ?? null;
const lagging = RESOLVERS.filter((_, i) => answers[i].addrs.length === 0).map(([, name]) => name);

if (!dnsLive) {
  bad(`${HOST} does not resolve at any of ${RESOLVERS.map(([, n]) => n).join("/")} — the CNAME at Hostinger has not been created`);
} else if (cname && cname !== PAGES) {
  // Pointing somewhere real but WRONG is worse than pointing nowhere: it
  // serves a working site that is not this one.
  bad(`${HOST} is a CNAME to ${cname}, not ${PAGES} — it is pointed at the wrong project`);
} else {
  ok(`${HOST} resolves${cname ? ` (CNAME -> ${cname})` : ""}`);
  if (lagging.length) info(`${lagging.join(", ")} ${lagging.length > 1 ? "have" : "has"} not caught up yet — ordinary propagation, not a missing record`);
}

// ---------------------------------------------------------------------------
// 2. It serves, over TLS, and serves THIS project rather than a stranger's.
let servedHtml = null;
if (dnsLive) {
  try {
    const res = await fetch(`https://${HOST}/`, { signal: timeout(20_000) });
    servedHtml = await res.text();
    if (res.status !== 200) {
      // 5xx here is the classic "CNAME exists, Pages was never told about the
      // hostname" shape — Cloudflare's edge receives a name it cannot route.
      bad(`https://${HOST}/ answered ${res.status} — add the domain in the Pages project BEFORE the CNAME exists`);
    } else {
      ok(`https://${HOST}/ answers 200 over a valid certificate`);
    }
  } catch (e) {
    bad(`https://${HOST}/ could not be fetched (${e.cause?.code ?? e.name}) — certificate not issued yet, or the hostname is unknown to Pages`);
  }
}

// ---------------------------------------------------------------------------
// 3. The same build as the origin it is supposed to be an alias of.
//    Catches a domain attached to the wrong Pages project, which otherwise
//    looks entirely healthy.
if (servedHtml) {
  const assets = (s) => [...s.matchAll(/assets\/[A-Za-z0-9_.-]+\.js/g)].map((m) => m[0]).sort();
  try {
    const originHtml = await (await fetch(`https://${PAGES}/`, { signal: timeout(20_000) })).text();
    const mine = assets(servedHtml);
    const theirs = assets(originHtml);
    // Differing chunk lists mean one of two very different things, and the
    // HASH is what cannot tell them apart — Vite rehashes on every build, so
    // "different hash" describes edge lag and a stranger's site equally well.
    // The BASE NAMES are the discriminator: the same app deployed twice keeps
    // index/shell/vendor-react, a different app shares none of them.
    //
    // Written this way after the negative control passed for the wrong reason:
    // ellaz.fun was caught by the origin check below, and this one shrugged.
    // A wrong project that happened to be origin-allowed would have sailed
    // through both.
    // Vite emits `[name]-[hash].js` with an EIGHT-character hash, so the hash
    // is matched by LENGTH. Both looser forms were tried and both were wrong,
    // in opposite directions: `[A-Za-z0-9_-]{6,}` is greedy across name
    // segments and turned `vendor-react-Bt4lNSbZ.js` into `vendor.js`, while
    // `[A-Za-z0-9_]{6,}` cannot match a hash containing a hyphen and left
    // `index-B3l9KG-t.js` untouched. Both still COMPARED correctly, because
    // each mangled the two sides alike — only the message was wrong, which is
    // the half a human acts on.
    const base = (list) => [...new Set(list.map((a) => a.replace(/-[A-Za-z0-9_-]{8}\.js$/, ".js")))].sort();
    if (!mine.length) {
      bad(`https://${HOST}/ names no JS bundle at all — that is not this app`);
    } else if (JSON.stringify(mine) === JSON.stringify(theirs)) {
      ok(`serves the same build as ${PAGES} (${mine.length} chunk(s))`);
    } else if (JSON.stringify(base(mine)) !== JSON.stringify(base(theirs))) {
      bad(`https://${HOST}/ is a DIFFERENT APP from ${PAGES} — it serves ${base(mine).join(",")} where this project serves ${base(theirs).join(",")}. The domain is attached to the wrong Pages project`);
    } else {
      info(`same app, different build from ${PAGES} — ${mine.join(",")} vs ${theirs.join(",")} (the edge has not caught up)`);
    }
  } catch {
    info(`could not read ${PAGES} to compare builds`);
  }
}

// ---------------------------------------------------------------------------
// 4. THE ONE THAT MATTERS. Does the Worker accept this Origin?
//
// Asserted on the HEADER, never the status: the preflight answers 200 either
// way, so a status check would report success over a table nobody can create.
async function allows(origin) {
  const res = await fetch(`${WORKER}/api/create`, {
    method: "OPTIONS",
    headers: { origin, "access-control-request-method": "POST" },
    signal: timeout(20_000),
  });
  return (res.headers.get("access-control-allow-origin") ?? "") === origin;
}

try {
  const wanted = await allows(`https://${HOST}`);
  // A gate that says yes to everyone passes every test ever written. This is
  // the control that makes the line above mean something.
  const control = await allows("https://not-allowed.example.com");

  if (control) {
    bad("the worker allows an arbitrary origin — the CORS check is not doing anything, so the result below proves nothing");
  } else if (wanted) {
    ok(`the worker accepts Origin: https://${HOST} (and still refuses a stranger)`);
  } else {
    bad(`the worker REFUSES Origin: https://${HOST} — the page would load and every action would 403. Add it to ALLOWED_ORIGINS in server/wrangler.toml and redeploy`);
  }
} catch (e) {
  bad(`could not probe the worker's origin check (${e.cause?.code ?? e.name})`);
}

// ---------------------------------------------------------------------------
console.log("");
if (!problems.length) {
  console.log(`CUSTOM DOMAIN OK — https://${HOST} serves this build and the worker accepts it`);
  process.exit(0);
}
if (!ARMED) {
  console.log(`custom domain not ready yet — ${problems.length} step(s) outstanding (advisory; set HOLDEM_CUSTOM_DOMAIN=1 to enforce)`);
  process.exit(0);
}
console.log(`CUSTOM DOMAIN FAIL — ${problems.length} problem(s)`);
process.exit(1);
