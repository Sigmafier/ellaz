#!/usr/bin/env node
/**
 * Read Bing Webmaster Tools' own backlinks export and say who links to us.
 *
 * WHY A SECOND ENGINE AT ALL. `gsc-links.mjs` is the authority under `RCH8`, and on
 * 2026-08-30 it stopped being able to answer: the Links panel was opened, both halves
 * read zero, and a control property on the same account read 11,569 / 55,663 - so the
 * report works and ellaz.fun has no link graph in it yet. That is a real finding and
 * it is also a dead instrument for the 2026-11-27 verdict, because a reader that can
 * only ever say zero cannot tell a lane that produced nothing from a lane that
 * produced something Google has not seen.
 *
 * Bing is a genuinely independent index rather than a second opinion on the same one.
 * It has crawled this site since 2026-08-18 and ranks it first for its own name, so it
 * is a live index with a real reading of this domain - which is exactly the property
 * the Google panel currently lacks.
 *
 * AND IT IS NOT THE PRIMARY, ON PURPOSE. `reach:backlinks` fetches the destinations we
 * actually wrote to and asks whether an anchor points at us. That answers the verdict
 * question directly and needs nobody's dashboard. This answers the wider one - who
 * linked to us that we never asked - which no fetch of ours can reach, because we do
 * not know where to look.
 *
 * THREE STATES, NEVER TWO, and they are the same three `gsc-links.mjs` learned the
 * hard way:
 *
 *   UNMEASURED   no export, nobody looked          -> exit 2
 *   READ, EMPTY  the panel was opened and reported nothing, with a control -> exit 2
 *   a count      an export parsed                  -> exit 0
 *
 * Zero is a finding. UNMEASURED is a gap. A script that prints 0 because it could not
 * read its input has told a lie with a number in it.
 *
 * Usage:
 *   node scripts/reach/bing-links.mjs                  # read the newest bing export
 *   node scripts/reach/bing-links.mjs <file.csv>       # read one
 *   node scripts/reach/bing-links.mjs --control        # prove it can answer both ways
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { splitCsvLine } from "./gsc-links.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = join(REPO, "docs/outreach/exports");

/**
 * WHICH FILES ARE MINE. Bing's exports and Search Console's live in one folder and
 * neither reader may read the other's, so each owns a NAME PREFIX and the prefixes are
 * disjoint by construction.
 *
 * This is not tidiness. `gsc-links.mjs` picks "the newest .csv in the folder" and
 * `backlinks.mjs` asks "is any filename like /link/i" - so before this prefix existed,
 * dropping a Bing backlinks export in here would have been read by the Google reader as
 * a Search Console export and would have suppressed the board's UNMEASURED banner on
 * the strength of the wrong engine. Both were fixed in the same change that added this
 * file, because adding a second producer to a folder with two loose consumers is what
 * creates the collision.
 */
export const BING = /^bing-(links|backlinks)-.*\.csv$/i;
export const BING_NOTE = /^bing-links-panel-read-.*\.md$/;

/**
 * Parse a Bing "Backlinks" export into {site, links} rows.
 *
 * BY SHAPE, NOT BY HEADER NAME, for the same reason `parseLinks` is: the header is
 * localised, the vendor renames columns, and a reader anchored on a literal string
 * reports an unreadable file as an empty one. The first column is the referring
 * domain or URL; the count is the first column that is an integer in EVERY row.
 *
 * A header we do not recognise is REPORTED, never guessed at - `reason` carries it up
 * so the caller can print the header it actually saw rather than a number it invented.
 */
export function parseBing(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { rows: [], header: lines[0] ?? "", reason: "the file has no data rows" };
  const header = splitCsvLine(lines[0]);
  const body = lines.slice(1).map(splitCsvLine).filter((c) => c.length >= 2 && c[0]);
  if (!body.length) return { rows: [], header: header.join(","), reason: "no parseable rows under the header" };
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

/** The newest Bing export, or null. Only files this reader OWNS are candidates. */
function newestBing(dir = DIR, readdir = readdirSync) {
  if (!existsSync(dir)) return null;
  const files = readdir(dir).filter((f) => BING.test(f))
    .map((f) => ({ f, path: join(dir, f), mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ?? null;
}

export function report(path) {
  const parsed = parseBing(readFileSync(path, "utf8"));
  const rel = path.replace(`${REPO}/`, "");
  if (!parsed.rows.length) {
    console.log(`UNMEASURED  ${rel} could not be read: ${parsed.reason}`);
    console.log(`            header was: ${parsed.header || "(empty)"}`);
    console.log("\nThis is not zero linking sites. It is a file this parser did not understand.");
    return 2;
  }
  const total = parsed.rows.reduce((n, r) => n + (r.links ?? 0), 0);
  console.log(`source: ${rel}   (Bing, an index independent of Google's)`);
  console.log(`referring sites: ${parsed.rows.length}${parsed.reason ? "" : `, ${total.toLocaleString()} links total`}`);
  if (parsed.reason) console.log(`note: ${parsed.reason} - the site count is trustworthy, the link totals are not`);
  console.log("");
  for (const r of parsed.rows.slice(0, 10)) console.log(`  ${String(r.links ?? "?").padStart(7)}  ${r.site}`);
  if (parsed.rows.length > 10) console.log(`  ... and ${parsed.rows.length - 10} more`);
  console.log("\nBing is the CROSS-CHECK. `npm run reach:backlinks` reads the destinations we");
  console.log("actually wrote to and is the primary instrument for the 2026-11-27 verdict.");
  return 0;
}

/**
 * The controls. The load-bearing one is the LAST PAIR: a reader that always says
 * UNMEASURED passes every "it refuses bad input" test ever written, and a file selector
 * that matches nothing reports "nobody looked" over a folder full of exports.
 */
function control() {
  const tmp = mkdtempSync(join(tmpdir(), "bing-control-"));
  let bad = 0;
  const say = (n, ok, d) => { if (!ok) bad++; console.log(`${ok ? "ok  " : "FAIL"} ${n}${d ? ` - ${d}` : ""}`); };
  try {
    const good = join(tmp, "bing-links-2026-11-27.csv");
    writeFileSync(good, 'Referring domain,Inbound links\ndigitalpedagogy.co,4\n"foo, inc.".test,2\nkef-lilmod.co.il,1\n');
    const p = parseBing(readFileSync(good, "utf8"));
    say("a real export parses", p.rows.length === 3, `${p.rows.length} rows`);
    say("  and the counts are read", p.rows[0].links === 4, String(p.rows[0].links));
    say("  and a quoted comma does not shift the columns", p.rows[1].links === 2, String(p.rows[1].links));
    say("a real export exits 0", report(good) === 0);

    const empty = join(tmp, "bing-links-empty.csv");
    writeFileSync(empty, "Referring domain,Inbound links\n");
    say("an empty export is UNMEASURED, not zero", report(empty) === 2);

    const junk = join(tmp, "bing-links-junk.csv");
    writeFileSync(junk, "not,a,report\n");
    say("an unrecognised shape reports its reason", parseBing(readFileSync(junk, "utf8")).reason !== "");

    // THE SELECTOR, BOTH WAYS. It must find its own file and must REFUSE Google's -
    // the two live in one folder and reading the wrong engine's export would report a
    // Bing figure that came from Search Console.
    say("the selector finds a bing export", newestBing(tmp) !== null);
    say("  and it is the bing one", newestBing(tmp).f.startsWith("bing-links-"));
    say("a Search Console export is NOT mine", BING.test("Pages.csv") === false);
    say("a GSC reading note is NOT mine", BING.test("links-panel-read-2026-08-30.md") === false);
    say("a bing reading note is not a bing EXPORT", BING.test("bing-links-panel-read-2026-11.md") === false);
    say("  but it is a bing NOTE", BING_NOTE.test("bing-links-panel-read-2026-11.md"));

    const bare = mkdtempSync(join(tmpdir(), "bing-bare-"));
    try { say("an empty folder finds nothing", newestBing(bare) === null); }
    finally { rmSync(bare, { recursive: true, force: true }); }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(bad ? `\n${bad} control(s) FAILED.` : "\nOK  all controls behaved.");
  return bad ? 1 : 0;
}

// Guarded, because everything below RUNS. An unguarded top level prints THIS file's
// verdict into its importer's output and exits with its code - measured 2026-08-21 on
// `gsc-links.mjs`, whose own controls then read "all behaved" having evaluated none.
// `process.argv[1] &&` first: under `node -e` there is no argv[1] and pathToFileURL
// throws, so the guard written to stop the hijack crashes the importer instead.
// See .claude/rules/a-script-that-runs-on-import-prints-its-importers-verdict.md
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2];
  if (arg === "--control") process.exit(control());
  const named = arg ? resolve(arg) : null;
  if (named && !existsSync(named)) { console.log(`UNMEASURED  ${arg} does not exist.`); process.exit(2); }
  const target = named ?? newestBing()?.path;
  if (!target) {
    const notes = existsSync(DIR) ? readdirSync(DIR).filter((f) => BING_NOTE.test(f)).sort() : [];
    if (notes.length) {
      const newest = notes[notes.length - 1];
      console.log(`READ, EMPTY  Bing's Backlinks panel was opened on ${newest.replace(/^bing-links-panel-read-|\.md$/g, "")} and reported nothing.`);
      console.log("");
      console.log(`Not "nobody looked", and not a zero. docs/outreach/exports/${newest} carries the`);
      console.log("reading and the control that proves the panel can report a non-zero figure.");
      process.exit(2);
    }
    console.log("UNMEASURED  no Bing backlinks export in docs/outreach/exports/.");
    console.log("");
    console.log("Bing Webmaster Tools -> Backlinks -> Export, then save it here as");
    console.log("  docs/outreach/exports/bing-links-YYYY-MM-DD.csv");
    console.log("");
    console.log("If the panel is EMPTY rather than un-exported, that is a different state and");
    console.log("it needs its own file: write what you saw into");
    console.log("  docs/outreach/exports/bing-links-panel-read-YYYY-MM-DD.md");
    console.log("including a CONTROL - another property on the same account reporting a");
    console.log("non-zero figure - or the reading cannot tell an empty index from a broken panel.");
    console.log("");
    console.log("This is NOT a report of zero referring sites. Nobody has looked.");
    process.exit(2);
  }
  process.exit(report(target));
}
