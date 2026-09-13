import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A kids-band game never ships the stick alone.
 *
 * WHY THIS FILE EXISTS AT ALL. On 2026-09-13 the operator ruled that the
 * steering moves ONTO the arena for `survivors`, and the law in `CLAUDE.md` was
 * narrowed in the same change: what used to bind every game now binds only
 * `ageBand: "kids"`. A narrowed law with nothing enforcing it is not a narrower
 * law - it is a deleted law with a paragraph where it stood, and this repo
 * already collects that failure ("a claim about a SET goes in a test, not a
 * sentence"). So the narrowing ships with its own gate.
 *
 * The thing being protected is not tidiness. A five-year-old on a phone, and
 * anyone on assistive input, cannot hold a sustained pointer gesture; the four
 * arrows are what make a kids game completable without one. A joystick is a
 * sustained drag by definition.
 */

const GAMES = join(__dirname);

const ids = readdirSync(GAMES, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((id) => {
    try {
      readFileSync(join(GAMES, id, "meta.ts"), "utf8");
      return true;
    } catch {
      return false;
    }
  });

const metaOf = (id: string) => readFileSync(join(GAMES, id, "meta.ts"), "utf8");

/** Every `.tsx` a game ships, joined - a game may split its renderer up. */
function sourceOf(id: string): string {
  return readdirSync(join(GAMES, id))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => readFileSync(join(GAMES, id, f), "utf8"))
    .join("\n");
}

const bandOf = (id: string) => (metaOf(id).match(/ageBand:\s*"([^"]+)"/) || [])[1] ?? null;
const kids = ids.filter((id) => bandOf(id) === "kids");
/** A game imports the pad by its own path - never through the `@ui` barrel. */
const hasPad = (id: string) => /from\s+"@ui\/DirectionPad"/.test(sourceOf(id));
/** A game draws its own stick. `survivors` is the first and, today, the only one. */
const hasStick = (id: string) => /from\s+"\.\/stick"/.test(sourceOf(id));

describe("the narrowed steering law actually binds something", () => {
  it("THE POPULATION: the kids band is not empty, so this gate guards a real set", () => {
    // Without this the whole file passes by asserting over nothing, which is how
    // a gate comes to mean "no kids games exist" while reading green forever.
    expect(ids.length).toBeGreaterThan(30);
    expect(kids.length).toBeGreaterThan(0);
  });

  it("THE CONTROL: maze is a kids game that steers, and it keeps the pad", () => {
    // Named rather than derived. If the scan ever stops seeing maze - a renamed
    // directory, a moved meta, a broken glob - every other assertion here would
    // pass silently over a shrunken set, and this is the line that refuses to.
    expect(kids).toContain("maze");
    expect(hasPad("maze"), "maze is ageBand kids and must keep DirectionPad").toBe(true);
  });

  it("no kids-band game ships a stick without the pad beside it", () => {
    const offenders = kids.filter((id) => hasStick(id) && !hasPad(id));
    expect(
      offenders,
      "a kids game cannot be steered by a sustained drag alone - keep DirectionPad",
    ).toEqual([]);
  });

  it("survivors is the exemption the law was narrowed FOR, and it is not kids", () => {
    // The narrowing is only honest while the game that prompted it sits outside
    // the band it exempted. The day survivors becomes `ageBand: "kids"`, this
    // reds and the law has to be re-argued rather than quietly stretched.
    expect(ids).toContain("survivors");
    expect(bandOf("survivors")).not.toBe("kids");
    expect(hasStick("survivors"), "survivors is the game that grew a stick").toBe(true);
    expect(hasPad("survivors"), "survivors gave up the pad by operator ruling").toBe(false);
  });
});
