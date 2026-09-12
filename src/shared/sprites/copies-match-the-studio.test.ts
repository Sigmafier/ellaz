// The three adapters in this directory are COPIES of the studio's, and each one
// says so in its own header: "keep this file byte-equal to the studio's apart
// from this header". That sentence is prose, and prose is exactly what goes
// quietly false - so this is the code that holds it.
//
// WHY A COPY AND NOT AN IMPORT. `studio/` is a third independent workspace and
// `studio/scripts/assert-boundary.mjs` refuses an import in either direction:
// `src/` importing it would put every renderer, character and recipe into the
// first visit of a child who has not chosen a game. The studio's adapters were
// written to be copied - they re-declare their types rather than importing the
// studio's build code - so the copy is the sanctioned path, not a workaround.
//
// WHY THAT NEEDS A GATE. A copy has no compiler keeping it honest. Fix a bug in
// one side and the other keeps the bug; widen a type here and the game reads a
// shape the exporter never writes. Neither shows up as an error anywhere - the
// two files just drift, and the header still claims they cannot.
//
// This reads BOTH trees off disk. That is not an import and the boundary gate
// scans import specifiers, so it stays green; a test may look at a file that
// shipped code may not link against.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");
const STUDIO_ADAPTERS = join(REPO, "studio", "adapters");

/**
 * Each copy, and where it came from.
 *
 * The studio puts its canvas adapters one directory below the types they
 * import, so `../manifest` there is `./manifest` here. That ONE substitution is
 * the only difference the copy is allowed to carry, and normalising it is what
 * lets the rest be compared byte for byte.
 */
const COPIES = [
  { file: "manifest.ts", from: join(STUDIO_ADAPTERS, "manifest.ts") },
  { file: "player.ts", from: join(STUDIO_ADAPTERS, "canvas", "player.ts") },
  { file: "draw-frame.ts", from: join(STUDIO_ADAPTERS, "canvas", "draw-frame.ts") },
  // The Phaser loader, added 2026-09-12 when `survivors` began drawing the cast.
  // THIS LIST IS A HAND-KEPT MIRROR of the adapter set, which is the shape
  // `a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md` collects: a copy
  // missing from here is a copy with no drift gate at all, and nothing anywhere
  // else would notice. Copy an adapter, add its row, in the same change.
  { file: "load-atlas.ts", from: join(STUDIO_ADAPTERS, "phaser", "load-atlas.ts") },
];

/**
 * The code, with the header comment gone and the import path normalised.
 *
 * Only WHOLE-LINE `//` comments are dropped, which is what a header is. Block
 * comments and doc comments are kept and must match - they are part of what the
 * adapter says about itself, and a copy that silently loses one has drifted.
 */
function code(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n")
    .replace(/"\.\.\/manifest"/g, '"./manifest"')
    .trim();
}

describe("the copied studio adapters have not drifted", () => {
  it("has a studio to compare against", () => {
    // THE POSITIVE CONTROL, and it is the load-bearing assertion here. Every
    // comparison below passes vacuously if a path is wrong and both sides read
    // as empty - which is precisely what a renamed studio directory would do,
    // and it would read as a clean bill of health.
    expect(existsSync(STUDIO_ADAPTERS), `${STUDIO_ADAPTERS} is missing - this test compared nothing`).toBe(true);
    for (const c of COPIES) {
      expect(existsSync(c.from), `the studio original ${c.from} is missing`).toBe(true);
      expect(existsSync(join(HERE, c.file)), `the copy ${c.file} is missing`).toBe(true);
    }
  });

  it.each(COPIES.map((c) => [c.file, c] as const))("%s matches the studio's", (file, c) => {
    const theirs = code(readFileSync(c.from, "utf8"));
    const ours = code(readFileSync(join(HERE, file), "utf8"));

    // Neither side may be empty. Comparing "" to "" is the shape of a gate that
    // cannot fail, and a stripped-to-nothing file would do it silently.
    expect(theirs.length, `${file}: the studio original stripped to nothing`).toBeGreaterThan(200);
    expect(ours.length, `${file}: the copy stripped to nothing`).toBeGreaterThan(200);

    expect(
      ours,
      `src/shared/sprites/${file} has drifted from ${c.from.replace(REPO + "/", "")}. ` +
        `These are COPIES, not forks - the studio cannot be imported from src/, so nothing ` +
        `else keeps them honest. Re-copy the studio's file and change only the header and ` +
        `the "../manifest" import, or change BOTH sides deliberately.`,
    ).toBe(theirs);
  });

  it("still carries the one substitution it is allowed", () => {
    // If this ever finds nothing, the normaliser above stopped doing anything -
    // and a normaliser that matches nothing makes every comparison above a
    // comparison of two unrelated strings that happen to agree.
    // Any adapter the studio keeps one directory BELOW the types - `canvas/` and
    // `phaser/` both - is a file whose `"../manifest"` this test normalises. The
    // filter said `canvas/` alone until 2026-09-12, so the Phaser loader would
    // have been compared with a normaliser nothing proved was still live.
    const studioCanvas = COPIES.filter((c) => /\/(canvas|phaser)\//.test(c.from));
    expect(studioCanvas.length, "no nested adapter in the list - the paths moved").toBeGreaterThan(0);
    for (const c of studioCanvas) {
      expect(
        readFileSync(c.from, "utf8"),
        `${c.file}: the studio original no longer imports "../manifest", so the one ` +
          `substitution this test normalises is stale and it is now comparing blind.`,
      ).toContain('"../manifest"');
    }
  });
});
