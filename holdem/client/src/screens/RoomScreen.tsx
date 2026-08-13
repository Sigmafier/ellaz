import { useEffect, useState } from "react";
import { savedName, saveName, socket } from "../net/socket";
import { useApp } from "../state/store";
import { Table } from "../table/Table";
import { HistoryPanel } from "./HistoryPanel";
import { LeaguePanel } from "./LeaguePanel";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";

export function RoomScreen({
  code,
  locale,
  onToggleLocale,
}: {
  code: string;
  locale: Locale;
  onToggleLocale: () => void;
}) {
  const app = useApp();
  const t = makeT(locale);
  const [panel, setPanel] = useState<"none" | "history" | "league" | "menu">("none");
  const [copied, setCopied] = useState(false);
  // A shared link can land here with no saved name — gate the connection on
  // one, or the server would answer hello with NAME_REQUIRED forever.
  const [hasName, setHasName] = useState(() => savedName().length > 0);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    if (!hasName) return;
    socket.connect(code);
    return () => socket.disconnect();
  }, [code, hasName]);

  if (!hasName) {
    return (
      <Center>
        <strong style={{ fontSize: 18 }}>{t("yourName")}</strong>
        <input
          className="field"
          style={{ maxWidth: 260 }}
          maxLength={24}
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
        />
        <button
          className="btn primary"
          disabled={!nameDraft.trim()}
          onClick={() => {
            saveName(nameDraft.trim());
            setHasName(true);
          }}
        >
          {t("join")}
        </button>
      </Center>
    );
  }

  const mySeat = app.you?.seatIdx ?? -1;
  const me = mySeat >= 0 && app.view ? app.view.seats[mySeat] : null;

  if (app.kicked) {
    return (
      <Center>
        <p>{t("kicked")}</p>
        <button className="btn primary" onClick={() => (location.hash = "")}>
          {t("back")}
        </button>
      </Center>
    );
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* http context */
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button className="btn ghost" style={{ minHeight: 38, padding: "0 10px" }} onClick={() => (location.hash = "")}>
          ‹
        </button>
        <button className="btn ghost" dir="ltr" style={{ minHeight: 38, fontWeight: 900, letterSpacing: 2 }} onClick={copyCode}>
          {copied ? t("copied") : code}
        </button>
        <span style={{ flex: 1 }} />
        {app.conn === "reconnecting" && (
          <span style={{ color: "var(--danger)", fontSize: 12, fontWeight: 700 }}>{t("reconnecting")}</span>
        )}
        {app.conn === "connecting" && (
          <span style={{ color: "var(--ink-dim)", fontSize: 12 }}>{t("connecting")}</span>
        )}
        <button className="btn ghost" style={{ minHeight: 38, padding: "0 10px" }} onClick={() => setPanel("history")}>
          🕘
        </button>
        <button className="btn ghost" style={{ minHeight: 38, padding: "0 10px" }} onClick={() => setPanel("league")}>
          🏆
        </button>
        <button className="btn ghost" style={{ minHeight: 38, padding: "0 10px" }} onClick={() => setPanel("menu")}>
          ⋮
        </button>
      </header>

      <Table locale={locale} />

      {/* sit-out / rebuy strip (only when relevant and not being asked to act) */}
      {me && !app.you?.legal && (
        <div style={{ position: "fixed", bottom: 0, insetInline: 0, padding: "8px 12px calc(8px + env(safe-area-inset-bottom))", display: "flex", gap: 8, zIndex: 10, justifyContent: "center" }}>
          {me.sittingOut ? (
            <button className="btn primary" onClick={() => socket.sitIn()}>
              {t("sitIn")}
            </button>
          ) : me.stack === 0 && !me.inHand ? (
            <button className="btn primary" onClick={() => socket.rebuy(app.view!.config.startingStack)}>
              {t("rebuy")} +{app.view!.config.startingStack}
            </button>
          ) : null}
        </div>
      )}

      {panel === "history" && <HistoryPanel locale={locale} onClose={() => setPanel("none")} />}
      {panel === "league" && <LeaguePanel locale={locale} onClose={() => setPanel("none")} />}
      {panel === "menu" && (
        <Sheet onClose={() => setPanel("none")}>
          <button className="btn ghost" onClick={onToggleLocale}>
            {t("language")}
          </button>
          {me && !me.sittingOut && (
            <button
              className="btn ghost"
              onClick={() => {
                socket.sitOut();
                setPanel("none");
              }}
            >
              {t("sitOut")}
            </button>
          )}
          {me && (
            <button
              className="btn ghost"
              onClick={() => {
                socket.rebuy(Math.round(app.view!.config.startingStack / 2));
                setPanel("none");
              }}
            >
              {t("rebuy")} +{Math.round(app.view!.config.startingStack / 2)}
            </button>
          )}
          {me && (
            <button
              className="btn danger"
              onClick={() => {
                socket.leaveSeat();
                setPanel("none");
              }}
            >
              {t("leave")}
            </button>
          )}
          {app.isHost && app.view && !app.view.hand && (
            <button
              className="btn primary"
              onClick={() => {
                socket.startNow();
                setPanel("none");
              }}
            >
              {t("startNow")}
            </button>
          )}
        </Sheet>
      )}

      {/* transient error toast */}
      {app.lastError && Date.now() - app.lastError.at < 4000 && app.lastError.code !== "NAME_REQUIRED" && (
        <div
          style={{
            position: "fixed",
            top: 64,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--danger)",
            color: "#fff",
            borderRadius: "var(--radius-pill)",
            padding: "6px 16px",
            fontSize: 13,
            fontWeight: 700,
            zIndex: 60,
          }}
        >
          {app.lastError.msg}
        </div>
      )}
    </div>
  );
}

export function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16, alignItems: "center", justifyContent: "center" }}>
      {children}
    </div>
  );
}

export function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 50, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-2) var(--radius-2) 0 0",
          padding: "16px 16px calc(16px + env(safe-area-inset-bottom))",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
