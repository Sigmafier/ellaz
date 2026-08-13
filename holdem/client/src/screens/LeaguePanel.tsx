import { useEffect } from "react";
import { socket } from "../net/socket";
import { useApp } from "../state/store";
import { Sheet } from "./RoomScreen";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";

export function LeaguePanel({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const { ledger, isHost } = useApp();
  const t = makeT(locale);

  useEffect(() => {
    socket.getLedger();
  }, []);

  return (
    <Sheet onClose={onClose}>
      <strong style={{ fontSize: 18 }}>{t("league")}</strong>
      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ color: "var(--ink-dim)", textAlign: "start" }}>
              <th style={{ textAlign: "start", padding: 6 }}></th>
              <th style={{ textAlign: "start", padding: 6 }}>{t("net")}</th>
              <th style={{ textAlign: "start", padding: 6 }}>{t("hands")}</th>
              {isHost && <th />}
            </tr>
          </thead>
          <tbody>
            {(ledger ?? []).map((r) => (
              <tr key={r.playerId} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: 6, fontWeight: 700 }}>
                  <bdi>{r.name}</bdi>
                </td>
                <td dir="ltr" style={{ padding: 6, color: r.net >= 0 ? "var(--accent)" : "var(--danger)", fontWeight: 800, textAlign: "start" }}>
                  {r.net >= 0 ? "+" : ""}
                  {r.net}
                </td>
                <td style={{ padding: 6, color: "var(--ink-dim)" }}>{r.handsPlayed}</td>
                {isHost && (
                  <td style={{ padding: 6 }}>
                    <button
                      className="btn ghost"
                      style={{ minHeight: 32, fontSize: 12, padding: "0 8px" }}
                      onClick={() => socket.hostRelink(r.playerId)}
                      title="relink device"
                    >
                      🔗
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {(ledger ?? []).length === 0 && <span style={{ color: "var(--ink-dim)" }}>—</span>}
      </div>
      <RelinkToast />
    </Sheet>
  );
}

function RelinkToast() {
  const { relink } = useApp();
  if (!relink) return null;
  return (
    <div dir="ltr" style={{ background: "var(--surface-2)", borderRadius: "var(--radius-1)", padding: 10, fontWeight: 800, letterSpacing: 2, textAlign: "center" }}>
      {relink.code}
    </div>
  );
}
