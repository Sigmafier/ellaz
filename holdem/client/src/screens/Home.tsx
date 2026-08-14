import { useState } from "react";
import { nameEmoji, pickName, renderName, rerollName } from "@shared/names";
import { createRoom } from "../net/socket";
import { savedName, saveName } from "../net/nameStore";
import { ThemePicker } from "../ui/ThemePicker";
import type { ThemeId } from "../ui/themes";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";

export function Home({
  locale,
  onToggleLocale,
  theme,
  onPickTheme,
}: {
  locale: Locale;
  onToggleLocale: () => void;
  theme: ThemeId;
  onPickTheme: (id: ThemeId) => void;
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
  const [error, setError] = useState("");

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
    });
    setCreating(false);
    if (!code) {
      setError("server?");
      return;
    }
    location.hash = `#/room/${code}`;
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
        <h1 style={{ margin: 0, fontSize: 34 }}>
          ♠️ {t("appName")}
        </h1>
        <button className="btn ghost" style={{ minHeight: 36, fontSize: 14 }} onClick={onToggleLocale}>
          {t("language")}
        </button>
      </div>
      <p style={{ margin: 0, color: "var(--ink-dim)" }}>{t("tagline")}</p>

      <ThemePicker value={theme} onPick={onPickTheme} locale={locale} />

      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 700 }}>
        {t("yourName")}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            className="field"
            style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}
          >
            <span aria-hidden style={{ fontSize: 24, lineHeight: 1 }}>{nameEmoji(name)}</span>
            <span>{renderName(name)}</span>
          </div>
          <button
            className="btn ghost"
            style={{ minWidth: 52 }}
            aria-label={t("rerollName")}
            title={t("rerollName")}
            onClick={doReroll}
          >
            🎲
          </button>
        </div>
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
