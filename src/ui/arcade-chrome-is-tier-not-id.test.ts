import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { GAMES } from "../portal/games";

/**
 * The arcade HUD is worn because of a BAND, never because of a NAME.
 *
 * `meta.tier === "showcase"` is the population the operator picked when they
 * were asked who should get dedicated game controls - "games that declare
 * showcase" - and the whole value of that answer is that it is a standard. A
 * HUD selected by `id === "survivors"` would look identical today, pass every
 * other test in this repo, and quietly be one game's decoration: the next
 * showcase game would get the shared grey bar and nothing would say why.
 *
 * So this pins the correspondence in both directions, and pins that the
 * component itself names no game.
 *
 * The checks are pure functions over strings, with the tree read once and
 * handed to them. That is what lets the controls below drive the OPPOSITE
 * verdicts without planting files in `src/` - the failure
 * `no-band-aids.md` § truth-table names, where an AND-coupled gate reads green
 * because a sibling predicate masked the one being driven.
 */

const SRC_DIR = join(__dirname, "..");
const GAMES_DIR = join(SRC_DIR, "games");

/** Every `.ts`/`.tsx` a game directory owns, minus its tests. */
function sourcesOf(dir: string): string[] {
  const full = join(GAMES_DIR, dir);
  if (!statSync(full).isDirectory()) return [];
  return readdirSync(full)
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"))
    .map((f) => readFileSync(join(full, f), "utf8"));
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

/** Source with `//` and block comments removed, so prose cannot trip a matcher. */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/**
 * Does this source SELECT on the given game id?
 *
 * Presence of the word is not the question - `overflow: "hidden"` is a CSS
 * keyword and `hidden` is also a game. What is forbidden is branching on an id:
 * a comparison, a membership test, a switch, or a keyed lookup.
 */
export function selectsOnId(code: string, id: string): boolean {
  const q = `["'\`]${id}["'\`]`;
  return (
    new RegExp(`[=!]==?\\s*${q}`).test(code) || // === "survivors"
    new RegExp(`${q}\\s*[=!]==?`).test(code) || // "survivors" ===
    new RegExp(`case\\s+${q}`).test(code) || // case "survivors":
    new RegExp(`\\[\\s*${q}\\s*\\]`).test(code) || // map["survivors"]
    new RegExp(`(includes|startsWith|endsWith|test)\\(\\s*${q}`).test(code)
  );
}

export type ChromeKind = "arcade" | "shared" | "none";

/** Which chrome this game's sources render. Pure, so the controls can drive it. */
export function chromeKindOf(sources: string[]): ChromeKind {
  if (sources.some((s) => /<ArcadeChrome\b/.test(s))) return "arcade";
  if (sources.some((s) => /<GameChrome\b/.test(s))) return "shared";
  return "none";
}

/**
 * The rule, as a truth table rather than as an `if` buried in an assertion.
 *
 * Both directions are real failures and they fail differently: a showcase game
 * on the shared bar is the feature silently not shipping, and a simple game on
 * the arcade HUD is a 42-game standard broken by one file.
 */
export function verdict(tier: string | undefined, kind: ChromeKind): "ok" | string {
  if (tier === "showcase" && kind !== "arcade")
    return `declares tier "showcase" but renders ${kind === "none" ? "no chrome" : "the shared bar"}`;
  if (tier !== "showcase" && kind === "arcade")
    return `renders the arcade HUD but its tier is "${tier}" - the HUD is for the showcase band`;
  return "ok";
}

describe("the arcade HUD is selected by tier, never by game id", () => {
  const rows = GAMES.map((g) => ({
    id: g.id,
    tier: (g as { tier?: string }).tier,
    kind: chromeKindOf(sourcesOf(DIR_OF[g.id] ?? g.id)),
  }));

  it("has BOTH bands in the roster, or the rule is vacuous", () => {
    // A correspondence over an empty side passes by never being tested. If the
    // roster ever holds no showcase game, delete this gate rather than let it
    // report green about nothing.
    const showcase = rows.filter((r) => r.tier === "showcase");
    const simple = rows.filter((r) => r.tier !== "showcase");
    expect(showcase.length, "no showcase game - this gate would assert nothing").toBeGreaterThan(0);
    expect(simple.length, "no simple game - the other direction would assert nothing").toBeGreaterThan(0);
  });

  it("actually read the games tree", () => {
    // The guard on the guard: a broken directory map makes every game report
    // `none`, and the suite would go green for every simple game at once.
    expect(rows.filter((r) => r.kind !== "none").length).toBeGreaterThan(GAMES.length / 2);
  });

  it("every game's chrome matches its band", () => {
    const wrong = rows.filter((r) => verdict(r.tier, r.kind) !== "ok");
    expect(wrong.map((r) => `${r.id}: ${verdict(r.tier, r.kind)}`)).toEqual([]);
  });

  it("the HUD component selects on no game id", () => {
    /*
     * THE FIRST VERSION OF THIS CELL WAS WRONG, and it is worth keeping the
     * reason: it asked whether any roster id appeared as a quoted string, and
     * reported `['hidden', 'survivors']` on a component that selects on
     * neither. `overflow: "hidden"` is a CSS keyword and there is a game whose
     * id is literally `hidden`; and this file's own doc comment quotes
     * `id === "survivors"` as the anti-pattern it forbids. So the matcher could
     * not tell a style value, or a comment describing the defect, from the
     * defect - and it produced two confident false findings that read exactly
     * like real ones.
     *
     * What is actually forbidden is SELECTION, so that is what is matched:
     * comments are stripped first, and an id only counts inside a comparison,
     * a lookup or a switch.
     */
    const hud = stripComments(readFileSync(join(SRC_DIR, "ui", "ArcadeChrome.tsx"), "utf8"));
    const named = GAMES.map((g) => g.id).filter((id) => selectsOnId(hud, id));
    expect(named, "the arcade HUD selects on a game id").toEqual([]);
  });

  describe("the verdict can say no, in both directions", () => {
    // Negative controls. Without these the three cells above pass because the
    // tree happens to be correct today, which proves the games are fine and
    // says nothing about whether this can SEE one that is not.
    it("catches a showcase game left on the shared bar", () => {
      expect(verdict("showcase", "shared")).not.toBe("ok");
      expect(verdict("showcase", "none")).not.toBe("ok");
    });

    it("catches a simple game wearing the arcade HUD", () => {
      expect(verdict("simple", "arcade")).not.toBe("ok");
      expect(verdict(undefined, "arcade")).not.toBe("ok");
    });

    it("passes the two correct pairings", () => {
      expect(verdict("showcase", "arcade")).toBe("ok");
      expect(verdict("simple", "shared")).toBe("ok");
    });

    it("tells id SELECTION from a word that merely appears", () => {
      // Both halves, because the first version of this only had one and was
      // wrong in the other direction.
      expect(selectsOnId('if (meta.id === "survivors") return <Arcade/>;', "survivors")).toBe(true);
      expect(selectsOnId('switch (id) { case "hidden": }', "hidden")).toBe(true);
      expect(selectsOnId('const c = BY_ID["survivors"];', "survivors")).toBe(true);
      // The two real false positives that made this cell necessary:
      expect(selectsOnId('overflow: "hidden",', "hidden")).toBe(false);
      expect(selectsOnId('aria-hidden="true"', "hidden")).toBe(false);
      // ...and a comment naming the anti-pattern must survive stripping.
      expect(selectsOnId(stripComments('// never id === "survivors"'), "survivors")).toBe(false);
    });

    it("reads the chrome kind off real source shapes", () => {
      expect(chromeKindOf(["<ArcadeChrome ctx={ctx}"])).toBe("arcade");
      expect(chromeKindOf(["<GameChrome ctx={ctx}"])).toBe("shared");
      expect(chromeKindOf(["nothing here"])).toBe("none");
      // A comment mentioning the name is not rendering it... but a substring of
      // a longer component name must not count either.
      expect(chromeKindOf(["<ArcadeChromeLegacy />"])).toBe("none");
    });
  });
});
