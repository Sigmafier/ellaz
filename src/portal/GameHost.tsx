import { useEffect, useRef, useState } from "react";
import type { Locale } from "@i18n/index";
import { createHostControls, audioPort, wallet } from "@sdk/index";
import { IconButton } from "@ui/components";
import { findEntry } from "./catalog";
import { WalletChip } from "./WalletChip";

// Loads a game module, builds its GameContext, mounts it into a neutral element,
// and wires portal chrome (back button, mute). Handles pause on tab-hide and
// resize; tears the game down fully on exit (mount/unmount leak safety).
export function GameHost({
  gameId,
  locale,
  onExit,
}: {
  gameId: string;
  locale: Locale;
  onExit: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const entry = findEntry(gameId);
    const el = mountRef.current;
    if (!entry || !el) {
      setError("not-found");
      return;
    }

    const host = createHostControls(gameId, locale, el);
    (host.context as unknown as { __setRequestExit: (f: () => void) => void }).__setRequestExit(
      onExit,
    );
    setMuted(host.context.audio.muted);
    const offMute = host.context.audio.onMuteChange(setMuted);

    let mod: { unmount: () => void } | null = null;
    let cancelled = false;

    const onVisibility = () => {
      if (document.hidden) host.emitPause();
      else host.emitResume();
    };
    const onResize = () => host.emitResize(el.clientWidth, el.clientHeight);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    entry
      .load()
      .then(async ({ default: gameModule }) => {
        if (cancelled) return;
        await gameModule.mount(host.context);
        mod = gameModule;
        setLoading(false);
        // Explicit, once per successful mount: this is what feeds the home
        // screen's "keep playing" row. It is deliberately its OWN call rather
        // than something derived from the analytics or lifecycle events below
        // - those fire on their own schedule (analytics.levelComplete() fires
        // on every correct answer in math), and player state must never be a
        // side effect of a telemetry firehose. See
        // .claude/rules/rewards-economy-convention.md.
        //
        // After mount, not before: a game that failed to load must not leave a
        // card in the row that opens nothing.
        wallet.markPlayed(gameId);
        host.context.analytics.track("game_open", { game: gameId });
      })
      .catch((e) => {
        // Best-effort: a game that fails to load must not crash the portal.
        console.error("[ellaz] game load failed", e);
        setError("load-failed");
      });

    return () => {
      cancelled = true;
      offMute();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      host.context.lifecycle.gameplayStop();
      try {
        mod?.unmount();
      } catch (e) {
        console.error("[ellaz] unmount error", e);
      }
      // Do NOT clear el here: the game (React root or Phaser) owns and removes its
      // own DOM in unmount(); clearing it too would double-free the same nodes.
    };
  }, [gameId, locale, onExit]);

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          flexShrink: 0,
        }}
      >
        <IconButton ariaLabel="back" onClick={onExit}>
          {locale === "he" ? "→" : "←"}
        </IconButton>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <WalletChip />
        </div>
        <IconButton ariaLabel="mute" active={!muted} onClick={() => audioPort.toggleMute()}>
          {muted ? "🔇" : "🔊"}
        </IconButton>
      </div>

      <div
        ref={mountRef}
        className="ellaz-scroll"
        style={{
          flex: 1,
          minHeight: 0, // flex child must allow shrink for overflow-y to scroll
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      />

      {loading && !error && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <div style={{ fontSize: 28 }}>⏳</div>
        </div>
      )}
      {error && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", gap: 12 }}>
          <div style={{ fontSize: 40 }}>😵</div>
          <IconButton ariaLabel="back" onClick={onExit}>
            {locale === "he" ? "→" : "←"}
          </IconButton>
        </div>
      )}
    </div>
  );
}
