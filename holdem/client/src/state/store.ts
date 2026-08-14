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

/** A named type so `msLeft` can take one without importing the whole store. */
export interface TimerState {
  seatIdx: number;
  deadlineEpochMs: number;
  /** The server's own clock at the moment it sent this. */
  serverNow: number;
  /** OUR clock when it arrived. The pair is what makes skew cancel. */
  receivedAt: number;
  timeBank: boolean;
}

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
  timer: TimerState | null;
  /** Cards revealed at the current showdown, cleared on the next HandStarted. */
  reveals: Record<number, readonly [Card, Card] | "muck">;
  /**
   * The community cards the FELT is showing, which is not the same thing as
   * the community cards that exist.
   *
   * `view.hand` becomes null the instant a hand ends, so a board read straight
   * out of the view vanishes at exactly the moment everybody wants to look at
   * it — the winner is announced over an empty table, and the cards the pot
   * was won on are gone. This survives the end of the hand and is cleared by
   * the next `HandStarted`, so the board a hand finished on stays up through
   * the whole inter-hand pause.
   *
   * It is built from `StreetDealt` events, which is what lets the pacer deal a
   * run-out street by street. `room` seeds it only when it is empty and the
   * view already has a board — that is somebody joining or reconnecting
   * mid-hand, who must be shown the board immediately rather than have four
   * seconds of cards dealt to them for a hand that is already on the river.
   */
  shownBoard: Card[];
  /** Last visible action per seat this street (badges). */
  lastAction: Record<number, string>;
  winners: number[];
  /**
   * The pot that was just won, for the winner banner — who, how much, and the
   * board it was won on.
   *
   * Separate from `winners` because the two have different lifetimes on
   * purpose. `winners` is live decoration on the seats and is right to vanish
   * the instant a new hand starts. This is a RECORD of a moment, so it keeps
   * its own copy of the board: the view's board is replaced by the next deal,
   * and a banner reading its cards out of the live view would silently start
   * describing the wrong hand.
   *
   * Cleared on HandStarted like the rest, so nothing survives into a hand it
   * did not belong to.
   */
  lastPot: { winners: number[]; amount: number; board: Card[]; at: number } | null;
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
  shownBoard: [],
  lastAction: {},
  winners: [],
  lastPot: null,
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
    case "room": {
      // Seed the felt's board ONLY for somebody arriving mid-hand. During
      // normal play `shownBoard` is ahead of nothing and behind nothing —
      // it is built from the events the pacer is releasing, and copying the
      // view's board here would undo the pacing by handing over all five
      // cards the moment the snapshot that follows a run-out arrives.
      const board = msg.view.hand?.board ?? [];
      const seed = state.shownBoard.length === 0 && board.length > 0 ? [...board] : state.shownBoard;
      setState({ view: msg.view, seatNames: msg.names, shownBoard: seed });
      break;
    }
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
      let lastPot = state.lastPot;
      let shownBoard = state.shownBoard;
      for (const e of msg.events) {
        if (e.type === "HandStarted") {
          reveals = {};
          lastAction = {};
          winners = [];
          lastPot = null;
          // The previous hand's board has been on the felt for the whole
          // inter-hand pause. THIS is where it goes, not at HandEnded.
          shownBoard = [];
        } else if (e.type === "ShowdownReveal") {
          reveals = { ...reveals, [e.seat]: e.mucked ? "muck" : e.cards! };
        } else if (e.type === "ActionTaken") {
          lastAction = { ...lastAction, [e.seat]: e.kind };
        } else if (e.type === "StreetDealt") {
          lastAction = {};
          // `?? []` because everything in this switch arrived over a socket.
          // A street with no cards is not a thing the engine emits, but this
          // reducer is the boundary, and a board is not worth a thrown
          // exception that takes the whole table down with it.
          shownBoard = [...shownBoard, ...(e.cards ?? [])];
        } else if (e.type === "PotAwarded") {
          winners = [...new Set([...winners, ...e.winners])];
          // Side pots arrive as several PotAwarded events for one hand, so the
          // banner ACCUMULATES rather than overwrites — otherwise it announces
          // whichever side pot happened to be settled last, which on a big
          // all-in is the smallest number at the table.
          //
          // The board is copied here rather than read at render time: the next
          // deal replaces view.hand, and a banner reading the live view would
          // name a hand from the board of the hand AFTER the one it describes.
          //
          // Copied from the PACED board, not from the view. On a run-out the
          // view is holding all five cards from the moment the batch arrives,
          // so reading it here would name a hand off cards the felt has not
          // dealt yet — the banner would say "flush" over a visible flop.
          lastPot = {
            winners: [...new Set([...(lastPot?.winners ?? []), ...e.winners])],
            amount: (lastPot?.amount ?? 0) + e.amount,
            board: lastPot?.board ?? [...shownBoard],
            at: Date.now(),
          };
        }
      }
      patch.reveals = reveals;
      patch.lastAction = lastAction;
      patch.winners = winners;
      patch.lastPot = lastPot;
      patch.shownBoard = shownBoard;
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
