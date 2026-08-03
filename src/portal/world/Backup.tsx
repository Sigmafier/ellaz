import { useEffect, useRef, useState } from "react";
import { cloudIdentity, cloudRestore, pushNow, wallet, type ProfileV1 } from "@sdk/index";
import { Button } from "@ui/components";
import { shake } from "@juice/index";

// The backup card — the one place this app talks to a grown-up.
//
// It sits at the BOTTOM of the World, under the shop, because it is not part of
// playing. A child never needs it; a parent setting up a second tablet, or
// recovering after a wipe, does.
//
// The copy does not pretend to be magic. There is no account, no email and no
// password, so the code IS the only way back — and a feature whose failure mode
// is "your child's room is gone forever" has to say what it needs, plainly,
// before it is needed.
//
// Restoring is the single destructive action in the whole app, so it is a
// three-step flow: look up the code, SEE what is in it, then confirm. A one-tap
// restore that silently replaced a full room with an empty one would be
// unrecoverable, and the child would be the one who noticed.

type Phase =
  | { kind: "idle" }
  | { kind: "typing" }
  | { kind: "looking" }
  | { kind: "missing" }
  | { kind: "found"; profile: ProfileV1 }
  | { kind: "done" }
  | { kind: "failed" };

export function Backup({ t }: { t: (key: string) => string }) {
  const [code, setCode] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const cardRef = useRef<HTMLDivElement>(null);

  // Ask for the code once the card is on screen. `alive` guards the state write
  // because a player can leave the World long before an 8-second request ends.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const identity = await cloudIdentity();
      if (!alive) return;
      if (identity) {
        setCode(identity.code);
        // Make sure the document behind the code actually exists before the
        // player writes it on a Post-it. A code that resolves to nothing is
        // worse than no code, because they would only find out on the day they
        // needed it.
        void pushNow();
      } else {
        setOffline(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const lookUp = async () => {
    setPhase({ kind: "looking" });
    const found = await cloudRestore(typed);
    if (!found) {
      setPhase({ kind: "missing" });
      if (cardRef.current) shake(cardRef.current, 4, 180);
      return;
    }
    setPhase({ kind: "found", profile: found });
  };

  const confirm = (profile: ProfileV1) => {
    const saved = wallet.adoptRestored(profile);
    setPhase({ kind: saved ? "done" : "failed" });
    // Mirror the restored profile straight back up, so this device's own
    // document matches what the player now sees. Without it the next push
    // would be the first thing to write it, up to a debounce later.
    if (saved) void pushNow();
  };

  return (
    <div
      ref={cardRef}
      style={{
        marginTop: 24,
        padding: "16px 18px",
        borderRadius: "var(--radius-2)",
        background: "var(--surface-2)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden="true" style={{ fontSize: 22 }}>
          🔑
        </span>
        <h2 style={{ fontSize: 17, margin: 0 }}>{t("keepProgress")}</h2>
      </div>

      {/* The code itself. Pinned LTR and monospaced: it is copied character by
          character onto paper, and an RTL run would reverse the groups. */}
      <div
        dir="ltr"
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 2,
          textAlign: "center",
          padding: "14px 0 10px",
          color: offline ? "var(--text-dim)" : "var(--text)",
        }}
      >
        {code ?? (offline ? "—" : "…")}
      </div>

      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 12px" }}>
        {offline ? t("backupOffline") : t("backupHint")}
      </p>

      {phase.kind === "idle" ? (
        <Button variant="ghost" onClick={() => setPhase({ kind: "typing" })}>
          {t("haveCode")}
        </Button>
      ) : null}

      {phase.kind !== "idle" && phase.kind !== "found" && phase.kind !== "done" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            dir="ltr"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={t("enterCode")}
            aria-label={t("enterCode")}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={12}
            style={{
              flex: "1 1 160px",
              minWidth: 0,
              fontFamily: "ui-monospace, monospace",
              fontSize: 18,
              letterSpacing: 2,
              padding: "10px 12px",
              borderRadius: "var(--radius-1)",
              border: "2px solid var(--surface)",
              background: "var(--surface)",
              color: "var(--text)",
            }}
          />
          <Button onClick={lookUp} disabled={phase.kind === "looking" || typed.trim() === ""}>
            {phase.kind === "looking" ? "…" : t("lookUp")}
          </Button>
        </div>
      ) : null}

      {phase.kind === "missing" ? (
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 10 }}>{t("codeNotFound")}</p>
      ) : null}

      {phase.kind === "found" ? (
        <div style={{ marginTop: 12 }}>
          {/* Show what is in there BEFORE replacing anything. This is the step
              that makes the action recoverable-by-not-doing-it. */}
          <p style={{ fontSize: 14, margin: "0 0 4px" }}>
            {t("restoreFound")}{" "}
            <strong>
              {phase.profile.coins} {t("coinsLabel")} · {phase.profile.stars}{" "}
              {t("starsEarned")} · {phase.profile.owned.length} {t("itemsLabel")}
            </strong>
          </p>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 10px" }}>
            {t("restoreReplaces")}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => confirm(phase.profile)}>{t("restoreConfirm")}</Button>
            <Button variant="ghost" onClick={() => setPhase({ kind: "idle" })}>
              {t("restoreCancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {phase.kind === "done" ? (
        <p style={{ fontSize: 14, marginTop: 10 }}>🎉 {t("restoreDone")}</p>
      ) : null}

      {phase.kind === "failed" ? (
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 10 }}>
          {t("restoreFailed")}
        </p>
      ) : null}
    </div>
  );
}
