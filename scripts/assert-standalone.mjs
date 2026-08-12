#!/usr/bin/env node
// Assert that a STANDALONE single-game bundle is safe to hand to a third party.
//
//   node scripts/assert-standalone.mjs            # checks dist-standalone/<id>/ for every id
//   BUNDLE_DIR=dist-standalone/snake node scripts/assert-standalone.mjs
//
// WHY THIS EXISTS
// Everything else in this repo asserts against `dist/`, which we build, deploy
// and can re-fetch. A standalone bundle is the first artifact this project
// publishes that it CANNOT watch: itch.io hosts it, on their CDN, inside an
// iframe on their domain. Nothing here can see it again after the upload.
//
// So this gate runs at the last moment we still have custody of the bytes.
//
// THE FOUR THINGS THAT WOULD BREAK IT, AND WHY EACH IS INVISIBLE
//
//   1. An absolute path. itch serves from a CDN subdirectory whose path we
//      never see, so `/assets/x.js` resolves against THEIR root and 404s.
//      Locally it is correct on both our hosts. The symptom is a blank frame,
//      not an error.
//
//   2. A service worker. Registering one on someone else's origin caches their
//      site, and the navigation fallback is the exact hijack documented in
//      .claude/rules/sw-navigation-fallback-hijacks-real-pages.md. Measured
//      2026-08-11: a relative-base build still emits sw.js + workbox-*.js, so
//      the base alone does NOT drop it and this check is load-bearing.
//
//   3. A phone-home. `bootContentPage` (src/portal/PageApp.tsx:109-111) calls
//      analytics.init() and startCloudSync() unconditionally, and cloudSync
//      pushes to Firestore on visibilitychange. Shipping that entry would open
//      a write loop from a third-party iframe - a direct breach of the "no
//      external network requests from games" rule that is the whole reason this
//      SDK can be listed on a portal. It is a STATIC import, so no amount of
//      chunk exclusion removes it; only a different entry does. This check is
//      what proves the different entry was actually used.
//
//   4. A case mismatch. This repo lives on /mnt/c, which is case-INSENSITIVE.
//      itch's server is case-sensitive and says so twice in its own docs. So
//      `GameArt.svg` referencing `gameart.svg` loads perfectly here and 404s
//      there. `existsSync` cannot see this - it answers with the filesystem's
//      rules, not the server's - which is why the check below reads the actual
//      directory entries and compares the basename byte-for-byte.
//
// A GATE NOBODY HAS WATCHED FAIL IS NOT A GATE.
// Every predicate here is exported once and used by BOTH the real check and the
// negative control at the bottom. A control that exercises different code proves
// nothing about the check. The control plants each of the four defects and
// requires each to be caught; if any fails to fire, this script exits non-zero
// even when the real bundle "passed".
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, relative, sep } from "node:path";

const ROOT = process.env.BUNDLE_ROOT ?? "dist-standalone";

// ---------------------------------------------------------------------------
// Predicates. One definition each, shared with the control block.
// ---------------------------------------------------------------------------

/**
 * Every root-absolute reference in a source file.
 *
 * `="/` deliberately excludes `="//` (protocol-relative) and anything starting
 * `http`, which are absolute by intent and fine. What is NOT fine is a path
 * rooted at the server, because on itch the server root is not ours.
 */
export function absoluteRefs(source) {
  const patterns = [
    /(?:src|href)="\/(?!\/)[^"]*/g,
    /(?:src|href)='\/(?!\/)[^']*/g,
    /url\(\s*"?'?\/(?!\/)[^)"']*/g,
    /["'`]\/assets\/[^"'`]*/g,
  ];
  return patterns.flatMap((re) => [...source.matchAll(re)].map((m) => m[0]));
}

/**
 * Service-worker traces, in the emitted source rather than in the file list.
 *
 * Checked as strings and not merely as filenames because a registration can
 * survive in a chunk after the sw file itself is gone - which fails at runtime
 * on the third-party origin, where the fetch for a missing sw.js is a 404
 * against THEIR root.
 */
export function serviceWorkerRefs(source) {
  const patterns = [
    /serviceWorker\s*\.\s*register/g,
    /registerSW/g,
    /workbox[-_][A-Za-z0-9]+\.js/g,
    /["'`][^"'`]*\bsw\.js\b/g,
  ];
  return patterns.flatMap((re) => [...source.matchAll(re)].map((m) => m[0]));
}

/**
 * Anything that would talk to a network this bundle has no business reaching.
 *
 * Names the vendors rather than our own module paths on purpose: after a
 * minified build our module names are gone, and the vendor's own endpoint
 * string is what actually survives into the bytes a player downloads.
 */
export function phoneHomeRefs(source) {
  const patterns = [
    /posthog/gi,
    /firestore\.googleapis\.com/gi,
    /identitytoolkit\.googleapis\.com/gi,
    /securetoken\.googleapis\.com/gi,
    /firebaseio\.com/gi,
  ];
  return patterns.flatMap((re) => [...source.matchAll(re)].map((m) => m[0]));
}

/**
 * Every third-party origin the bundle references. An ALLOWLIST, and the
 * distinction is the whole point.
 *
 * `phoneHomeRefs` above is a denylist of vendors I already knew about, and it
 * passed this bundle clean while the page fetched
 * `https://fonts.googleapis.com/css2?family=Heebo…` on load - measured in a real
 * browser 2026-08-11, after the denylist had said OK. A webfont is an external
 * request from a game, which is the one thing this artifact promises not to
 * make, and on a children's platform it hands a child's IP to a third party.
 *
 * A denylist can only catch the vendor you thought of. This names what is
 * ALLOWED and reports everything else, so the next unthought-of host fails.
 *
 * The excluded hosts are XML/JSON-LD NAMESPACE identifiers - they appear in
 * `xmlns` and `@context` and are never fetched. They are excluded by name
 * rather than by pattern so that adding one is a deliberate edit.
 */
const ALLOWED_ORIGINS = ["ellaz.fun"];
const NAMESPACE_HOSTS = ["www.w3.org", "schema.org", "purl.org"];

export function externalOrigins(source) {
  // FETCH POSITIONS ONLY, not every URL in the bytes. The first version of this
  // matched any `https?://` and immediately flagged `reactjs.org` inside a React
  // error message and `phaser.io`, `github.com`, `opensource.org`, `steffe.se`
  // inside Phaser's licence banner. Those are attributions, not requests. A gate
  // that reds on a licence comment gets switched off within a week, and then it
  // is not protecting anything.
  const patterns = [
    // `\s*` not `\s+`: minified CSS emits `@import"https://…"` with no space,
    // and a pattern demanding one silently matches nothing - which is a gate
    // reporting clean over the exact request it exists to catch.
    /@import\s*(?:url\(\s*)?["']?(https?:\/\/[a-z0-9.-]+)/gi,
    /url\(\s*["']?(https?:\/\/[a-z0-9.-]+)/gi,
    /(?:src|href)\s*=\s*["'](https?:\/\/[a-z0-9.-]+)/gi,
    /(?:fetch|importScripts|sendBeacon)\s*\(\s*["'`](https?:\/\/[a-z0-9.-]+)/gi,
    /new\s+(?:URL|Worker|EventSource|WebSocket)\s*\(\s*["'`]((?:https?|wss?):\/\/[a-z0-9.-]+)/gi,
    /\.(?:src|href)\s*=\s*["'`](https?:\/\/[a-z0-9.-]+)/gi,
  ];
  const hosts = patterns
    .flatMap((re) => [...source.matchAll(re)].map((m) => m[1]))
    .map((url) => url.replace(/^[a-z]+:\/\//i, "").toLowerCase());
  return [...new Set(hosts)].filter(
    (host) =>
      !NAMESPACE_HOSTS.includes(host) &&
      !ALLOWED_ORIGINS.some((ok) => host === ok || host.endsWith(`.${ok}`)),
  );
}

/** Local files an HTML document points at, ignoring anything off-site. */
export function localRefs(html) {
  return [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((ref) => !/^(?:[a-z]+:)?\/\//i.test(ref) && !ref.startsWith("data:") && !ref.startsWith("#"));
}

/**
 * Does `relPath` exist under `dir` with EXACTLY this spelling?
 *
 * Walks segment by segment and compares against the real directory entries,
 * because `existsSync` on a case-insensitive volume answers yes to the wrong
 * case and that is precisely the bug this catches.
 */
export function existsExactCase(dir, relPath) {
  const clean = relPath.replace(/[?#].*$/, "").replace(/^\.\//, "");
  if (!clean || clean.startsWith("/")) return false;
  let current = dir;
  for (const segment of clean.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") return false;
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return false;
    }
    if (!entries.includes(segment)) return false;
    current = join(current, segment);
  }
  return true;
}

/**
 * The stamp the bundle must carry.
 *
 * Mirrored in vite.config.ts because one is TypeScript inside a build and the
 * other is a plain script - the same two-implementations arrangement as
 * portal/paths.ts against build/routes.ts, and safe for the same reason: this
 * gate FAILS on any drift between them, so they cannot quietly disagree.
 *
 * The `-dirty` suffix is not decoration. A bundle built from an uncommitted
 * tree is not described by its HEAD sha, and saying so is the difference
 * between a stamp and a decoration.
 */
export function buildStamp() {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim() !== "";
  return dirty ? `${sha}-dirty` : sha;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const isText = (file) => /\.(html|js|mjs|css|json|webmanifest)$/i.test(file);

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

function checkBundle(dir, problems) {
  // A bundle outside cwd (a fixture, a temp dir) relativises to a stack of
  // `../` that buries the filename the reader needs. Error text IS the product
  // of a gate, so fall back to the absolute path rather than a path puzzle.
  const rel = relative(process.cwd(), dir).split(sep).join(posix.sep);
  const label = rel.startsWith("..") ? dir : rel;
  const files = walk(dir);

  // REFUSE AN EMPTY BUNDLE before asserting anything about its contents.
  // Every "contains no forbidden X" below passes vacuously over zero files and
  // prints success. That false green has fired twice in this project already,
  // once on a precache manifest and once on a deploy ledger.
  const html = files.filter((f) => f.toLowerCase().endsWith(".html"));
  const js = files.filter((f) => /\.m?js$/i.test(f));
  if (html.length === 0 || js.length === 0) {
    problems.push(`${label} — empty or not a bundle: ${html.length} html, ${js.length} js`);
    return;
  }

  if (!existsExactCase(dir, "index.html")) {
    problems.push(`${label} — no index.html at the bundle root; itch needs the entry point there`);
  }

  for (const file of files.filter(isText)) {
    const rel = relative(dir, file).split(sep).join(posix.sep);
    const source = readFileSync(file, "utf8");
    for (const ref of absoluteRefs(source)) {
      problems.push(`${label}/${rel} — absolute path "${ref.slice(0, 60)}" resolves against itch's root, not ours`);
    }
    for (const ref of serviceWorkerRefs(source)) {
      problems.push(`${label}/${rel} — service worker trace "${ref.slice(0, 40)}" must not ship to a third-party origin`);
    }
    for (const ref of phoneHomeRefs(source)) {
      problems.push(`${label}/${rel} — phone-home "${ref}"; a game may make no external request (the entry is wrong, not the chunking)`);
    }
    for (const host of externalOrigins(source)) {
      problems.push(`${label}/${rel} — third-party origin "${host}"; a game may fetch nothing off-site, and on a kids' platform that also hands a child's IP to a stranger`);
    }
  }

  for (const doc of html) {
    const rel = relative(dir, doc).split(sep).join(posix.sep);
    const source = readFileSync(doc, "utf8");
    const base = dirname(doc);
    for (const ref of localRefs(source)) {
      if (!existsExactCase(base, ref)) {
        problems.push(`${label}/${rel} — references "${ref}", which is missing or differs in CASE (itch is case-sensitive; /mnt/c is not)`);
      }
    }
  }

  const index = join(dir, "index.html");
  if (existsSync(index)) {
    const source = readFileSync(index, "utf8");

    if (!/https:\/\/ellaz\.fun/.test(source)) {
      problems.push(`${label}/index.html — no link back to ellaz.fun; that link is the entire reason this bundle exists`);
    }

    const stamped = source.match(/name="ellaz:commit"\s+content="([^"]+)"/);
    if (!stamped) {
      problems.push(`${label}/index.html — no build stamp; a stale upload on itch is invisible from here without one`);
    } else if (stamped[1] !== buildStamp()) {
      // Print both IN FULL. These were truncated to 16 chars until 2026-08-12, and
      // buildStamp() discriminates a dirty tree by appending "-dirty" at char 41 - so
      // the one thing that differed was the one thing the message could not show. It
      // read "stamped 13840666dff557ae but the tree is 13840666dff557ae; rebuild",
      // which is a correct refusal wearing a self-contradicting sentence. Trigger was
      // "build, then edit any file". A gate that reads as broken gets bypassed, and a
      // bypassed stamp check is how a stale bundle reaches itch - the exact thing the
      // stamp exists to prevent.
      problems.push(`${label}/index.html — stamped ${stamped[1]} but the tree is ${buildStamp()}; rebuild before uploading`);
    }
  }
}

// ---------------------------------------------------------------------------
// The negative control. Same predicates, planted defects, must all fire.
// ---------------------------------------------------------------------------

const CONTROL_TOTAL = 14;

function runControl() {
  const cases = [
    ["absolute path", () => absoluteRefs('<script src="/assets/index-a1b2.js"></script>')],
    ["absolute css url", () => absoluteRefs("body{background:url(/img/bg.png)}")],
    ["bare asset specifier", () => absoluteRefs('import("/assets/game-snake-x.js")')],
    ["sw registration", () => serviceWorkerRefs("navigator.serviceWorker.register('/sw.js')")],
    ["workbox file", () => serviceWorkerRefs('importScripts("workbox-f0bb1bde.js")')],
    ["posthog", () => phoneHomeRefs('import("posthog-js")')],
    ["firestore", () => phoneHomeRefs('fetch("https://firestore.googleapis.com/v1/x")')],
    ["identity toolkit", () => phoneHomeRefs("https://identitytoolkit.googleapis.com/v1/accounts")],
    // The one a denylist could not have caught, and did not.
    ["webfont origin", () => externalOrigins('@import url("https://fonts.googleapis.com/css2?family=Heebo")')],
    ["unknown cdn", () => externalOrigins('<script src="https://cdn.example.net/x.js">')],
  ];

  const dead = cases.filter(([, run]) => run().length === 0).map(([name]) => name);

  // The case check needs a real filesystem, so it gets a real one.
  const tmp = mkdtempSync(join(tmpdir(), "ellaz-standalone-control-"));
  writeFileSync(join(tmp, "gameart.svg"), "<svg/>");
  if (!existsExactCase(tmp, "gameart.svg")) dead.push("exact case: correct spelling rejected");
  if (existsExactCase(tmp, "GameArt.svg")) dead.push("exact case: WRONG spelling accepted (this volume is case-insensitive and the check did not compensate)");
  if (existsExactCase(tmp, "missing.svg")) dead.push("exact case: missing file accepted");

  // A positive control: a clean bundle must produce nothing, or the checks are
  // simply firing on everything and every green above is meaningless.
  // The positive control carries the two URL shapes that MUST NOT be flagged:
  // the link home, and an SVG namespace, which looks like a URL and is never
  // fetched. An allowlist that trips on either would red every clean bundle.
  const clean =
    '<script src="./assets/index-a1b2.js"></script><a href="https://ellaz.fun/">' +
    '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  if (
    absoluteRefs(clean).length ||
    serviceWorkerRefs(clean).length ||
    phoneHomeRefs(clean).length ||
    externalOrigins(clean).length
  ) {
    dead.push("positive control: a clean document was flagged");
  }

  return dead;
}

// ---------------------------------------------------------------------------

function main() {
  const problems = [];

  const explicit = process.env.BUNDLE_DIR;
  const dirs = explicit
    ? [explicit]
    : existsSync(ROOT)
      ? readdirSync(ROOT)
          .map((d) => join(ROOT, d))
          .filter((d) => statSync(d).isDirectory())
      : [];

  if (dirs.length === 0) {
    console.error(`FAIL  no standalone bundle found under ${explicit ?? ROOT}/`);
    console.error(`      build one first:  STANDALONE_GAME=snake npm run build:standalone`);
    process.exit(1);
  }

  for (const dir of dirs) checkBundle(dir, problems);

  const dead = runControl();

  console.log(`standalone: ${dirs.length} bundle(s) — ${dirs.map((d) => d.split(sep).pop()).join(", ")}`);
  console.log(`negative control: ${CONTROL_TOTAL - dead.length}/${CONTROL_TOTAL} planted cases detected`);

  if (dead.length) {
    console.error(`\nFAIL  the checks themselves are broken — ${dead.length} control case(s) did not fire:`);
    for (const d of dead) console.error(`  ${d}`);
    process.exit(1);
  }

  if (problems.length) {
    console.error(`\nFAIL  ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }

  console.log("OK  every bundle is self-contained, silent, and stamped.");
}

// Only when RUN, not when imported. The predicates above are exported so a probe
// or a future test can drive them against a real artifact; without this guard,
// importing the module runs the whole gate and exits the importer's process.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
