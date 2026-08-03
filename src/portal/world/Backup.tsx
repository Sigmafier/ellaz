import { useCallback, useEffect, useRef, useState } from "react";
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
// Two things here exist because the honest version of each is not the obvious
// one:
//
//   A CODE IS NOT OFFERED UNTIL A SAVE ACTUALLY LANDED. A backup code is
//   generated locally, so it exists whether or not anything reached the cloud.
//   Printing it the moment we have it would hand a parent a code to write on a
//   Post-it that restores nothing, and they would find that out on the one day
//   it mattered. So the save is awaited, and a failure says so and offers a
//   retry instead of a confident string of characters.
//
//   RESTORING SHOWS BOTH SIDES AND CAN BE TAKEN BACK. It is the only
//   destructive action in the app: look up the code, SEE what is arriving
//   AND what is here now, then confirm. Even then the replaced profile is kept,
//   so the parent who was holding the wrong tablet has a way back.

/** What we can honestly say about this device's backup right now. */
type Save =
  | { kind: "connecting" }
  | { kind: "offline" }
  /** Written down safely: the cloud has this device's progress. */
  | { kind: "saved"; code: string }
  /** We have a code, but nothing is behind it yet. */
  | { kind: "unsaved"; code: string };

type Phase =
  | { kind: "idle" }
  | { kind: "typing" }
  | { kind: "looking" }
  | { kind: "missing" }
  | { kind: "found"; incoming: ProfileV1; current: ProfileV1 }
  | { kind: "done"; canUndo: boolean }
  | { kind: "undone" }
  | { kind: "failed" };

export function Backup({ t }: { t: (key: string) => string }) {
  const [save, setSave] = useState<Save>({ kind: "connecting" });
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const cardRef = useRef<HTMLDivElement>(null);
  // A player can leave the World long before an 8-second request ends, and the
  // retry button can fire a second attempt while the first is still in flight.
  const alive = useRef(true);

  const backUp = useCallback(async () => {
    setSave({ kind: "connecting" });
    // A backup needs something to back up. The smallest true thing is who the
    // player is, and naming is idempotent — the World already does this, but
    // doing it here too means the card does not depend on which effect ran
    // first for its answer to be right.
    wallet.ensureName();

    const identity = await cloudIdentity();
    if (!alive.current) return;
    if (!identity) {
      setSave({ kind: "offline" });
      return;
    }
    // Shown straight away, but as UNSAVED — the honest state, since at this
    // instant the code is a local string and nothing is behind it. Holding it
    // back until the upload finishes would mean up to two request timeouts of
    // blank card on a bad connection; showing it as a promise already kept
    // would be the lie this whole card exists to avoid.
    setSave({ kind: "unsaved", code: identity.code });

    const stored = await pushNow();
    if (!alive.current) return;
    setSave({ kind: stored ? "saved" : "unsaved", code: identity.code });
  }, []);

  useEffect(() => {
    alive.current = true;
    void backUp();
    return () => {
      alive.current = false;
    };
  }, [backUp]);

  const lookUp = async () => {
    setPhase({ kind: "looking" });
    const incoming = await cloudRestore(typed);
    if (!incoming) {
      setPhase({ kind: "missing" });
      if (cardRef.current) shake(cardRef.current, 4, 180);
      return;
    }
    // Captured now, so the confirm screen shows the two profiles the decision
    // is actually being made between.
    setPhase({ kind: "found", incoming, current: wallet.snapshot() });
  };

  const confirm = (incoming: ProfileV1) => {
    const saved = wallet.adoptRestored(incoming);
    setPhase(saved ? { kind: "done", canUndo: wallet.canUndoRestore() } : { kind: "failed" });
    // Mirror the restored profile straight back up, so this device's own
    // document matches what the player now sees. Without it the next push
    // would be the first thing to write it, up to a debounce later.
    if (saved) void pushNow();
  };

  const undo = () => {
    setPhase(wallet.undoRestore() ? { kind: "undone" } : { kind: "failed" });
    void pushNow();
  };

  const code = save.kind === "saved" || save.kind === "unsaved" ? save.code : null;

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
          character onto paper, and an RTL run would reverse the groups. Dimmed
          whenever it is not yet backed by anything, so it never looks like a
          promise the cloud has not made. */}
      <div
        dir="ltr"
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 2,
          textAlign: "center",
          padding: "14px 0 10px",
          color: save.kind === "saved" ? "var(--text)" : "var(--text-dim)",
        }}
      >
        {code ?? (save.kind === "offline" ? "—" : "…")}
      </div>

      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 12px" }}>
        {save.kind === "saved"
          ? t("backupHint")
          : save.kind === "unsaved"
            ? t("backupUnsaved")
            : save.kind === "offline"
              ? t("backupOffline")
              : "…"}
      </p>

      {save.kind === "unsaved" || save.kind === "offline" ? (
        <div style={{ marginBottom: 12 }}>
          <Button variant="ghost" onClick={() => void backUp()}>
            {t("backupRetry")}
          </Button>
        </div>
      ) : null}

      {phase.kind === "idle" ? (
        <Button variant="ghost" onClick={() => setPhase({ kind: "typing" })}>
          {t("haveCode")}
        </Button>
      ) : null}

      {phase.kind === "typing" || phase.kind === "looking" || phase.kind === "missing" ? (
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
          {/* BOTH sides, before replacing anything. Showing only what arrives
              tells a parent what they gain and hides what they spend. */}
          <Tally label={t("restoreHere")} profile={phase.current} t={t} />
          <Tally label={t("restoreFound")} profile={phase.incoming} t={t} />
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "8px 0 10px" }}>
            {t("restoreReplaces")}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => confirm(phase.incoming)}>{t("restoreConfirm")}</Button>
            <Button variant="ghost" onClick={() => setPhase({ kind: "idle" })}>
              {t("restoreCancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {phase.kind === "done" ? (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 14, margin: "0 0 8px" }}>🎉 {t("restoreDone")}</p>
          {/* Offered only when there is genuinely something to go back to — a
              device that refused to keep the copy gets no button rather than
              one that does nothing. */}
          {phase.canUndo ? (
            <Button variant="ghost" onClick={undo}>
              {t("restoreUndo")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {phase.kind === "undone" ? (
        <p style={{ fontSize: 14, marginTop: 10 }}>{t("restoreUndone")}</p>
      ) : null}

      {phase.kind === "failed" ? (
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 10 }}>
          {t("restoreFailed")}
        </p>
      ) : null}
    </div>
  );
}

/** One line of "what is in this profile", in the units a child recognises. */
function Tally({
  label,
  profile,
  t,
}: {
  label: string;
  profile: ProfileV1;
  t: (key: string) => string;
}) {
  return (
    <p style={{ fontSize: 14, margin: "0 0 4px" }}>
      <span style={{ color: "var(--text-dim)" }}>{label}</span>{" "}
      <strong>
        {profile.coins} {t("coinsLabel")} · {profile.stars} {t("starsEarned")} ·{" "}
        {profile.owned.length} {t("itemsLabel")}
      </strong>
    </p>
  );
}
