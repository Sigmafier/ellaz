// How much time the acting seat has left, on the SERVER's clock.
//
// Extracted out of TimerBar so it can be tested without a browser. The
// arithmetic is four terms long and every one of them matters, which is
// exactly the shape that reads as obviously correct and is worth pinning.

import type { TimerState } from "./store";

/**
 * Milliseconds remaining, never negative.
 *
 * The deadline is an epoch stamp from the SERVER, so it cannot be compared
 * against `Date.now()` — a phone whose clock is a minute fast would read a
 * 25-second timer as already expired, and one a minute slow would show a
 * timer that never ends. What a phone CAN be trusted with is counting
 * elapsed time, so the reference is the server's own `serverNow` advanced by
 * however long the message has been sitting here:
 *
 *     now = serverNow + (Date.now() - receivedAt)
 *
 * Both `Date.now()` calls are on the same clock, so the offset cancels.
 *
 * `now` is a parameter rather than read inside, so a test can drive it.
 */
export function msLeft(timer: TimerState | null, now: number = Date.now()): number {
  if (!timer) return 0;
  const serverTime = timer.serverNow + (now - timer.receivedAt);
  return Math.max(0, timer.deadlineEpochMs - serverTime);
}

/**
 * The full length of this timer, for the shrinking bar's denominator.
 *
 * A time-bank timer is longer than a normal one, and using the plain action
 * time for it would make the bar start past full and clamp — the countdown
 * would appear frozen for the first few seconds of the extension a player just
 * spent their one time bank on.
 */
export function totalMs(
  timer: TimerState | null,
  actionTimeMs: number,
  timeBankMs: number,
): number {
  return actionTimeMs + (timer?.timeBank ? timeBankMs : 0);
}
