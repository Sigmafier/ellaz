// The WebSocket protocol — every message is one JSON object `{ t, ... }`.
//
// Client → server commands carry the seat implicitly: the server derives the
// seat from the socket's authenticated player, never from the payload, so a
// client cannot act for another seat. Amounts are re-validated by the engine;
// the guards here only reject garbage early with a typed error.
//
// Server → client: `room` is the full PUBLIC snapshot (safe for spectators),
// `you` is the private half (own hole cards + legal actions), `ev` streams
// redacted engine events with a monotonic `seq` so a client can detect gaps
// and resync by reconnecting (hello always answers with a fresh snapshot).

import type { LegalActions } from "./engine/betting";
import type { Card } from "./engine/cards";
import type { EngineEvent, TableConfig } from "./engine/types";
import type { PublicTableView } from "./engine/view";
import { isPlayerName, type PlayerName } from "./names";

// Bumped from 1: a name is now two word ids rather than free text, so a v1
// client's `name: "Dani"` would be silently dropped by the new guard and the
// player would arrive nameless. The version check turns that into "refresh the
// app", which is the honest answer.
export const PROTOCOL_VERSION = 2;

export const EMOTES = [
  "laugh",
  "cry",
  "nice",
  "yalla",
  "bluff",
  "chicken",
  "bomb",
  "clap",
] as const;
export type EmoteId = (typeof EMOTES)[number];

// ---------------------------------------------------------------------------
// Client → Server

export type C2S =
  // `name` is two word ids from the shared pool, never text. The server
  // re-validates them against the pool and renders the string itself, so a
  // client cannot put arbitrary characters on anyone else's screen.
  | { t: "hello"; v: number; token: string; name?: PlayerName; relink?: string; spectate?: boolean }
  | { t: "setName"; name: PlayerName }
  | { t: "takeSeat"; seatIdx: number; buyIn: number }
  | { t: "leaveSeat" }
  | { t: "sitOut" }
  | { t: "sitIn" }
  | { t: "rebuy"; amount: number }
  | {
      t: "act";
      handNo: number;
      actionSeq: number;
      action: "fold" | "check" | "call" | "bet" | "raise";
      amount?: number;
    }
  | { t: "useTimeBank" }
  | { t: "chat"; emote: EmoteId; at?: number }
  | { t: "getHistory"; beforeHandNo?: number; limit?: number }
  | { t: "getHand"; handNo: number }
  | { t: "getLedger" }
  | { t: "startNow" }
  | { t: "hostSettings"; patch: Partial<Pick<TableConfig, "sb" | "bb" | "actionTimeMs" | "minBuyIn" | "maxBuyIn">> }
  | { t: "hostKick"; playerId: string }
  | { t: "hostRelink"; playerId: string }
  | { t: "ping"; now: number };

// ---------------------------------------------------------------------------
// Server → Client

export interface YouView {
  playerId: string;
  seatIdx: number; // -1 when unseated / spectating
  hole: readonly [Card, Card] | null;
  legal: LegalActions | null;
  /** Present when a hand is running — everything an `act` needs to be valid. */
  handNo: number;
  actionSeq: number;
  sittingOut: boolean;
  timeBankAvailable: boolean;
}

export interface HandSummary {
  handNo: number;
  endedAt: number;
  /** Seat → net chips won/lost this hand (post refunds). */
  net: Record<number, number>;
  potTotal: number;
  board: Card[];
  winners: number[];
  /**
   * RENDERED strings, not ids — deliberately, and the one place in this
   * protocol that goes the other way.
   *
   * History is an archive. Word ids are promised never to be removed, but a
   * rendered name is immune even to that promise being broken, and to a future
   * language switch: a hand played tonight should still read the way it read
   * tonight when someone scrolls back to it. Live seats carry ids (see the
   * `room` message) because they need the emoji and can be re-rendered.
   */
  names: Record<number, string>;
}

export interface LedgerRow {
  playerId: string;
  /** Rendered at send time. See HandSummary.names for why it is not ids. */
  name: string;
  /** The ids too, so the row can show the player's animal beside the figure. */
  nameIds: PlayerName;
  net: number;
  buyIn: number;
  handsPlayed: number;
  seated: boolean;
}

export type S2C =
  | {
      t: "welcome";
      v: number;
      playerId: string;
      /** The ids the server settled on — it may have assigned them itself. */
      name: PlayerName;
      seatIdx: number;
      isHost: boolean;
      serverNow: number;
      chipsMode: string;
    }
  // `names` rides alongside the view rather than inside it: the engine treats a
  // seat's name as an opaque string and must not learn about the word pool, so
  // the ids the client needs for each seat's animal travel next to it.
  | { t: "room"; view: PublicTableView; names: Record<number, PlayerName>; seq: number }
  | { t: "you"; you: YouView }
  | { t: "ev"; seq: number; events: EngineEvent[] }
  | { t: "timer"; seatIdx: number; deadlineEpochMs: number; serverNow: number; timeBank: boolean }
  | { t: "chat"; seatIdx: number; name: string; emote: EmoteId; at?: number }
  | { t: "history"; hands: HandSummary[]; hasMore: boolean }
  | { t: "hand"; handNo: number; events: EngineEvent[] }
  | { t: "ledger"; rows: LedgerRow[] }
  // The name the server SETTLED ON, which is not always the one asked for: an
  // id this build does not know is answered with a fresh name rather than an
  // error, so the client must render what comes back, never what it sent.
  | { t: "name"; name: PlayerName }
  | { t: "relinkCode"; playerId: string; code: string; expiresAt: number }
  | { t: "kicked" }
  | { t: "err"; code: string; msg: string }
  | { t: "pong"; now: number; echoed: number };

// ---------------------------------------------------------------------------
// Guards — reject garbage before it reaches the engine.

export function parseC2S(raw: unknown): C2S | null {
  if (typeof raw !== "string" || raw.length > 4096) return null;
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof msg !== "object" || msg === null) return null;
  const m = msg as Record<string, unknown>;
  if (typeof m.t !== "string") return null;
  switch (m.t) {
    case "hello":
      if (typeof m.token !== "string" || m.token.length < 8 || m.token.length > 128) return null;
      // Shape only here; membership in the pool is checked server-side, where
      // an unknown id becomes a fresh assigned name rather than a rejection.
      if (m.name !== undefined && !isPlayerName(m.name)) return null;
      if (m.relink !== undefined && typeof m.relink !== "string") return null;
      return m as C2S;
    case "setName":
      if (!isPlayerName(m.name)) return null;
      return m as C2S;
    case "takeSeat":
      if (!Number.isInteger(m.seatIdx) || !Number.isInteger(m.buyIn)) return null;
      return m as C2S;
    case "rebuy":
      if (!Number.isInteger(m.amount)) return null;
      return m as C2S;
    case "act":
      if (!Number.isInteger(m.handNo) || !Number.isInteger(m.actionSeq)) return null;
      if (typeof m.action !== "string") return null;
      if (m.amount !== undefined && !Number.isInteger(m.amount)) return null;
      return m as C2S;
    case "chat":
      if (!EMOTES.includes(m.emote as EmoteId)) return null;
      return m as C2S;
    case "getHistory":
    case "getHand":
    case "getLedger":
    case "leaveSeat":
    case "sitOut":
    case "sitIn":
    case "useTimeBank":
    case "startNow":
    case "hostSettings":
    case "hostKick":
    case "hostRelink":
    case "ping":
      return m as C2S;
    default:
      return null;
  }
}
