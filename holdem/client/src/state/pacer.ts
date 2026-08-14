// The felt is deliberately BEHIND the server, and this is what holds it back.
//
// The engine is right and always was: `closeStreetAndAdvance` deals the flop,
// the turn and the river as three separate `StreetDealt` events, and on an
// all-in runout `emitShowdownReveals` turns over every live hand. The bug was
// entirely on this side — the socket handed the whole batch to the reducer in
// one frame, so a hand that went all-in preflop arrived as:
//
//     ev[ StreetDealt(flop) StreetDealt(turn) StreetDealt(river)
//         ShowdownReveal x2  PotAwarded  HandEnded ]
//     room{ hand: null }
//
// One React render. Five community cards appeared at once, already decided,
// and the hand was over before anybody could look at it. There is nothing to
// fix in the engine and nothing to add to the protocol: the information was
// always there, arriving too fast to be a game.
//
// So this is a QUEUE, not an animation. It splits a batch at its street
// boundaries and releases the pieces over time, holding the trailing `room`
// until the pieces are done so the snapshot cannot leap ahead of the story it
// is meant to conclude.
//
// The pacing costs nobody a decision. A batch only ever contains more than one
// street when no player can act — that is precisely the condition
// `closeStreetAndAdvance` sets `runout` on — so the long pauses happen only in
// the one situation where nothing is being waited for. During ordinary play a
// batch carries a single street and the whole delay is one beat.

import type { EngineEvent } from "@shared/engine/types";
import type { S2C } from "@shared/protocol";
import { reduceMessage } from "./store";

// THE NUMBERS BELOW WERE RAISED ON 2026-08-14, BY THE ONLY MEASUREMENT THAT
// COUNTS: the operator played hands against the bots and said it ran too fast.
// They were 900 / 700 / 1000, which was already a fix for five cards landing
// in a single frame — being no longer instantaneous is not the same as being
// readable, and only somebody sitting at the table can tell you which one you
// built. A whole run-out now takes about 5.8s rather than 3.5s.

/**
 * A street lands, and then the table gets a moment to see it.
 *
 * Long enough to read a card and say something about it, short enough that
 * four of them in a row is a run-out rather than a wait. The flop needs no
 * per-card timing here — `CardFace` staggers its own deal animation per card,
 * so the three arrive together and land one after another.
 */
const STREET_MS = 1500;

/** After the river, before anybody turns their hand over. */
const BEFORE_REVEAL_MS = 1200;

/** After the cards are face up, before the pot moves and the banner lands. */
const BEFORE_AWARD_MS = 1600;

/**
 * How long the result gets before a new hand is allowed on top of it.
 *
 * THIS IS WHAT MAKES SLOWING THE RUN-OUT SAFE, and without it "a little bit
 * slower" would have made the best moment in the game invisible.
 *
 * The server deals again `INTER_HAND_MS` after it ends a hand — measured from
 * ITS clock, which does not know this queue exists. On an ordinary hand that
 * is fine: the award lands here almost immediately and the banner gets the
 * whole pause. On an all-in it is not, because the whole run-out is paced: the
 * award now lands ~5.8s after the batch arrives, and the next `HandStarted`
 * is already waiting. The banner would appear and be wiped in the same frame.
 *
 * So the queue holds a `HandStarted` until the result has had its moment. The
 * cost is that the felt runs a second or so behind the server after a
 * run-out — the action clock is already ticking while the story finishes —
 * which is why `INTER_HAND_MS` was raised to meet this rather than leaving
 * this number to do all the work alone.
 */
const AFTER_AWARD_MS = 2600;

/**
 * Where a batch of events is allowed to be cut, and how long the cut is worth.
 *
 * Returning null means "this event does not start a new beat" — it rides with
 * whatever came before it, which is what keeps a fold, a call and a raise
 * instantaneous.
 */
function beatBefore(e: EngineEvent, isFirst: boolean): number | null {
  if (isFirst) return null;
  if (e.type === "StreetDealt") return STREET_MS;
  if (e.type === "ShowdownReveal") return BEFORE_REVEAL_MS;
  if (e.type === "PotAwarded") return BEFORE_AWARD_MS;
  return null;
}

/** One release: some events, after some delay. */
interface Beat {
  delayMs: number;
  msg: Extract<S2C, { t: "ev" }>;
}

/**
 * Cut a batch into beats.
 *
 * Consecutive reveals stay in ONE beat rather than getting a pause each: they
 * are simultaneous at a real table, and staggering them would say the second
 * player thought about it.
 */
export function planBeats(msg: Extract<S2C, { t: "ev" }>): Beat[] {
  const beats: Beat[] = [];
  let current: EngineEvent[] = [];
  let delay = 0;
  let lastType: string | null = null;

  for (const e of msg.events) {
    const isFirst = current.length === 0 && beats.length === 0;
    // A run of reveals is one beat; the pause belongs before the first of them.
    const sameRun = e.type === "ShowdownReveal" && lastType === "ShowdownReveal";
    const gap = sameRun ? null : beatBefore(e, isFirst);
    if (gap !== null && current.length > 0) {
      beats.push({ delayMs: delay, msg: { ...msg, events: current } });
      current = [];
      delay = gap;
    }
    current.push(e);
    lastType = e.type;
  }
  if (current.length > 0) beats.push({ delayMs: delay, msg: { ...msg, events: current } });
  return beats;
}

// ---------------------------------------------------------------------------
// The queue.
//
// Everything goes through here in arrival order, including messages that are
// not paced at all. That ordering is the point: a `room` snapshot delivered
// while a run-out is still being dealt would hand the reducer a view whose
// hand is already null, and the story would end mid-sentence.

const queue: { at: number; msg: S2C }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let draining = false;
/** When the most recent `PotAwarded` is scheduled to land. See AFTER_AWARD_MS. */
let lastAwardAt = 0;

function pump(): void {
  if (draining || timer !== null) return;
  const next = queue[0];
  if (!next) return;
  const wait = Math.max(0, next.at - Date.now());
  timer = setTimeout(() => {
    timer = null;
    draining = true;
    try {
      const item = queue.shift();
      if (item) reduceMessage(item.msg);
    } finally {
      draining = false;
    }
    pump();
  }, wait);
}

/**
 * Hand a server message to the store, possibly later.
 *
 * The socket calls this instead of `reduceMessage`. Messages that are not
 * paced still go through the queue rather than around it, so nothing can
 * overtake a run-out in progress.
 */
export function deliver(msg: S2C): void {
  const now = Date.now();
  const tail = queue.length ? queue[queue.length - 1].at : now;

  if (msg.t !== "ev") {
    queue.push({ at: Math.max(now, tail), msg });
    pump();
    return;
  }

  let at = Math.max(now, tail);

  // A new hand may not land on top of the result of the last one. The server
  // measures its inter-hand pause from its own clock and cannot see this
  // queue, so on a paced run-out its next deal arrives while the banner is
  // still being drawn.
  if (msg.events.some((e) => e.type === "HandStarted")) {
    at = Math.max(at, lastAwardAt + AFTER_AWARD_MS);
  }

  for (const beat of planBeats(msg)) {
    at += beat.delayMs;
    if (beat.msg.events.some((e) => e.type === "PotAwarded")) lastAwardAt = at;
    queue.push({ at, msg: beat.msg });
  }
  pump();
}

/**
 * Throw away anything still waiting.
 *
 * Called on disconnect and on leaving a room. A queued beat from the table you
 * just left would otherwise deal cards onto the next screen you open — and
 * because every beat is a real `S2C`, the reducer would believe it.
 */
export function resetPacer(): void {
  queue.length = 0;
  // Zeroed with the queue: a hold measured against a table you have left would
  // delay the first hand of the next one by up to AFTER_AWARD_MS, for a
  // banner nobody is looking at.
  lastAwardAt = 0;
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Test hook: how much is still in flight. */
export function pacerDepth(): number {
  return queue.length;
}
