import { describe, expect, it } from "vitest";
import { SHELL_ART_COUNT } from "@ui/gameArt";
import { SHELL_LOADERS } from "./catalog";
import { GAMES } from "./games";
import { REST, REST_LOADERS } from "./gamesRest";
import { ROSTER_IDS, SHELL_GAMES, SHELL_META_COUNT } from "./shellRoster";

/**
 * The roster is split across three files so a first visit stops carrying a
 * record per game, and three files holding one ordering is exactly how an
 * ordering drifts. This is the pin.
 *
 * Every assertion here fails LOUDLY. The failure this guards against does not:
 * a game that slips from `shellRoster.ts` into `gamesRest.ts` renders perfectly,
 * ships a smaller shell, and simply pops in a beat later than it should - and one
 * that slips the other way renders perfectly too and quietly charges every child
 * for a card they will never scroll to. Neither shows up as an error anywhere.
 */
describe("the roster split", () => {
  it("draws its line where the card art draws its own", () => {
    // The same question - "what is above the fold" - must not have two answers.
    // `SHELL_ART_COUNT` is the original and this follows it; if the fold ever
    // moves, both move together or this fails.
    expect(SHELL_META_COUNT).toBe(SHELL_ART_COUNT);
  });

  it("is the shell half followed by the rest, in the roster's own order", () => {
    expect(SHELL_GAMES).toHaveLength(SHELL_META_COUNT);
    expect(GAMES.map((m) => m.id)).toEqual([
      ...SHELL_GAMES.map((m) => m.id),
      ...REST.map((m) => m.id),
    ]);
  });

  it("names every game in ROSTER_IDS, and nothing else", () => {
    // The grid lays out one card per id BEFORE the rest arrive, so an id missing
    // here is a card that never appears at all until the lazy chunk lands - and
    // an id here with no game behind it is a permanently empty box.
    expect(ROSTER_IDS).toEqual(GAMES.map((m) => m.id));
  });

  it("carries the game's id and never its directory name", () => {
    // `src/games/n2048/` publishes at `2048`. An alias leaking into ROSTER_IDS is
    // a card that links to a 404 and a loader lookup that finds nothing.
    expect(ROSTER_IDS).toContain("2048");
    expect(ROSTER_IDS).not.toContain("n2048");
  });

  it("puts a NEW game below the fold by construction", () => {
    // A game is appended to the roster, so it lands in `gamesRest.ts` and costs
    // the first visit its id and nothing more. If the last game is ever in the
    // shell half, the split has stopped doing its job.
    expect(SHELL_GAMES.map((m) => m.id)).not.toContain(GAMES[GAMES.length - 1]!.id);
  });

  it("splits the LOADERS on the same line as the metadata", () => {
    // A loader is not free: 13.1 B gz per game in chunk names alone, measured on
    // the served artifact. So the shell carries a loader for exactly the games
    // whose metadata it carries - one line, not two - and a loader that drifts
    // to the wrong side is invisible: the game still mounts, it is just paid for
    // by every child (shell side) or fetched a beat late (rest side).
    expect(Object.keys(SHELL_LOADERS).sort()).toEqual(SHELL_GAMES.map((m) => m.id).sort());
    expect(Object.keys(REST_LOADERS).sort()).toEqual(REST.map((m) => m.id).sort());
  });

  it("pairs every game in the roster with exactly one loader", () => {
    // The positive control for the pair above, and the assertion that would
    // still hold if BOTH halves were the whole roster - which is why it is not
    // the only one here.
    const all = { ...SHELL_LOADERS, ...REST_LOADERS };
    expect(Object.keys(all)).toHaveLength(GAMES.length);
    for (const m of GAMES) expect(typeof all[m.id], `no loader for ${m.id}`).toBe("function");
    // ...and no id appears on both sides, which a spread would silently swallow.
    const overlap = Object.keys(SHELL_LOADERS).filter((id) => id in REST_LOADERS);
    expect(overlap).toEqual([]);
  });

  it("has a shell half small enough to be worth splitting", () => {
    // The positive control: every assertion above passes on a shell half that is
    // the WHOLE roster, which is the state this change exists to leave.
    expect(SHELL_GAMES.length).toBeLessThan(GAMES.length);
    expect(REST.length).toBeGreaterThan(0);
    expect(Object.keys(SHELL_LOADERS).length).toBeLessThan(GAMES.length);
    expect(Object.keys(REST_LOADERS).length).toBeGreaterThan(0);
  });
});
