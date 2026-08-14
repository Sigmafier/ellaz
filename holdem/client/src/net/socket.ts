// WebSocket lifecycle: connect, hello, heartbeat, and the reconnect ladder.
//
// iOS Safari kills sockets silently when the phone locks, so beyond the
// exponential backoff we reconnect immediately on visibilitychange/pageshow/
// online. Every (re)connect replays hello; the server answers with a full
// snapshot, which is the whole resync story.

import type { PlayerName } from "@shared/names";
import type { C2S, EmoteId, S2C } from "@shared/protocol";
import { PROTOCOL_VERSION } from "@shared/protocol";
import { getState, resetState, setState } from "../state/store";
import { deliver, resetPacer } from "../state/pacer";
import { savedName } from "./nameStore";

const TOKEN_KEY = "holdem:token";

export function deviceToken(): string {
  try {
    let t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem(TOKEN_KEY, t);
    }
    return t;
  } catch {
    return `mem-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }
}

export function serverBase(): string {
  return (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "";
}

/** One row of the lobby. Mirrors the server's LobbyRow. */
export interface OpenTable {
  code: string;
  seated: number;
  maxSeats: number;
  sb: number;
  bb: number;
  playing: boolean;
  league: boolean;
}

/**
 * The open tables.
 *
 * Returns an empty list rather than throwing on any failure, because every
 * caller of this would do exactly that: the lobby is a convenience on a screen
 * whose Join-by-code and Create buttons work regardless. A home screen that
 * shows an error because a list is unreachable is worse than one that shows no
 * list.
 */
export async function listTables(): Promise<OpenTable[]> {
  try {
    const res = await fetch(`${serverBase()}/api/tables`);
    if (!res.ok) return [];
    const data = (await res.json()) as { tables?: OpenTable[] };
    return Array.isArray(data.tables) ? data.tables : [];
  } catch {
    return [];
  }
}

export async function createRoom(config: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch(`${serverBase()}/api/create`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { code?: string };
    return data.code ?? null;
  } catch {
    return null;
  }
}

class GameSocket {
  private ws: WebSocket | null = null;
  private code: string | null = null;
  private closedOnPurpose = false;
  private attempts = 0;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wakeListenersAttached = false;

  private spectate = false;

  connect(code: string, opts: { relink?: string; spectate?: boolean } = {}): void {
    this.code = code;
    this.spectate = opts.spectate ?? false;
    this.closedOnPurpose = false;
    resetPacer();
    resetState();
    setState({ conn: "connecting", code });
    this.open(opts.relink);
    this.attachWakeListeners();
  }

  disconnect(): void {
    this.closedOnPurpose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.ws?.close(1000, "bye");
    this.ws = null;
    resetPacer();
    resetState();
  }

  private open(relink?: string): void {
    if (!this.code) return;
    const base = serverBase().replace(/^http/, "ws") || `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
    const ws = new WebSocket(`${base}/ws/${this.code}`);
    this.ws = ws;

    ws.onopen = () => {
      this.attempts = 0;
      setState({ conn: "open" });
      this.sendRaw({
        t: "hello",
        v: PROTOCOL_VERSION,
        token: deviceToken(),
        name: this.spectate ? undefined : savedName(),
        relink,
        spectate: this.spectate || undefined,
      });
      if (this.heartbeat) clearInterval(this.heartbeat);
      this.heartbeat = setInterval(() => this.sendRaw({ t: "ping", now: Date.now() }), 20_000);
    };
    ws.onmessage = (ev) => {
      try {
        deliver(JSON.parse(ev.data as string) as S2C);
      } catch {
        /* garbage frame */
      }
    };
    ws.onclose = () => {
      if (this.heartbeat) clearInterval(this.heartbeat);
      if (this.closedOnPurpose || getState().kicked) return;
      setState({ conn: "reconnecting" });
      const delay = Math.min(8_000, 500 * 2 ** this.attempts++);
      this.reconnectTimer = setTimeout(() => this.open(), delay);
    };
    ws.onerror = () => {
      // onclose follows; nothing to do here.
    };
  }

  private attachWakeListeners(): void {
    if (this.wakeListenersAttached) return;
    this.wakeListenersAttached = true;
    const wake = () => {
      if (this.closedOnPurpose || !this.code) return;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.attempts = 0;
      this.open();
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") wake();
    });
    window.addEventListener("pageshow", wake);
    window.addEventListener("online", wake);
  }

  private sendRaw(msg: C2S): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  // ---- typed senders -------------------------------------------------------

  act(action: "fold" | "check" | "call" | "bet" | "raise", amount?: number): void {
    const you = getState().you;
    if (!you) return;
    this.sendRaw({ t: "act", handNo: you.handNo, actionSeq: you.actionSeq, action, amount });
  }

  /**
   * Ask for a name. NOT a local rename — nothing is persisted here, because
   * the server decides and answers with `name`, which the store then saves.
   * Writing it optimistically would leave this device showing a name the rest
   * of the table cannot see when the two disagree.
   */
  setName(name: PlayerName): void {
    this.sendRaw({ t: "setName", name });
  }
  takeSeat(seatIdx: number, buyIn: number): void {
    this.sendRaw({ t: "takeSeat", seatIdx, buyIn });
  }
  leaveSeat(): void {
    this.sendRaw({ t: "leaveSeat" });
  }
  sitOut(): void {
    this.sendRaw({ t: "sitOut" });
  }
  sitIn(): void {
    this.sendRaw({ t: "sitIn" });
  }
  rebuy(amount: number): void {
    this.sendRaw({ t: "rebuy", amount });
  }
  useTimeBank(): void {
    this.sendRaw({ t: "useTimeBank" });
  }
  chat(emote: EmoteId): void {
    this.sendRaw({ t: "chat", emote });
  }
  getHistory(beforeHandNo?: number): void {
    this.sendRaw({ t: "getHistory", beforeHandNo });
  }
  getHand(handNo: number): void {
    this.sendRaw({ t: "getHand", handNo });
  }
  getLedger(): void {
    this.sendRaw({ t: "getLedger" });
  }
  startNow(): void {
    this.sendRaw({ t: "startNow" });
  }
  hostRelink(playerId: string): void {
    this.sendRaw({ t: "hostRelink", playerId });
  }
  hostKick(playerId: string): void {
    this.sendRaw({ t: "hostKick", playerId });
  }
}

export const socket = new GameSocket();
