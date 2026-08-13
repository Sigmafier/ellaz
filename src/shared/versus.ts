// Pass-and-play — two people, one device, taking turns.
//
// PURE: no DOM, no React, no storage, no clock. Everything here is a function
// from a state to a state, driven by an injectable rng, so the whole of
// "whose turn is it and who is ahead" is unit-testable without a browser.
//
// WHY THIS IS ONE MODULE AND NOT A RULE PER GAME
// The same shape it shares with `economy.ts` and `score.ts`: a game reports
// WHAT HAPPENED — a pair was taken, a line was made, the board filled up — and
// this module alone decides what that does to the turn, to the tally, and to
// who opens the next match. A game cannot invent its own turn order, cannot
// decide that losing costs something, and cannot say what a match is worth.
//
// WHAT IS DELIBERATELY ABSENT
//   - No `spend`, no subtraction, no negative anywhere. `take` and `finish` only
//     ever add, exactly like RewardsPort has no `spend()`. A losing child can
//     never watch a number go down.
//   - No text entry, anywhere, for anything. Both players are DRAWN from the
//     name pool. See the header of `sdk/names.ts`: nothing a child can type is
//     the reason this platform has no moderation problem, and a two-player mode
//     is precisely where a "what's your name?" box would have crept in.
//   - No score, no personal best, no leaderboard. See `versusWinOptions`.
import type { Locale } from "@i18n/index";
// DIRECT module path, not `@sdk/index`. The barrel pulls the whole SDK in — the
// wallet, the profile, cloud sync — where all this needs is the name pool, and
// `names.ts` itself imports only `@shared/rng` (a leaf). Same discipline the
// comment above the import in `names.ts` spells out, pointed the other way.
import { pickName, rerollName, type PlayerName } from "@sdk/names";
import type { WinMomentOptions } from "./winMoment";

/** Which side of the table. There are exactly two, and there will only ever be two. */
export type Seat = 0 | 1;

/** The other one. */
export function other(seat: Seat): Seat {
  return seat === 0 ? 1 : 0;
}

/**
 * The two colours the seats wear, and they are not decoration — they are the
 * ANSWER to "whose turn is it" for someone who cannot read.
 *
 * These two exactly: tictactoe has drawn X in `--brand-2` and O in `--teal`
 * since it shipped, so a child sees the same two colours on the banner and on
 * the board without anything having to say they are the same thing. Both tokens
 * are defined in the light and the dark theme.
 */
export const SEAT_COLORS: readonly [string, string] = ["var(--brand-2)", "var(--teal)"];

/**
 * How much of the seat's colour fills its card, mixed into the surface it sits
 * on — NOT the raw colour. A card filled with the full accent needs its own ink
 * chosen for it, and both accents are theme-varying pastels, so a fixed ink is
 * readable in one theme and not the other. A tint of the SURFACE keeps the
 * theme's own `--text` correct by construction and still reads across a room.
 *
 * MEASURED, both themes, both seats, `--text` on the tinted card:
 *
 *   night  --brand-2 -> #4b4b81   7.44:1
 *   night  --teal    -> #145c6f   6.99:1
 *   market --brand-2 -> #ffd8e1  12.89:1
 *   market --teal    -> #aee5df  12.02:1
 *
 * The floor is 4.5:1 and the worst cell is 6.99, so there is real room — but
 * the room shrinks as this number rises (at 40% the worst cell is 6.04, and
 * `--text-dim` is already under the floor at 34%, which is why the active card
 * never uses it). `versus.test.ts` pins the band this was measured inside.
 */
export const SEAT_TINT_PERCENT = 34;

/** The active seat's card fill: its colour, mixed into whatever it sits on. */
export function seatTint(color: string): string {
  return `color-mix(in srgb, ${color} ${SEAT_TINT_PERCENT}%, var(--surface))`;
}

export interface VersusPlayer {
  /** Two word ids, drawn from the pool. Rendered per locale at display time. */
  name: PlayerName;
  color: string;
}

export interface VersusState {
  readonly players: readonly [VersusPlayer, VersusPlayer];
  /** Whose turn it is right now. */
  readonly turn: Seat;
  /**
   * Points in the CURRENT match — memory's pairs. A game with nothing to count
   * inside a match (tictactoe: you make a line or you do not) leaves it at zero.
   */
  readonly taken: readonly [number, number];
  /** Matches won across this sitting. */
  readonly wins: readonly [number, number];
  /** Matches that ended level. Kept apart from `wins` so a draw is not half a win. */
  readonly draws: number;
  /** Who opens the NEXT match. See `finish`. */
  readonly starts: Seat;
  /** Matches finished this sitting. */
  readonly matches: number;
}

/**
 * A fresh pair of players.
 *
 * The second name is drawn with `rerollName`, which draws from the pool with
 * the first name REMOVED — so the two are guaranteed different rather than
 * probably different. Drawing twice and hoping is a 1-in-320 collision that
 * would never show up in manual testing and would put two identical animals on
 * the banner with no way to tell whose turn it is, which is the one thing this
 * screen exists to say.
 */
export function newVersus(rng: () => number = Math.random): VersusState {
  const first = pickName(rng);
  return {
    players: [
      { name: first, color: SEAT_COLORS[0] },
      { name: rerollName(first, rng), color: SEAT_COLORS[1] },
    ],
    turn: 0,
    taken: [0, 0],
    wins: [0, 0],
    draws: 0,
    starts: 0,
    matches: 0,
  };
}

/** Hand the turn over. */
export function pass(v: VersusState): VersusState {
  return { ...v, turn: other(v.turn) };
}

/** Credit a seat inside the current match. Only ever adds. */
export function take(v: VersusState, seat: Seat, n = 1): VersusState {
  const taken: [number, number] = [v.taken[0], v.taken[1]];
  taken[seat] += Math.max(0, n);
  return { ...v, taken };
}

/** Who is ahead in the current match. Equal piles — including 0 and 0 — is a draw. */
export function leader(v: VersusState): Seat | "draw" {
  if (v.taken[0] === v.taken[1]) return "draw";
  return v.taken[0] > v.taken[1] ? 0 : 1;
}

/**
 * Record how a match ended.
 *
 * THE ONLY CONSOLATION IN THIS APP, AND IT NEEDS NO WORDS: the loser opens the
 * next match. A five-year-old understands "you go first" instantly, it is what
 * every family already does at a kitchen table, and it is the answer to "what
 * does the loser get" that does not involve either pity or a prize. Nothing is
 * subtracted from anybody, ever — there is no code path here that can.
 *
 * A DRAW alternates instead, so a level match cannot pin the first move to one
 * seat forever.
 *
 * The piles are left standing. `nextMatch` clears them, so the final board can
 * sit on screen and be looked at before anything is dealt.
 */
export function finish(v: VersusState, result: Seat | "draw"): VersusState {
  const wins: [number, number] = [v.wins[0], v.wins[1]];
  if (result !== "draw") wins[result] += 1;
  return {
    ...v,
    wins,
    draws: result === "draw" ? v.draws + 1 : v.draws,
    matches: v.matches + 1,
    starts: result === "draw" ? other(v.starts) : other(result),
  };
}

/** Deal again: piles cleared, the turn handed to whoever `finish` chose. */
export function nextMatch(v: VersusState): VersusState {
  return { ...v, taken: [0, 0], turn: v.starts };
}

/**
 * The reason a finished match reports. One constant, so no game can invent a
 * different one and no game can pass a tier that would change the payout.
 */
export const VERSUS_REASON = "versus_complete" as const;

/**
 * What a finished match tells `winMoment`, and it is deliberately tiny.
 *
 * NO `score`, and that is an argument rather than an omission. `ctx.score` is a
 * fact about the PROFILE — it is per-game, per-board, and a new personal best is
 * PUBLISHED to a real leaderboard by `createContext`. A versus result is a fact
 * about two people, one of whom is not the profile, and it is produced by a mode
 * where one child can tap both sides. Recording it would put a farmed number
 * under somebody's name on a board other children can see, which is the coin
 * problem moved into the one currency the coin argument does not cover.
 *
 * NO `tier`, because `economy.ts` ignores it for this reason and a tier here
 * would read as if it did not.
 *
 * So the tally two players build up over a sitting lives in memory for exactly
 * as long as they are sitting there. That is the right lifetime for it: it is
 * a fact about an afternoon, not about a child.
 */
export function versusWinOptions(
  at?: { x: number; y: number },
  /** An analytics label only. `RewardGrant.level` never affects a payout. */
  level = "versus",
): WinMomentOptions {
  return { reason: VERSUS_REASON, at, level, confetti: true };
}

/**
 * The handful of words this mode needs.
 *
 * A locale RECORD keyed on `Locale` (= `PageLocale`), which is the same shape
 * every game's own strings use — so promoting a language reds this block by
 * name instead of leaving two-player mode speaking English inside a page that
 * is not.
 *
 * They live HERE rather than in the eleven chrome dictionaries on purpose.
 * `dict/he.ts` and `dict/en.ts` are STATIC shell chunks, so a key added there is
 * downloaded by every child on their first visit — before they have chosen a
 * game, let alone invited a sibling. These five strings belong to two games, and
 * `src/shared/` is a `page-*` chunk, so here they cost a first visit nothing.
 *
 * Note what is NOT here: any word for "your turn" that a game depends on. The
 * turn is said in colour and size; these strings are for the buttons an adult
 * reads and for the screen-reader labels.
 */
export interface VersusWords {
  /** The button that starts a game with someone else. */
  two: string;
  /** The button that goes back to playing alone. */
  one: string;
  /** The stat-row label for how many matches this sitting has finished. */
  matches: string;
  tie: string;
  turnOf(name: string): string;
  wonBy(name: string): string;
}

export const VERSUS_WORDS: Record<Locale, VersusWords> = {
  he: {
    two: "שני שחקנים",
    one: "שחקן אחד",
    matches: "משחקים",
    tie: "תיקו",
    turnOf: (name) => `התור של ${name}`,
    wonBy: (name) => `${name} ניצח!`,
  },
  en: {
    two: "Two players",
    one: "One player",
    matches: "Matches",
    tie: "Draw",
    turnOf: (name) => `${name}'s turn`,
    wonBy: (name) => `${name} wins!`,
  },
  es: {
    two: "Dos jugadores",
    one: "Un jugador",
    matches: "Partidas",
    tie: "Empate",
    turnOf: (name) => `Turno de ${name}`,
    wonBy: (name) => `¡Gana ${name}!`,
  },
};

/**
 * The words for a locale, never `undefined`.
 *
 * `ctx.locale` is TYPED as a page locale, and at runtime it can be one of the
 * eleven the interface speaks — the same gap `textFor` exists to close for a
 * game's own strings. Reading the record directly would give `undefined` and
 * then throw on `.matches` inside a render, which is a white screen for a
 * language the app is allowed to be in. English is the fallback for the same
 * reason it is the `x-default`.
 */
export function versusWords(locale: string): VersusWords {
  return VERSUS_WORDS[locale as Locale] ?? VERSUS_WORDS.en;
}
