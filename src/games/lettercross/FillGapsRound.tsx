import { useMemo, useState, type ReactNode } from "react";
import { haptic } from "@juice/index";
import { tierOf, type BonusTier } from "./bonus";
import { isWord } from "./patterns";
import { BARE_BUTTON, CHOICE_ROW, RoundShell, Tile, useNoPuzzleGuard, useRoundClock, type RoundText } from "./roundShell";
import { FILL_MS, fillQuality, makeFill } from "./fillGaps";

/**
 * "Fill the missing letters in the word in front of you" - the fourth of
 * BONUS's five screens. 20s, two gaps, one word.
 *
 * THE GAPS FILL LEFT TO RIGHT and a filled gap can be tapped back out, which is
 * the whole input model. There is no submit button: the word is checked the
 * moment the last gap takes a letter, because a five-year-old who has just
 * spelled something correctly should not then have to find a button.
 *
 * A WRONG PAIR COSTS NOTHING BUT TIME. The letters clear, the clock keeps
 * running, and nothing is taken away - the same gentleness `SharedLetterRound`
 * has, for the same reason. Nor are the letters spent: a letter that was wrong
 * in the first gap may be right in the second, so dimming it would lie.
 *
 * IT IS CHECKED AGAINST THE DICTIONARY AND NOT AGAINST THE ANSWER, even though
 * `fillGaps.ts` guarantees those are the same set. Asking the dictionary is the
 * question the player thinks they are answering - "is that a word?" - and if the
 * uniqueness guarantee ever weakened, this side would keep being fair while a
 * `=== puzzle.word` would quietly start refusing real words.
 *
 * THE ROUND DECIDES NOTHING. It reduces to a quality and hands it to `onStop`.
 */
export function FillGapsRound({ glyph, t, onStop, playTap }: {
  glyph: ReactNode;
  t: RoundText;
  onStop: (tier: BonusTier) => void;
  playTap: () => void;
}) {
  const puzzle = useMemo(() => makeFill(), []);
  const clock = useRoundClock(FILL_MS, (won) => onStop(tierOf(fillQuality(won))), playTap);
  useNoPuzzleGuard(clock, puzzle);

  /** One entry per gap, in the gaps' own order. `null` is still empty. */
  const [put, setPut] = useState<readonly (string | null)[]>([]);

  const gaps = puzzle?.gaps ?? [];
  const filledWith = (chosen: readonly (string | null)[]) =>
    puzzle ? [...puzzle.pattern].map((c, i) => {
      const k = gaps.indexOf(i);
      return k < 0 ? c : chosen[k] ?? "_";
    }).join("") : "";

  const tap = (c: string) => {
    if (clock.phase !== "playing" || !puzzle || clock.over()) return;
    const next = [...put];
    const slot = gaps.findIndex((_, k) => !next[k]);
    if (slot < 0) return;
    next[slot] = c;
    playTap();

    if (next.filter(Boolean).length < gaps.length) { setPut(next); return; }

    const built = filledWith(next);
    if (isWord(built)) { setPut(next); clock.finish(true); return; }
    // Wrong: the letters go back rather than staying to be picked over. Keeping
    // them would need a second gesture to clear before the next try, and the
    // thing this round is short of is time.
    setPut([]);
    haptic.fail();
  };

  const pull = (k: number) => {
    if (clock.phase !== "playing" || clock.over() || !put[k]) return;
    playTap();
    setPut((xs) => xs.map((c, i) => (i === k ? null : c)));
  };

  // The word fills in once the round is over, whichever way it went - the answer
  // is the thing worth carrying out of a round you lost.
  const reveal = clock.phase === "done";
  const shown = reveal && puzzle ? puzzle.word : filledWith(put);

  return (
    <RoundShell glyph={glyph} t={t} clock={clock} playTap={playTap}>
      {puzzle && (
        <>
          {/* `dir="ltr"`: the word is English whatever the app is speaking, and
              an unpinned line mirrors in the Hebrew app - the gaps would land at
              the wrong end. See .claude/rules/rtl-spatial-grid-dir-ltr.md */}
          <div dir="ltr" aria-label={shown} style={{ display: "flex", gap: 4 }}>
            {[...shown].map((ch, i) => {
              const k = gaps.indexOf(i);
              const mine = k >= 0;
              const tone = ch === "_" ? "gap" : mine ? "filled" : "plain";
              if (!mine || ch === "_" || reveal) {
                return <Tile key={i} tone={tone}>{ch === "_" ? "" : ch}</Tile>;
              }
              return (
                <button key={i} type="button" onClick={() => pull(k)}
                  aria-label={`${ch} placed`}
                  style={{ ...BARE_BUTTON, cursor: "pointer" }}>
                  <Tile tone={tone}>{ch}</Tile>
                </button>
              );
            })}
          </div>

          {clock.phase === "playing" && (
            <div style={CHOICE_ROW}>
              {puzzle.choices.map((c) => (
                <button key={c} type="button" onClick={() => tap(c)} aria-label={c}
                  style={{ ...BARE_BUTTON, cursor: "pointer" }}>
                  <Tile size={44}>{c.toUpperCase()}</Tile>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </RoundShell>
  );
}
