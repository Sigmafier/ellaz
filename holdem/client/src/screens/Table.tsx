import { renderName } from "@shared/names";
import { useEffect, useRef, useState } from "react";

import { type ClientState, isMyTurn, seatLabel, toAct } from "../net/state";
import { Card, CardBack } from "../ui/Card";
import { Controls } from "../ui/Controls";
import { Seat } from "../ui/Seat";
import { Timer } from "../ui/Timer";
import type { C2S } from "@shared/protocol";

/**
 * The hand log, pinned to its newest line.
 *
 * Without the scroll the box fills and then freezes on the oldest six lines
 * with the current one clipped in half below the fold — which looks like a
 * rendering bug and hides exactly the line anyone is reading.
 */
function Log({ lines }: { lines: { id: number; text: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="log" ref={ref} aria-live="polite">
      {lines.map((l) => (
        <div key={l.id}>{l.text}</div>
      ))}
    </div>
  );
}

export interface TableProps {
  state: ClientState;
  connected: boolean;
  send: (msg: C2S) => void;
  onLeave: () => void;
}

export function Table({ state, connected, send, onLeave }: TableProps) {
  const { view, you } = state;
  const [showLedger, setShowLedger] = useState(false);

  useEffect(() => {
    if (showLedger) send({ t: "getLedger" });
  }, [showLedger, send]);

  if (!view) {
    return (
      <div className="screen pad stack">
        <div className="banner">{connected ? "joining the table…" : "connecting…"}</div>
      </div>
    );
  }

  const mySeat = you?.seatIdx ?? -1;
  const seated = mySeat >= 0;
  const acting = toAct(state);
  const myTurn = isMyTurn(state);
  const hand = view.hand;
  const seatedCount = view.seats.filter((s) => s.playerId).length;

  return (
    <div className="screen">
      {/* ------------------------------------------------------------ head */}
      <div className="row pad" style={{ paddingBottom: 8 }}>
        <button onClick={onLeave} aria-label="leave the table">
          ‹
        </button>
        <div className="grow">
          <div style={{ fontWeight: 700, letterSpacing: 2 }}>{view.code}</div>
          <div className="tiny dim">
            {renderName(state.myName ?? undefined) ?? "…"}
            {state.isHost ? " · host" : ""}
          </div>
        </div>
        {/* A word, not a currency glyph: the shekel sign was both wrong for an
            English table and wrong about what this is — play money that cannot
            be bought or cashed out. */}
        <button onClick={() => setShowLedger((v) => !v)} aria-expanded={showLedger}>
          chips
        </button>
      </div>

      {!connected && <div className="banner bad pad">reconnecting…</div>}
      {state.status === "kicked" && (
        <div className="banner bad pad">the host removed you from this table</div>
      )}

      {/* ------------------------------------------------------------ felt */}
      <div className="felt">
        <div className="seats">
          {view.seats.map((s) => (
            <Seat
              key={s.seat}
              seat={s}
              name={seatLabel(state, s.seat)}
              ids={state.seatNames[s.seat]}
              acting={acting === s.seat}
              isButton={view.buttonSeat === s.seat}
              isMe={s.seat === mySeat}
              reveal={state.reveals[s.seat]}
              onSit={
                !s.playerId && !seated
                  ? () =>
                      send({
                        t: "takeSeat",
                        seatIdx: s.seat,
                        buyIn: view.config.startingStack,
                      })
                  : undefined
              }
            />
          ))}
        </div>

        <div className="middle">
          <div className="pot">pot {hand?.potTotal ?? 0}</div>
          <div className="cards">
            {hand?.board.map((c) => <Card key={c} card={c} />)}
            {/* Placeholders keep the board from jumping as streets arrive. */}
            {Array.from({ length: Math.max(0, 5 - (hand?.board.length ?? 0)) }, (_, i) => (
              <div key={`gap-${i}`} className="card" style={{ background: "#ffffff14", boxShadow: "none" }} />
            ))}
          </div>
          {hand && <div className="tiny dim">{hand.street}</div>}
          {!hand && (
            <div className="tiny dim">
              {seatedCount < 2 ? "waiting for another player" : "next hand starting…"}
            </div>
          )}
        </div>

        {/* your own cards, larger, at the bottom where your thumb is */}
        {seated && (
          <div className="middle">
            <div className="cards">
              {you?.hole ? (
                you.hole.map((c) => <Card key={c} card={c} mine />)
              ) : (
                <>
                  <CardBack mine />
                  <CardBack mine />
                </>
              )}
            </div>
          </div>
        )}

        {showLedger && (
          <div className="banner stack">
            <strong>tonight</strong>
            {(state.ledger ?? []).map((r) => (
              <div className="row" key={r.playerId}>
                <span className="grow">{r.name}</span>
                <span style={{ color: r.net >= 0 ? "var(--gold)" : "var(--danger)" }}>
                  {r.net >= 0 ? "+" : ""}
                  {r.net}
                </span>
              </div>
            ))}
            {(state.ledger ?? []).length === 0 && <span className="tiny dim">nothing yet</span>}
          </div>
        )}

        <Log lines={state.log} />
      </div>

      {/* -------------------------------------------------------- controls */}
      {myTurn && <Timer state={state} />}

      {seated && you?.legal && myTurn ? (
        <Controls
          legal={you.legal}
          committed={view.seats[mySeat]?.committed ?? 0}
          stack={view.seats[mySeat]?.stack ?? 0}
          potTotal={hand?.potTotal ?? 0}
          bigBlind={view.config.bb}
          disabled={!connected}
          onAct={(action, amount) =>
            send({
              t: "act",
              handNo: you.handNo,
              actionSeq: you.actionSeq,
              action,
              amount,
            })
          }
        />
      ) : (
        <div className="controls">
          <div className="actions">
            {seated ? (
              <>
                <button className="grow" onClick={() => send({ t: you?.sittingOut ? "sitIn" : "sitOut" })}>
                  {you?.sittingOut ? "sit in" : "sit out"}
                </button>
                <button className="grow" onClick={() => send({ t: "leaveSeat" })}>
                  stand up
                </button>
              </>
            ) : (
              <span className="tiny dim grow" style={{ textAlign: "center", alignSelf: "center" }}>
                tap an empty seat to join
              </span>
            )}
          </div>
          {state.error && <div className="tiny dim">{state.error}</div>}
        </div>
      )}
    </div>
  );
}
