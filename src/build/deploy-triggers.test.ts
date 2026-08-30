import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * A `paths-ignore` IS A HAND-KEPT MIRROR OF THE BUILD'S INPUT GRAPH, AND
 * NOTHING IN GITHUB CHECKS IT.
 *
 * The two ellaz workflows skip a deploy for paths that cannot change `dist/`.
 * Every entry is a claim - "the build never reads this" - and a wrong one fails
 * in the silent direction: the site simply stops updating for that input, with
 * a green run history and a browser that shows a complete, working, older page.
 *
 * WHY THE LIST GREW ON 2026-08-30. Commit `a3fc75b` changed two markdown files
 * and one control script. It rebuilt ellaz.fun, shipped the whole site over
 * FTP, and the upload FAILED - leaving the live site on an older build while
 * every asset it named still returned 200. A commit that touched no code put
 * the live site behind, so documentation stopped being a cost argument about
 * wasted uploads and became a correctness one.
 *
 * This test holds the three things that can make those entries wrong.
 */

const REPO = resolve(new URL(".", import.meta.url).pathname, "../..");
const WORKFLOWS = [".github/workflows/deploy-hostinger.yml", ".github/workflows/deploy-pages.yml"];

/** The `paths-ignore:` block of one workflow, as a list of globs. */
function ignoreList(rel: string): string[] {
  const src = readFileSync(join(REPO, rel), "utf8");
  const start = src.indexOf("paths-ignore:");
  expect(start, `${rel} has no paths-ignore block`).toBeGreaterThan(-1);
  const out: string[] = [];
  for (const line of src.slice(start).split("\n").slice(1)) {
    if (/^\s*#/.test(line)) continue;            // a comment inside the block
    const m = line.match(/^\s+-\s+"([^"]+)"\s*$/);
    if (m) { out.push(m[1]); continue; }
    if (line.trim() === "") continue;
    break;                                        // the block ended
  }
  return out;
}

/**
 * The files a deploy actually executes: the app and build sources, the vite
 * config, and every script the workflow runs. Tests are excluded - a test may
 * legitimately read a document, and this one does.
 */
function deployPathFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(ts|tsx|mjs|js)$/.test(name)) continue;
      if (/\.test\.(ts|tsx)$/.test(name)) continue;
      out.push(p);
    }
  };
  walk(join(REPO, "src"));
  for (const f of [
    "vite.config.ts",
    "scripts/assert-first-visit.mjs", "scripts/assert-payload.mjs",
    "scripts/assert-pages.mjs", "scripts/assert-slope.mjs",
    "scripts/assert-live.mjs", "scripts/indexnow.mjs",
  ]) out.push(join(REPO, f));
  return out;
}

/**
 * The roots the list claims are documentation. Kept here rather than derived
 * from the workflow, because the point is to check the CLAIM: if somebody adds
 * `src/**` to paths-ignore, deriving the roots would make this test approve it.
 */
const DOC_ROOTS = ["docs/", ".claude/", "CLAUDE.md"];

/**
 * A doc path next to something that READS it. Deliberately not a
 * comment-stripping scan: every one of these roots appears in prose in this
 * repo, and a regex that tries to remove comments is the thing that has broken
 * here before (`.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`).
 * Matching the CALL instead needs no comment handling at all, because a comment
 * does not contain `readFileSync(`.
 */
const READS = new RegExp(
  String.raw`(readFileSync|readFile|createReadStream|existsSync|readdirSync|statSync|import\s*\(|\bfrom\s+)` +
    String.raw`\s*\(?\s*["'\`][^"'\`]*(${DOC_ROOTS.map((r) => r.replace(".", "\\.")).join("|")})`,
  "g",
);
/** join(x, "docs", ...) - the same read, assembled from segments. */
const JOINS = new RegExp(String.raw`join\s*\([^)]*["'\`](docs|\.claude|CLAUDE\.md)["'\`]`, "g");

describe("the deploy filters", () => {
  it("both ellaz workflows ignore exactly the same paths", () => {
    // Two hosts serving one repo at two base paths. A filter that drifts does
    // not break a build; it makes ellaz.fun and the Pages mirror publish on
    // different commits, and the divergence is invisible from either site.
    const [a, b] = WORKFLOWS.map(ignoreList);
    expect(a.length, "the hostinger filter parsed as empty - the matcher read nothing").toBeGreaterThan(5);
    expect(a).toEqual(b);
  });

  it("names the documentation roots, so a docs commit cannot redeploy the site", () => {
    const list = ignoreList(WORKFLOWS[0]);
    for (const root of ["docs/**", ".claude/**", "CLAUDE.md"]) expect(list).toContain(root);
  });

  it("and nothing in the deploy path reads a document, which is what makes that safe", () => {
    const files = deployPathFiles();
    // The population, always. A walk that found nothing would pass silently.
    expect(files.length, "no deploy-path files found - the walker read nothing").toBeGreaterThan(50);
    const hits: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const re of [READS, JOINS]) {
        re.lastIndex = 0;
        for (const m of src.matchAll(re)) hits.push(`${f.replace(REPO + "/", "")}: ${m[0].slice(0, 70)}`);
      }
    }
    expect(hits, "the build reads a document, so ignoring it in paths-ignore is now wrong").toEqual([]);
  });
});
