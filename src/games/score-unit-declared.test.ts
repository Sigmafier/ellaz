// Every game that keeps a record declares what that record MEASURES, in its
// DOM-free `meta.ts`, and this pins the declaration to the renderer that
// actually reports it.
//
// WHY THE DECLARATION HAS TO EXIST AT ALL
// A stored personal best is a bare number. Only the number is persisted — never
// the unit — so nothing reading `ellaz:sudoku:score:easy` back off the disk can
// tell 12,750 milliseconds from 12,750 points. The boards screen needs the unit
// twice over: to rank a board the right way round (a fast time WINS) and to
// print "12.8s" rather than "12750". Reading it out of the renderer is not an
// option, because the renderer imports React and the catalog must not.
//
// WHY IT IS PINNED RATHER THAN TRUSTED
// A declaration copied to the wrong game is invisible: it type-checks, it
// renders, and it silently orders a whole board backwards for exactly the games
// that use it. So this test reads each game's OWN source, finds the `unit:` it
// reports, and requires the two to agree. That is the same trade `board.test.ts`
// makes for the cloud chunk's LOW_UNITS set, for the same reason.
//
// It reads the tree rather than importing the roster, deliberately. The roster
// module has moved once already, and a test that pins two files to each other
// should not also be pinned to where a third one lives - `catalog.test.ts`
// ratchets the roster itself. Everything here is source text, so this holds
// whichever module happens to own the list.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const GAMES_DIR = new URL(".", import.meta.url).pathname;

/** Every `unit: "..."` a game's own source reports, tests excluded. */
function reportedUnits(dir: string): Set<string> {
  const found = new Set<string>();
  for (const entry of readdirSync(join(GAMES_DIR, dir))) {
    if (entry.includes(".test.")) continue;
    if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) continue;
    const src = readFileSync(join(GAMES_DIR, dir, entry), "utf8");
    for (const m of src.matchAll(/unit: *"([a-z]+)"/g)) found.add(m[1]);
  }
  return found;
}

/**
 * Sibling game directories this one borrows a renderer from.
 *
 * `evolve` has no renderer of its own — it renders 2048's component under its
 * own game id, so it gets its own storage namespace and its own board while
 * every `unit:` literal lives in the other directory. Followed rather than
 * hardcoded, so the next skinned game needs no edit here.
 */
function borrowedFrom(dir: string): string[] {
  const index = join(GAMES_DIR, dir, "index.ts");
  if (!existsSync(index)) return [];
  const src = readFileSync(index, "utf8");
  return [...src.matchAll(/from "\.\.\/([A-Za-z0-9_-]+)\//g)].map((m) => m[1]);
}

/** Game directories, which are NOT game ids: `src/games/n2048/` publishes "2048". */
const DIRS = readdirSync(GAMES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

interface Declared {
  dir: string;
  id: string;
  /** What `meta.ts` claims, or undefined when it claims nothing. */
  scoreUnit?: string;
}

const METAS: Declared[] = DIRS.map((dir) => {
  const src = readFileSync(join(GAMES_DIR, dir, "meta.ts"), "utf8");
  return {
    dir,
    id: src.match(/\bid: *"([^"]+)"/)?.[1] ?? dir,
    scoreUnit: src.match(/\bscoreUnit: *"([a-z]+)"/)?.[1],
  };
});

/** What this game's source says it measures, following a borrowed renderer. */
function unitFromSource(dir: string): string | undefined {
  const own = reportedUnits(dir);
  if (own.size === 0) {
    for (const sibling of borrowedFrom(dir)) {
      const inherited = reportedUnits(sibling);
      if (inherited.size === 1) return [...inherited][0];
    }
    return undefined;
  }
  // Two units in one game is not a declaration problem, it is a design one: the
  // record would mean two different things depending on how the run ended.
  expect([...own], `${dir} reports more than one unit`).toHaveLength(1);
  return [...own][0];
}

describe("what each game says its record measures", () => {
  it.each(METAS.map((m) => [m.id, m] as const))("%s", (id, meta) => {
    const reported = unitFromSource(meta.dir);
    expect(
      meta.scoreUnit,
      reported
        ? `${id} reports unit "${reported}" but its meta declares ` +
          `${meta.scoreUnit ? `"${meta.scoreUnit}"` : "nothing"}. ` +
          `The boards screen ranks and formats by the declared unit, so a wrong ` +
          `one orders that board backwards and prints the number in the wrong shape.`
        : `${id} keeps no record, so its meta must not declare a unit`,
    ).toBe(reported);
  });

  it("never gives coloring one", () => {
    // Deliberate and permanent: ranking a child's drawing is the opposite of
    // this platform's premise. Named here rather than left to the general rule
    // above, so adding one is a test someone has to delete on purpose.
    const coloring = METAS.find((m) => m.id === "coloring");
    expect(coloring, "coloring left the tree").toBeDefined();
    expect(coloring!.scoreUnit).toBeUndefined();
  });

  it("covers every game but coloring", () => {
    // A count ratchet in the same spirit as catalog.test.ts: a game that quietly
    // loses its record would otherwise pass every assertion above by declaring
    // nothing and reporting nothing.
    const scored = METAS.filter((m) => m.scoreUnit !== undefined);
    expect(scored).toHaveLength(METAS.length - 1);
  });
});
