import { useMemo, useState } from "react";
import { haptic } from "@juice/index";
import { tierOf, type BonusTier } from "./bonus";
import { BARE_BUTTON, CHOICE_ROW, RoundShell, Tile, useNoPuzzleGuard, useRoundClock, type RoundText } from "./roundShell";
import { CHOICES, SHARED_MS, makeShared, sharedQuality } from "./sharedLetter";

/**
 * "The same letter is missing from these words" - two of BONUS's five screens.
 *
 *   20s  the identical letter, missing in the TWO words before you    40 pts
 *   30s  the identical letter, missing in the THREE words before you  100 pts
 *
 * ONE COMPONENT, TWO ROUNDS. The original words them as two separate bonuses
 * and they differ in exactly two numbers, so `count` is a prop: the clock comes
 * from `SHARED_MS` and the payout from `sharedQuality`, both of which live in
 * `sharedLetter.ts`. A second copy of this file with 3 where 2 is would be two
 * places to fix the next thing either of them gets wrong.
 *
 * THE ROUND STILL DECIDES NOTHING. It reduces to a quality in 0..1 and hands it
 * to `onStop`; `tierOf` turns that into a tier and `Lettercross.tsx` hands the
 * tier to `winMoment`. Same shape as a game reporting a reason and never an
 * amount.
 *
 * A WRONG LETTER COSTS NOTHING BUT TIME. Kids games here are gentle: the letter
 * dims and the clock keeps running, which is pressure enough. There is no lives
 * counter and no way to end the round early on a mistake.
 *
 * IT SHOWS THE ANSWER WHEN THE CLOCK WINS. BONUS allowed no appeal inside a
 * bonus, which is about arguing rather than about learning - a round that ends
 * with the blanks still blank teaches nothing, and this is a children's game.
 */
export function SharedLetterRound({ count, glyph, t, onStop, playTap }: {
  count: 2 | 3;
  glyph: React.ReactNode;
  t: RoundText;
  onStop: (tier: BonusTier) => void;
  playTap: () => void;
}) {
  const puzzle = useMemo(() => makeShared(count), [count]);
  const clock = useRoundClock(
    SHARED_MS[count], (won) => onStop(tierOf(sharedQuality(count, won))), playTap);
  useNoPuzzleGuard(clock, puzzle);
  const [wrong, setWrong] = useState<readonly string[]>([]);

  const guess = (c: string) => {
    if (clock.phase !== "playing" || !puzzle || clock.over()) return;
    playTap();
    if (c === puzzle.answer) { clock.finish(true); return; }
    if (!wrong.includes(c)) setWrong((xs) => [...xs, c]);
    haptic.fail();
  };

  // The blanks fill in once the round is over, whichever way it went - the
  // answer is the thing worth carrying out of a round you lost.
  const reveal = clock.phase === "done";
  const shown = (pattern: string) =>
    reveal && puzzle ? pattern.replace("_", puzzle.answer) : pattern;

  return (
    <RoundShell glyph={glyph} t={t} clock={clock} playTap={playTap}>
      {puzzle && (
        <>
          {/* `dir="ltr"` because the words are English whatever the app is
              speaking, and an unpinned line mirrors in the Hebrew app - the
              blank would land at the wrong end of the word.
              See .claude/rules/rtl-spatial-grid-dir-ltr.md */}
          <div dir="ltr" style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            {puzzle.patterns.map((pattern, i) => (
              <div key={i} aria-label={shown(pattern)} style={{ display: "flex", gap: 4 }}>
                {[...shown(pattern)].map((ch, k) => (
                  <Tile key={k} tone={ch === "_" ? "gap" : reveal && pattern[k] === "_" ? "filled" : "plain"}>
                    {ch === "_" ? "" : ch}
                  </Tile>
                ))}
              </div>
            ))}
          </div>

          {clock.phase === "playing" && (
            <div style={CHOICE_ROW}>
              {puzzle.choices.map((c) => {
                const no = wrong.includes(c);
                return (
                  <button key={c} type="button" onClick={() => guess(c)} disabled={no}
                    aria-label={c} style={{ ...BARE_BUTTON, cursor: no ? "default" : "pointer" }}>
                    <Tile tone={no ? "spent" : "plain"} size={44}>{c.toUpperCase()}</Tile>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </RoundShell>
  );
}

/** Kept beside the component so a test can pin the row size it renders. */
export const OFFERED = CHOICES;
