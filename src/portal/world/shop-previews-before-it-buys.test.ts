import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CATEGORIES, ITEMS, STREAK_ITEMS, artFor } from "./items";
import { EXTRA_ITEMS, SHOP_ITEMS } from "./itemsRest";
import { REST_ART } from "./artRest";
import { ART } from "./art";
import { STREAK_ART } from "./streakArt";

// Two claims this file pins, and neither is visible to `tsc`.
//
// 1. A SHOP CARD MAY NOT SPEND. Tapping a card used to buy the item, which was
//    tolerable at 27 items and is not at 82 - the picture on a 132px card was
//    the only way to judge a hat, and the only way to see one properly was to
//    own it. A tap previews; one named button under the room buys. Both halves
//    render perfectly if the wiring slips back, and the cost of the slip is a
//    child's coins, so this is a source scan and not a rendering test.
//
// 2. THE ART SPLIT IS REAL. Everything a returning player can already have
//    equipped is drawn in the SHELL; only the second shelf may be lazy. Get
//    that backwards and a child opens Home to a room missing the wall they
//    bought - with a green build, because a missing drawing is a legal state.

const SRC = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

describe("a tap previews, a button buys", () => {
  const world = SRC("World.tsx");

  it("hands the cards a handler that cannot spend", () => {
    // `select` is the whole guarantee: it plays a sound and sets state. If a
    // later edit points `onTap` back at the spending path this goes red.
    expect(world).toMatch(/onTap=\{select\}/);
    const select = world.slice(world.indexOf("const select ="), world.indexOf("const buyOrPlace"));
    expect(select).not.toMatch(/wallet\.buy|wallet\.equip/);
  });

  it("spends in exactly one place", () => {
    const buys = world.split("\n").filter((line) => /\bwallet\.buy\(/.test(line));
    expect(buys, "wallet.buy call sites in World.tsx").toHaveLength(1);
    const bar = world.slice(world.indexOf("const buyOrPlace"), world.indexOf("  return ("));
    expect(bar).toMatch(/wallet\.buy\(/);
  });

  it("refuses without words, and never with a dead button", () => {
    // The platform's own rule: a locked or unaffordable item wiggles and says
    // nothing. `disabled` here would be the first fail-punishment in the app -
    // it is what the shared `Button` reserves for genuinely impossible actions,
    // and "you have not earned this" is not one of those.
    const act = world.slice(world.indexOf("const buyOrPlace"), world.indexOf("  return ("));
    expect(act).toMatch(/shake\(/);
    const bar = world.slice(
      world.indexOf("function ActionBar("),
      world.indexOf("function ItemCard("),
    );
    expect(bar.length, "the ActionBar slice").toBeGreaterThan(500);
    expect(bar).not.toMatch(/\bdisabled\b/);
  });

  it("renders the WHOLE catalogue, and never imports it statically", () => {
    // Two failures guarded by one test, because the fixes pull against each
    // other and a later edit will be tempted to trade one for the other.
    //
    // Reading `SHELL_ITEMS` gives a shop that type-checks, renders, scrolls
    // and is missing 52 items, with nothing on screen saying so. Found by a
    // mutation that SURVIVED the first version of this file.
    //
    // Importing the lazy half STATICALLY fixes that and charges every visitor
    // who opens a GAME for it - `PageApp` imports this module, so the whole
    // second shelf lands in `page`. Measured: 19.3 -> 28.5 KB gz on a game
    // page, +47%, to carry pictures of shop items no game will ever draw.
    expect(world, "the lazy half must not be a static import").not.toMatch(
      /^import .*from "\.\/(itemsRest|artRest)"/m,
    );
    expect(world, "the shop reads the growing catalogue").toMatch(/shopItems\(\)/);
    const uses = world
      .split("\n")
      .filter((line) => /\bSHELL_ITEMS\b/.test(line) && !line.trimStart().startsWith("//"));
    expect(uses, "World.tsx must not read the shell half directly").toEqual([]);
    for (const call of ["const shown =", "const all ="]) {
      const at = world.indexOf(call);
      expect(at, call).toBeGreaterThan(-1);
      expect(world.slice(at, at + 60), call).toContain("catalogue");
    }
  });

  it("shows the preview in the big room, not only on the card", () => {
    expect(world).toMatch(/\[preview\.category\]:\s*preview\.id/);
  });
});

describe("the art split follows what a player can already be wearing", () => {
  it("draws every shelf item, and nothing it has no row for", () => {
    // `tsc` already proves each map is exhaustive over its own union. What it
    // cannot see is that the three unions together cover the catalogue - a
    // fourth list added later with no map would type-check everywhere.
    const drawn = new Set([
      ...Object.keys(ART),
      ...Object.keys(STREAK_ART),
      ...Object.keys(REST_ART),
    ]);
    const missing = SHOP_ITEMS.filter((item) => !drawn.has(item.art)).map((i) => i.id);
    expect(missing, "catalogue rows with no drawing").toEqual([]);
    expect(drawn.size, "drawings with no catalogue row").toBe(
      new Set(SHOP_ITEMS.map((i) => i.art)).size,
    );
  });

  it("keeps every free default in the SHELL half", () => {
    // The fallback `roomPiece` reaches for when the lazy chunk has not landed.
    // In the lazy half it would be a fallback that is itself missing, and the
    // room would draw a hole on a first paint.
    for (const category of CATEGORIES) {
      const free = SHOP_ITEMS.find((i) => i.category === category && i.price === 0);
      expect(free, category).toBeDefined();
      expect(Object.keys(ART), `${category} default`).toContain(free?.art);
    }
  });

  it("keeps the whole pre-existing catalogue in the SHELL half", () => {
    // The one that matters on the day somebody moves a row to save bytes: a
    // returning player has these equipped ALREADY, so their room has to be
    // right at first paint with no fetch. Only items nobody can own yet may be
    // lazy, which is what makes `EXTRA_ITEMS` a safe place and `ITEMS` not.
    for (const item of [...ITEMS, ...STREAK_ITEMS]) {
      expect(
        [...Object.keys(ART), ...Object.keys(STREAK_ART)],
        `${item.id} must be drawn in the shell`,
      ).toContain(item.art);
    }
    for (const item of EXTRA_ITEMS) {
      expect(Object.keys(REST_ART), `${item.id} is the lazy half`).toContain(item.art);
    }
  });

  it("loads the lazy half from inside a function, never at module scope", () => {
    // A module-scope `import()` keeps the chunk in the production graph and
    // Vite writes a modulepreload for it into index.html - an eager download no
    // globIgnores entry can prevent, because a preload is not the precache.
    const registry = SRC("roomArt.ts");
    const dynamic = registry.indexOf('import("./artRest")');
    expect(dynamic, "the dynamic import").toBeGreaterThan(-1);
    // The ROWS ride the same request. Two dynamic imports of one chunk is one
    // fetch, and splitting them would be two chunks and two round trips.
    expect(registry).toContain('import("./itemsRest")');
    expect(registry.slice(0, dynamic)).toMatch(/export function loadRoomArtRest/);
  });

  it("is carved into its own named chunk, and kept out of the precache", () => {
    // Three changes make a lazy chunk real and two of them leave the payload
    // exactly where it was, behind a green build.
    const config = readFileSync(new URL("../../../vite.config.ts", import.meta.url), "utf8");
    // Read a WINDOW, not a line: prettier is free to wrap the predicate onto
    // its own line, and a line-scoped matcher goes red on a reformat while the
    // config stays correct - a gate that cries wolf gets passed with --force.
    const at = config.indexOf('return "world-art"');
    expect(at, "a NAMED manualChunks branch").toBeGreaterThan(-1);
    const branch = config.slice(Math.max(0, at - 400), at);
    // Both halves, and the DATA is the half that surprises: carving out the
    // pictures and leaving the rows behind fails the payload gate by more than
    // it saves, because the rows alone measured 2,448 B gz in the shell.
    expect(branch).toContain("artRest");
    expect(branch).toContain("itemsRest");
    expect(config).toContain('"**/world-art-*.js"');
  });
});

describe("the catalogue grew without breaking what it promised", () => {
  it("still gives every category exactly one free default", () => {
    for (const category of CATEGORIES) {
      expect(
        SHOP_ITEMS.filter((i) => i.category === category && i.price === 0),
        category,
      ).toHaveLength(1);
    }
  });

  it("prices the top tier out of one sitting, and gates it on stars", () => {
    // A session is capped at 40 coins (SESSION_COIN_CAP), so anything above
    // ~200 is deliberately a week or more of coming back. The gate is what
    // stops it also being reachable by grinding one game for an afternoon.
    for (const item of SHOP_ITEMS) {
      if (item.price < 250) continue;
      expect(item.requiresStars, `${item.id} is expensive and must be star-gated`).toBeGreaterThan(
        0,
      );
    }
  });

  it("leaves something to want in every category", () => {
    // A shelf holding only its free default is a tab that opens onto nothing.
    for (const category of CATEGORIES) {
      const buyable = SHOP_ITEMS.filter((i) => i.category === category && i.price > 0);
      expect(buyable.length, `${category} has nothing to buy`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("the shell can resolve a lazy item it has never seen", () => {
  // `artFor` lives in the shell and only knows the shell half of the
  // catalogue. It answers for the other 52 by reading the id itself, which is
  // sound only while every row keeps both halves of this shape. Break it and a
  // child who bought a galaxy wall opens Home to a plain one, for ever, with a
  // green build - the failure has no error and no line number.
  it("keeps every id equal to its art key and prefixed by its slot", () => {
    for (const item of SHOP_ITEMS) {
      expect(item.art, `${item.id} art key`).toBe(item.id);
      expect(item.id.startsWith(`${item.category}_`), `${item.id} slot prefix`).toBe(true);
    }
  });

  it("resolves a lazy item's drawing without the lazy list", () => {
    for (const item of EXTRA_ITEMS) {
      expect(artFor(item.category, item.id), item.id).toBe(item.art);
    }
  });

  it("still refuses a cross-slot id and an id from no shelf at all", () => {
    // The prefix guess must not become a way for a corrupt profile to put a
    // hat on the rug. Both of these are the category default, as before.
    expect(artFor("rug", "hat_crown")).toBe("rug_none");
    expect(artFor("wall", "retired_in_a_later_release")).toBe("wall_plain");
    expect(artFor("pet", "petunia_not_a_pet")).toBe("pet_none");
  });
});
