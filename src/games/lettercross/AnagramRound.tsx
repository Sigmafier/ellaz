import { useMemo, useState, type ReactNode } from "react";
import { haptic } from "@juice/index";
import { tierOf, type BonusTier } from "./bonus";
import { ANAGRAM_MS, anagramQuality, isAnswer, makeAnagram } from "./anagram";
import { EDGE, INK, RoundShell, Tile, useNoPuzzleGuard, useRoundClock, type RoundText } from "./roundShell";

/**
 * "Build a word from ALL the letters in front of you" - the fifth and last of
 * BONUS's five screens. 30s, four to six loose letters, 30-100 points by length.
 *
 * TAP A LETTER TO LAY IT DOWN, TAP A LAID LETTER TO TAKE IT BACK. No dragging,
 * for the platform's own reason: a five-year-old on a phone, and anyone on
 * assistive input, cannot reliably hold a sustained pointer gesture, so a bonus
 * round that needed one would be a prize some players cannot open.
 *
 * TILES ARE TAKEN BY POSITION, NEVER BY LETTER. `lake` has one of each and
 * `puppy` does not, so identity has to be the SLOT the tile came from - keying
 * on the character would let one `p` be spent twice while the other sat there.
 *
 * A WRONG WORD POPS THE LAST TILE rather than clearing the line. The player has
 * usually got most of it right and is one letter out; sweeping the whole line
 * would make them lay every tile again, and the thing this round is short of is
 * time. Nothing is taken away and the clock simply keeps running.
 *
 * ANY REAL WORD USING EVERY TILE WINS - `anagram.ts` says why at length: 133 of
 * the 252 words this round can draw share their letters with another word, so
 * accepting only the one we scrambled would refuse a player who built `stale`
 * out of `least`. The reveal still shows OUR word, because a word on a screen
 * comes from `puzzleWords.ts` and never from the dictionary.
 *
 * THE ROUND DECIDES NOTHING. It reduces to a quality and hands it to `onStop`.
 */
/** The one thing this round says that the other four do not. */
export type AnagramText = RoundText & { readonly clear: string };

export function AnagramRound({ glyph, t, onStop, playTap }: {
  glyph: ReactNode;
  t: AnagramText;
  onStop: (tier: BonusTier) => void;
  playTap: () => void;
}) {
  const puzzle = useMemo(() => makeAnagram(), []);
  const letters = puzzle?.letters ?? [];
  const clock = useRoundClock(
    ANAGRAM_MS, (won) => onStop(tierOf(anagramQuality(letters.length, won))), playTap);
  useNoPuzzleGuard(clock, puzzle);

  /** Which tiles have been laid down, by their position in `letters`. */
  const [laid, setLaid] = useState<readonly number[]>([]);
  const built = laid.map((i) => letters[i]).join("");

  const lay = (i: number) => {
    if (clock.phase !== "playing" || !puzzle || clock.over() || laid.includes(i)) return;
    playTap();
    const next = [...laid, i];
    if (next.length < letters.length) { setLaid(next); return; }

    const word = next.map((k) => letters[k]).join("");
    if (isAnswer(letters, word)) { setLaid(next); clock.finish(true); return; }
    setLaid(next.slice(0, -1));
    haptic.fail();
  };

  const take = (at: number) => {
    if (clock.phase !== "playing" || clock.over()) return;
    playTap();
    setLaid((xs) => xs.filter((_, k) => k !== at));
  };

  const reveal = clock.phase === "done";
  const shown = reveal && puzzle ? [...puzzle.word] : [...built];
  const blanks = Math.max(0, letters.length - shown.length);

  return (
    <RoundShell glyph={glyph} t={t} clock={clock} playTap={playTap}>
      {puzzle && (
        <>
          {/* The word being built. `dir="ltr"` for the reason every round here
              pins it: the letters are English whatever the app is speaking.
              See .claude/rules/rtl-spatial-grid-dir-ltr.md */}
          <div dir="ltr" aria-label={reveal ? puzzle.word : built || "empty"}
            style={{ display: "flex", gap: 4, minHeight: 44 }}>
            {shown.map((ch, k) => (
              reveal ? <Tile key={k} tone="filled">{ch}</Tile> : (
                <button key={k} type="button" onClick={() => take(k)} aria-label={`${ch} placed`}
                  style={{ border: 0, background: "none", padding: 0, cursor: "pointer" }}>
                  <Tile tone="filled">{ch}</Tile>
                </button>
              )
            ))}
            {Array.from({ length: blanks }, (_, k) => <Tile key={`b${k}`} tone="gap" />)}
          </div>

          {clock.phase === "playing" && (
            <div dir="ltr" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, maxWidth: 300 }}>
              {letters.map((c, i) => {
                const spent = laid.includes(i);
                return (
                  <button key={i} type="button" onClick={() => lay(i)} disabled={spent}
                    aria-label={`${c} tile`} style={{
                      border: 0, background: "none", padding: 0,
                      cursor: spent ? "default" : "pointer",
                    }}>
                    <Tile tone={spent ? "spent" : "plain"} size={44}>{c.toUpperCase()}</Tile>
                  </button>
                );
              })}
            </div>
          )}

          {clock.phase === "playing" && laid.length > 0 && (
            <button type="button" onClick={() => { playTap(); setLaid([]); }} aria-label={t.clear}
              style={{
                minHeight: 34, padding: "0 14px", borderRadius: 10,
                border: `2px solid ${EDGE}`, background: "transparent", color: INK,
                fontSize: 14, fontWeight: 800, cursor: "pointer",
              }}>{t.clear}</button>
          )}
        </>
      )}
    </RoundShell>
  );
}
