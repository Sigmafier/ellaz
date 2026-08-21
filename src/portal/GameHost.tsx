import { useEffect, useRef, useState } from "react";
import { backArrow, makeT, shippedLocaleFor } from "@i18n/index";
import type { AppLocale } from "@i18n/locales";
import { createHostControls, audioPort, wallet } from "@sdk/index";
import { Button, IconButton } from "@ui/components";
import { entryFor } from "./catalog";
import { attachSelectionDismissal, dismissSelection } from "./selectionDismiss";
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
  locale: AppLocale;
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
    const el = mountRef.current;
    if (!el) {
      setError("not-found");
      return;
    }

    // Narrowed here, at the boundary: the interface may be speaking one of
    // eleven languages and a game's own label tables are written in three. A
    // Portuguese player gets English game strings rather than `undefined`.
    const host = createHostControls(gameId, shippedLocaleFor(locale), el);
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

    // A highlight the player left somewhere else - the prose under the frame on
    // a game page, the header, the home screen they came from - paints straight
    // across the board and survives every gesture the game makes, because the
    // board is `user-select: none` and so cannot take the selection off it.
    // Cleared once as the game opens, then on every touch of the board. See
    // `selectionDismiss.ts`.
    dismissSelection(window.getSelection());
    const detachSelectionDismissal = attachSelectionDismissal(el, window);

    // `entryFor`, not `findEntry`: the shell only carries metadata for the games
    // above the fold, so a below-the-fold game is absent from the catalogue until
    // `gamesRest` lands. Resolving it synchronously would report "we couldn't
    // find that game" for 18 of 33 games - a real, permanent-looking error on a
    // game that exists and works. It fetches the rest only when that is what is
    // missing, and returns undefined for an id the roster genuinely does not
    // hold. The fetch runs beside the game's own chunk, not before it.
    entryFor(gameId)
      .then((entry) => {
        if (cancelled) return undefined;
        if (!entry) {
          setError("not-found");
          return undefined;
        }
        return entry.load();
      })
      .then(async (loaded) => {
        if (cancelled || !loaded) return;
        const { default: gameModule } = loaded;
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
      detachSelectionDismissal();
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
  // WHO DRAWS BACK AND MUTE depends on the variant, and it no longer depends on
  // whether the game owns its chrome.
  //
  // On a PAGE the emitted header draws both - they are platform controls and
  // that is where platform controls live now
  // (.claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md), so
  // this bar would be a second mute button in the same viewport.
  //
  // On the APP variant - the standalone single-game bundle, which has no
  // emitted header at all - this bar is the ONLY platform chrome there is, so
  // it draws back and mute. It does NOT draw restart: <GameChrome> has that
  // one again, in the game panel where the rule puts it, and every game in the
  // catalogue renders <GameChrome>.

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {!onPage && (
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
            {backArrow(locale)}
          </IconButton>
        )}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {!onPage && <WalletChip />}
        </div>
        {/* `active` marks MUTED, not sound-on. Two reasons, and both were wrong
            the other way round. Visually, sound-on is the default state, and
            painting the default in --brand made a secondary control the loudest
            thing on a game page - on a content page it is the ONLY control in
            this row (back and wallet are hidden there), so it read as a stray
            pink block in the corner. Semantically, `active` drives
            `aria-pressed`, and on a button labelled "mute" pressed has to mean
            muting is engaged; it announced the exact opposite. The glyph already
            carries the state either way, so the emphasis is free to go to the
            unusual case. */}
        <IconButton ariaLabel="mute" active={muted} onClick={() => audioPort.toggleMute()}>
          {muted ? "🔇" : "🔊"}
        </IconButton>
      </div>
      )}

      <div
        ref={mountRef}
        // `ellaz-game-stage` is what makes a game unselectable, and it belongs
        // HERE rather than on each board: this is the one element every game
        // mounts inside, so the level toggle, the stat row and the footer are
        // covered too - and those, not the board, were the ones still selecting
        // (measured: a drag across sudoku's header took `"Level\nHard\n5/6"`).
        // `user-select` inherits, so the whole subtree comes with it.
        className="ellaz-scroll ellaz-game-stage"
        style={{
          flex: 1,
          minHeight: 0, // flex child must allow shrink for overflow-y to scroll
          display: "flex",
          // `safe center`, and the `safe` is the whole point.
          //
          // Games fall into two kinds and no CSS can tell them apart. A FLUID
          // game (snake's Phaser canvas) sizes itself to whatever the stage
          // offers, so it always fills. A CAPPED game (memory's board is
          // min(92vw, 72vh, 460px)) stops at its cap and leaves the rest over -
          // 159px of it on a 1280x900 desktop, all of it below the board,
          // because this used to say `flex-start`.
          //
          // Shrinking the stage to hug the game would fix the capped ones and
          // SHRINK the fluid ones: snake's canvas reads its parent's height, so
          // a shorter stage means a smaller game. Centring costs a filling game
          // nothing (it has nothing to centre) and turns a capped game's dead
          // tail into symmetric framing.
          //
          // Plain `center` would be a bug: when the game is TALLER than the
          // stage, centring overflows both ends and the top becomes unreachable
          // by scroll. Measured in an isolated container - an 800px child in a
          // 200px flex box lands at top -300 under `center` and at 0 under both
          // `safe center` and `flex-start`, with and without overflow-y:auto.
          // `safe` falls back to start in exactly that case. A browser that does
          // not understand it drops the declaration and stretches, which is no
          // worse than what this replaced.
          //
          // Measuring this INSIDE the mount does not work and it looks like it
          // does: appending a tall probe child grows the mount (it is flex:1
          // with min-height:0), so the overflow the probe meant to create never
          // exists and `center` reports a harmless 0. Isolate the geometry.
          alignItems: "safe center",
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
              {backArrow(locale)}
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}
