/**
 * The ledger check: every draft has a row, and the two agree about its status.
 *
 * WHY IT IS SEPARATE FROM THE GATE THAT IMPORTS IT. `assert-outreach.mjs` answers
 * "is every NUMBER in this folder still true". This answers "is every SURFACE
 * accounted for" - a different question with a different failure. A number goes
 * stale on its own, silently, because the tree moved. A status goes stale because
 * a PERSON did something and did not write it down, and the cost is not a wrong
 * figure in a draft: it is a one-shot surface fired twice.
 *
 * THE DISAGREEMENT IS THE SIGNAL, NOT EITHER SIDE ALONE. A draft saying "drafts,
 * nothing is posted" while the ledger says `fired` means somebody posted and did
 * not update the draft. The reverse means somebody updated a draft and the ledger
 * never learned. Both are the same defect - two records of one fact - and neither
 * file can detect it alone, which is why this reads both.
 *
 * POPULATION FIRST, ALWAYS. The count of drafts found is printed on every run. A
 * matcher that stops seeing the status line - because a draft was rephrased -
 * reports a clean sweep over prose it never read, which is the shape
 * `.claude/rules/a-diagnostic-that-truncates-what-it-compares.md` is about. Zero
 * drafts, or zero rows, is a FAILURE here and never a pass.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LEDGER = "docs/outreach/ledger.md";
const STATUSES = ["draft", "fired", "spent", "dropped"];

// The folder holds two KINDS of file and only one of them is a proposal. A RECORD
// describes what already happened - the ledger itself, the audit of these drafts, the
// search-console reading - so it has no surface, no status and nothing to fire. Naming
// them here rather than inferring from "does it have a **Status**: line" is deliberate:
// the missing-status check is what catches a real draft whose header was lost, and an
// inference would turn that check off for exactly the file it exists to catch.
// `prospects.md` joined them 2026-08-30. It is the same kind as `backlinks.md` and
// for the same reason: a destination measured is not a surface fired, so it has no
// status to carry and no row to match. Adding it here was NOT a way to quiet the
// gate - the gate was right to refuse it, and the fix is naming the kind rather
// than giving a record a fake `**Status**: draft` to satisfy a check.
export const RECORDS = new Set([
  "ledger.md",
  "audit.md",
  "measured.md",
  "backlinks.md",
  "prospects.md",
]);

/** Every draft in the folder, and the status its own header claims. */
export function drafts(repo) {
  const dir = join(repo, "docs/outreach");
  if (!existsSync(dir)) throw new Error(`outreach-ledger: ${dir} is missing.`);
  const out = [];
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".md") || RECORDS.has(f)) continue;
    const body = readFileSync(join(dir, f), "utf8");
    // The status line is a claim in prose. Read the FIRST word after the marker and
    // map it onto the vocabulary; anything unrecognised is reported, never assumed.
    const m = body.match(/^\*\*Status\*\*:\s*(\S+)/m);
    const word = m ? m[1].toLowerCase().replace(/[^a-z]/g, "") : "";
    const claimed = word.startsWith("draft") ? "draft"
      : STATUSES.find((s) => word.startsWith(s)) ?? (m ? `unrecognised:${word}` : "missing");
    out.push({ file: f, claimed });
  }
  return out;
}

/** Every row of the ledger table, keyed by the draft it names. */
export function rows(repo) {
  const path = join(repo, LEDGER);
  if (!existsSync(path)) throw new Error(`outreach-ledger: ${LEDGER} is missing.`);
  const out = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    // cells[0] is the empty string before the leading pipe.
    // `who` and `next` are appended AFTER `notes`, so this destructure stays
    // correct for a table written before they existed - they read as undefined
    // rather than shifting a column. The board renders them; the gate ignores
    // them, which is why they may be blank without failing anything.
    const [, surface, draft, status, fired, due, notes, who, next] = cells;
    if (!surface || surface.startsWith("---") || surface === "Surface") continue;
    const file = (draft ?? "").replace(/`/g, "");
    if (!file.endsWith(".md")) continue;
    out.push({
      surface, file, status: (status ?? "").toLowerCase(), fired, due,
      notes: notes ?? "", who: (who ?? "").toLowerCase().replace(/[^a-z]/g, ""), next: next ?? "",
    });
  }
  return out;
}

/** Returns a list of problems. Empty means clean. */
export function check(repo) {
  const problems = [];
  const ds = drafts(repo);
  const rs = rows(repo);

  // The population, printed by the caller. Zero of either is the blind case.
  if (ds.length === 0) problems.push({ kind: "BLIND", text: "no drafts found in docs/outreach/ - the matcher is reading nothing" });
  if (rs.length === 0) problems.push({ kind: "BLIND", text: `no rows found in ${LEDGER} - the table matcher is reading nothing` });

  const covered = new Set(rs.map((r) => r.file));
  for (const d of ds) {
    if (!covered.has(d.file)) problems.push({ kind: "UNLEDGERED", text: `${d.file} has no row in ${LEDGER}` });
    if (d.claimed.startsWith("unrecognised")) problems.push({ kind: "UNREADABLE", text: `${d.file} status "${d.claimed.split(":")[1]}" is not one of ${STATUSES.join("/")}` });
    if (d.claimed === "missing") problems.push({ kind: "UNREADABLE", text: `${d.file} has no **Status**: line` });
  }
  for (const r of rs) {
    if (!ds.some((d) => d.file === r.file)) { problems.push({ kind: "GHOST", text: `${LEDGER} names ${r.file}, which does not exist` }); continue; }
    if (!STATUSES.includes(r.status)) { problems.push({ kind: "UNREADABLE", text: `${r.surface}: status "${r.status}" is not one of ${STATUSES.join("/")}` }); continue; }
    const claimed = ds.find((d) => d.file === r.file).claimed;
    // A file holding several surfaces (dev.md holds three, launch.md two) can
    // legitimately be "draft" overall while one row is fired - so only the reverse
    // is a defect: a draft that says it was SENT while no row of its own agrees.
    //
    // The comparison is against the file's rows AS A SET, not row by row. Row by
    // row it reported dev.md - correctly marked fired for PR #465, which is open
    // on a 4,900-star list right now - as disagreeing with its own two unfired
    // siblings. That reading makes the honest header the one the gate refuses, so
    // the header goes back to claiming everything is a draft, which is precisely
    // the "a draft cannot be its own record" failure this file exists to stop.
    // (2026-08-20, found the day #465 turned out to have been open for eight days
    // under a header saying nothing was opened.)
    const anyFired = rs.some((x) => x.file === r.file && x.status !== "draft");
    if (claimed !== "draft" && !anyFired)
      problems.push({ kind: "DISAGREE", text: `${r.file} says "${claimed}" but no surface of its own is fired in the ledger` });
    if ((r.status === "fired" || r.status === "spent") && (!/\d/.test(r.fired ?? "") || !/\d/.test(r.due ?? "")))
      problems.push({ kind: "UNDATED", text: `${r.surface} is "${r.status}" with no fired date and verdict date - a verdict that is not scheduled is not taken` });
  }
  return { problems, population: { drafts: ds.length, rows: rs.length } };
}
