import { cards } from "@shared/engine/cards";
import type { EngineEvent } from "@shared/engine/types";
import type { PublicTableView } from "@shared/engine/view";
import type { S2C } from "@shared/protocol";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type ClientState,
  initialState,
  isMyTurn,
  msLeft,
  reduce,
  seatLabel,
} from "./state";

afterEach(() => vi.useRealTimers());

const welcome: S2C = {
  t: "welcome",
  v: 2,
  playerId: "p1",
  name: { adj: "swift", noun: "tiger" },
  seatIdx: 0,
  isHost: true,
  serverNow: 1_000_000,
  chipsMode: "fresh",
};

function view(over: Partial<PublicTableView> = {}): PublicTableView {
  return {
    code: "AB12C",
    config: {
      maxSeats: 6,
      sb: 1,
      bb: 2,
      startingStack: 200,
      chipsMode: "fresh",
      actionTimeMs: 20000,
      timeBankMs: 15000,
      minBuyIn: 40,
      maxBuyIn: 400,
    },
    phase: "hand",
    seats: [],
    buttonSeat: 0,
    smallBlindSeat: 0,
    bigBlindSeat: 1,
    hand: null,
    ...over,
  };
}

const room = (over: Partial<PublicTableView> = {}, seq = 1): S2C => ({
  t: "room",
  view: view(over),
  names: { 0: { adj: "swift", noun: "tiger" }, 1: { adj: "lucky", noun: "fox" } },
  seq,
});

const ev = (events: EngineEvent[], seq: number): S2C => ({ t: "ev", seq, events });

function run(msgs: S2C[], from: ClientState = initialState()): ClientState {
  return msgs.reduce((s, m) => reduce(s, m), from);
}

describe("the clock", () => {
  // The whole reason the server sends serverNow beside every deadline. A phone
  // with a wrong clock is not exotic and the failure is invisible in testing,
  // because the machine running the tests agrees with itself.
  it("corrects a timer for a client clock running FAST", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000 + 180_000); // this device is 3 minutes ahead

    const s = run([
      welcome,
      { t: "timer", seatIdx: 0, deadlineEpochMs: 1_020_000, serverNow: 1_000_000, timeBank: false },
    ]);

    // 20s of real time left, despite the device reading 3 minutes past it.
    expect(msLeft(s, Date.now())).toBe(20_000);
  });

  it("corrects a timer for a client clock running SLOW", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000 - 180_000);

    const s = run([
      welcome,
      { t: "timer", seatIdx: 0, deadlineEpochMs: 1_020_000, serverNow: 1_000_000, timeBank: false },
    ]);

    expect(msLeft(s, Date.now())).toBe(20_000);
  });

  it("never reports negative time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const s = run([
      welcome,
      { t: "timer", seatIdx: 0, deadlineEpochMs: 1_005_000, serverNow: 1_000_000, timeBank: false },
    ]);
    expect(msLeft(s, Date.now() + 60_000)).toBe(0);
  });

  it("reports nothing when no timer is running", () => {
    expect(msLeft(initialState(), Date.now())).toBe(0);
  });

  it("would be WRONG without the correction — proving the offset is load-bearing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000 + 180_000);
    const s = run([
      welcome,
      { t: "timer", seatIdx: 0, deadlineEpochMs: 1_020_000, serverNow: 1_000_000, timeBank: false },
    ]);
    // The naive computation every client gets wrong the first time:
    const naive = Math.max(0, s.timer!.deadlineEpochMs - Date.now());
    expect(naive).toBe(0); // reads as "already expired"
    expect(msLeft(s, Date.now())).toBe(20_000); // ...and it is not
  });
});

describe("showdown reveals", () => {
  const reveal: EngineEvent = {
    type: "ShowdownReveal",
    seat: 1,
    cards: cards("As Kd") as [number, number],
    mucked: false,
  };

  it("keeps revealed cards through the gap between hands", () => {
    const s = run([welcome, room(), ev([reveal], 2), ev([{ type: "HandEnded", handNo: 1, stacks: {} }], 3)]);
    // HandEnded must NOT clear them — this is the pause when people look.
    expect(s.reveals[1]).toEqual(cards("As Kd"));
  });

  it("clears them when the NEXT hand starts", () => {
    const started: EngineEvent = {
      type: "HandStarted",
      handNo: 2,
      buttonSeat: 0,
      smallBlindSeat: 0,
      sbPosted: true,
      bigBlindSeat: 1,
      dealtSeats: [0, 1],
      stacks: {},
    };
    const s = run([welcome, room(), ev([reveal], 2), ev([started], 3)]);
    expect(s.reveals).toEqual({});
  });

  it("never stores a mucked hand — those cards are private forever", () => {
    const s = run([welcome, room(), ev([{ type: "ShowdownReveal", seat: 1, mucked: true }], 2)]);
    expect(s.reveals[1]).toBeUndefined();
  });
});

describe("sequence gaps", () => {
  it("flags a hole in the event stream", () => {
    const s = run([welcome, room({}, 1), ev([], 2), ev([], 5)]);
    expect(s.needsResync).toBe(true);
  });

  it("stays quiet on a contiguous stream", () => {
    const s = run([welcome, room({}, 1), ev([], 2), ev([], 3), ev([], 4)]);
    expect(s.needsResync).toBe(false);
  });

  it("a fresh snapshot clears the flag — that IS the resync", () => {
    const gapped = run([welcome, room({}, 1), ev([], 5)]);
    expect(gapped.needsResync).toBe(true);
    expect(reduce(gapped, room({}, 6)).needsResync).toBe(false);
  });

  it("does not flag the very first batch, when nothing came before", () => {
    const s = run([welcome, ev([], 9)]);
    expect(s.needsResync).toBe(false);
  });
});

describe("names on the felt", () => {
  it("prefers the word ids over the engine's rendered copy", () => {
    const s = run([welcome, room({ seats: [{ name: "STALE" } as never] })]);
    expect(seatLabel(s, 0)).toBe("Swift Tiger");
  });

  it("falls back to the engine's copy when ids are missing", () => {
    const s = reduce(run([welcome, room()]), {
      t: "room",
      view: view({ seats: [{ name: "Some Body" } as never] }),
      names: {},
      seq: 2,
    });
    expect(seatLabel(s, 0)).toBe("Some Body");
  });

  it("updates my own name when the server settles on a different one", () => {
    const s = run([welcome, { t: "name", name: { adj: "bold", noun: "heron" } }]);
    expect(s.myName).toEqual({ adj: "bold", noun: "heron" });
  });
});

describe("whose turn", () => {
  const seated: S2C = {
    t: "you",
    you: {
      playerId: "p1",
      seatIdx: 2,
      hole: null,
      legal: null,
      handNo: 1,
      actionSeq: 0,
      sittingOut: false,
      timeBankAvailable: true,
    },
  };

  it("is mine when the table says my seat acts", () => {
    const s = run([welcome, seated, room({ hand: { toAct: 2 } as never })]);
    expect(isMyTurn(s)).toBe(true);
  });

  it("is not mine when another seat acts", () => {
    const s = run([welcome, seated, room({ hand: { toAct: 3 } as never })]);
    expect(isMyTurn(s)).toBe(false);
  });

  it("is never mine while unseated, even if toAct happens to be -1", () => {
    const s = run([welcome, room({ hand: { toAct: -1 } as never })]);
    expect(isMyTurn(s)).toBe(false);
  });
});

describe("errors and kicks", () => {
  it("keeps the table alive on an ordinary error", () => {
    const s = run([welcome, room(), { t: "err", code: "BAD_ACTION", msg: "not your turn" }]);
    expect(s.error).toBe("not your turn");
    expect(s.status).toBe("live");
    expect(s.view).not.toBeNull();
  });

  it("clears a stale error on the next welcome", () => {
    const s = run([welcome, { t: "err", code: "X", msg: "boom" }, welcome]);
    expect(s.error).toBeNull();
  });

  it("marks a kick as terminal", () => {
    expect(run([welcome, { t: "kicked" }]).status).toBe("kicked");
  });
});

describe("the hand log", () => {
  it("describes actions in words a person would use", () => {
    const s = run([
      welcome,
      room(),
      ev(
        [
          { type: "ActionTaken", seat: 0, kind: "raise", to: 40, allIn: false, actionSeq: 1 },
          { type: "ActionTaken", seat: 1, kind: "fold", to: 0, allIn: false, actionSeq: 2 },
        ],
        2,
      ),
    ]);
    const text = s.log.map((l) => l.text);
    expect(text).toContain("Swift Tiger raises to 40");
    expect(text).toContain("Lucky Fox folds");
  });

  it("marks an all-in", () => {
    const s = run([
      welcome,
      room(),
      ev([{ type: "ActionTaken", seat: 0, kind: "call", to: 200, allIn: true, actionSeq: 1 }], 2),
    ]);
    expect(s.log.at(-1)!.text).toBe("Swift Tiger calls 200 (all in)");
  });

  it("is bounded, so a long night cannot grow it without limit", () => {
    let s = run([welcome, room()]);
    for (let i = 0; i < 400; i++) {
      s = reduce(s, ev([{ type: "ActionTaken", seat: 0, kind: "check", to: 0, allIn: false, actionSeq: i }], i + 2));
    }
    expect(s.log.length).toBeLessThanOrEqual(60);
  });

  it("gives every line a unique key, so React never reorders the log", () => {
    let s = run([welcome, room()]);
    for (let i = 0; i < 120; i++) {
      s = reduce(s, ev([{ type: "ActionTaken", seat: 0, kind: "check", to: 0, allIn: false, actionSeq: i }], i + 2));
    }
    expect(new Set(s.log.map((l) => l.id)).size).toBe(s.log.length);
  });
});
