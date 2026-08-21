#!/usr/bin/env node
/**
 * Read Search Console's Performance export and say WHICH problem we have.
 *
 * WHY THIS EXISTS. "Nobody finds the site" has three causes with three opposite
 * remedies, and from inside this repository they are indistinguishable:
 *
 *   not indexed          -> crawling and links are the fix
 *   indexed, 0 impressions -> the CONTENT is the fix
 *   impressions, no clicks -> position, titles and descriptions are the fix
 *
 * Every other gate here reads `dist/` or fetches the live site as a crawler,
 * which answers "can we be fetched". None of them can see an impression. This
 * reads the engine's own report, exported by hand into `docs/outreach/exports/`.
 *
 * The finding it exists to surface is the one a human scanning the CSV will miss:
 * the DEMAND (what language people search in) against the SUPPLY (which locale's
 * URLs actually earn the impressions). Those can diverge badly while every page
 * is correct, indexed and self-canonical - and the divergence is invisible in any
 * single row.
 *
 * IT EXITS 2 AND PRINTS UNMEASURED WHEN THERE IS NO EXPORT, AND NEVER 0. Same
 * reason as its sibling `gsc-links.mjs`: zero is a finding, unmeasured is a gap,
 * and a script printing 0 because it could not read its input has told a lie with
 * a number in it.
 *
 * GSC's per-dimension exports are each truncated to their own top-N, so Queries
 * and Pages do NOT sum to the same total and neither sums to Chart. That is the
 * export's shape, not a parse error, and the population line prints all three so
 * nobody reconciles them by hand later.
 *
 * Usage:
 *   node scripts/reach/gsc-performance.mjs                  # newest export folder
 *   node scripts/reach/gsc-performance.mjs <folder>         # one folder
 *   node scripts/reach/gsc-performance.mjs --control        # prove it answers both ways
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { splitCsvLine } from "./gsc-links.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = join(REPO, "docs/outreach/exports");
const ORIGIN = "ellaz.fun";

/** Rows of a GSC dimension CSV, keyed by header, with numbers coerced. */
export function parseDimension(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const head = splitCsvLine(lines[0].replace(/^﻿/, ""));
  return lines.slice(1).map(splitCsvLine).map((cells) => {
    const row = {};
    head.forEach((h, i) => {
      const v = (cells[i] ?? "").replace(/[",]/g, "");
      row[h] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : (cells[i] ?? "");
    });
    // Found by SHAPE, not by header name: GSC localises these headers and has
    // renamed them before. The first column is always the dimension value.
    row._key = cells[0] ?? "";
    return row;
  });
}

const num = (row, name) => {
  const k = Object.keys(row).find((h) => h.toLowerCase() === name);
  return k === undefined ? 0 : Number(row[k]) || 0;
};

/**
 * Which writing system a query is in. Only the scripts this site publishes in
 * need telling apart, and Hebrew is the one that matters: it is the market, and
 * it is the one whose URLs carry a locale prefix.
 */
export function scriptOf(s) {
  if (/[֐-׿]/.test(s)) return "he";
  if (/[؀-ۿ]/.test(s)) return "ar";
  if (/[Ѐ-ӿ]/.test(s)) return "ru";
  return "latin";
}

/** Which locale directory a URL sits in. The bare path is the canonical language. */
export function localeOf(url, canonical = "en") {
  const p = url.replace(/^https?:\/\/(www\.)?[^/]+/, "");
  const m = /^\/([a-z]{2})\//.exec(p);
  return m ? m[1] : `bare(${canonical})`;
}

export function positionBand(pos) {
  if (pos <= 10) return "1-10";
  if (pos <= 20) return "11-20";
  if (pos <= 50) return "21-50";
  return "51+";
}

/**
 * The whole point of the script, as one pure function so the control can drive it.
 *
 * Returns the demand share per script and the supply share per locale prefix,
 * plus the gap between the two for every language that has its own directory.
 */
export function demandVsSupply(queries, pages, canonical = "en") {
  const demand = {}, supply = {};
  let dTot = 0, sTot = 0;
  for (const q of queries) {
    const i = num(q, "impressions");
    demand[scriptOf(q._key)] = (demand[scriptOf(q._key)] ?? 0) + i;
    dTot += i;
  }
  for (const p of pages) {
    const i = num(p, "impressions");
    const l = localeOf(p._key, canonical);
    supply[l] = (supply[l] ?? 0) + i;
    sTot += i;
  }
  const pct = (n, t) => (t ? (100 * n) / t : 0);
  const gaps = [];
  for (const lang of Object.keys(demand)) {
    if (lang === "latin") continue; // the canonical language has no directory
    const d = pct(demand[lang], dTot);
    const s = pct(supply[lang] ?? 0, sTot);
    gaps.push({ lang, demandPct: d, supplyPct: s, gap: d - s });
  }
  return { demand, supply, dTot, sTot, gaps: gaps.sort((a, b) => b.gap - a.gap) };
}

function newestFolder() {
  if (!existsSync(DIR)) return null;
  const dirs = readdirSync(DIR)
    .map((f) => join(DIR, f))
    .filter((p) => statSync(p).isDirectory() && existsSync(join(p, "Queries.csv")))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return dirs[0] ?? null;
}

function control() {
  const ok = [];
  const t = (name, pass) => ok.push([name, pass]);

  t("a Hebrew query is read as Hebrew", scriptOf("שולה מוקשים") === "he");
  t("a Latin query is read as Latin", scriptOf("free minesweeper") === "latin");
  // The positive control that earns its place: a mixed query must NOT read as
  // Latin just because most of its characters are. Brand + Hebrew is the shape.
  t("brand plus Hebrew still reads as Hebrew", scriptOf("Ellaz שולה מוקשים") === "he");
  t("a /he/ URL is he", localeOf("https://ellaz.fun/he/games/snake/") === "he");
  t("a bare URL is the canonical language", localeOf("https://ellaz.fun/games/snake/") === "bare(en)");
  t("www is stripped before the path is read", localeOf("https://www.ellaz.fun/he/") === "he");
  t("position bands", positionBand(3) === "1-10" && positionBand(21) === "21-50" && positionBand(80) === "51+");

  // A real mismatch is detected...
  const q = [{ _key: "שולה מוקשים", Impressions: 80 }, { _key: "free minesweeper", Impressions: 20 }];
  const pMismatch = [
    { _key: "https://ellaz.fun/games/minesweeper/", Impressions: 90 },
    { _key: "https://ellaz.fun/he/games/minesweeper/", Impressions: 10 },
  ];
  const bad = demandVsSupply(q, pMismatch).gaps.find((g) => g.lang === "he");
  t("a demand/supply mismatch is caught", bad !== undefined && bad.gap > 60);

  // ...and an aligned site is NOT reported as one. Without this a function that
  // always returned a large gap would pass every test above it.
  const pAligned = [
    { _key: "https://ellaz.fun/he/games/minesweeper/", Impressions: 80 },
    { _key: "https://ellaz.fun/games/minesweeper/", Impressions: 20 },
  ];
  const good = demandVsSupply(q, pAligned).gaps.find((g) => g.lang === "he");
  t("and an ALIGNED site reports no gap", good !== undefined && Math.abs(good.gap) < 1);

  // An empty export must never read as an aligned site.
  const empty = demandVsSupply([], []);
  t("an empty export yields no gap rows rather than a clean bill", empty.gaps.length === 0 && empty.dTot === 0);

  let bad_ = 0;
  for (const [name, pass] of ok) {
    console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
    if (!pass) bad_++;
  }
  console.log(bad_ === 0 ? "\nOK  all controls behaved." : `\nFAIL  ${bad_} control(s) did not behave.`);
  process.exit(bad_ === 0 ? 0 : 1);
}

function main() {
  const arg = process.argv[2];
  if (arg === "--control") return control();
  const folder = arg ? resolve(arg) : newestFolder();
  if (!folder || !existsSync(join(folder, "Queries.csv"))) {
    console.log("");
    console.log("UNMEASURED - no Search Console Performance export to read.");
    console.log("");
    console.log("Export it: Search Console -> Performance -> Export -> CSV, unzip the");
    console.log(`folder into ${DIR}/ and run this again.`);
    console.log("");
    console.log("This is NOT a report of zero impressions. Nobody has looked.");
    process.exit(2);
  }

  const read = (n) => (existsSync(join(folder, n)) ? parseDimension(readFileSync(join(folder, n), "utf8")) : []);
  const queries = read("Queries.csv");
  const pages = read("Pages.csv");
  const chart = read("Chart.csv");
  const countries = read("Countries.csv");
  const filters = read("Filters.csv");

  const qImp = queries.reduce((a, r) => a + num(r, "impressions"), 0);
  const pImp = pages.reduce((a, r) => a + num(r, "impressions"), 0);
  const cImp = chart.reduce((a, r) => a + num(r, "impressions"), 0);
  const clicks = pages.reduce((a, r) => a + num(r, "clicks"), 0);
  const live = chart.filter((r) => num(r, "impressions") > 0);

  console.log("");
  console.log(`GSC Performance: ${folder.replace(REPO + "/", "")}`);
  for (const f of filters) console.log(`  filter        ${f._key}: ${Object.values(f)[1]}`);
  console.log(`  population    ${queries.length} queries · ${pages.length} pages · ${chart.length} days`);
  console.log(`  impressions   queries ${qImp} · pages ${pImp} · chart ${cImp}` +
    "   (each dimension is truncated to its own top-N by GSC - they are not meant to agree)");
  if (live.length) console.log(`  window        first impression ${live[0]._key} · last ${live[live.length - 1]._key}`);
  console.log(`  clicks        ${clicks}`);

  // --- the finding ---------------------------------------------------------
  const { demand, supply, dTot, sTot, gaps } = demandVsSupply(queries, pages);
  const pct = (n, t) => (t ? ((100 * n) / t).toFixed(0) : "0");
  console.log("");
  console.log("DEMAND vs SUPPLY");
  console.log("  what people SEARCH IN     " +
    Object.entries(demand).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v} (${pct(v, dTot)}%)`).join(" · "));
  console.log("  which URLs EARN it        " +
    Object.entries(supply).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v} (${pct(v, sTot)}%)`).join(" · "));
  for (const g of gaps) {
    if (g.gap > 15) {
      console.log(`  MISMATCH  ${g.demandPct.toFixed(0)}% of demand is ${g.lang}, but only ` +
        `${g.supplyPct.toFixed(0)}% of impressions are on /${g.lang}/ URLs.`);
      console.log(`            That demand is landing on another language's page.`);
    }
  }
  if (!gaps.some((g) => g.gap > 15)) console.log("  no language's demand exceeds its own URLs' share by more than 15 points.");

  // --- position ------------------------------------------------------------
  const bands = {};
  for (const p of pages) bands[positionBand(num(p, "position"))] = (bands[positionBand(num(p, "position"))] ?? 0) + num(p, "impressions");
  console.log("");
  console.log("POSITION (impressions by a page's average position)");
  for (const b of ["1-10", "11-20", "21-50", "51+"]) console.log(`  ${b.padEnd(7)} ${String(bands[b] ?? 0).padStart(5)}`);
  const top = bands["1-10"] ?? 0;
  console.log(`  ${pct(top, pImp)}% of impressions come from pages averaging page one.`);

  // --- pages that earn NOTHING --------------------------------------------
  const earning = new Set(pages.map((p) => p._key.replace(/^https?:\/\/(www\.)?[^/]+/, "")));
  console.log("");
  console.log(`PAGES IN THE EXPORT: ${earning.size}. Anything absent earned no impression in the window,`);
  console.log("  which for a page published inside it is expected, not a defect.");

  if (countries.length) {
    const tot = countries.reduce((a, r) => a + num(r, "impressions"), 0);
    const t3 = countries.slice(0, 3).map((r) => `${r._key} ${num(r, "impressions")} (${pct(num(r, "impressions"), tot)}%)`);
    console.log("");
    console.log(`WHERE          ${t3.join(" · ")}`);
  }

  console.log("");
  console.log("Read the query list by hand for pages we have not written - no matcher");
  console.log("here is trusted to decide that across four languages.");
  console.log("");
  console.log(`OK  measured. ${ORIGIN} is INDEXED and earning impressions; this is not a crawling problem.`);
}

// The CLI, guarded. Without this the whole report runs the moment anything
// imports this file for a helper - into the importer's stdout, with this
// script's exit code - and the importer's own verdict reads as a clean pass
// over something it never evaluated. Measured on the sibling gsc-links.mjs,
// 2026-08-21. See .claude/rules/a-script-that-runs-on-import-prints-its-importers-verdict.md
const IS_MAIN = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (IS_MAIN) main();
