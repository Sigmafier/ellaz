// What a player downloads before they can play a hand.
//
// The sound lab is a tuning tool. Keeping it off a first load takes THREE
// things that live in three different places, and getting two of them right
// produces a green build whose payload did not move:
//
//   1. the lazy `import()` in App.tsx
//   2. a stable chunk NAME, so the exclusion has something to match
//   3. `workbox.globIgnores`, because the precache glob sweeps **/*.js
//
// ...plus a fourth that is invisible from the source entirely: a
// `<link rel="modulepreload">` is a DOWNLOAD, not a hint, so Vite writing one
// for the lazy chunk undoes all three.
//
// This gate exists because the fourth and a fifth both fired here on the day
// the lab was written, and neither was visible anywhere except the artifact:
//
//   · the modulepreload — three correct settings, and every player still
//     fetched the lab on first paint.
//   · A MANUAL CHUNK IS A MAGNET — declaring `manualChunks: id =>
//     id.includes("/src/lab/") && "lab"` pulled REACT into the lab chunk, so
//     the shell opened with `import{r as L,...}from"./lab-*.js"` and the lab
//     became mandatory to run the app while still being excluded from the
//     precache. The tell was a precache that got 13.5 KiB SMALLER after a
//     whole screen was added.
//
// Run: node scripts/assert-first-visit.mjs [--control]
//   --control plants each failure in a COPY of dist/ and requires this script
//   to catch every one. A gate nobody has watched fail is not a gate.

import { readFileSync, readdirSync, writeFileSync, cpSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const DIST = process.env.DIST_DIR ?? "client/dist";

/** Every check, as data, so --control can plant a failure per check. */
function inspect(dist) {
  const assets = join(dist, "assets");
  const files = readdirSync(assets);
  const labs = files.filter((f) => /^lab-.*\.js$/.test(f));
  const shells = files.filter((f) => /^index-.*\.js$/.test(f));
  const html = readFileSync(join(dist, "index.html"), "utf8");
  const sw = readFileSync(join(dist, "sw.js"), "utf8");
  // Minified workbox writes `{url:"index.html",revision:...}` — a bare
  // identifier key, not JSON. A `"url":"` matcher finds ZERO entries here and
  // then every "contains no forbidden chunk" assertion under it passes over an
  // empty list, which is how this exact check reported success twice in ellaz.
  const precached = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
  const shellSrc = shells.map((f) => readFileSync(join(assets, f), "utf8")).join("\n");
  return { files, labs, shells, html, precached, shellSrc };
}

function check(dist) {
  const fail = [];
  const s = inspect(dist);

  // The matcher must be able to see anything at all before any absence below
  // it means something.
  if (s.precached.length === 0) fail.push("the precache manifest parsed as EMPTY — the matcher is broken, not the build");
  if (s.shells.length === 0) fail.push("no index-*.js shell chunk found at all");
  if (s.labs.length === 0) fail.push("no lab-*.js chunk — the chunk name changed, so every exclusion below silently matches nothing");

  for (const lab of s.labs) {
    if (s.precached.includes(`assets/${lab}`)) fail.push(`${lab} is PRECACHED — every player downloads the lab`);
    if (s.html.includes(lab)) fail.push(`${lab} is referenced by index.html (a modulepreload is a download, not a hint)`);
    // A static import means the app cannot run without it, which also makes
    // the precache exclusion actively wrong.
    if (new RegExp(`from\\s*["']\\./${lab}["']`).test(s.shellSrc))
      fail.push(`the shell STATICALLY imports ${lab} — a manual chunk magnetised shared code into the lab`);
  }

  // POSITIVE CONTROLS. Every assertion above is an absence, and an absence is
  // satisfied by a build that emitted nothing at all.
  const shellPrecached = s.shells.some((f) => s.precached.includes(`assets/${f}`));
  if (!shellPrecached) fail.push("positive control failed: the shell chunk is NOT precached, so this build is broken in a different way");
  if (!s.shells.some((f) => s.html.includes(f)))
    fail.push("positive control failed: index.html does not reference the shell chunk");
  if (s.labs.length && !/import\(\s*["']\.\/lab-/.test(s.shellSrc))
    fail.push("positive control failed: nothing dynamically imports the lab, so it is unreachable rather than lazy");

  return { fail, s };
}

function report(dist) {
  const { fail, s } = check(dist);
  for (const f of fail) console.error(`FAIL  ${f}`);
  if (fail.length) return 1;
  const size = (f) => readFileSync(join(dist, "assets", f)).length;
  console.log(`OK  first visit is ${s.shells.map(size).reduce((a, b) => a + b, 0)} B of shell`);
  console.log(`    lab kept off it: ${s.labs.map((f) => `${f} (${size(f)} B)`).join(", ")}`);
  console.log(`    precache holds ${s.precached.length} entries, none of them the lab`);
  return 0;
}

// ---------------------------------------------------------------------------

if (process.argv.includes("--control")) {
  const mutations = [
    ["lab precached", (d, s) => {
      const p = join(d, "sw.js");
      writeFileSync(p, readFileSync(p, "utf8").replace('url:"index.html"', `url:"assets/${s.labs[0]}",revision:null},{url:"index.html"`));
    }],
    ["modulepreload for the lab", (d, s) => {
      const p = join(d, "index.html");
      writeFileSync(p, readFileSync(p, "utf8").replace("</head>", `<link rel="modulepreload" href="/assets/${s.labs[0]}"></head>`));
    }],
    ["shell statically imports the lab", (d, s) => {
      const p = join(d, "assets", s.shells[0]);
      writeFileSync(p, `import{x}from"./${s.labs[0]}";\n` + readFileSync(p, "utf8"));
    }],
    ["lab chunk renamed away", (d, s) => rmSync(join(d, "assets", s.labs[0]))],
    ["precache matcher blinded", (d) => {
      const p = join(d, "sw.js");
      writeFileSync(p, readFileSync(p, "utf8").replaceAll('url:"', 'href:"'));
    }],
  ];

  const base = inspect(DIST);
  let killed = 0;
  for (const [name, mutate] of mutations) {
    const tmp = mkdtempSync(join(tmpdir(), "fv-"));
    const d = join(tmp, "dist");
    cpSync(DIST, d, { recursive: true });
    mutate(d, base);
    // Assert the mutation LANDED. A verdict read from the absence of a
    // message is not a verdict: a mutation that never applied is
    // indistinguishable from one the gate missed.
    const before = JSON.stringify(base);
    const after = (() => { try { return JSON.stringify(inspect(d)); } catch { return "unreadable"; } })();
    if (before === after) { console.error(`HARNESS FAULT  ${name}: mutation did not change the dist`); rmSync(tmp, { recursive: true, force: true }); continue; }
    let caught;
    try { caught = check(d).fail.length > 0; } catch { caught = true; }
    console.log(`${caught ? "KILLED  " : "SURVIVED"}  ${name}`);
    if (caught) killed++;
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`\n${killed}/${mutations.length} planted failures caught`);
  process.exit(killed === mutations.length ? 0 : 1);
}

process.exit(report(DIST));
