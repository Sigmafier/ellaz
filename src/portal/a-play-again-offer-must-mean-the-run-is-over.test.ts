/**
 * An offer to PLAY AGAIN must mean the run is actually over.
 *
 * The win strip is fed by `winMoment()`, which fires on three reasons - and
 * two of them, `milestone` and `personal_best`, fire MID-RUN in four games
 * (snake, spell, reaction, pet). Sharing a score mid-run is odd and harmless.
 * Offering to start over is not: `runRestart()` deals a new board, so a child
 * who taps it during a live snake run loses that run, having been told by the
 * button that the game was finished.
 *
 * So the button is gated on the REASON, read at the moment of the win, and
 * these cells pin both halves of that:
 *
 *   1. the payload - `runEnded` is true for `level_complete` and false for the
 *      other two, asserted per reason rather than on one sampled case;
 *   2. the call site - GameHost renders the button only behind that flag, and
 *      reaches the game's restart through the SAME slot the page header uses.
 *
 * (2) is a SOURCE assertion because nothing in this repo can render a
 * component: vitest runs in node over `src/**\/*.test.ts` with no DOM. A source
 * scan is the weaker instrument and is written as such - it can only refuse a
 * shape, never prove a pixel. The picture is
 * `screenshots/parking-win-after/`, from `scripts/repro/shoot-parking-win.mjs`.
 */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { GameContext } from "@sdk/index";
import { winMoment } from "@shared/winMoment";
import { registerShareChipHandler, type WinShareEvent } from "@shared/shareResult";

function ctx(): GameContext {
  return {
    mount: undefined as never,
    locale: "en",
    dir: "ltr",
    t: (k: string) => k,
    storage: { get: () => undefined, set: () => {}, remove: () => {} },
    analytics: { init: () => {}, track: () => {}, levelStart: () => {}, levelComplete: () => {} },
    audio: {
      muted: false, toggleMute: () => {}, onMuteChange: () => () => {},
      play: () => {}, tone: () => {}, now: () => 0, unlock: () => {},
    },
    rewards: { grant: () => ({ coins: 3, stars: 1, capped: false }) },
  } as unknown as GameContext;
}

afterEach(() => registerShareChipHandler(null));

/** Comments first, or a scan reads the paragraph ABOUT a shape as the shape.
 *  Block comments before line comments: a `//` inside a block would otherwise
 *  eat the rest of that line and leave the block's tail behind. */
function code(path: string): string {
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("the win event says whether the RUN ended, not just that something was earned", () => {
  it("is true for level_complete and false for the two that fire mid-run", () => {
    const seen: Record<string, boolean> = {};
    for (const reason of ["level_complete", "milestone", "personal_best"] as const) {
      const events: WinShareEvent[] = [];
      registerShareChipHandler((e) => events.push(e));
      winMoment(ctx(), { reason, confetti: false });
      expect(events, reason).toHaveLength(1);
      seen[reason] = events[0].runEnded;
    }
    expect(seen).toEqual({ level_complete: true, milestone: false, personal_best: false });
  });
});

describe("GameHost only offers to play again behind that flag", () => {
  const src = code("src/portal/GameHost.tsx");

  it("sets the offer from the reason AND a restart actually being in the slot", () => {
    expect(src).toContain("playAgain: event.runEnded && hasRestart()");
  });

  it("renders the button behind the flag, and nothing else behind it", () => {
    expect(src).toMatch(/\{share\.playAgain && \(\s*<Button/);
    // Exactly two readings of the flag - the gate above, and the share
    // button's variant below - so there is no second, unguarded path to the
    // same button. A third would have to justify itself here.
    expect(src.match(/share\.playAgain/g) ?? []).toHaveLength(2);
  });

  it("restarts through the shared slot rather than a second implementation", () => {
    expect(src).toContain('from "@ui/gameTools"');
    expect(src).toContain("runRestart()");
    // A game's own restart handler must not be re-invented here: nothing in
    // this file may deal a board itself.
    expect(src).not.toMatch(/newGame|setState\(.*deal/);
  });

  it("keeps the share button filled when it stands alone", () => {
    expect(src).toContain('variant={share.playAgain ? "ghost" : "primary"}');
  });

  it("paints Play again with the pair that clears the floor in BOTH themes", () => {
    // `Button`'s own primary is `--text` on `--brand-fill`, and night's
    // --brand-fill is a gradient no ink clears 4.5 across (2.53:1). This is
    // the measured pair - 5.87 market, 4.86 night - and `contrast.test.ts`
    // holds those numbers. Pinned here because the override is one line in a
    // JSX prop, which is exactly the kind of line a later tidy-up removes.
    expect(src).toContain('background: "var(--brand-strong)", color: "var(--on-brand)"');
  });
});
