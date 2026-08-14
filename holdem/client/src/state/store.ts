// One tiny external store; the reducer over server messages lives in
// net/socket.ts. No state library — useSyncExternalStore over a frozen-ish
// snapshot object, the plan's choice.

import { useSyncExternalStore } from "react";
import type { Card } from "@shared/engine/cards";
import type { PlayerName } from "@shared/names";
import type { HandSummary, LedgerRow, S2C, YouView } from "@shared/protocol";
import type { PublicTableView } from "@shared/engine/view";
import type { EngineEvent } from "@shared/engine/types";
import { saveName } from "../net/nameStore";

export type ConnState = "idle" | "connecting" | "open" | "reconnecting";

export interface ChatItem {
  key: number;
  seatIdx: number;
  name: string;
  emote: string;
}

export interface AppState {
  conn: ConnState;
  code: string | null;
  playerId: string | null;
  /**
   * The name the SERVER settled on, not the one this device asked for. An id a
   * newer build introduced comes back as something else entirely, so rendering
   * the request would show a name nobody else at the table can see.
   */
  myName: PlayerName | null;
  isHost: boolean;
  chipsMode: string;
  view: PublicTableView | null;
  /** Seat → word ids, so a seat can wear its animal. Arrives with every view. */
  seatNames: Record<number, PlayerName>;
  you: YouView | null;
  timer: { seatIdx: number; deadlineEpochMs: number; receivedAt: number; serverNow: number; timeBank: boolean } | null;
  /** Cards revealed at the current showdown, cleared on the next HandStarted. */
  reveals: Record<number, readonly [Card, Card] | "muck">;
  /** Last visible action per seat this street (badges). */
  lastAction: Record<number, string>;
  winners: number[];
  chats: ChatItem[];
  history: HandSummary[] | null;
  replay: { handNo: number; events: EngineEvent[] } | null;
  ledger: LedgerRow[] | null;
  relink: { playerId: string; code: string } | null;
  lastError: { code: string; msg: string; at: number } | null;
  kicked: boolean;
}

const initial: AppState = {
  conn: "idle",
  code: null,
  playerId: null,
  myName: null,
  isHost: false,
  chipsMode: "fresh",
  view: null,
  seatNames: {},
  you: null,
  timer: null,
  reveals: {},
  lastAction: {},
  winners: [],
  chats: [],
  history: null,
  replay: null,
  ledger: null,
  relink: null,
  lastError: null,
  kicked: false,
};

let state: AppState = initial;
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function resetState(): void {
  state = initial;
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

// Test/debug hook: lets an automated browser read the live state without
// scraping the DOM. Costs a few bytes and no behaviour.
declare global {
  interface Window {
    __holdem?: { getState: () => AppState };
  }
}
if (typeof window !== "undefined") {
  window.__holdem = { getState };
}

let chatKey = 0;

// Engine-event tap for the juice layer: fires once per `ev` batch, after the
// store has been updated, so listeners can read the fresh view.
type EventsListener = (events: EngineEvent[]) => void;
const eventListeners = new Set<EventsListener>();
export function onEngineEvents(l: EventsListener): () => void {
  eventListeners.add(l);
  return () => eventListeners.delete(l);
}

/** The message reducer — called by the socket for every S2C. */
export function reduceMessage(msg: S2C): void {
  switch (msg.t) {
    case "welcome":
      setState({
        playerId: msg.playerId,
        myName: msg.name,
        isHost: msg.isHost,
        chipsMode: msg.chipsMode,
      });
      // Persist it here, not only on `name`: a first visit sends no name at
      // all and the server assigns one, so this is the only message that
      // carries it. Without this the same device draws a different name on
      // every load and the table never learns who is who.
      saveName(msg.name);
      break;
    case "room":
      setState({ view: msg.view, seatNames: msg.names });
      break;
    // What the server SETTLED ON after a reroll, which is not always what was
    // asked for. Rendering the request instead would show this player a name
    // nobody else at the table sees.
    case "name":
      setState({ myName: msg.name });
      saveName(msg.name);
      break;
    case "you":
      setState({ you: msg.you });
      break;
    case "ev": {
      const patch: Partial<AppState> = {};
      let reveals = state.reveals;
      let lastAction = state.lastAction;
      let winners = state.winners;
      for (const e of msg.events) {
        if (e.type === "HandStarted") {
          reveals = {};
          lastAction = {};
          winners = [];
        } else if (e.type === "ShowdownReveal") {
          reveals = { ...reveals, [e.seat]: e.mucked ? "muck" : e.cards! };
        } else if (e.type === "ActionTaken") {
          lastAction = { ...lastAction, [e.seat]: e.kind };
        } else if (e.type === "StreetDealt") {
          lastAction = {};
        } else if (e.type === "PotAwarded") {
          winners = [...new Set([...winners, ...e.winners])];
        }
      }
      patch.reveals = reveals;
      patch.lastAction = lastAction;
      patch.winners = winners;
      setState(patch);
      for (const l of eventListeners) l(msg.events);
      break;
    }
    case "timer":
      setState({
        timer: {
          seatIdx: msg.seatIdx,
          deadlineEpochMs: msg.deadlineEpochMs,
          serverNow: msg.serverNow,
          receivedAt: Date.now(),
          timeBank: msg.timeBank,
        },
      });
      break;
    case "chat":
      setState({
        chats: [...state.chats.slice(-11), { key: chatKey++, seatIdx: msg.seatIdx, name: msg.name, emote: msg.emote }],
      });
      break;
    case "history":
      setState({ history: msg.hands });
      break;
    case "hand":
      setState({ replay: { handNo: msg.handNo, events: msg.events } });
      break;
    case "ledger":
      setState({ ledger: msg.rows });
      break;
    case "relinkCode":
      setState({ relink: { playerId: msg.playerId, code: msg.code } });
      break;
    case "kicked":
      setState({ kicked: true });
      break;
    case "err":
      setState({ lastError: { code: msg.code, msg: msg.msg, at: Date.now() } });
      break;
    case "pong":
      break;
  }
}
