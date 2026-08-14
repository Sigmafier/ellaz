import { nameEmoji, type PlayerName, pickName, renderName, rerollName } from "@shared/names";
import { useState } from "react";

import { createRoom, tidyCode } from "../net/server";
import { rememberName, storedName } from "../net/storage";

export interface HomeProps {
  onJoin: (code: string) => void;
  lastRoom: string | null;
}

export function Home({ onJoin, lastRoom }: HomeProps) {
  const [name, setName] = useState<PlayerName>(() => storedName() ?? pickName());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reroll = () => {
    const next = rerollName(name);
    setName(next);
    // Persisted here so the socket layer picks it up on hello, rather than
    // being passed down through props into the connection.
    rememberName(next);
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await createRoom({
        maxSeats: 6,
        sb: 1,
        bb: 2,
        startingStack: 200,
        minBuyIn: 40,
        maxBuyIn: 400,
        actionTimeMs: 20_000,
      });
      onJoin(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not reach the server");
      setBusy(false);
    }
  };

  const join = () => {
    const tidy = tidyCode(code);
    if (tidy.length !== 5) {
      setError("a room code is five characters");
      return;
    }
    onJoin(tidy);
  };

  return (
    <div className="screen pad stack" style={{ justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 30 }}>Hold&apos;em</h1>
        <p className="dim" style={{ margin: 0 }}>
          for friends. one room code, no accounts.
        </p>
      </div>

      <div className="banner row">
        <span style={{ fontSize: 26 }} aria-hidden="true">
          {nameEmoji(name)}
        </span>
        <span className="grow">
          <div className="tiny dim">you are</div>
          <strong>{renderName(name)}</strong>
        </span>
        <button onClick={reroll} aria-label="pick another name">
          ↻
        </button>
      </div>

      <button className="btn-primary" onClick={create} disabled={busy}>
        {busy ? "creating…" : "start a table"}
      </button>

      <div className="stack">
        <label className="tiny dim" htmlFor="code">
          or join with a code
        </label>
        <div className="row">
          <input
            id="code"
            className="grow"
            value={code}
            onChange={(e) => setCode(tidyCode(e.target.value))}
            placeholder="ABC12"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={5}
            style={{ letterSpacing: 4, textAlign: "center", fontFamily: "ui-monospace, monospace" }}
          />
          <button onClick={join} disabled={code.length !== 5}>
            join
          </button>
        </div>
      </div>

      {lastRoom && (
        <button onClick={() => onJoin(lastRoom)} className="tiny">
          rejoin {lastRoom}
        </button>
      )}

      {error && <div className="banner bad">{error}</div>}

      <p className="tiny dim" style={{ textAlign: "center", margin: 0 }}>
        Play money only. Nothing here can be bought or cashed out.
      </p>
    </div>
  );
}
