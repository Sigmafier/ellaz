#!/usr/bin/env node
/**
 * Read Search Console's own link export and say who links to us.
 *
 * WHY THIS EXISTS. Nothing in this repository can see an inbound link. Every gate
 * here reads `dist/` or the live site as a crawler - which answers "can we be
 * fetched", never "does anyone point at us". So the one number the whole backlinks
 * lane exists to move has never been measured, and the two ways to guess at it are
 * both worse than not knowing:
 *
 *   - A `site:` query looks authoritative in a browser and returns something else
 *     entirely to a script. Measured 2026-08-20 against ellaz.fun: ten results,
 *     none of them the site, beside a claimed 102,000.
 *   - A third-party tool's free tier is sampled and stale, and will not say which.
 *
 * Search Console is the engine's own report. It is exported by hand - there is no
 * API key here - so this reads a CSV the operator drops in `docs/outreach/exports/`.
 *
 * IT EXITS 2 AND PRINTS UNMEASURED WHEN THERE IS NO FILE, AND NEVER 0. Zero is a
 * finding: it says the lane produced nothing and should stop. UNMEASURED says
 * nobody looked. They are acted on differently, and a script that prints 0 because
 * it could not read its input has told a lie with a number in it.
 *
 * Usage:
 *   node scripts/reach/gsc-links.mjs                       # read the newest export
 *   node scripts/reach/gsc-links.mjs <file.csv>            # read one
 *   node scripts/reach/gsc-links.mjs --control             # prove it can answer both ways
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = join(REPO, "docs/outreach/exports");

/**
 * Split one CSV line, honouring quotes. Search Console quotes any field holding a
 * comma, and a naive split silently shifts every column after it - which reads as
 * a link count in the domain column rather than as an error.
 */
export function splitCsvLine(line) {
  const out = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
    } else if (c === "," && !quoted) { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Parse a "Top linking sites" export into {site, links} rows.
 *
 * The header is localised and has been renamed by Google more than once, so the
 * columns are found by SHAPE rather than by name: the first column is the site,
 * and the link count is the first column whose values parse as integers. A header
 * we do not recognise is reported, never guessed at.
 */
export function parseLinks(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { rows: [], header: lines[0] ?? "", reason: "the file has no data rows" };
  const header = splitCsvLine(lines[0]);
  const body = lines.slice(1).map(splitCsvLine).filter((c) => c.length >= 2 && c[0]);
  if (body.length === 0) return { rows: [], header: header.join(","), reason: "no parseable rows under the header" };
  // Which column carries the count: the first one that is an integer in every row.
  const width = Math.max(...body.map((c) => c.length));
  let countCol = -1;
  for (let i = 1; i < width; i++) {
    if (body.every((c) => /^\d[\d,]*$/.test((c[i] ?? "").replace(/"/g, "")))) { countCol = i; break; }
  }
  const rows = body.map((c) => ({
    site: c[0].replace(/^https?:\/\//, "").replace(/\/$/, ""),
    links: countCol === -1 ? null : Number((c[countCol] ?? "").replace(/[",]/g, "")),
  }));
  return { rows, header: header.join(","), reason: countCol === -1 ? "no column parsed as a link count" : "" };
}

/** The newest .csv in the exports folder, or null. */
function newestExport() {
  if (!existsSync(DIR)) return null;
  const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".csv"))
    .map((f) => ({ f, path: join(DIR, f), mtime: statSync(join(DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ?? null;
}

function report(path) {
  const parsed = parseLinks(readFileSync(path, "utf8"));
  const rel = path.replace(`${REPO}/`, "");
  if (parsed.rows.length === 0) {
    console.log(`UNMEASURED  ${rel} could not be read: ${parsed.reason}`);
    console.log(`            header was: ${parsed.header || "(empty)"}`);
    console.log("\nThis is not zero linking sites. It is a file this parser did not understand.");
    return 2;
  }
  const total = parsed.rows.reduce((n, r) => n + (r.links ?? 0), 0);
  console.log(`source: ${rel}`);
  console.log(`linking sites: ${parsed.rows.length}${parsed.reason ? "" : `, ${total.toLocaleString()} links total`}`);
  if (parsed.reason) console.log(`note: ${parsed.reason} - site count is trustworthy, link totals are not`);
  console.log("");
  for (const r of parsed.rows.slice(0, 10)) {
    console.log(`  ${String(r.links ?? "?").padStart(7)}  ${r.site}`);
  }
  if (parsed.rows.length > 10) console.log(`  ... and ${parsed.rows.length - 10} more`);
  console.log("\nA verdict on any lane needs ~90 days from the date in docs/outreach/ledger.md.");
  return 0;
}

/**
 * The controls. The load-bearing one is the LAST: a reader that always says
 * UNMEASURED passes every "it refuses bad input" test ever written, so it must
 * also be shown producing a real count from a real export.
 */
function control() {
  const tmp = mkdtempSync(join(tmpdir(), "gsc-control-"));
  let failures = 0;
  const say = (n, ok, d) => { if (!ok) failures++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? ` - ${d}` : ""}`); };
  try {
    // A real export, in Google's shape, with a quoted comma in a field.
    const good = join(tmp, "links.csv");
    writeFileSync(good, 'Top linking sites,Linking pages\nexample.com,12\n"foo, inc.".test,3\nblog.example.org,1\n');
    const parsed = parseLinks(readFileSync(good, "utf8"));
    say("a real export parses", parsed.rows.length === 3, `${parsed.rows.length} rows`);
    say("  and the counts are read", parsed.rows[0].links === 12, String(parsed.rows[0].links));
    say("  and a quoted comma does not shift the columns", parsed.rows[1].links === 3, String(parsed.rows[1].links));
    say("a real export exits 0", report(good) === 0);

    // An empty file is UNMEASURED, never zero.
    const empty = join(tmp, "empty.csv");
    writeFileSync(empty, "Top linking sites,Linking pages\n");
    say("an empty export is UNMEASURED, not zero", report(empty) === 2);

    // A file whose shape we do not understand is reported, not guessed at.
    const junk = join(tmp, "junk.csv");
    writeFileSync(junk, "not,a,report\n");
    const j = parseLinks(readFileSync(junk, "utf8"));
    say("an unrecognised shape reports its reason", j.reason !== "", j.reason);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(failures === 0 ? "\nOK  all controls behaved." : `\n${failures} control(s) failed.`);
  return failures === 0 ? 0 : 1;
}

const arg = process.argv[2];
if (arg === "--control") process.exit(control());
const named = arg ? resolve(arg) : null;
if (named && !existsSync(named)) {
  console.log(`UNMEASURED  ${arg} does not exist.`);
  process.exit(2);
}
const target = named ?? newestExport()?.path;
if (!target) {
  console.log("UNMEASURED  no export in docs/outreach/exports/.");
  console.log("");
  console.log("Nothing here can see an inbound link, and a site: query is not a measurement.");
  console.log("Export it: Search Console -> Links -> Top linking sites -> Export -> CSV,");
  console.log(`then drop the file in ${DIR.replace(`${REPO}/`, "")}/ and run this again.`);
  console.log("");
  console.log("This is NOT a report of zero linking sites. Nobody has looked.");
  process.exit(2);
}
process.exit(report(target));
