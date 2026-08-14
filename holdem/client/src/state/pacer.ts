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

/**
 * A street lands, and then the table gets a moment to see it.
 *
 * Long enough to read a card and say something about it, short enough that
 * four of them in a row is a run-out rather than a wait. The flop needs no
 * per-card timing here — `CardFace` already staggers its own deal animation by
 * 90ms a card, so the three arrive together and land one after another.
 */
const STREET_MS = 900;

/** After the river, before anybody turns their hand over. */
const BEFORE_REVEAL_MS = 700;

/** After the cards are face up, before the pot moves and the banner lands. */
const BEFORE_AWARD_MS = 1000;

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
  for (const beat of planBeats(msg)) {
    at += beat.delayMs;
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
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Test hook: how much is still in flight. */
export function pacerDepth(): number {
  return queue.length;
}
