import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

// One record per game, kept in one place.
//
// Before Wave B, six games (bees, echo, math, n2048, reaction, snake) each
// hand-rolled a personal best under a bare `best` key: read it, compare it,
// write it back. The score port owns all three of those now, because a board
// cannot rank what each game ranked by its own private rule — reaction stores
// milliseconds where LOWER wins, and nothing in a stored number says so.
//
// The failure this guards against is not a crash. A game that keeps writing
// `best` alongside the port simply has TWO records of the same thing, drifting
// apart the first time one write succeeds and the other does not, with every
// test still green and every screen still plausible. So it is banned at the
// source, where it is visible, rather than hoped about in a convention doc.
//
// This is the same shape as logic-is-pure.test.ts: scan the tree, not a list of
// known files, so a game added tomorrow is covered the moment it exists.

const HERE = dirname(fileURLToPath(import.meta.url));

/** ctx.storage.get("best", …) / .set("best", …) — the pre-Wave-B pattern. */
const LEGACY_BEST = /storage\s*\.\s*(get|set)\s*\(\s*["'`]best["'`]/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("a personal best has exactly one owner", () => {
  it("no game reads or writes the bare `best` storage key", () => {
    const offenders = sourceFiles(HERE)
      .filter((f) => LEGACY_BEST.test(readFileSync(f, "utf8")))
      .map((f) => relative(HERE, f));

    expect(
      offenders,
      `These games keep their own record beside ctx.score, which is two sources of truth ` +
        `for one number:\n  ${offenders.join("\n  ")}\n` +
        `Use ctx.score.best() and ctx.score.report({ value, unit }) instead. The port ` +
        `derives direction from the unit, so "lower is better" cannot be got wrong, and ` +
        `it already reads a pre-Wave-B \`best\` through as a fallback (see ` +
        `sdk/scoreboard.ts legacyKey) so no existing player loses a record.`,
    ).toEqual([]);
  });

  it("the matcher fires on the pattern it claims to catch", () => {
    // A scan that matches nothing passes this file vacuously — and would keep
    // passing after a refactor renamed the very thing it looks for. Exercise
    // the SAME regex against the real shape it is meant to reject, plus a line
    // that must NOT trip it.
    expect(LEGACY_BEST.test('const [best] = useState(() => ctx.storage.get("best", 0));')).toBe(
      true,
    );
    expect(LEGACY_BEST.test('ctx.storage.set("best", score);')).toBe(true);
    expect(LEGACY_BEST.test("this.ctx.storage.get('best', 0)")).toBe(true);
    expect(LEGACY_BEST.test('ctx.score?.report({ value: n, unit: "points" })')).toBe(false);
    expect(LEGACY_BEST.test('ctx.storage.get("bestStreak", 0)')).toBe(false);
  });

  it("actually scanned the games tree", () => {
    // Zero files scanned would satisfy the assertion above forever. This is the
    // same reason assert-first-visit.mjs refuses a zero-entry manifest.
    expect(sourceFiles(HERE).length).toBeGreaterThan(10);
  });
});
