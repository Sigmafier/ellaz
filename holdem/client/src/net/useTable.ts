// The socket, and the only place in the client that touches one.
//
// Deliberately thin: it owns the connection lifecycle and nothing about poker.
// Every message goes straight into the pure reducer in state.ts, which is where
// the behaviour worth testing lives.

import type { PlayerName } from "@shared/names";
import type { C2S, S2C } from "@shared/protocol";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { socketUrl } from "./server";
import { type ClientState, initialState, reduce } from "./state";
import { deviceToken, rememberName, storedName } from "./storage";

/** Backoff between reconnect attempts, in ms. Caps rather than growing forever. */
const BACKOFF = [400, 800, 1600, 3200, 5000] as const;

/** A table is dead air if nothing arrives for this long — poke it. */
const PING_EVERY_MS = 20_000;

export interface TableApi {
  state: ClientState;
  /** False while the socket is down, so the UI can disable its buttons. */
  connected: boolean;
  send: (msg: C2S) => void;
}

export function useTable(code: string | null): TableApi {
  const [state, dispatch] = useReducer(
    (s: ClientState, m: S2C) => reduce(s, m),
    undefined,
    initialState,
  );
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  // The name is echoed back on every connect so a reconnect keeps the animal
  // this player already had. The server still validates it against the pool.
  const nameRef = useRef<PlayerName | undefined>(storedName());
  const closedByUs = useRef(false);

  const send = useCallback((msg: C2S) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    if (!code) return;

    closedByUs.current = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;

    const open = () => {
      const ws = new WebSocket(socketUrl(code));
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setConnected(true);
        ws.send(
          JSON.stringify({
            t: "hello",
            v: 2,
            token: deviceToken(),
            name: nameRef.current,
          } satisfies C2S),
        );
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ t: "ping", now: Date.now() } satisfies C2S));
          }
        }, PING_EVERY_MS);
      };

      ws.onmessage = (ev) => {
        let msg: S2C;
        try {
          msg = JSON.parse(String(ev.data)) as S2C;
        } catch {
          return; // garbage from the wire is not worth a crash
        }
        // Keep the name the server SETTLED ON, not the one we asked for — it
        // may have replaced an id this build no longer knows.
        if (msg.t === "welcome" || msg.t === "name") {
          nameRef.current = msg.name;
          rememberName(msg.name);
        }
        dispatch(msg);
      };

      ws.onclose = () => {
        setConnected(false);
        clearInterval(pingTimer);
        if (closedByUs.current) return;
        const wait = BACKOFF[Math.min(attemptRef.current, BACKOFF.length - 1)];
        attemptRef.current += 1;
        retryTimer = setTimeout(open, wait);
      };

      // `onerror` is always followed by `onclose`, so reconnecting here too
      // would open two sockets for one failure.
      ws.onerror = () => {};
    };

    open();

    return () => {
      closedByUs.current = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [code]);

  // A sequence gap means a batch was lost. Reconnecting is the whole resync
  // protocol: `hello` answers with a fresh snapshot.
  useEffect(() => {
    if (state.needsResync) wsRef.current?.close();
  }, [state.needsResync]);

  return { state, connected, send };
}
