/**
 * Lettercross - what a prize box is worth. PURE: no DOM, no React, no timers.
 *
 * THE ROUND ITSELF LIVES IN `bonusBoard.ts`. This file is the one thing every
 * round must agree on: how well it went, turned into a tier `economy.ts` can
 * price. A round reports a QUALITY in 0..1 and never a payout, the same shape
 * as a game reporting a reason and never an amount.
 *
 * IT USED TO HOLD FIVE ARCADE GAMES, and they were the wrong genre. This file
 * argued, in a comment, that "a word puzzle inside a word puzzle is not a break
 * from anything" - a real design position, and the artifact refutes it. The
 * 1993 Hebrew game this arc is chasing put FIVE bonus screens behind its boxes
 * and every one of them is a word game; the instruction strings are still in
 * its `BON.EXE`. The bonus is not a break from the game, it is a second
 * helping of it, and that is why it reads as a prize.
 *
 * The five, as the original words them:
 *
 *   30s  the same letter is missing from THREE words        100 pts
 *   20s  the same letter is missing from TWO words           40 pts
 *   ?    build a word from ALL the letters in front of you   30-100 by length
 *   ?    fill the missing letters in the word in front of you
 *   60s  build a crossword from as many letters as you can   the words' own points
 *
 * The last one is what `bonusBoard.ts` builds, and it is first because it is
 * the only one that shows the player no dictionary word at all - every letter
 * comes off their own deal, so it needs nothing this repo is not allowed to
 * put on a screen (`words.ts`, and NOTICE.md).
 */

/** The three outcomes, which are `economy.ts`'s tiers and not a payout. */
export type BonusTier = "easy" | "medium" | "hard";

/** Which arts open a round. Every prize art does; `lock` is step 4's. */
export type BonusArt = "bell" | "gem" | "star" | "leaf" | "drop";
export const BONUS_ARTS: readonly BonusArt[] = ["bell", "gem", "star", "leaf", "drop"];

/**
 * WHICH SCREEN A BOX OPENS. The symbol on the box is the promise, so it has to
 * mean the same thing every time you land on it.
 *
 * Three of the five now, and the mapping is not arbitrary: the star is the
 * rarest-feeling art and gets the round the original paid most for (100 against
 * 40), while the bell is the only art on the board exactly ONCE, so its round
 * can be played at most once a game. `boxes.ts` decides those counts, which is
 * why a test reads them rather than this file asserting them.
 *
 * ONE OPEN QUESTION, worth reading before adding to this table. BONUS's own
 * bonuses look drawn from a POOL used up once each per game rather than fixed
 * per symbol - strongly implied by the record, never proven. If that is right
 * then keying on `art` at all is wrong, and this table is the thing to delete.
 */
export type RoundKind = "crossword" | "shared2" | "shared3";
export const ROUND_OF: Readonly<Record<BonusArt, RoundKind>> = {
  star: "shared3",
  bell: "shared2",
  gem: "crossword",
  leaf: "crossword",
  drop: "crossword",
};

/**
 * HOW WELL DID THAT GO -> WHAT IT WAS WORTH. The one place every round agrees.
 *
 * THERE IS NO MISS, and that is a rule rather than a generosity. This platform
 * does not punish: losing gives nothing and never takes anything away, so the
 * worst a round can do is pay the smallest tier. A bonus that can pay ZERO is a
 * trap wearing a prize's clothes, and a player who reached that box with a real
 * word has already earned something.
 *
 * That is also how the original's all-or-nothing rule survives here without
 * becoming a punishment: an illegal word zeroes the round's SCORE, so it costs
 * the player the upside and never the prize for having arrived.
 */
export const HARD_Q = 0.84;
export const MEDIUM_Q = 0.4;

export function tierOf(quality: number): BonusTier {
  const q = Math.min(1, Math.max(0, quality));
  if (q >= HARD_Q) return "hard";
  if (q >= MEDIUM_Q) return "medium";
  return "easy";
}
