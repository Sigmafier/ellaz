/**
 * Record the payload figure THE DEPLOY measured, so published copy can quote it.
 *
 * `assert-outreach` used to re-derive the first visit from the local `dist/`.
 * That is the wrong instrument for a number that leaves the repository: this
 * machine runs Node 24, the deploy builds on Node 22, and the same commit
 * measures ~50 B apart on the two. A provenance row in a draft NAMES the commit
 * it was measured on, so a local reading written under that row is false about
 * the one thing the row exists to let somebody check.
 *
 * So the figure is read out of the deploy's own log - not re-derived, not
 * retyped. It cannot be wrong about what CI measured, because it is what CI
 * printed.
 *
 *   node scripts/reach/ci-payload.mjs           # show what is recorded vs latest
 *   node scripts/reach/ci-payload.mjs --write   # refresh the record from CI
 *
 * Exits 2 when there is no record and none could be read - never 0, and never a
 * fabricated number. Needs `gh`, authenticated.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const RECORD = join(REPO, "docs", "outreach", "ci-payload.json");

export function readRecord() {
  if (!existsSync(RECORD)) return null;
  try {
    return JSON.parse(readFileSync(RECORD, "utf8"));
  } catch (e) {
    // A corrupt record must not read as "no record" - one means refresh it, the
    // other means somebody hand-edited a file that is meant to be generated.
    throw new Error(`ci-payload: ${RECORD} does not parse: ${e.message}`);
  }
}

function gh(args) {
  return execFileSync("gh", args, { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/** The newest SUCCESSFUL primary-host deploy, and the figures it printed. */
export function readLatestFromCI() {
  const runs = JSON.parse(
    gh(["run", "list", "--limit", "20", "--json", "databaseId,name,conclusion,headSha,createdAt"]),
  );
  const run = runs.find((r) => r.conclusion === "success" && r.name.includes("Hostinger"));
  if (!run) return null;
  const log = gh(["run", "view", String(run.databaseId), "--log"]);

  // Anchored on the words assert-payload and assert-slope actually print. A
  // looser match would pick up the mirror's build, which uses a different base
  // and is NOT the artifact anybody visits.
  const fv = /first visit: ([\d,]+) B gz of ([\d,]+)/.exec(log);
  const sl = /SLOPE\s+([\d.]+) B gz per game/.exec(log);
  if (!fv) return null;
  const n = (s) => Number(s.replace(/,/g, ""));
  return {
    firstVisitB: n(fv[1]),
    ceiling: n(fv[2]),
    spareB: n(fv[2]) - n(fv[1]),
    slopeB: sl ? Number(sl[1]) : null,
    commit: run.headSha.slice(0, 7),
    runId: run.databaseId,
    measuredAt: run.createdAt.slice(0, 10),
    note: "Read off the deploy's own log. CI is the toolchain that builds the live site; this machine is not.",
  };
}

const isMain =
  process.argv[1] && (await import("node:fs")).realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const have = readRecord();
  const latest = readLatestFromCI();
  if (have) console.log(`recorded  ${have.firstVisitB.toLocaleString()} B gz, ${have.spareB} spare, at ${have.commit} (${have.measuredAt})`);
  else console.log("recorded  (nothing)");
  if (latest) console.log(`latest CI ${latest.firstVisitB.toLocaleString()} B gz, ${latest.spareB} spare, at ${latest.commit} (${latest.measuredAt})`);
  else console.log("latest CI (could not read a successful deploy)");

  if (process.argv.includes("--write")) {
    if (!latest) {
      console.error("FAIL  no successful primary-host deploy to read. Refusing to write a number nobody measured.");
      process.exit(2);
    }
    writeFileSync(RECORD, JSON.stringify(latest, null, 2) + "\n");
    console.log(`wrote ${RECORD}`);
  } else if (!have) {
    console.error("FAIL  no record. Run with --write once a deploy has succeeded.");
    process.exit(2);
  }
}
