import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { artIds, artGround, gameArt, hasArt } from "./gameArt";

/**
 * Every game has a picture, and this is the gate that says so.
 *
 * It exists because of a specific failure. The 21 scenes were drawn and
 * approved on 2026-08-03 and recorded in the plan under "reused, not
 * reinvented" - a line, not a task. Nothing owned it and nothing checked it, so
 * the site shipped every game as one operating-system emoji on a colour block,
 * and two cards on the home grid were the same snake. Every gate in this repo
 * reported green throughout: they count words, resolve links, parse JSON-LD,
 * bound the precache and diff the sitemap. Not one of them looked at whether a
 * game had a picture.
 *
 * So this reads the game tree, not a list. A game added tomorrow appears here
 * with no edit, which is the only way a coverage check stays true.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Every game id, read off the tree the same way `catalog.ts` gets them. */
function gameIdsFromTree(): string[] {
  const dir = join(ROOT, "games");
  const ids: string[] = [];
  for (const name of readdirSync(dir)) {
    let meta: string;
    try {
      meta = readFileSync(join(dir, name, "meta.ts"), "utf8");
    } catch {
      continue; // not a game directory
    }
    const m = meta.match(/\bid:\s*"([^"]+)"/);
    if (m) ids.push(m[1]);
  }
  return ids.sort();
}

const GAME_IDS = gameIdsFromTree();

describe("every game has key art", () => {
  it("actually found the games", () => {
    // Guards the whole file: a broken reader would make every assertion below
    // pass over an empty list.
    expect(GAME_IDS.length).toBeGreaterThan(15);
    expect(GAME_IDS).toContain("memory");
    // The slug trap: the directory is `n2048`, the id is `2048`, and the id is
    // what everything addresses. A check keyed on directory names would have
    // reported full coverage while 2048 had none.
    expect(GAME_IDS).toContain("2048");
    expect(GAME_IDS).not.toContain("n2048");
  });

  it("has a scene for every single game", () => {
    const missing = GAME_IDS.filter((id) => !hasArt(id));
    expect(missing).toEqual([]);
  });

  it("has no scene for a game that does not exist", () => {
    const orphans = artIds().filter((id) => !GAME_IDS.includes(id));
    expect(orphans).toEqual([]);
  });

  it("fires on a game with no art", () => {
    expect(hasArt("a-game-nobody-drew")).toBe(false);
    expect(gameArt("a-game-nobody-drew")).toBe("");
  });
});

describe("a scene is well-formed", () => {
  it("draws every game without throwing, and closes its svg", () => {
    for (const id of GAME_IDS) {
      const svg = gameArt(id);
      expect(svg.startsWith("<svg"), `${id} must open an svg`).toBe(true);
      expect(svg.endsWith("</svg>"), `${id} must close its svg`).toBe(true);
      expect(svg.length, `${id} looks empty`).toBeGreaterThan(200);
    }
  });

  it("is authored on the one stage size, so a grid of them lines up", () => {
    for (const id of GAME_IDS) {
      expect(gameArt(id), id).toContain('viewBox="0 0 200 150"');
    }
  });

  it("carries no <defs> or gradient, because ids collide when inlined 21 times", () => {
    for (const id of GAME_IDS) {
      const svg = gameArt(id);
      expect(svg, `${id} must not use <defs>`).not.toContain("<defs");
      expect(svg, `${id} must not use a gradient`).not.toMatch(/Gradient|url\(#/);
    }
  });

  it("is hidden from a screen reader - the game's name is right beside it", () => {
    for (const id of GAME_IDS) {
      expect(gameArt(id), id).toContain('aria-hidden="true"');
    }
  });

  it("gives every game a ground colour", () => {
    for (const id of GAME_IDS) {
      expect(artGround(id), id).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("the theme reaches the art, through exactly one rect", () => {
  /**
   * The veil is the whole theming mechanism, and it is deliberately the ONLY
   * one. Swapping the scenes' paper and ink for theme tokens breaks the
   * drawings - a memory card in night's surface colour is a dark navy playing
   * card - and the saturated grounds are the game's identity, like meta.color.
   */
  it("ends on a veil rect driven by a custom property", () => {
    for (const id of GAME_IDS) {
      expect(gameArt(id), id).toContain('style="fill:var(--art-veil,transparent)"');
    }
  });

  it("uses style=, not a fill attribute, because attributes reject var()", () => {
    expect(gameArt("memory")).not.toMatch(/fill="var\(/);
  });

  it("puts the veil LAST, or it would sit under the scene and do nothing", () => {
    const svg = gameArt("memory");
    expect(svg.indexOf("--art-veil")).toBeGreaterThan(svg.lastIndexOf("<path"));
  });

  it("declares --art-veil in BOTH theme blocks", () => {
    // A key in one block and not the other silently inherits the default's
    // value for that one property - a theme bug nobody finds by looking.
    const css = readFileSync(join(ROOT, "ui/tokens.css"), "utf8");
    expect((css.match(/--art-veil:/g) || []).length).toBe(2);
  });
});
