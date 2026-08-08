import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { GAMES } from "../portal/games";

/**
 * `ownsChrome` in a game's meta and `<GameChrome>` in its renderer are two
 * halves of one decision, and they live in two files that nothing else forces
 * to agree. Getting either half alone is silent and unpleasant:
 *
 * - meta says `ownsChrome`, renderer does not use GameChrome -> `GameHost`
 *   stops drawing its bar and the player has NO WAY HOME. The game still plays
 *   perfectly, which is why nobody would notice until a child is stuck in it.
 * - renderer uses GameChrome, meta does not say `ownsChrome` -> both bars draw,
 *   so the screen has two mute buttons and two ways back. That reads as a bug
 *   rather than as emphasis, and it is exactly what the flag exists to prevent.
 *
 * Neither shows up in `tsc`, in any unit test, or in a screenshot of the one
 * game somebody happened to open. So it is pinned here, by reading each game's
 * own source - the same technique `score-unit-declared.test.ts` uses, and for
 * the same reason: the catalog cannot import a renderer without pulling React
 * into a DOM-free module.
 */

const GAMES_DIR = join(__dirname);

/** Every `.ts`/`.tsx` file a game directory owns, minus its tests. */
function sourcesOf(dir: string): string[] {
  const full = join(GAMES_DIR, dir);
  if (!statSync(full).isDirectory()) return [];
  return readdirSync(full)
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"))
    .map((f) => readFileSync(join(full, f), "utf8"));
}

/**
 * A game may borrow a sibling's renderer - evolve renders n2048's component
 * under its own id - so the search follows a relative import into that
 * sibling's directory rather than calling the borrower chrome-less.
 */
function borrowedDirs(sources: string[]): string[] {
  const out = new Set<string>();
  for (const src of sources) {
    for (const m of src.matchAll(/from\s+"\.\.\/([a-z0-9]+)\//g)) out.add(m[1]);
  }
  return [...out];
}

function usesGameChrome(dir: string, seen = new Set<string>()): boolean {
  if (seen.has(dir)) return false;
  seen.add(dir);
  const sources = sourcesOf(dir);
  if (sources.some((s) => /<GameChrome\b/.test(s))) return true;
  return borrowedDirs(sources).some((d) => usesGameChrome(d, seen));
}

/** meta.id is the published slug; the DIRECTORY can differ (n2048 -> "2048"). */
const DIR_OF: Record<string, string> = Object.fromEntries(
  readdirSync(GAMES_DIR)
    .filter((f) => statSync(join(GAMES_DIR, f)).isDirectory())
    .map((dir) => {
      const meta = readFileSync(join(GAMES_DIR, dir, "meta.ts"), "utf8");
      const id = /id:\s*"([^"]+)"/.exec(meta)?.[1] ?? dir;
      return [id, dir];
    }),
);

describe("a game's chrome is declared in exactly one place", () => {
  it("every game in the roster resolves to a directory", () => {
    for (const g of GAMES) expect(DIR_OF[g.id], `no directory for ${g.id}`).toBeTruthy();
  });

  it.each(GAMES.map((g) => [g.id, g.ownsChrome === true] as const))(
    "%s: ownsChrome=%s matches its renderer",
    (id, declared) => {
      const used = usesGameChrome(DIR_OF[id]);
      expect(
        used,
        declared
          ? `${id} declares ownsChrome but no renderer under src/games/${DIR_OF[id]}/ renders <GameChrome>. ` +
              `GameHost will hide its bar, so the player has no way home.`
          : `${id} renders <GameChrome> but its meta does not declare ownsChrome: true. ` +
              `The host bar draws as well, so the screen gets two mute buttons.`,
      ).toBe(declared);
    },
  );

  it("actually scanned the games tree", () => {
    // A guard on the guard: if the recursion or the id map broke, every game
    // would report `used === false` and the suite would go green for the half
    // of the roster that declares nothing. The roster is 100% GameChrome today,
    // so a zero here means the scanner is broken, not that the games are.
    const found = GAMES.filter((g) => usesGameChrome(DIR_OF[g.id])).length;
    expect(found).toBeGreaterThan(GAMES.length / 2);
  });
});
