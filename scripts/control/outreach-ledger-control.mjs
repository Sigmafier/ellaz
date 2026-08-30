/**
 * Mutation controls for the ledger check. Each plants ONE defect in a COPY of the
 * repo's outreach folder and asserts the check names it. The mutation is verified
 * to have landed before the verdict is read - a run that never happened is
 * otherwise indistinguishable from a run that passed.
 */
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { check } from "../outreach-ledger.mjs";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
let failures = 0;
const say = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` - ${detail}` : ""}`);
};

function sandbox() {
  const t = mkdtempSync(join(tmpdir(), "ledger-control-"));
  mkdirSync(join(t, "docs"), { recursive: true });
  cpSync(join(SRC, "docs/outreach"), join(t, "docs/outreach"), { recursive: true });
  return t;
}
/** Edit a file and REFUSE to continue unless the bytes actually changed. */
function mutate(root, rel, fn) {
  const path = join(root, rel);
  const before = readFileSync(path, "utf8");
  const after = fn(before);
  if (after === before) throw new Error(`control: mutation to ${rel} did not land`);
  writeFileSync(path, after);
}
const kinds = (r) => r.problems.map((p) => p.kind);

// 0. POSITIVE CONTROL: an untouched copy must be clean. Without it, a check wired
//    to "always fail" would pass every negative control below.
{
  const t = sandbox();
  const r = check(t);
  say("an untouched copy is clean", r.problems.length === 0, JSON.stringify(r.problems));
  say("  and it read a real population", r.population.drafts > 0 && r.population.rows > 0,
      JSON.stringify(r.population));
  rmSync(t, { recursive: true, force: true });
}

// 1. A draft with no row.
{
  const t = sandbox();
  writeFileSync(join(t, "docs/outreach/tiktok.md"), "# TikTok\n\n**Status**: drafts. Nothing posted.\n");
  say("a draft with no ledger row is caught", kinds(check(t)).includes("UNLEDGERED"));
  rmSync(t, { recursive: true, force: true });
}

// 2. A row naming a draft that does not exist.
{
  const t = sandbox();
  mutate(t, "docs/outreach/ledger.md", (s) =>
    s.replace("| Show HN | `launch.md` |", "| Show HN | `ghost.md` |"));
  say("a row naming a missing draft is caught", kinds(check(t)).includes("GHOST"));
  rmSync(t, { recursive: true, force: true });
}

// 3. THE ONE THIS EXISTS FOR: a draft says it was sent, the ledger still says draft.
{
  const t = sandbox();
  mutate(t, "docs/outreach/reddit.md", (s) =>
    s.replace(/^\*\*Status\*\*:.*$/m, "**Status**: fired. Posted 2026-08-20."));
  const k = kinds(check(t));
  say("a fired draft with a 'draft' row is caught", k.includes("DISAGREE"), k.join(","));
  rmSync(t, { recursive: true, force: true });
}

// 4. A fired row with no dates - a verdict nobody scheduled.
{
  const t = sandbox();
  mutate(t, "docs/outreach/ledger.md", (s) =>
    s.replace("| Show HN | `launch.md` | draft | — | — |", "| Show HN | `launch.md` | spent | — | — |"));
  mutate(t, "docs/outreach/launch.md", (s) =>
    s.replace(/^\*\*Status\*\*:.*$/m, "**Status**: spent. Fired."));
  say("a spent row with no dates is caught", kinds(check(t)).includes("UNDATED"));
  rmSync(t, { recursive: true, force: true });
}

// 5. BLIND: the table matcher stops matching. Must FAIL, never read as clean.
{
  const t = sandbox();
  mutate(t, "docs/outreach/ledger.md", (s) => s.split("\n").filter((l) => !l.startsWith("|")).join("\n"));
  const k = kinds(check(t));
  say("an unreadable ledger reports BLIND, not clean", k.includes("BLIND"), k.join(","));
  rmSync(t, { recursive: true, force: true });
}

// 6. A status word outside the vocabulary must be reported, never coerced.
//
//    The mutation is DERIVED, not typed. It used to plant `| itch.io | \`itch.md\` |
//    draft |` as a literal, and the day the itch row legitimately became `fired`
//    that string stopped existing - so the mutation stopped landing and the whole
//    harness threw, on a control whose subject had not changed at all. A control
//    bound to a value that is SUPPOSED to move is a control with an expiry date
//    nobody wrote down. (Found 2026-08-30. The `mutation did not land` guard is the
//    only reason it surfaced as a refusal rather than as a seventh PASS.)
{
  const t = sandbox();
  mutate(t, "docs/outreach/ledger.md", (s) => {
    const lines = s.split("\n");
    const i = lines.findIndex((l) => /^\|[^|]*\|[^|]*\|\s*draft\s*\|/.test(l));
    if (i < 0) throw new Error("control: the ledger holds no `draft` row to corrupt");
    lines[i] = lines[i].replace(/(\|[^|]*\|[^|]*\|)\s*draft\s*\|/, "$1 maybe |");
    return lines.join("\n");
  });
  say("an unrecognised status is caught", kinds(check(t)).includes("UNREADABLE"));
  rmSync(t, { recursive: true, force: true });
}

console.log(failures === 0 ? "\nOK  all controls behaved." : `\n${failures} control(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
