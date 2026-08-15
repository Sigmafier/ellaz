import { useCallback, useEffect, useState } from "react";
import { pickName, renderName, rerollName } from "@shared/names";
import { createRoom, ensurePracticeTable, listTables, type OpenTable } from "../net/socket";
import { botsWanted, setBotsWanted } from "../net/botsPref";
import { savedName, saveName } from "../net/nameStore";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";
import { Animal } from "../ui/animals";
import { IconCrown, IconDice, IconEye, IconLock, IconPalette, IconRefresh, IconRobot, Logo } from "../ui/icons";

export function Home({
  locale,
  onToggleLocale,
}: {
  locale: Locale;
  onToggleLocale: () => void;
}) {
  const t = makeT(locale);
  // Drawn, never typed. A first visit already HAS a name, so nothing on this
  // screen can be blocked on one — which is why `requireName` is gone and both
  // buttons act immediately.
  const [name, setName] = useState(() => savedName() ?? pickName());
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [seats, setSeats] = useState(6);
  const [sb, setSb] = useState(1);
  const [stack, setStack] = useState(200);
  const [league, setLeague] = useState(false);
  const [actionSecs, setActionSecs] = useState(25);
  const [isPrivate, setPrivate] = useState(false);
  const [error, setError] = useState("");
  const [tables, setTables] = useState<OpenTable[] | null>(null);
  // OFF unless this device has asked. See net/botsPref.ts — the practice table
  // used to be created and listed on every visit, so a lobby always opened on
  // a room full of machines.
  const [bots, setBots] = useState(botsWanted);

  // `null` means "have not looked yet" and `[]` means "looked, nothing there".
  // Rendering the empty-state copy over the first is how a lobby flashes "no
  // tables" at somebody a quarter-second before showing them four.
  const refresh = useCallback(() => {
    void listTables().then(setTables);
  }, []);

  useEffect(() => {
    // ONLY when this device has asked for it. It is idempotent and it answers
    // in a few milliseconds; `refresh` does not wait on it, because a slow
    // server must not delay the tables that DO exist.
    //
    // Asking for it is what CREATES it, so leaving the switch off is not
    // merely a filter over the list — the room is never made, never woken and
    // never costs anything.
    if (bots) void ensurePracticeTable().then(refresh);
    refresh();
    // Twenty seconds. The lobby is a list of rooms, not a live feed — a table
    // appearing a few seconds late costs nothing, and this screen is the one
    // people leave open. Refresh on tab focus covers the case that matters:
    // coming back to this tab after being told a code out loud.
    const iv = setInterval(refresh, 20_000);
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // `bots` is a dependency because turning the switch ON has to go and make
    // the table before the next listing can show it. Turning it off re-runs
    // this too, which costs one extra `refresh` and keeps the two directions
    // symmetrical rather than special-cased.
  }, [refresh, bots]);

  // A name always exists, so this only persists the current one. It cannot
  // fail and it cannot refuse, which is the whole point of a pool.
  const keepName = (): void => {
    saveName(name);
    setError("");
  };

  const doReroll = (): void => {
    const next = rerollName(name);
    setName(next);
    saveName(next);
  };

  const doCreate = async () => {
    keepName();
    setCreating(true);
    const code = await createRoom({
      maxSeats: seats,
      sb,
      bb: sb * 2,
      startingStack: stack,
      chipsMode: league ? "league" : "fresh",
      actionTimeMs: actionSecs * 1000,
      minBuyIn: Math.max(1, Math.round(stack / 5)),
      maxBuyIn: stack * 2,
      isPrivate,
    });
    setCreating(false);
    if (!code) {
      setError("server?");
      return;
    }
    location.hash = `#/room/${code}`;
  };

  /**
   * The tables to show, which is not the same list the server sent.
   *
   * Filtered on what the ROW says about itself rather than on a code this
   * screen would otherwise have to know — see `bots` in net/socket.ts.
   */
  const shown = (tables ?? []).filter((tbl) => bots || !tbl.bots);

  const toggleBots = () => {
    const next = !bots;
    setBots(next);
    setBotsWanted(next);
  };

  const doJoin = () => {
    keepName();
    const code = joinCode.trim().toUpperCase().replace(/[\s-]/g, "");
    if (code.length < 4) return;
    location.hash = `#/room/${code}`;
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 34, display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={30} />
          {t("appName")}
        </h1>
        <button className="btn ghost" style={{ minHeight: 36, fontSize: 14 }} onClick={onToggleLocale}>
          {t("language")}
        </button>
      </div>
      <p style={{ margin: 0, color: "var(--ink-dim)" }}>{t("tagline")}</p>


      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 700 }}>
        {t("yourName")}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            className="field"
            style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}
          >
            <Animal id={name.noun} size={26} />
            <span>{renderName(name)}</span>
          </div>
          <button
            className="btn ghost"
            style={{ minWidth: 52 }}
            aria-label={t("rerollName")}
            title={t("rerollName")}
            onClick={doReroll}
          >
            <IconDice size={18} />
          </button>
        </div>
      </div>

      {/* The studio, from the home screen.
       *
       * It had two ways in and both of them assumed you already knew: type
       * `#/look`, or open a table and find it in the ⋮ menu. The operator's own
       * question after it shipped was "how do i reach the lab?", which is the
       * whole argument for this row — a screen nobody can find is a screen
       * nobody uses, however good it is.
       *
       * It sits under the NAME rather than under the tables, because the name
       * is one of the three things it changes; the row reads as "and the rest
       * of you" rather than as an unrelated settings link. */}
      <button
        className="btn ghost"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          minHeight: 56,
          padding: "0 14px",
          textAlign: "start",
        }}
        onClick={() => {
          keepName();
          location.hash = "#/look";
        }}
      >
        <IconPalette size={20} />
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <span style={{ fontWeight: 800 }}>{t("studio")}</span>
          <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 500 }}>{t("studioHint")}</span>
        </span>
        <span aria-hidden style={{ opacity: 0.6 }}>
          ›
        </span>
      </button>

      <div style={{ background: "var(--surface)", borderRadius: "var(--radius-2)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>{t("openTables")}</strong>
          <button
            className="btn ghost"
            style={{ minHeight: 32, fontSize: 13, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
            onClick={() => {
              keepName();
              refresh();
            }}
          >
            <IconRefresh size={13} /> {t("refreshTables")}
          </button>
        </div>
        {tables === null ? (
          <div style={{ color: "var(--ink-dim)", fontSize: 14 }}>…</div>
        ) : shown.length === 0 ? (
          <div style={{ color: "var(--ink-dim)", fontSize: 14, lineHeight: 1.5 }}>
            {t("noOpenTables")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shown.map((tbl) => (
              <TableRow
                key={tbl.code}
                table={tbl}
                t={t}
                onJoin={() => {
                  keepName();
                  location.hash = `#/room/${tbl.code}`;
                }}
              />
            ))}
          </div>
        )}

        {/* The switch, under the list it changes, so what it does is visible
            in the same glance. Off by default and remembered per device.
            Turning it on is also what CREATES the table — this is not a
            filter over something that exists regardless. */}
        <button
          className="btn ghost"
          role="switch"
          aria-checked={bots}
          onClick={toggleBots}
          style={{
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            fontSize: 14,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <IconRobot size={16} /> {t("playWithBots")}
          </span>
          <span
            aria-hidden
            style={{
              flex: "0 0 auto",
              width: 40,
              height: 24,
              borderRadius: 999,
              background: bots ? "var(--gold)" : "var(--line)",
              position: "relative",
              transition: "background 160ms var(--ease)",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                insetInlineStart: bots ? 19 : 3,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: bots ? "var(--gold-ink)" : "var(--ink-dim)",
                transition: "inset-inline-start 160ms var(--ease)",
              }}
            />
          </span>
        </button>
      </div>

      <div style={{ background: "var(--surface)", borderRadius: "var(--radius-2)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <strong>{t("joinRoom")}</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            dir="ltr"
            className="field"
            placeholder="ABC12"
            value={joinCode}
            maxLength={7}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{ textTransform: "uppercase", letterSpacing: 2, fontWeight: 800, textAlign: "center" }}
          />
          <button className="btn primary" onClick={doJoin}>
            {t("join")}
          </button>
        </div>
      </div>

      <div style={{ background: "var(--surface)", borderRadius: "var(--radius-2)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <button className="btn" onClick={() => setShowCreate((v) => !v)}>
          {t("createRoom")} {showCreate ? "▴" : "▾"}
        </button>
        {showCreate && (
          <>
            <Row label={t("seats")}>
              <Stepper value={seats} min={2} max={9} onChange={setSeats} />
            </Row>
            <Row label={t("blinds")}>
              <select className="field" dir="ltr" value={sb} onChange={(e) => setSb(Number(e.target.value))} style={{ width: 130 }}>
                {[1, 2, 5, 10, 25].map((v) => (
                  <option key={v} value={v}>
                    {v} / {v * 2}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={t("startingStack")}>
              <select className="field" dir="ltr" value={stack} onChange={(e) => setStack(Number(e.target.value))} style={{ width: 130 }}>
                {[100, 200, 500, 1000].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={t("actionTime")}>
              <select className="field" dir="ltr" value={actionSecs} onChange={(e) => setActionSecs(Number(e.target.value))} style={{ width: 130 }}>
                {[15, 25, 45, 60].map((v) => (
                  <option key={v} value={v}>
                    {v} {t("seconds")}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={t("chipsMode")}>
              <button className={`btn ${league ? "" : "primary"}`} style={{ minHeight: 38, fontSize: 13 }} onClick={() => setLeague(false)}>
                {t("chipsFresh")}
              </button>
            </Row>
            <Row label="">
              <button className={`btn ${league ? "primary" : ""}`} style={{ minHeight: 38, fontSize: 13 }} onClick={() => setLeague(true)}>
                {t("chipsLeague")}
              </button>
            </Row>
            <Row label={t("privateTable")}>
              <button
                className={`btn ${isPrivate ? "primary" : "ghost"}`}
                style={{ minHeight: 38, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
                aria-pressed={isPrivate}
                onClick={() => setPrivate((v) => !v)}
              >
                {isPrivate ? <IconLock size={14} /> : <IconEye size={14} />} {isPrivate ? t("privateOn") : t("privateOff")}
              </button>
            </Row>
            <button className="btn primary" disabled={creating} onClick={doCreate}>
              {creating ? "…" : t("create")}
            </button>
          </>
        )}
      </div>

      {error && <div style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</div>}
    </div>
  );
}

/**
 * One open table.
 *
 * Wraps rather than laying out in a single row: the pieces are a code, a seat
 * count, blinds and a state word, and that set grows. A non-wrapping flex row
 * of catalogue-sized content is the trap this repo has documented twice — it
 * clips inside a fixed-width parent with no scrollbar to reveal what fell off.
 */
function TableRow({
  table,
  t,
  onJoin,
}: {
  table: OpenTable;
  t: (k: "tablePlaying" | "tableWaiting" | "tableFull" | "botsTable") => string;
  onJoin: () => void;
}) {
  const full = table.seated >= table.maxSeats;
  return (
    <button
      className="btn"
      onClick={onJoin}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        justifyContent: "flex-start",
        textAlign: "start",
        minHeight: 52,
        padding: "8px 12px",
      }}
    >
      <span dir="ltr" style={{ fontWeight: 900, letterSpacing: 2, fontSize: 17 }}>
        {table.code}
      </span>
      <span dir="ltr" style={{ color: "var(--ink-dim)", fontSize: 14 }}>
        {table.seated}/{table.maxSeats} · {table.sb}/{table.bb}
        {table.league ? <IconCrown size={12} /> : null}
      </span>
      {/* Said on the row as well as on the switch. Somebody who turned the
          switch on an hour ago should not have to remember which of three
          rooms was the one with the machines in it. */}
      {table.bots ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-dim)" }}>
          <IconRobot size={12} /> {t("botsTable")}
        </span>
      ) : null}
      <span
        style={{
          marginInlineStart: "auto",
          fontSize: 12,
          fontWeight: 800,
          padding: "3px 8px",
          borderRadius: 999,
          whiteSpace: "nowrap",
          background: table.playing ? "var(--gold)" : "var(--line)",
          color: table.playing ? "#1a1204" : "var(--ink-dim)",
        }}
      >
        {full ? t("tableFull") : table.playing ? t("tablePlaying") : t("tableWaiting")}
      </span>
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <span style={{ color: "var(--ink-dim)", fontSize: 14 }}>{label}</span>
      {children}
    </div>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div dir="ltr" style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button className="btn ghost" style={{ minHeight: 38, minWidth: 38, padding: 0 }} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <strong style={{ minWidth: 20, textAlign: "center" }}>{value}</strong>
      <button className="btn ghost" style={{ minHeight: 38, minWidth: 38, padding: 0 }} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}
