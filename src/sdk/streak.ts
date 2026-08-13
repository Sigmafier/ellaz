// The streak ladder - what a run of correct answers SOUNDS like.
//
// Third policy port of the same shape as `economy.ts` (a reason in, coins out)
// and `score.ts` (a unit in, a direction out): A GAME REPORTS HOW MANY IN A ROW
// AND NOTHING ELSE. This file alone decides whether that warrants a sound, how
// far up the ladder it is, and where the ladder stops. Thirty games cannot
// invent thirty different escalations, and retuning the feel of a streak is one
// file rather than a sweep.
//
// Pure data and arithmetic - no WebAudio, no DOM - so it unit-tests in node
// like every `logic.ts` in the repo.
//
// THE THREE NUMBERS, and each is a decision rather than a default:
//
//   FIRST = 3. The first two correct answers sound like ordinary play, because
//   an escalation that fires on every success is not an escalation. Three is
//   where a run starts to feel like a run and not like a coincidence.
//
//   The ladder is PENTATONIC. Every rung is consonant with every other rung, so
//   a child who stops at four and a child who reaches nine both hear something
//   that resolved. A chromatic ladder counts upward mechanically and a diatonic
//   one has a leading tone that BEGS for the next step - which is precisely the
//   compulsion loop this platform has no business building for five-year-olds.
//   Bright and finished, never bright and unfinished.
//
//   It CAPS rather than resets. At the top the ladder simply holds. Dropping a
//   long run back to the first rung tells a child who is doing well that they
//   are suddenly a beginner again, which is the opposite of what the sound is
//   for. It costs one `Math.min`.

/** The run length at which the ladder first sounds. Below this: nothing. */
export const STREAK_FIRST = 3;

/**
 * C major pentatonic over two octaves, in semitones from the voice's own base.
 *
 * Ten rungs. Past the tenth the ladder holds at the top rather than climbing
 * into the range where a tine note stops reading as musical and starts reading
 * as a smoke alarm - the highest rung is already an octave and a fifth up.
 */
export const STREAK_LADDER: readonly number[] = [
  0, 2, 4, 7, 9, 12, 14, 16, 19, 21,
];

/**
 * Which rung a run of `streak` correct answers has reached, in semitones - or
 * `undefined` when the run is too short to have earned a sound at all.
 *
 * `undefined` rather than 0 on purpose. Zero is a real rung (the ladder's own
 * bottom note), so a caller that treated "no sound" as 0 would play the first
 * rung on every single correct answer, which is the exact failure this file
 * exists to prevent. The two answers must not be spellable the same way.
 */
export function streakStep(streak: number): number | undefined {
  if (!Number.isFinite(streak)) return undefined;
  const n = Math.floor(streak);
  if (n < STREAK_FIRST) return undefined;
  const rung = Math.min(n - STREAK_FIRST, STREAK_LADDER.length - 1);
  return STREAK_LADDER[rung];
}

/** Whether the ladder has stopped climbing - the run is longer than it has rungs. */
export function streakCapped(streak: number): boolean {
  return Math.floor(streak) - STREAK_FIRST >= STREAK_LADDER.length - 1;
}

/**
 * The praise TIER a run has reached, for anything that wants to SAY something
 * rather than play a note.
 *
 * Deliberately coarse - three tiers, not ten - because this is the half that
 * has to be translated. The ladder above carries the escalation on its own in
 * every language on earth; words are the optional layer on top, and a layer
 * with ten steps is ten strings per language that all have to sound natural to
 * a child. `undefined` below the first rung, same contract as `streakStep`.
 *
 * NOTHING PLAYS THIS YET, and that is the honest state: no verbal praise has
 * been judged, and speech in this app is supplementary by hard rule (see the
 * header of `src/sdk/speech.ts`) - a voice can be present, be selected, fire
 * `onend` on time and still emit no sound, undetectably. So a tier may only
 * ever decorate a moment the ladder has already carried.
 */
export type StreakTier = "good" | "great" | "amazing";

export function streakTier(streak: number): StreakTier | undefined {
  const n = Math.floor(streak);
  if (n < STREAK_FIRST) return undefined;
  if (n < 5) return "good";
  if (n < 8) return "great";
  return "amazing";
}
