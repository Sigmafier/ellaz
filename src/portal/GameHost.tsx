import { useEffect, useRef, useState } from "react";
import { makeT, type Locale } from "@i18n/index";
import { createHostControls, audioPort, wallet } from "@sdk/index";
import { Button, IconButton } from "@ui/components";
import { findEntry } from "./catalog";
import { WalletChip } from "./WalletChip";

// Loads a game module, builds its GameContext, mounts it into a neutral element,
// and wires portal chrome (back button, mute). Handles pause on tab-hide and
// resize; tears the game down fully on exit (mount/unmount leak safety).
export function GameHost({
  gameId,
  locale,
  onExit,
  variant = "app",
}: {
  gameId: string;
  locale: Locale;
  onExit: () => void;
  /**
   * "app" fills a viewport and owns its own chrome. "page" sits inside the
   * frame on a game page, where the breadcrumb above it is already the way
   * back and the wallet chip is already in the page header - so it renders
   * neither, and two of each in one viewport reads as a bug rather than as
   * emphasis. Mute stays, because nothing else on the page offers it.
   */
  variant?: "app" | "page";
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = makeT(locale);

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

  const onPage = variant === "page";

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: onPage ? "6px 10px" : "10px 12px",
          flexShrink: 0,
        }}
      >
        {!onPage && (
          <IconButton ariaLabel="back" onClick={onExit}>
            {locale === "he" ? "→" : "←"}
          </IconButton>
        )}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {!onPage && <WalletChip />}
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            alignContent: "center",
            gap: 14,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 40 }} aria-hidden>
            {error === "not-found" ? "🔍" : "😵"}
          </div>
          {/* A glyph alone is not a message. Before this, a failed chunk left a
              child looking at a dizzy face with no words and no way forward but
              the back arrow — and the most likely cause (an open tab meeting a
              new deploy) is one reload away from fixed. */}
          <div style={{ fontSize: 18, fontWeight: 600, maxWidth: "22ch" }}>
            {t(error === "not-found" ? "gameMissing" : "gameLoadFailed")}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {error !== "not-found" && (
              <Button onClick={() => window.location.reload()}>{t("tryAgain")}</Button>
            )}
            <IconButton ariaLabel={t("back")} onClick={onExit}>
              {locale === "he" ? "→" : "←"}
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}
