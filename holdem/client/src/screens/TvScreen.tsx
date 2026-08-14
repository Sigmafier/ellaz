// The shared-screen "TV table": a read-only spectator client for game night.
// The TV shows the felt, the pot and everyone's public state; phones stay the
// private controllers. The server's redaction already guarantees a spectator
// socket can never receive a hole card.

import { useEffect } from "react";
import { socket } from "../net/socket";
import { useApp } from "../state/store";
import { Table } from "../table/Table";
import { attachJuice } from "../juice/moments";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";
import { Logo } from "../ui/icons";

export function TvScreen({ code, locale }: { code: string; locale: Locale }) {
  const app = useApp();
  const t = makeT(locale);

  useEffect(() => {
    socket.connect(code, { spectate: true });
    const offJuice = attachJuice();
    return () => {
      offJuice();
      socket.disconnect();
    };
  }, [code]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          background: "var(--surface)",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Logo size={19} />
          {t("appName")}
        </span>
        <span style={{ color: "var(--ink-dim)", fontSize: 15 }}>{t("spectating")}</span>
        <span dir="ltr" style={{ fontSize: 26, fontWeight: 900, letterSpacing: 5, color: "var(--gold)" }}>
          {code}
        </span>
      </header>
      {app.view ? (
        <Table locale={locale} spectator />
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-dim)" }}>
          {t("connecting")}
        </div>
      )}
    </div>
  );
}
