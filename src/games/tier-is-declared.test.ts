// Every game declares which band it is in, in its DOM-free `meta.ts`.
//
// WHY THE DECLARATION HAS TO EXIST AT ALL
// Games shipped looking like coloured circles because nothing anywhere said
// what a game has to look like. `tier` is that sentence: `simple` is what the
// roster already is and carries no requirement, `showcase` is a promise the
// build holds you to (sprites, animation, effects, weapons). A band nobody
// writes down is a band nobody can enforce.
//
// WHY IT IS PINNED RATHER THAN DEFAULTED
// `GameMeta.tier` is optional, so the type cannot require it - making it
// required would be a red build in 43 files for a field 42 of them do not care
// about. This test is what makes the word mandatory anyway, so choosing
// `simple` is a decision somebody made rather than a field they forgot.
//
// THE HEAVY LIFTING IS NOT HERE. `scripts/assert-tier.mjs` is what refuses a
// showcase game missing a requirement, because it runs inside `build:check` and
// the deploy workflows run that - they run `vitest` ZERO times. This file pins
// the declaration; that script pins the promise.
//
// It reads the tree rather than importing the roster, for the same reason
// `score-unit-declared.test.ts` does: the roster module has moved once already,
// and a test pinning a field should not also be pinned to where a third file
// lives.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const GAMES_DIR = new URL(".", import.meta.url).pathname;

const BANDS = ["simple", "showcase"] as const;

const DIRS = readdirSync(GAMES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

interface Declared {
  dir: string;
  id: string;
  tier?: string;
  src: string;
}

const METAS: Declared[] = DIRS.map((dir) => {
  const src = readFileSync(join(GAMES_DIR, dir, "meta.ts"), "utf8");
  return {
    dir,
    id: src.match(/\bid: *"([^"]+)"/)?.[1] ?? dir,
    tier: src.match(/\btier: *"([a-z]+)"/)?.[1],
    src,
  };
});

describe("what each game says its quality band is", () => {
  it.each(METAS.map((m) => [m.id, m] as const))("%s", (id, meta) => {
    expect(
      meta.tier,
      `${id} declares no tier. Every game says which band it is in - "simple" ` +
        `is what the roster already is and asks nothing of you, "showcase" is a ` +
        `promise the build holds you to. Writing the word is the point: a band ` +
        `nobody chose is a band nobody can enforce.`,
    ).toBeDefined();
    expect(
      BANDS as readonly string[],
      `${id} declares tier "${meta.tier}", which is not a band. The two are ` +
        `${BANDS.join(" and ")}, and there is deliberately no third.`,
    ).toContain(meta.tier);
  });

  it("has at least one game in each band", () => {
    // The positive control, and it is the load-bearing assertion in this file.
    // Every per-game check above passes vacuously over a roster where all 43
    // games chose the same word - and a showcase gate with no showcase game to
    // read is a gate passing over nothing, which reads exactly like a gate that
    // works. If this ever fails, delete the gate rather than leave it green.
    for (const band of BANDS) {
      const inBand = METAS.filter((m) => m.tier === band);
      expect(
        inBand.length,
        `no game declares "${band}". A band with no members means the gate that ` +
          `reads it is passing over an empty set.`,
      ).toBeGreaterThan(0);
    }
  });

  it("never lets a meta.ts import an asset", () => {
    // `meta.ts` is pulled into the SHELL chunk by manualChunks, so an asset
    // imported here is an asset in every child's first visit - before they have
    // chosen a game. A showcase game's sprite sheet is exactly the thing that
    // would be reached for, which is why this is pinned beside the tier rather
    // than left to review.
    for (const meta of METAS) {
      const assetImports = [...meta.src.matchAll(/from "([^"]*\.(?:png|jpe?g|webp|gif|svg|json|css))"/g)];
      expect(
        assetImports.map((m) => m[1]),
        `${meta.id}/meta.ts imports an asset. meta.ts is in the shell chunk, so ` +
          `this puts those bytes in the first visit of a child who has not picked ` +
          `a game yet. Import it from the game's renderer, which is lazy.`,
      ).toEqual([]);
    }
  });
});
