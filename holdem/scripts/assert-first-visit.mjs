// What a player downloads before they can play a hand.
//
// The studio (look, sounds, your name) is a tuning tool. Keeping it off a
// first load takes THREE
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
// the lab was written, and a SIXTH fired the day it was renamed — the chunk
// name was matched on a FILE name, so renaming the component dropped the
// `lab-` prefix and the whole screen went into the precache, and neither was visible anywhere except the artifact:
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

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, cpSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const DIST = process.env.DIST_DIR ?? "client/dist";

/**
 * How many `lab-*.js` chunks this build should emit: one, the studio (look,
 * sounds and your name, over a demo hand). It was 2 while the sound lab and
 * the look lab were separate screens; they were merged because all three are
 * judged against the same felt.
 */
const LABS_EXPECTED = 1;

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
  // The recorded bank. `public/` files are copied verbatim, so these are NOT
  // in assets/ and NOT hashed - a different population from every chunk above
  // and one no existing check could see.
  const sfxDir = join(dist, "sfx", "v1");
  const sfx = existsSync(sfxDir) ? readdirSync(sfxDir).filter((f) => f.endsWith(".opus")) : [];
  const sfxBytes = sfx.reduce((a, f) => a + statSync(join(sfxDir, f)).size, 0);
  return { files, labs, shells, html, precached, shellSrc, sfx, sfxBytes };
}

function check(dist) {
  const fail = [];
  const s = inspect(dist);

  // The matcher must be able to see anything at all before any absence below
  // it means something.
  if (s.precached.length === 0) fail.push("the precache manifest parsed as EMPTY — the matcher is broken, not the build");
  if (s.shells.length === 0) fail.push("no index-*.js shell chunk found at all");
  // A COUNT, not `> 0`, and that distinction was a live regression rather
  // than a precaution. `length === 0` was correct while there was one lab; the
  // day a second one landed, the "lab chunk renamed away" control started
  // SURVIVING — deleting one chunk still left one, so the gate reported green
  // over exactly the failure it exists to catch, and the only thing that said
  // so was `--control`.
  //
  // Adding a third tuning screen means bumping this number in the same commit.
  // That is the point: a ratchet somebody has to walk past, rather than a
  // threshold that quietly stops meaning anything as the tree grows.
  if (s.labs.length !== LABS_EXPECTED)
    fail.push(
      `expected ${LABS_EXPECTED} lab-*.js chunks and found ${s.labs.length} (${s.labs.join(", ") || "none"}) — ` +
        `either a chunk name changed, so every exclusion below silently matches nothing, or a lab was added ` +
        `without updating LABS_EXPECTED`,
    );

  for (const lab of s.labs) {
    if (s.precached.includes(`assets/${lab}`)) fail.push(`${lab} is PRECACHED — every player downloads the lab`);
    if (s.html.includes(lab)) fail.push(`${lab} is referenced by index.html (a modulepreload is a download, not a hint)`);
    // A static import means the app cannot run without it, which also makes
    // the precache exclusion actively wrong.
    if (new RegExp(`from\\s*["']\\./${lab}["']`).test(s.shellSrc))
      fail.push(`the shell STATICALLY imports ${lab} — a manual chunk magnetised shared code into the lab`);
  }

  // THE RECORDED BANK IS OPT-IN, and these three lines are the entire
  // mechanism keeping it that way.
  //
  // 118 KB of audio is bigger than this whole app. It is paid ONLY by somebody
  // who picked a recording, and what makes that true is that nothing precaches
  // it and nothing references it from the document - the fetch happens in
  // `audio.ts` on the first gesture, and only for arms actually picked.
  //
  // The default `globPatterns` does not sweep `.opus` today. That is a DEFAULT,
  // not a decision, and the day it changes or somebody adds `opus` to the
  // pattern list, every player downloads the bank behind a green build. This is
  // the line that notices.
  for (const f of s.precached) {
    if (f.endsWith(".opus")) fail.push(`${f} is PRECACHED — every player downloads the recorded bank`);
  }
  if (/\.opus\b/.test(s.html)) fail.push("index.html references a .opus file — the bank must be fetched on demand, never linked");
  if (s.sfx.length && !/sfx\/v1\//.test(s.shellSrc))
    fail.push("positive control failed: the shell never builds a sfx/v1/ URL, so the bank is unreachable rather than lazy");

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
  console.log(`    recorded bank opt-in: ${s.sfx.length} files, ${s.sfxBytes} B, 0 precached, 0 in index.html`);
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
    ["a sample precached", (d, s) => {
      const p = join(d, "sw.js");
      writeFileSync(p, readFileSync(p, "utf8").replace('url:"index.html"', `url:"sfx/v1/${s.sfx[0]}",revision:null},{url:"index.html"`));
    }],
    ["a sample linked from index.html", (d, s) => {
      const p = join(d, "index.html");
      writeFileSync(p, readFileSync(p, "utf8").replace("</head>", `<link rel="preload" as="audio" href="/sfx/v1/${s.sfx[0]}"></head>`));
    }],
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
