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
   * The community cards of the hand in progress, which is not the same thing
   * as the community cards the FELT is showing.
   *
   * `view.hand` becomes null the instant a hand ends, so a board read straight
   * out of the view vanishes at exactly the moment everybody wants to look at
   * it — the winner is announced over an empty table, and the cards the pot
   * was won on are gone. This survives the end of the hand and is cleared by
   * the next `HandStarted`, so the board a hand finished on stays up through
   * the whole inter-hand pause.
   *
   * EVERY `room` REPLACES IT OUTRIGHT while a hand is live. That is not
   * belt-and-braces, it is the fix for a real bug: this used to be an
   * accumulator fed only by `StreetDealt`, with no way back to the truth, and
   * a reconnect that ate a `HandStarted` left the previous hand's cards in
   * place for the next street to append to. The operator saw SIX cards on the
   * board. `resetPacer()` runs on every reconnect and throws away whatever is
   * queued, so eating a `HandStarted` is not exotic — backgrounding a tab is
   * enough.
   *
   * Between snapshots `StreetDealt` extends it, which is what lets the pacer
   * deal a run-out street by street: a batch that ends a hand carries every
   * street AND the `room` that follows says `hand: null`, so the events are
   * the only source for those cards until the next hand begins.
   */
  handBoard: Card[];
  /**
   * How many of `handBoard` the felt has actually dealt.
   *
   * The pacer owns this number and nothing else. Splitting "which cards" from
   * "how many are visible" is what makes a wrong board unrepresentable rather
   * than merely unlikely — the cards always come from the server, and the
   * worst a desync can now do is show too few of the RIGHT ones for a moment.
   */
  shownCount: number;
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
  handBoard: [],
  shownCount: 0,
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
      const hand = msg.view.hand;
      let handBoard = state.handBoard;
      let shownCount = state.shownCount;

      if (hand) {
        // THE SERVER'S BOARD WINS, always. A snapshot is the whole truth about
        // a live hand, so there is no case in which our copy is more right
        // than this one — and re-deriving here is what heals a client that
        // missed a HandStarted, instead of leaving it wrong until a reload.
        handBoard = hand.board;
        // There is deliberately NO clamp of `shownCount` here. One was
        // written, and then removed for being unprovable: with the line above
        // in place, `slice(0, shownCount)` at render time already cannot show
        // a card that does not exist, and deleting the clamp changed the
        // outcome of not one of the seventeen tests. A stale-high count is
        // harmless because `handBoard` grows with the events beside it, so the
        // pacing survives too. If you are about to add it back, write the test
        // that fails without it first.
        //
        // Somebody arriving or reconnecting mid-hand must be shown the board
        // at once. Dealing it to them a street at a time would be pacing a
        // story that finished before they sat down.
        if (shownCount === 0 && handBoard.length > 0) shownCount = handBoard.length;
      }
      // When `hand` is null the board is NOT touched: the hand has ended and
      // the cards it was won on stay on the felt until the next one starts.

      setState({ view: msg.view, seatNames: msg.names, handBoard, shownCount });
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
      let handBoard = state.handBoard;
      let shownCount = state.shownCount;
      for (const e of msg.events) {
        if (e.type === "HandStarted") {
          reveals = {};
          lastAction = {};
          winners = [];
          lastPot = null;
          // The previous hand's board has been on the felt for the whole
          // inter-hand pause. THIS is where it goes, not at HandEnded.
          handBoard = [];
          shownCount = 0;
        } else if (e.type === "ShowdownReveal") {
          reveals = { ...reveals, [e.seat]: e.mucked ? "muck" : e.cards! };
        } else if (e.type === "ActionTaken") {
          lastAction = { ...lastAction, [e.seat]: e.kind };
        } else if (e.type === "StreetDealt") {
          lastAction = {};
          // Extending BETWEEN snapshots, not instead of them. The batch that
          // ends a hand carries every remaining street and is followed by a
          // `room` saying `hand: null`, so these events are the only source
          // for those cards — but the next live snapshot still overrules us.
          //
          // `?? []` because everything in this switch arrived over a socket.
          // A street with no cards is not a thing the engine emits, but this
          // reducer is the boundary, and a board is not worth a thrown
          // exception that takes the whole table down with it.
          const dealt = e.cards ?? [];
          handBoard = [...handBoard, ...dealt];
          shownCount += dealt.length;
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
            board: lastPot?.board ?? [...handBoard],
            at: Date.now(),
          };
        }
      }
      patch.reveals = reveals;
      patch.lastAction = lastAction;
      patch.winners = winners;
      patch.lastPot = lastPot;
      patch.handBoard = handBoard;
      patch.shownCount = shownCount;
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
