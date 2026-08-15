import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineEvent } from "@shared/engine/types";
import type { S2C } from "@shared/protocol";
import { deliver, pacerDepth, planBeats, resetPacer } from "./pacer";
import { getState, resetState } from "./store";

/**
 * A batch, under a command number.
 *
 * `seq` is not decoration and these tests may not share one: `deliver` refuses
 * a batch whose number it has already accepted, which is what makes a second
 * socket incapable of dealing the same flop twice. Two batches in one test are
 * two commands and must say so.
 */
const ev = (events: EngineEvent[], seq = 1): Extract<S2C, { t: "ev" }> => ({ t: "ev", seq, events });

const street = (s: "flop" | "turn" | "river", cards: number[]): EngineEvent =>
  ({ type: "StreetDealt", street: s, cards }) as EngineEvent;
const reveal = (seat: number): EngineEvent =>
  ({ type: "ShowdownReveal", seat, cards: [0, 1], mucked: false }) as EngineEvent;
const action = (seat: number): EngineEvent =>
  ({ type: "ActionTaken", seat, kind: "call", to: 2, allIn: false, actionSeq: 1 }) as EngineEvent;

describe("planBeats", () => {
  it("lets the actions land, then deals the flop a beat later", () => {
    // Ordinary play: the calls resolve immediately and the dealer takes a
    // moment before the flop, which is the whole "one at a time" ask. The
    // acting player is not kept waiting by this — the server's action clock
    // is authoritative and this costs under a second of a thirty-second one.
    const beats = planBeats(ev([action(0), action(1), street("flop", [1, 2, 3])]));
    expect(beats).toHaveLength(2);
    expect(beats[0].msg.events.map((e) => e.type)).toEqual(["ActionTaken", "ActionTaken"]);
    expect(beats[0].delayMs).toBe(0);
    expect(beats[1].msg.events.map((e) => e.type)).toEqual(["StreetDealt"]);
    expect(beats[1].delayMs).toBeGreaterThan(0);
  });

  it("deals a run-out one street at a time", () => {
    // The exact batch an all-in preflop produces. Before the pacer this was a
    // single render: five cards and a result, simultaneously.
    const beats = planBeats(
      ev([
        street("flop", [1, 2, 3]),
        street("turn", [4]),
        street("river", [5]),
        reveal(0),
        reveal(1),
        { type: "PotAwarded", potIndex: 0, amount: 200, winners: [0], shares: { 0: 200 } } as EngineEvent,
        { type: "HandEnded", handNo: 1, stacks: {} } as EngineEvent,
      ]),
    );

    // flop | turn | river | both reveals | award+ended
    expect(beats).toHaveLength(5);
    expect(beats.map((b) => b.msg.events.map((e) => e.type))).toEqual([
      ["StreetDealt"],
      ["StreetDealt"],
      ["StreetDealt"],
      ["ShowdownReveal", "ShowdownReveal"],
      ["PotAwarded", "HandEnded"],
    ]);
    // Every beat after the first waits.
    expect(beats[0].delayMs).toBe(0);
    for (const b of beats.slice(1)) expect(b.delayMs).toBeGreaterThan(0);
  });

  it("shows both hands at once — a run of reveals is a single beat", () => {
    // Staggering these would say the second player thought about it. They are
    // simultaneous at a real table.
    const beats = planBeats(ev([reveal(0), reveal(1), reveal(2)]));
    expect(beats).toHaveLength(1);
    expect(beats[0].msg.events).toHaveLength(3);
  });

  it("never drops or reorders an event", () => {
    const events = [
      action(0),
      street("flop", [1, 2, 3]),
      action(1),
      street("turn", [4]),
      reveal(0),
      { type: "HandEnded", handNo: 2, stacks: {} } as EngineEvent,
    ];
    const flat = planBeats(ev(events)).flatMap((b) => b.msg.events);
    expect(flat).toEqual(events);
  });

  it("keeps the batch's own fields on every beat", () => {
    // Each beat is a real S2C handed to the reducer, so anything the reducer
    // reads off the envelope has to survive the split.
    const beats = planBeats(ev([street("flop", [1, 2, 3]), street("turn", [4])]));
    for (const b of beats) expect(b.msg.seq).toBe(1);
  });

  it("does not pause before the first event even when it is a street", () => {
    // A batch that OPENS on a street is the common case — one street, no wait.
    const beats = planBeats(ev([street("river", [5])]));
    expect(beats).toHaveLength(1);
    expect(beats[0].delayMs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The hold after a result.
//
// The server deals again on ITS clock and cannot see this queue. Slowing the
// run-out without this would have made the winner banner appear and be wiped
// in the same frame — the operator asked for "a little bit slower" and the
// naive version of that makes the best moment in the game invisible.

const awarded = (): EngineEvent =>
  ({ type: "PotAwarded", potIndex: 0, amount: 40, winners: [1], shares: { 1: 40 } }) as EngineEvent;
const startHand = (handNo: number): EngineEvent =>
  ({ type: "HandStarted", handNo, buttonSeat: 0, smallBlindSeat: 0, sbPosted: true,
     bigBlindSeat: 1, dealtSeats: [0, 1], stacks: {} }) as EngineEvent;

describe("the queue holds a new hand off the last result", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPacer();
    resetState();
  });
  afterEach(() => {
    resetPacer();
    vi.useRealTimers();
  });

  it("does not let a HandStarted land on top of the banner", () => {
    deliver(ev([awarded()]));
    vi.advanceTimersByTime(50);
    expect(getState().winners).toEqual([1]);

    // The server's pause is over and it has dealt again — a second command.
    deliver(ev([startHand(2)], 2));

    // Half a second later the banner must still be up.
    vi.advanceTimersByTime(500);
    expect(getState().winners).toEqual([1]);
    expect(pacerDepth()).toBeGreaterThan(0);

    // And it must arrive on its own — held, not dropped.
    vi.advanceTimersByTime(5_000);
    expect(getState().winners).toEqual([]);
    expect(pacerDepth()).toBe(0);
  });

  it("does not hold a hand that follows no result at all", () => {
    // The first hand of a session, and every hand after a fold-out that
    // awarded before this client connected. Nothing to protect, no delay.
    deliver(ev([startHand(1)]));
    vi.advanceTimersByTime(50);
    expect(pacerDepth()).toBe(0);
  });

  // -------------------------------------------------------------------------
  // The same command, twice.
  //
  // Not hypothetical: measured on the live table, forty visibilitychange
  // events produced forty-one sockets and TWENTY-TWO open at once, every one
  // of them delivering every broadcast into this one queue. `StreetDealt`
  // appends, so the felt held the right three cards, twice, and then the right
  // five cards, twice.
  //
  // The cause is fixed in net/socket.ts. This is the class: a duplicate is
  // refused here no matter how many streams exist.

  it("refuses a command it has already accepted", () => {
    deliver(ev([street("flop", [1, 2, 3])], 7));
    vi.advanceTimersByTime(50);
    expect(getState().handBoard).toEqual([1, 2, 3]);

    // The second socket's copy of the same command.
    deliver(ev([street("flop", [1, 2, 3])], 7));
    vi.advanceTimersByTime(2_000);
    expect(getState().handBoard).toEqual([1, 2, 3]);
    expect(getState().shownCount).toBe(3);
  });

  it("still accepts the NEXT command after a duplicate", () => {
    // The refusal must not poison the stream — a dropped duplicate is not a
    // reason to stop believing the server.
    deliver(ev([street("flop", [1, 2, 3])], 7));
    deliver(ev([street("flop", [1, 2, 3])], 7));
    deliver(ev([street("turn", [4])], 8));
    vi.advanceTimersByTime(4_000);
    expect(getState().handBoard).toEqual([1, 2, 3, 4]);
  });

  it("refuses a stale snapshot without refusing a fresh one", () => {
    const room = (seq: number, board: number[]): S2C =>
      ({
        t: "room",
        seq,
        names: {},
        view: {
          phase: "hand",
          seats: [],
          config: {},
          buttonSeat: 0,
          hand: { handNo: 1, board, potTotal: 0, street: "flop", toAct: -1, betTo: 0 },
        },
      }) as unknown as S2C;

    deliver(room(5, [1, 2, 3]));
    vi.advanceTimersByTime(50);
    expect(getState().handBoard).toEqual([1, 2, 3]);

    // A late frame from a socket on its way out, carrying an OLD number.
    deliver(room(4, [9, 9, 9]));
    vi.advanceTimersByTime(50);
    expect(getState().handBoard).toEqual([1, 2, 3]);

    deliver(room(6, [1, 2, 3, 4]));
    vi.advanceTimersByTime(50);
    expect(getState().handBoard).toEqual([1, 2, 3, 4]);
  });

  it("forgets the seen commands when the table is left", () => {
    // resetPacer clears the store too, so a snapshot refused as "already seen"
    // against a store that no longer holds it is a table with nothing on it.
    deliver(ev([street("flop", [1, 2, 3])], 7));
    vi.advanceTimersByTime(50);
    resetPacer();
    resetState();

    deliver(ev([street("flop", [5, 6, 7])], 7));
    vi.advanceTimersByTime(50);
    expect(getState().handBoard).toEqual([5, 6, 7]);
  });

  it("forgets the hold when the table is left", () => {
    deliver(ev([awarded()]));
    vi.advanceTimersByTime(50);
    resetPacer();
    resetState();

    // A new table. Its first hand must not wait out a banner from the old one.
    deliver(ev([startHand(1)]));
    vi.advanceTimersByTime(50);
    expect(pacerDepth()).toBe(0);
  });
});
