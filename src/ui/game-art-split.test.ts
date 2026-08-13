import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { GAMES } from "../portal/games";
import { SHELL_ART_COUNT, artGround, artIds, artReady, hasArt } from "./gameArt";
import { REST } from "./gameArtRest";

/**
 * Which scene ships on a first visit, and which one waits.
 *
 * The art used to be one object literal, so every scene reached every child
 * before they had chosen a game - 163 B gz apiece, on a screen that shows about
 * eight cards. A first visit that grows with the catalogue is the one property
 * a catalogue must not have, so the scenes above the fold stay in the shell and
 * the rest are a lazy chunk.
 *
 * The line between them is the roster's own order, and this file is why that is
 * a FACT rather than an intention. Reordering `games.ts` moves a card onto the
 * first screen; without this gate it would keep whichever half its scene was
 * written into, and the only symptom would be a picture that arrives late on
 * the one screen every session starts on - which nobody reports as a bug.
 *
 * It reads the SOURCE rather than the loaded registry, deliberately. The
 * registry is a merged view by design: anything that imports the lazy half
 * (this repo's own build emitter does) makes the two look identical, so a
 * runtime check here would pass over a split that had entirely collapsed.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));

/** The entry keys of an art map, read out of its source text. */
function sceneKeys(file: string): string[] {
  const src = readFileSync(join(HERE, file), "utf8");
  const keys = [...src.matchAll(/\n {2}(?:"([^"]+)"|([A-Za-z_$][\w$]*)):\s*\{\s*a:\s*"/g)].map(
    (m) => m[1] ?? m[2],
  );
  // Guards the whole file: a drifted matcher would make every assertion below
  // pass over an empty list, which is how a source-scanning gate reports green
  // about something it never read.
  if (keys.length === 0) throw new Error(`${file}: read no scenes - the matcher is broken`);
  return keys;
}

const SHELL_KEYS = sceneKeys("gameArt.ts");
const REST_KEYS = sceneKeys("gameArtRest.ts");
const ROSTER = GAMES.map((g) => g.id);

describe("the split follows the roster", () => {
  it("keeps the first SHELL_ART_COUNT games' scenes in the shell", () => {
    // Sorted, not in order: the art file groups scenes by how they were drawn,
    // and the roster orders them by where they appear. Membership is the claim.
    expect([...SHELL_KEYS].sort()).toEqual([...ROSTER.slice(0, SHELL_ART_COUNT)].sort());
  });

  it("puts every other game's scene in the lazy half", () => {
    for (const id of ROSTER.slice(SHELL_ART_COUNT)) {
      expect(REST_KEYS, `${id} is below the fold, so its scene belongs in gameArtRest.ts`).toContain(
        id,
      );
    }
  });

  it("never holds the same scene twice", () => {
    expect(SHELL_KEYS.filter((k) => REST_KEYS.includes(k))).toEqual([]);
  });

  it("loses no scene in the move", () => {
    expect([...new Set([...SHELL_KEYS, ...REST_KEYS])].sort()).toEqual(artIds());
  });

  it("is a split at all - both halves hold scenes", () => {
    // The failure this catches is somebody "fixing" a red build by moving
    // everything back, which leaves every other assertion here green.
    expect(SHELL_KEYS.length).toBe(SHELL_ART_COUNT);
    expect(REST_KEYS.length).toBeGreaterThan(0);
  });
});

describe("the lazy half is invisible from the shell, except where it must not be", () => {
  it("promises a scene for a lazy game before the chunk lands", async () => {
    // A fresh module registry, so this sees the shell exactly as a browser does
    // on first paint - every other test file in this process has imported the
    // lazy half and merged it in.
    vi.resetModules();
    const art = await import("./gameArt");
    const lazy = ROSTER[SHELL_ART_COUNT];

    // `hasArt` must say YES: the home grid asks it once per card to choose
    // between the picture branch and the emoji branch, and nothing re-renders
    // that choice, so a NO would strand the card on its emoji all session.
    expect(art.hasArt(lazy)).toBe(true);
    // ...and `artReady` must say NO, because nothing has arrived. That is the
    // one the view branches on, and the reason both exist.
    expect(art.artReady(lazy)).toBe(false);
    expect(art.gameArt(lazy)).toBe("");

    // The ground is needed at BUILD time, for the game page's header bar, and
    // an absent one falls back to a single indigo - a plausible, wrong colour
    // with no error anywhere.
    //
    // Compared against the SCENE's own ground rather than against the fallback:
    // one lazy game's ground happens to BE the fallback indigo, so
    // "not the fallback" is a check that passes for the wrong reason on 9 games
    // and fails for the wrong reason on the tenth.
    expect(art.artGround(lazy)).toBe(REST[lazy].a);
  });

  it("draws the scene once it is registered", async () => {
    vi.resetModules();
    const art = await import("./gameArt");
    const { REST: fresh } = await import("./gameArtRest");
    const lazy = ROSTER[SHELL_ART_COUNT];

    expect(art.artReady(lazy)).toBe(false);
    art.registerArt(fresh);
    expect(art.artReady(lazy)).toBe(true);
    expect(art.gameArt(lazy).startsWith("<svg")).toBe(true);
  });

  it("tells a subscriber, once, when they arrive", async () => {
    vi.resetModules();
    const art = await import("./gameArt");
    const { REST: fresh } = await import("./gameArtRest");

    const before = art.artRevision();
    let fired = 0;
    const off = art.subscribeArt(() => (fired += 1));
    art.registerArt(fresh);
    expect(fired).toBe(1);
    expect(art.artRevision()).not.toBe(before);

    off();
    art.registerArt(fresh);
    expect(fired).toBe(1);
  });
});

describe("the duplicated ground colours agree with the scenes they describe", () => {
  // `gameArt.ts` carries each lazy game's ground a second time so `artGround`
  // and `hasArt` can answer before the chunk lands. Two copies of one fact is a
  // drift waiting to happen, so it is pinned here rather than trusted.
  it("matches every lazy scene's own ground", () => {
    for (const [id, scene] of Object.entries(REST)) {
      expect(artGround(id), `${id}'s cached ground has drifted from its scene`).toBe(scene.a);
    }
  });

  it("knows every lazy game and no others", () => {
    for (const id of REST_KEYS) expect(hasArt(id), id).toBe(true);
    expect(hasArt("a-game-nobody-drew")).toBe(false);
    expect(artReady("a-game-nobody-drew")).toBe(false);
  });
});
