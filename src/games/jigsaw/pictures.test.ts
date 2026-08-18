import { describe, expect, it, vi } from "vitest";
import { GAMES } from "../../portal/games";
import { SHELL_ART_COUNT } from "@ui/gameArt";
import { PICTURES } from "./pictures";

/**
 * The jigsaw's pictures have to be in the SHELL, not in the lazy art chunk.
 *
 * `gameArtRest.ts` is fetched on browser idle, so a scene from that half is
 * absent for the first moments of a session - and for a card on the home grid
 * that is a brief emoji, which is fine, while for THIS game it is a board of
 * blank rectangles with nothing to solve. Same latency, completely different
 * consequence, which is why this game needs a gate the grid does not.
 *
 * The line between the halves is the ROSTER'S OWN ORDER (`game-art-split.test.ts`
 * enforces that), so it moves whenever somebody reorders `games.ts` - a change
 * that has nothing to do with this game and would otherwise empty its board
 * with no error anywhere.
 */

describe("every picture is one the shell already carries", () => {
  const shellIds = GAMES.slice(0, SHELL_ART_COUNT).map((g) => g.id);

  it("found the roster and the split", () => {
    // Guards everything below: an empty list would make each assertion pass
    // over nothing, which is how a source-reading gate reports green about
    // something it never read.
    expect(PICTURES.length).toBeGreaterThanOrEqual(4);
    expect(shellIds).toHaveLength(SHELL_ART_COUNT);
  });

  it.each(PICTURES)("%s is above the fold, so its scene ships in the shell", (id) => {
    expect(shellIds).toContain(id);
  });

  it("draws every one of them without loading the lazy half", async () => {
    // A fresh module registry, so this sees the shell exactly as a browser does
    // on first paint - every other test file in this process has imported
    // `gameArtRest` and merged it in, which would make this pass for the wrong
    // reason.
    vi.resetModules();
    const art = await import("@ui/gameArt");
    for (const id of PICTURES) {
      expect(art.artReady(id), `${id} is not in the shell half`).toBe(true);
      expect(art.gameArt(id).startsWith("<svg"), id).toBe(true);
    }
  });

  it("names no picture twice", () => {
    expect(new Set(PICTURES).size).toBe(PICTURES.length);
  });
});
