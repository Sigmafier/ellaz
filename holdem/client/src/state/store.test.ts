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
