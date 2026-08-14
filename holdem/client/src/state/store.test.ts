// The message reducer. Server-authoritative means the view is whatever the
// last snapshot said — but four things ARE folded on the client (reveals, last
// action, winners, chat), and every one of them is a small state machine with
// a wrong version that looks right.

import { beforeEach, describe, expect, it } from "vitest";
import type { Card } from "@shared/engine/cards";
import type { EngineEvent } from "@shared/engine/types";
import type { S2C } from "@shared/protocol";
import { getState, reduceMessage, resetState } from "./store";

const HOLE: readonly [Card, Card] = ["As", "Kd"] as unknown as readonly [Card, Card];

const ev = (...events: EngineEvent[]): S2C =>
  ({ t: "ev", seq: 1, events }) as S2C;
const started = { type: "HandStarted", handNo: 1 } as unknown as EngineEvent;
const reveal = (seat: number, mucked = false) =>
  ({ type: "ShowdownReveal", seat, mucked, cards: mucked ? undefined : HOLE }) as unknown as EngineEvent;
const acted = (seat: number, kind: string) =>
  ({ type: "ActionTaken", seat, kind }) as unknown as EngineEvent;
const street = { type: "StreetDealt", street: "flop" } as unknown as EngineEvent;
const awarded = (...winners: number[]) =>
  ({ type: "PotAwarded", winners }) as unknown as EngineEvent;

beforeEach(() => resetState());

describe("showdown reveals", () => {
  it("records who showed and who mucked", () => {
    reduceMessage(ev(reveal(1), reveal(3, true)));
    expect(getState().reveals).toEqual({ 1: HOLE, 3: "muck" });
  });

  // The one that matters. Clearing on HandEnded instead would wipe the cards
  // in the same breath as showing them — the reveal and the end of the hand
  // arrive in the SAME batch, so nobody would ever see a showdown.
  it("survives the end of its own hand, and is cleared by the NEXT one", () => {
    reduceMessage(
      ev(reveal(1), { type: "HandEnded", handNo: 1 } as unknown as EngineEvent),
    );
    expect(getState().reveals).toEqual({ 1: HOLE });

    reduceMessage(ev(started));
    expect(getState().reveals).toEqual({});
  });

  it("clears the previous hand's reveals even when the new hand is in the same batch", () => {
    reduceMessage(ev(reveal(1)));
    reduceMessage(ev(started, acted(2, "call")));
    expect(getState().reveals).toEqual({});
    expect(getState().lastAction).toEqual({ 2: "call" });
  });
});

describe("last action badges", () => {
  it("keeps one per seat, latest wins", () => {
    reduceMessage(ev(acted(0, "call"), acted(1, "raise"), acted(0, "fold")));
    expect(getState().lastAction).toEqual({ 0: "fold", 1: "raise" });
  });

  // A badge saying "call" over a seat on the next street is a lie about what
  // just happened — the street boundary is what makes the badges mean "this
  // betting round".
  it("is wiped by a new street, within the same batch", () => {
    reduceMessage(ev(acted(0, "call"), street, acted(1, "check")));
    expect(getState().lastAction).toEqual({ 1: "check" });
  });
});

describe("winners", () => {
  it("unions across split pots rather than replacing", () => {
    reduceMessage(ev(awarded(2), awarded(2, 5)));
    expect(getState().winners.sort()).toEqual([2, 5]);
  });

  it("resets on the next hand", () => {
    reduceMessage(ev(awarded(2)));
    reduceMessage(ev(started));
    expect(getState().winners).toEqual([]);
  });
});

describe("names", () => {
  it("takes the name the server settled on, not the one that was asked for", () => {
    reduceMessage({
      t: "welcome",
      v: 2,
      playerId: "p1",
      name: { adj: "golden", noun: "fox" },
      seatIdx: -1,
      isHost: true,
      serverNow: 0,
      chipsMode: "fresh",
    } as S2C);
    expect(getState().myName).toEqual({ adj: "golden", noun: "fox" });

    reduceMessage({ t: "name", name: { adj: "wild", noun: "zebra" } } as S2C);
    expect(getState().myName).toEqual({ adj: "wild", noun: "zebra" });
  });

  it("carries seat names alongside the view, so a seat can wear its animal", () => {
    reduceMessage({
      t: "room",
      view: { seats: [] } as never,
      names: { 0: { adj: "sly", noun: "owl" } },
      seq: 4,
    } as S2C);
    expect(getState().seatNames).toEqual({ 0: { adj: "sly", noun: "owl" } });
  });
});

describe("chat", () => {
  // The window is the point: a table that emotes all night must not grow an
  // unbounded array in a phone's memory.
  it("keeps only the last twelve", () => {
    for (let i = 0; i < 40; i++) {
      reduceMessage({ t: "chat", seatIdx: 0, name: "Sly Owl", emote: "clap" } as S2C);
    }
    expect(getState().chats).toHaveLength(12);
  });

  it("gives every item a distinct key, so React does not reuse a row", () => {
    for (let i = 0; i < 5; i++) {
      reduceMessage({ t: "chat", seatIdx: i, name: "x", emote: "clap" } as S2C);
    }
    const keys = getState().chats.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ---------------------------------------------------------------------------
// The board.
//
// The operator saw SIX cards on the felt. This was an accumulator fed only by
// StreetDealt with no way back to the truth, so any lost HandStarted left the
// previous hand's cards in place for the next street to append to — and
// `resetPacer()` throws away everything queued on EVERY reconnect, which a
// backgrounded tab is enough to cause.
//
// Nothing here tested the board before, which is exactly why it shipped.

const flop = (a: number, b: number, c: number) =>
  ({ type: "StreetDealt", street: "flop", cards: [a, b, c] }) as unknown as EngineEvent;
const single = (s: string, c: number) =>
  ({ type: "StreetDealt", street: s, cards: [c] }) as unknown as EngineEvent;
const room = (board: number[] | null): S2C =>
  ({
    t: "room",
    view: { seats: [], hand: board === null ? null : { board, potTotal: 0, betTo: 0 } },
    names: {},
    seq: 1,
  }) as unknown as S2C;

/** What the felt is actually showing — the same slice Table.tsx renders. */
const felt = () => getState().handBoard.slice(0, getState().shownCount);

describe("the board on the felt", () => {
  it("is dealt one street at a time", () => {
    reduceMessage(ev(started));
    reduceMessage(ev(flop(1, 2, 3)));
    expect(felt()).toHaveLength(3);
    reduceMessage(ev(single("turn", 4)));
    expect(felt()).toHaveLength(4);
    reduceMessage(ev(single("river", 5)));
    expect(felt()).toEqual([1, 2, 3, 4, 5]);
  });

  it("outlives the hand it belongs to", () => {
    reduceMessage(ev(started));
    reduceMessage(ev(flop(1, 2, 3), single("turn", 4), single("river", 5)));
    // `hand: null` — the hand is over and the winner is being announced.
    reduceMessage(room(null));
    expect(felt()).toEqual([1, 2, 3, 4, 5]);
  });

  it("NEVER shows six cards, even when a reconnect eats the HandStarted", () => {
    // Hand one, played out to the river.
    reduceMessage(ev(started));
    reduceMessage(ev(flop(1, 2, 3), single("turn", 4), single("river", 5)));
    reduceMessage(room(null));
    expect(felt()).toHaveLength(5);

    // The socket drops. resetPacer() discards the queue, and hand two's
    // HandStarted is in it. No event ever arrives to clear the old board.
    // The reconnect's snapshot is the first thing we hear.
    reduceMessage(room([]));
    expect(felt()).toEqual([]); // healed by the snapshot, not by an event

    reduceMessage(ev(flop(6, 7, 8)));
    expect(felt()).toEqual([6, 7, 8]); // was [1,2,3,4,5,6,7,8]
    expect(felt().length).toBeLessThanOrEqual(5);
  });

  it("shows a mid-hand joiner the whole board at once", () => {
    // No pacing for somebody who sat down on the river: the story finished
    // before they arrived, and dealing it to them slowly is a lie about when.
    reduceMessage(room([1, 2, 3, 4]));
    expect(felt()).toEqual([1, 2, 3, 4]);
  });

  it("does not let a snapshot leap ahead of a run-out being dealt", () => {
    // The pacer holds the trailing snapshot until its beats are done, so this
    // is the ordering the reducer actually sees. If a `room` carrying all five
    // cards did arrive mid-run-out, the felt must still show only what has
    // been dealt — the count is the pacer's, and a snapshot may not raise it.
    reduceMessage(ev(started));
    reduceMessage(ev(flop(1, 2, 3)));
    reduceMessage(room([1, 2, 3, 4, 5]));
    expect(felt()).toEqual([1, 2, 3]);
  });

  it("keeps the winning hand's own board on the banner", () => {
    reduceMessage(ev(started));
    reduceMessage(ev(flop(1, 2, 3), single("turn", 4), single("river", 5), awarded(2)));
    expect(getState().lastPot?.board).toEqual([1, 2, 3, 4, 5]);
  });
});
