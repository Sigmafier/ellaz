#!/usr/bin/env node
// assert-context-complete.mjs — the CLAUDE.md split lost nothing, and its pointers work.
//
// On 2026-08-29 CLAUDE.md was 164,867 chars and over Claude Code's 150,000-char
// per-file limit, so every session was silently dropping part of it. The long
// evidentiary narrative moved OUT of CLAUDE.md (always-on, every turn) into docs/
// (read on demand) and .claude/skills/ (loaded on demand).
//
// TWO checks, because the first one alone shipped a real regression:
//
//   1. COVERAGE  every non-trivial line CLAUDE.md held at BASE_SHA still exists,
//                byte-identical, somewhere in the tree.
//   2. LINKS     every relative markdown link resolves. The prose was written for
//                a file at the repo ROOT; moved into docs/ every one of its 47
//                pointers became a dead path, and coverage was green throughout
//                because the LINE was intact - only its meaning was gone. A gate
//                proving text survived a move cannot see that the move broke it.
//
// Both halves carry a control that PLANTS a failure, because a checker nobody has
// watched fail is not a checker
// (.claude/rules/a-diagnostic-that-truncates-what-it-compares.md).
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, normalize } from "node:path";
import { existsSync } from "node:fs";

// The commit whose CLAUDE.md is the thing being preserved. Do NOT move this forward
// casually: it is the baseline the word "lossless" is measured against.
//
// Moved bb8c47b -> 2218aa0 on 2026-08-29 for a REASON, not for tidiness: origin/main
// gained 70 new lines of CLAUDE.md (the win-fanfare work, a0c8a67) while this split was
// in flight. Pointed at the older baseline the gate was green and blind to them. Pointed
// here it demands they exist too, so absorbing a concurrent edit is proven rather than
// hoped. Bump it again the same way: only ever to a commit whose CLAUDE.md is a SUPERSET.
const BASE_SHA = process.env.BASE_SHA || "2218aa0";
const HAYSTACK_ROOTS = ["CLAUDE.md", "docs", ".claude/rules", ".claude/skills", "holdem/README.md"];
const LINK_ROOTS = ["CLAUDE.md", "docs", ".claude/skills"];

// Links that were ALREADY broken when this gate was written, in files this change did
// not author. A RATCHET, not an amnesty: a new break reds, and an entry here that has
// since been fixed ALSO reds, so the list cannot quietly go stale. It may shrink and
// must never grow. (docs/build-log.md carries the identical root-relative-from-docs/
// defect this gate exists to catch - it is a peer's file, so it is recorded, not edited.)
const KNOWN_BROKEN = new Set([
  "docs/build-log.md\t.claude/rules/a-fixed-shell-cannot-chain-a-gesture-to-a-sibling.md",
  "docs/build-log.md\t.claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md",
  "docs/build-log.md\t.claude/rules/a-hand-authored-number-that-leaves-the-repo.md",
  "docs/build-log.md\t.claude/rules/a-layout-nobody-can-look-at-drifts-into-a-different-one.md",
  "docs/build-log.md\t.claude/rules/a-locale-page-without-a-translated-body-is-a-duplicate.md",
  "docs/build-log.md\t.claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md",
  "docs/build-log.md\t.claude/rules/space-between-spreads-whatever-survives-the-media-query.md",
  "docs/build-log.md\tdocs/outreach/audit.md",
  "docs/build-log.md\tdocs/outreach/ledger.md",
  "docs/payload-history.md\t.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md",
]);

// Moving a file one directory down REQUIRES its relative links to gain a `../`. That
// is the only edit the extraction was allowed to make to the moved prose, so it is the
// only difference coverage forgives - and it forgives it inside link targets ONLY.
const unprefix = (s) => s.replace(/\]\((?:\.\.\/)+/g, "](");
const norm = (s) => unprefix(s).replace(/\s+/g, " ").trim();
// Lines too short or too generic to identify anything: a bare "---", a table rule, a
// closing fence. Requiring these to match would pass on noise alone.
const trivial = (s) => norm(s).length < 24 || /^[-|`#*_\s]+$/.test(norm(s));

function walk(p, out = []) {
  let st;
  try { st = statSync(p); } catch { return out; }
  if (st.isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f), out); return out; }
  if (/\.md$/.test(p)) out.push(p);
  return out;
}

function haystack() {
  const counts = new Map();
  for (const f of HAYSTACK_ROOTS.flatMap((r) => walk(r))) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const k = norm(line);
      if (k) counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return counts;
}

function baseline() {
  return execFileSync("git", ["show", `${BASE_SHA}:CLAUDE.md`], { encoding: "utf8", maxBuffer: 64e6 });
}

function missing(counts) {
  const want = new Map();
  for (const line of baseline().split("\n")) {
    if (trivial(line)) continue;
    const k = norm(line);
    want.set(k, (want.get(k) || 0) + 1);
  }
  const gone = [];
  for (const [k, n] of want) if ((counts.get(k) || 0) < n) gone.push(k);
  return { gone, checked: want.size };
}

// Returns every relative link, resolved, as {file, target, ok}.
function links(extra = []) {
  const out = [...extra];
  for (const f of LINK_ROOTS.flatMap((r) => walk(r))) {
    // Strip fenced blocks and inline code FIRST: a `[Name](url)` inside backticks is a
    // format example, not a link, and reading it as one reports a break in a healthy file.
    const src = readFileSync(f, "utf8").replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
    for (const m of src.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1].split("#")[0];
      if (!target || /^(https?:|mailto:|<)/.test(target)) continue;
      out.push({ file: f, target, ok: existsSync(normalize(join(dirname(f), target))) });
    }
  }
  return out;
}

function checkLinks(all) {
  const broke = [], stale = [];
  for (const { file, target, ok } of all) {
    const key = `${file}\t${target}`;
    if (!ok && !KNOWN_BROKEN.has(key)) broke.push(key);
    if (ok && KNOWN_BROKEN.has(key)) stale.push(key);
  }
  return { broke, stale, total: all.length };
}

if (process.argv.includes("--control")) {
  let bad = 0;
  // (a) coverage: plant a loss and demand the gate name it.
  const victim = baseline().split("\n").map(norm).find((l) => l && !trivial(l));
  const crippled = haystack(); crippled.delete(victim);
  const { gone } = missing(crippled);
  if (!gone.includes(victim)) { console.error("CONTROL FAILED: planted content loss went unreported."); bad = 1; }
  else console.log(`OK control a: planted content loss named  (${victim.slice(0, 60)}...)`);
  // (b) links: plant a dead pointer and demand the gate name it.
  const planted = { file: "docs/__control__.md", target: "no/such/file.md", ok: false };
  const r1 = checkLinks(links([planted]));
  if (!r1.broke.includes(`${planted.file}\t${planted.target}`)) { console.error("CONTROL FAILED: planted broken link went unreported."); bad = 1; }
  else console.log(`OK control b: planted broken link named   (${r1.broke.length} reported of ${r1.total} links)`);
  // (c) ratchet: a KNOWN_BROKEN entry that now resolves must be reported as stale.
  const first = [...KNOWN_BROKEN][0];
  const r2 = checkLinks(links([{ file: first.split("\t")[0], target: first.split("\t")[1], ok: true }]));
  if (!r2.stale.includes(first)) { console.error("CONTROL FAILED: a fixed KNOWN_BROKEN entry was not reported stale."); bad = 1; }
  else console.log(`OK control c: stale allowlist entry named (${first.split("\t")[1]})`);
  process.exit(bad);
}

let fail = 0;
const { gone, checked } = missing(haystack());
if (checked < 1500) { console.error(`REFUSED: only ${checked} lines read from ${BASE_SHA}:CLAUDE.md — the baseline did not load.`); process.exit(1); }
if (gone.length) {
  console.error(`LOST ${gone.length} of ${checked} lines from ${BASE_SHA}:CLAUDE.md:\n`);
  for (const g of gone.slice(0, 40)) console.error("  " + g.slice(0, 150));
  if (gone.length > 40) console.error(`  ... and ${gone.length - 40} more`);
  fail = 1;
} else console.log(`OK coverage: all ${checked} substantive lines of ${BASE_SHA}:CLAUDE.md are still in the tree.`);

const { broke, stale, total } = checkLinks(links());
if (total < 50) { console.error(`REFUSED: only ${total} links found — the link scan did not run.`); process.exit(1); }
if (broke.length) {
  console.error(`\n${broke.length} BROKEN relative link(s) of ${total}:`);
  for (const b of broke) console.error("  " + b.replace("\t", "  ->  "));
  console.error("  A link is relative to ITS OWN file. Prose moved into docs/ needs ../ on every root-relative target.");
  fail = 1;
}
if (stale.length) {
  console.error(`\n${stale.length} KNOWN_BROKEN entr(y/ies) now resolve — delete them from the allowlist:`);
  for (const s of stale) console.error("  " + s.replace("\t", "  ->  "));
  fail = 1;
}
if (!broke.length && !stale.length) console.log(`OK links: ${total} relative links resolve (${KNOWN_BROKEN.size} pre-existing breaks allowlisted, ratcheted).`);
process.exit(fail);
