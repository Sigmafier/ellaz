import { useCallback, useEffect, useState } from "react";

import { useTable } from "./net/useTable";
import { lastRoom, rememberRoom } from "./net/storage";
import { tidyCode } from "./net/server";
import { Home } from "./screens/Home";
import { Table } from "./screens/Table";

/**
 * Which table we are at, taken from the URL.
 *
 * The room code lives in the address bar, so a link IS an invitation — the
 * whole join flow for a group already in a WhatsApp thread. Back leaves the
 * table, and a refresh keeps the seat.
 */
function codeFromLocation(): string | null {
  const raw = new URLSearchParams(window.location.search).get("t");
  if (!raw) return null;
  const tidy = tidyCode(raw);
  return tidy.length === 5 ? tidy : null;
}

export function App() {
  const [code, setCode] = useState<string | null>(codeFromLocation);

  useEffect(() => {
    const onPop = () => setCode(codeFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const join = useCallback((next: string) => {
    rememberRoom(next);
    window.history.pushState(null, "", `?t=${next}`);
    setCode(next);
  }, []);

  const leave = useCallback(() => {
    window.history.pushState(null, "", window.location.pathname);
    setCode(null);
  }, []);

  const { state, connected, send } = useTable(code);

  return (
    <div className="app">
      {code ? (
        <Table state={state} connected={connected} send={send} onLeave={leave} />
      ) : (
        <Home onJoin={join} lastRoom={lastRoom()} />
      )}
    </div>
  );
}
