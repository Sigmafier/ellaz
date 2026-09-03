// `GameInvite.resultLine` is new (T9, 2026-09) and goes through the SAME
// scrub `buildGameInvite` already runs `title`/`note`/`invite`/`url` through -
// this file exists to prove that wiring holds, on its own, rather than
// trusting the shared assertion at the bottom of `share.test.ts` to have
// noticed a field that file predates.
import { describe, it, expect } from "vitest";
import { mulberry32 } from "@shared/rng";
import { makeBackupCode } from "./backupCode";
import { assertShareSafe, buildGameInvite, type GameInvite } from "./share";

const LABELS = { note: "Free in your browser. No ads, no account.", invite: "Come and play on Ellaz" };
const URL = "https://ellaz.fun/games/maze/";

const game = (over: Partial<GameInvite> = {}): GameInvite => ({
  gameId: "maze",
  title: "Maze",
  emoji: "🐭",
  ...over,
});

describe("resultLine is scrubbed exactly like every other field", () => {
  it("redacts a real backup code arriving through resultLine", () => {
    // A REAL code from the real generator, not a hand-typed lookalike - the
    // same discipline `share.test.ts` holds its own backup-code case to.
    const code = makeBackupCode(mulberry32(11));
    const payload = buildGameInvite(game({ resultLine: `New best: 14 ${code}` }), LABELS, URL);
    expect(payload).toBeDefined();
    expect(payload!.headline).not.toContain(code);
    expect(payload!.text).not.toContain(code);
    // Visible, not silently dropped - `share.ts`'s own REDACTED contract.
    expect(payload!.headline).toContain("•••");
    expect(() => assertShareSafe(payload!)).not.toThrow();
  });

  it("redacts a storage key arriving through resultLine", () => {
    const key = "ellaz:maze:score:default";
    const payload = buildGameInvite(game({ resultLine: `New best: ${key}` }), LABELS, URL);
    expect(payload).toBeDefined();
    expect(payload!.headline).not.toContain(key);
    expect(payload!.text).not.toContain(key);
  });

  it("a plain result line passes through untouched", () => {
    const payload = buildGameInvite(game({ resultLine: "New best: 14" }), LABELS, URL);
    expect(payload!.headline).toBe("🐭 Maze - New best: 14");
  });

  it("a game with no resultLine keeps the plain invite - unchanged from before this field existed", () => {
    const payload = buildGameInvite(game(), LABELS, URL);
    expect(payload!.headline).toBe("🐭 Maze");
    expect(payload!.text).toBe(
      "🐭 Maze\nFree in your browser. No ads, no account.\nCome and play on Ellaz https://ellaz.fun/games/maze/",
    );
  });
});
