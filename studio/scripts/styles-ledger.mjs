#!/usr/bin/env node
// The styles ledger: what is IN, what was REMOVED for good, what is BACKLOG.
//
//   node scripts/styles-ledger.mjs             gate: ledger.json vs registry, dirs,
//                                              git history, and the rendered doc
//   node scripts/styles-ledger.mjs --write     re-render docs/styles-ledger.md
//   node scripts/styles-ledger.mjs --sync      local only: pull new removals from
//                                              git, the taste ledger and the notes
//                                              store into ledger.json, then --write
//   node scripts/styles-ledger.mjs --control   plant each defect the gate claims to catch
//
// IN is never written down twice: registry.ts is the in-list and this script
// reads it. OUT and BACKLOG live in art/styles/ledger.json. The doc is DERIVED
// - a hand edit to it reds the gate, because a list in prose decays and the
// point of a ledger is that it cannot.
//
// The git half runs only on a repo with history; a shallow clone (CI) SAYS it
// skipped that check rather than passing it. A check that cannot run is not a
// check that passed.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runControls, report } from "./lib/control.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO = resolve(HERE, "..");
const STYLES = join(STUDIO, "art", "styles");
const GAMES = join(STUDIO, "art", "games");
const LEDGER = join(STYLES, "ledger.json");
const DOC = join(STUDIO, "docs", "styles-ledger.md");
const FAMILIES = ["pixel", "vector", "craft", "paint", "ink", "print"];
const AUDIENCES = ["kids", "all", "teen", "adult"];
const STATUSES = ["proposed", "adjacent-to-rejected", "building"];

// ---------------------------------------------------------------------------
// Reading the three sources
// ---------------------------------------------------------------------------

/** registry.ts rows in order: { id, name, tier, family }. */
export function registryRows(stylesDir = STYLES) {
  const src = readFileSync(join(stylesDir, "registry.ts"), "utf8");
  const rows = [];
  for (const m of src.matchAll(/\{\s*id:\s*"([a-z0-9]+)",\s*name:\s*"([^"]+)",\s*tier:\s*"(full|card)",\s*family:\s*"([a-z]+)"/g)) {
    rows.push({ id: m[1], name: m[2], tier: m[3], family: m[4] });
  }
  if (rows.length === 0) throw new Error("registryRows: parsed zero rows from registry.ts - the row shape changed, fix the matcher before trusting anything");
  return rows;
}

/** game id -> candidate style ids, from art/games/*.json. */
export function gamePicks(gamesDir = GAMES) {
  const out = {};
  for (const f of readdirSync(gamesDir).filter((n) => n.endsWith(".json"))) {
    const g = JSON.parse(readFileSync(join(gamesDir, f), "utf8"));
    out[g.id] = { name: g.name, picks: g.candidateStyles ?? [g.style], first: g.style };
  }
  return out;
}

export const readLedger = (file = LEDGER) => JSON.parse(readFileSync(file, "utf8"));

function git(args, cwd = STUDIO) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/** Style dirs deleted in history: id -> { commit, date }. null when the clone has no history. */
export function deletedStyles(cwd = STUDIO) {
  try {
    if (git(["rev-parse", "--is-shallow-repository"], cwd) === "true") return null;
  } catch { return null; }
  const log = git(["log", "--diff-filter=D", "--format=%x00%h%x09%as", "--name-only", "--", "art/styles"], cwd);
  const out = {};
  for (const block of log.split("\x00").filter(Boolean)) {
    const [head, ...files] = block.split("\n");
    const [commit, date] = head.split("\t");
    for (const f of files) {
      const m = f.match(/\/art\/styles\/([a-z0-9]+)\/render\.ts$/);
      if (m && !out[m[1]]) out[m[1]] = { commit, date };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

export function scan({ stylesDir = STYLES, ledger = readLedger(), doc = existsSync(DOC) ? readFileSync(DOC, "utf8") : null, deleted = deletedStyles(), games = gamePicks() } = {}) {
  const out = [];
  const reg = registryRows(stylesDir);
  const regIds = new Set(reg.map((r) => r.id));
  const dirs = new Set(readdirSync(stylesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name));
  const outIds = new Set();
  for (const r of ledger.out ?? []) {
    if (regIds.has(r.id)) out.push(`OUT row "${r.id}" is still in registry.ts - removed for good means removed`);
    if (dirs.has(r.id)) out.push(`OUT row "${r.id}" still has a directory art/styles/${r.id}`);
    if (!/^[0-9a-f]{7,40}$/.test(r.commit ?? "")) out.push(`OUT row "${r.id}" names no commit (got ${JSON.stringify(r.commit)})`);
    if (!r.note) out.push(`OUT row "${r.id}" carries no note - the operator's own words are the reason, and a removal with no reason gets re-proposed`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.removed ?? "")) out.push(`OUT row "${r.id}" has no removed date`);
    if (!FAMILIES.includes(r.family)) out.push(`OUT row "${r.id}" family ${JSON.stringify(r.family)} is not one of ${FAMILIES.join("/")}`);
    if (outIds.has(r.id)) out.push(`OUT row "${r.id}" appears twice`);
    outIds.add(r.id);
  }
  if (deleted) {
    for (const [id, d] of Object.entries(deleted)) {
      if (dirs.has(id)) continue; // deleted once, added back: it is IN, not OUT
      if (!outIds.has(id)) out.push(`git says art/styles/${id} was deleted in ${d.commit} (${d.date}) and the ledger has no OUT row for it`);
    }
    for (const r of ledger.out ?? []) {
      const d = deleted[r.id];
      if (!d) { out.push(`OUT row "${r.id}" names commit ${r.commit} but git history has no deletion of art/styles/${r.id}`); continue; }
      if (!d.commit.startsWith(r.commit) && !r.commit.startsWith(d.commit)) out.push(`OUT row "${r.id}" names commit ${r.commit} but git deleted it in ${d.commit}`);
    }
  }
  const backIds = new Set();
  for (const b of ledger.backlog ?? []) {
    if (regIds.has(b.id)) out.push(`BACKLOG row "${b.id}" is already in the registry - it is IN, not backlog`);
    if (outIds.has(b.id)) out.push(`BACKLOG row "${b.id}" was removed for good - re-proposing a rejected style is the thing this ledger exists to stop`);
    if (backIds.has(b.id)) out.push(`BACKLOG row "${b.id}" appears twice`);
    backIds.add(b.id);
    for (const k of ["name", "look", "seenIn", "proposed"]) if (!b[k]) out.push(`BACKLOG row "${b.id}" has no ${k}`);
    if (!FAMILIES.includes(b.family)) out.push(`BACKLOG row "${b.id}" family ${JSON.stringify(b.family)} is not one of ${FAMILIES.join("/")}`);
    if (!AUDIENCES.includes(b.audience)) out.push(`BACKLOG row "${b.id}" audience ${JSON.stringify(b.audience)} is not one of ${AUDIENCES.join("/")}`);
    if (!STATUSES.includes(b.status)) out.push(`BACKLOG row "${b.id}" status ${JSON.stringify(b.status)} is not one of ${STATUSES.join("/")}`);
    if (b.status === "adjacent-to-rejected" && !outIds.has(b.adjacentTo)) out.push(`BACKLOG row "${b.id}" says adjacent-to-rejected but "${b.adjacentTo}" is not an OUT row`);
  }
  for (const [gid, g] of Object.entries(games)) {
    for (const s of g.picks) if (!regIds.has(s)) out.push(`game ${gid} lists style "${s}" and the registry has no such style`);
  }
  if (doc === null) out.push(`docs/styles-ledger.md does not exist - run --write`);
  else {
    const want = renderDoc({ reg, ledger, games });
    if (doc !== want) out.push(`docs/styles-ledger.md is stale or hand-edited - it is DERIVED from ledger.json + registry.ts; run --write (first differing line: ${firstDiff(doc, want)})`);
  }
  return out;
}

function firstDiff(a, b) {
  const la = a.split("\n"), lb = b.split("\n");
  for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) return `${i + 1}: have ${JSON.stringify(la[i] ?? "<eof>")} want ${JSON.stringify(lb[i] ?? "<eof>")}`;
  return "none";
}

// ---------------------------------------------------------------------------
// The doc, rendered
// ---------------------------------------------------------------------------

export function renderDoc({ reg = registryRows(), ledger = readLedger(), games = gamePicks() } = {}) {
  const L = [];
  const pickedFor = (id) => Object.values(games).filter((g) => g.picks.includes(id)).map((g) => g.first === id ? `**${g.name}**` : g.name).join(", ") || "-";
  L.push("# Styles ledger");
  L.push("");
  L.push("<!-- GENERATED by scripts/styles-ledger.mjs --write from art/styles/registry.ts and art/styles/ledger.json. Do not edit; the gate compares this file byte for byte. -->");
  L.push("");
  L.push("What is in, what was removed for good and why, and what has been proposed but");
  L.push("not built. IN is `registry.ts`; OUT and BACKLOG are `ledger.json`; this page is");
  L.push("rendered from both and the gate refuses a hand edit. The same three lists are the");
  L.push("gallery's Ledger page. Picks per game come from `art/games/*.json`; a bold game is");
  L.push("the one whose default binding is that style.");
  L.push("");
  L.push(`## In the registry (${reg.length})`);
  L.push("");
  L.push("| id | name | tier | family | picked for |");
  L.push("|---|---|---|---|---|");
  for (const r of reg) L.push(`| \`${r.id}\` | ${r.name} | ${r.tier} | ${r.family} | ${pickedFor(r.id)} |`);
  L.push("");
  L.push(`## Removed for good (${ledger.out.length})`);
  L.push("");
  L.push("Each was deleted by the operator's own beetle note on the gallery, module and recipe");
  L.push("and registry row together, and recorded as `rejected mood` in the taste ledger so no");
  L.push("session re-proposes it under another name. The renderer is one command away if a");
  L.push("game ever needs it back; re-adding it to the registry is a decision, not a restore.");
  L.push("");
  L.push("| id | name | family | removed | the note | commit | see the renderer |");
  L.push("|---|---|---|---|---|---|---|");
  for (const r of ledger.out) L.push(`| \`${r.id}\` | ${r.name} | ${r.family} | ${r.removed} | “${r.note}” | \`${r.commit}\` | \`git show ${r.commit}^:studio/art/styles/${r.id}/render.ts\` |`);
  L.push("");
  L.push(`## Backlog (${ledger.backlog.length}) - researched, not built`);
  L.push("");
  L.push("Proposed from the 2026-09-05 research pass (pixel sub-styles, teen and adult 2D");
  L.push("styles, print and craft). None has a renderer. A row marked `adjacent-to-rejected`");
  L.push("sits next to a style the operator removed and needs an explicit yes before anyone");
  L.push("builds it. Audience is who the style suits, not who it is limited to.");
  L.push("");
  for (const fam of FAMILIES) {
    const rows = ledger.backlog.filter((b) => b.family === fam);
    if (!rows.length) continue;
    L.push(`### ${fam} (${rows.length})`);
    L.push("");
    L.push("| id | name | audience | the look | seen in | status |");
    L.push("|---|---|---|---|---|---|");
    for (const b of rows) L.push(`| \`${b.id}\` | ${b.name} | ${b.audience} | ${b.look} | ${b.seenIn} | ${b.status}${b.adjacentTo ? ` (${b.adjacentTo})` : ""} |`);
    L.push("");
  }
  L.push("## How it moves");
  L.push("");
  L.push("- **Backlog to IN**: build `art/styles/<id>/{render.ts,recipe.md}`, add the registry");
  L.push("  row, delete the backlog row, `--write`. The recipe gate and render-smoke take it");
  L.push("  from there.");
  L.push("- **IN to OUT**: delete the directory and the row, add an OUT row with the commit");
  L.push("  and the operator's words, record `rejected mood` in the taste ledger, `--write`.");
  L.push("  `--sync` does the first two from git, taste and the notes store on this machine.");
  L.push("- **OUT to IN**: not a restore. It is a new decision, recorded as such.");
  L.push("");
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// --sync: this machine only. git + the taste ledger + the notes store.
// ---------------------------------------------------------------------------

function sync() {
  const ledger = readLedger();
  const deleted = deletedStyles();
  if (!deleted) throw new Error("--sync needs git history; this clone is shallow");
  const tastePath = join(homedir(), ".claude", "state", "design-taste", "ellaz.json");
  const notesPath = join(homedir(), ".claude", "visual-hall", "_notes", "studio-gallery.jsonl");
  const taste = existsSync(tastePath) ? JSON.parse(readFileSync(tastePath, "utf8")).decisions : [];
  const notes = existsSync(notesPath) ? readFileSync(notesPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((n) => n.kind === "note") : [];
  const have = new Set(ledger.out.map((r) => r.id));
  const dirs = new Set(readdirSync(STYLES, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name));
  let added = 0;
  for (const [id, d] of Object.entries(deleted)) {
    if (have.has(id) || dirs.has(id)) continue;
    let name = id, family = "pixel";
    try {
      const recipe = git(["show", `${d.commit}^:studio/art/styles/${id}/recipe.md`]);
      name = (recipe.match(/^# (.+)$/m) ?? [, id])[1].trim();
      const reg = git(["show", `${d.commit}^:studio/art/styles/registry.ts`]);
      family = (reg.match(new RegExp(`id:\\s*"${id}"[^}]*?family:\\s*"([a-z]+)"`)) ?? [, "pixel"])[1];
    } catch { /* an older tree with no recipe: keep the id */ }
    const row = taste.find((t) => t.verdict === "rejected" && t.dimension === "mood" && t.value.toLowerCase().startsWith(name.toLowerCase()));
    const noteId = row?.source?.replace(/^beetle-note-/, "");
    const note = notes.find((n) => n.id === noteId);
    ledger.out.push({ id, name, family, removed: d.date, commit: d.commit, note: note?.text ?? "(no note found - write the operator's reason here)", noteId: noteId ?? null, taste: row?.source ?? null });
    added++;
    console.log(`  + OUT ${id} (${name}) removed ${d.date} in ${d.commit}${note ? ` - "${note.text}"` : " - NO NOTE MATCHED, fill it in"}`);
  }
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2).replace(/\{\n\s+("id")/g, "{ $1").replace(/,\n\s+("(?:name|family|removed|commit|note|noteId|taste|audience|look|seenIn|proposed|status|adjacentTo)":)/g, ", $1").replace(/\n\s+\}/g, " }") + "\n");
  console.log(`styles-ledger --sync: ${added} OUT row(s) added`);
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function controls() {
  const base = () => ({ ledger: structuredClone(readLedger()), doc: renderDoc(), deleted: deletedStyles(), games: gamePicks() });
  const firstReg = registryRows()[0].id;
  const withLedger = (mutate) => { const s = base(); mutate(s.ledger); s.doc = renderDoc({ ledger: s.ledger }); return scan(s); };
  return [
    { name: "the real tree (positive control: must be clean to mean anything below)", expect: "PASS", run: () => scan(base()) },
    { name: "an OUT row whose style is still in the registry", expect: "FIRE", run: () => withLedger((l) => l.out.push({ ...l.out[0], id: firstReg })) },
    { name: "an OUT row with no commit", expect: "FIRE", run: () => withLedger((l) => { l.out[0] = { ...l.out[0], commit: "" }; }) },
    { name: "an OUT row with no note", expect: "FIRE", run: () => withLedger((l) => { l.out[0] = { ...l.out[0], note: "" }; }) },
    { name: "a BACKLOG row re-proposing a removed style", expect: "FIRE", run: () => withLedger((l) => l.backlog.push({ ...l.backlog[0], id: l.out[0].id })) },
    { name: "a BACKLOG row already in the registry", expect: "FIRE", run: () => withLedger((l) => l.backlog.push({ ...l.backlog[0], id: firstReg })) },
    { name: "a BACKLOG row with an audience outside the closed set", expect: "FIRE", run: () => withLedger((l) => { l.backlog[0] = { ...l.backlog[0], audience: "everyone" }; }) },
    { name: "adjacent-to-rejected naming a style that was never removed", expect: "FIRE", run: () => withLedger((l) => { l.backlog[0] = { ...l.backlog[0], status: "adjacent-to-rejected", adjacentTo: "nothing" }; }) },
    { name: "the doc hand-edited by one character", expect: "FIRE", run: () => { const s = base(); s.doc = s.doc.replace("## In the registry", "## In the registry "); return scan(s); } },
    { name: "the doc missing", expect: "FIRE", run: () => { const s = base(); s.doc = null; return scan(s); } },
    { name: "a git deletion the ledger does not record (skipped on a shallow clone, and says so)", expect: deletedStyles() ? "FIRE" : "PASS", run: () => { const s = base(); if (!s.deleted) { console.log("  (shallow clone: the git half cannot run here - this control is inert, not green)"); return []; } s.ledger.out = s.ledger.out.slice(1); s.doc = renderDoc({ ledger: s.ledger }); return scan(s); } },
    { name: "a game binding naming a style that does not exist", expect: "FIRE", run: () => { const s = base(); s.games = { ...s.games, ghost: { name: "Ghost", picks: ["nosuchstyle"], first: "nosuchstyle" } }; s.doc = renderDoc({ games: s.games }); return scan(s); } },
  ];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes("--control")) process.exit(runControls("styles-ledger", controls()) ? 0 : 1);
  if (argv.includes("--sync")) sync();
  if (argv.includes("--write") || argv.includes("--sync")) {
    writeFileSync(DOC, renderDoc());
    console.log(`styles-ledger: wrote ${DOC}`);
  }
  const L = readLedger();
  const d = deletedStyles();
  const pop = `${registryRows().length} in · ${L.out.length} out · ${L.backlog.length} backlog · git history ${d ? `${Object.keys(d).length} deleted dir(s) checked` : "UNAVAILABLE (shallow clone) - the git half was skipped, not passed"}`;
  process.exit(report("styles-ledger", pop, scan()));
}
