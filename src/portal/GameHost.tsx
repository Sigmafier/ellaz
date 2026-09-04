import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { backArrow, makeT, pageLocaleFor, shippedLocaleFor, textFor } from "@i18n/index";
import type { AppLocale } from "@i18n/locales";
import { createHostControls, audioPort, wallet } from "@sdk/index";
import { Button, IconButton } from "@ui/components";
import { hasRestart, runRestart } from "@ui/gameTools";
import { Icon } from "@ui/icons";
import {
  getCurrentGame,
  registerCurrentGame,
  registerShareChipHandler,
  resultLineFor,
} from "@shared/shareResult";
import { entryFor } from "./catalog";
import { gameHref } from "./paths";
import { attachSelectionDismissal, dismissSelection } from "./selectionDismiss";
import type { ShareSheetProps } from "./ShareSheet";
import { WalletChip } from "./WalletChip";

/**
 * Which platform controls the host's own bar draws, per variant.
 *
 * A DECISION, exported so `embed-context.test.ts` can ask it without a DOM.
 *
 * - `page`: nothing - the emitted header draws every platform control.
 * - `app`: the standalone single-game bundle. No emitted header at all, so
 *   this bar is the ONLY platform chrome and draws back, the wallet and mute.
 * - `embed`: the same bundle inside a STRANGER's iframe. Back goes, because
 *   inside an iframe there is nowhere for it to go: the visitor did not
 *   navigate here, so back either does nothing or walks the host's own
 *   history, and the frame already carries one deliberate way out with
 *   `target="_top"`. The wallet goes because it is a PLAYER's - coins earned
 *   on ellaz.fun, drawn on somebody else's site for somebody who has not
 *   earned them. Mute stays: sound is the one control a framed visitor
 *   genuinely needs, and nothing on the host's page offers it.
 *
 *   Verified on the built bundle in a real iframe (2026-09-02): the frame
 *   renders 0 back buttons, 1 mute button and no wallet text.
 *
 * `app` is unchanged by the embed case, on purpose: the standalone bundles on
 * itch and Newgrounds draw exactly what they drew before.
 */
export type HostVariant = "app" | "page" | "embed";

export interface HostChrome {
  /** Whether the bar exists at all. */
  bar: boolean;
  back: boolean;
  wallet: boolean;
  mute: boolean;
}

export function hostChrome(variant: HostVariant): HostChrome {
  if (variant === "page") return { bar: false, back: false, wallet: false, mute: false };
  if (variant === "embed") return { bar: true, back: false, wallet: false, mute: true };
  return { bar: true, back: true, wallet: true, mute: true };
}

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
   * "embed" is the app inside a stranger's iframe: mute only - see `hostChrome`.
   */
  variant?: HostVariant;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = makeT(locale);

  // The win-screen "Share my result" chip. `null` while nothing has been won
  // yet (or the game has since exited); `open` switches the SAME state into
  // the full sheet rather than tracking a second boolean the two could drift
  // out of sync on.
  const [share, setShare] = useState<{
    resultLine?: string;
    open: boolean;
    /**
     * Offer to start another game. TWO facts, and both are read at the moment
     * the win fires rather than at render: the run actually ENDED (see
     * `WinShareEvent.runEnded` - a milestone is not a finished board), and a
     * game was mounted with a restart in the slot. A module registry is not
     * reactive, so reading it in the render body would be a value nothing
     * re-renders on; the win itself is the render, so this is the moment.
     */
    playAgain: boolean;
  } | null>(null);
  const [shareSheetMod, setShareSheetMod] = useState<{
    ShareSheet: ComponentType<ShareSheetProps>;
  } | null>(null);

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

  // The chip's own plumbing - who is playing, and what to do when they win.
  // A separate effect from the mount above: it needs only gameId/locale, and
  // folding it into that effect would tie the chip's lifecycle to a dependency
  // array that already has other jobs (onExit) this has no business reacting to.
  //
  // Skipped entirely on the "app" variant - see `registerCurrentGame`'s caller
  // contract in shareResult.ts. That variant is the standalone single-game
  // bundle (itch.io, Newgrounds), built by its own vite config with no real
  // `/games/<id>/` page for `gameHref` to point at - a chip there would offer
  // to share a URL nobody could open. "page" and "embed" both run inside THIS
  // build, where it resolves to the real site.
  useEffect(() => {
    if (variant === "app") return;
    let cancelled = false;

    entryFor(gameId).then((entry) => {
      if (cancelled || !entry) return;
      registerCurrentGame({
        gameId,
        title: textFor(entry.meta.title, locale),
        emoji: entry.meta.emoji,
        url: `${location.origin}${gameHref(gameId, pageLocaleFor(locale))}`,
      });
    });

    registerShareChipHandler((event) => {
      // A WIN THAT DOES NOT END THE RUN SHOWS NOTHING.
      //
      // Until 2026-09-04 the chip appeared on every win and only the Play
      // again BUTTON was gated, so a match3 round - and a milestone in snake,
      // spell, reaction or pet - put a "share my result" chip over a game that
      // was still being played. Reported as "the play again / share should
      // show only upon completion and not in continuous plays... when the game
      // continues we dont need this" (issue #27); the operator chose to have
      // it gone in every game rather than in match3 alone, so that the
      // platform answers this situation one way and not two.
      //
      // What a mid-run win still does is unchanged: the confetti, the sound
      // and every coin. This is the chip only.
      if (!event.runEnded) return;
      const resultLine = resultLineFor(event.score, event.isPersonalBest, {
        best: t("shareResultBest"),
        scored: t("shareResultScored"),
      });
      setShare({ resultLine, open: false, playAgain: hasRestart() });
    });

    return () => {
      cancelled = true;
      registerCurrentGame(null);
      registerShareChipHandler(null);
      // A game that has exited must not leave its last win's chip floating
      // over whatever the portal shows next.
      setShare(null);
    };
    // `t` is rebuilt every render; it changes only with `locale`, which is
    // already a dependency - the same reasoning ShareSheet.tsx's own memo
    // holds itself to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, locale, variant]);

  /**
   * Opens the sheet. The chip's own label already promised nothing about
   * WHICH way it will share - `ShareSheet` decides that itself, from
   * capability, before it shows a button. This only has to get the module
   * loaded and the game it should describe.
   */
  async function openShareSheet() {
    audioPort.play("tap");
    let mod = shareSheetMod;
    if (!mod) {
      try {
        mod = await import("./ShareSheet");
      } catch {
        // A failed chunk fetch - an open tab meeting a new deploy - costs the
        // sheet and nothing else. The chip stays up, so a retry tap tries again.
        return;
      }
      setShareSheetMod(mod);
    }
    setShare((s) => (s ? { ...s, open: true } : s));
  }

  // Read once per render, only when it will actually be used - `getCurrentGame`
  // is a cheap module-ref read, but three separate calls scattered through the
  // JSX below would read three different instants if a win landed mid-render.
  const sheetGame = share?.open ? getCurrentGame() : null;

  const onPage = variant === "page";
  const chrome = hostChrome(variant);
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
      {chrome.bar && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: onPage ? "6px 10px" : "10px 12px",
          flexShrink: 0,
        }}
      >
        {chrome.back && (
          <IconButton ariaLabel="back" onClick={onExit}>
            {backArrow(locale)}
          </IconButton>
        )}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {chrome.wallet && <WalletChip />}
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
        {chrome.mute && (
          <IconButton ariaLabel="mute" active={muted} onClick={() => audioPort.toggleMute()}>
            {muted ? "🔇" : "🔊"}
          </IconButton>
        )}
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

      {/* The win-screen chip. NEVER modal, and IN FLOW rather than floating -
          it reserves its own strip at the end of the game area instead of
          being painted over one.

          IT WAS ABSOLUTE, AND IT COVERED A CONTROL. Measured in a browser on
          the built bundle, 2026-09-03: anchored to `bottom: max(12px, ...)` of
          this container at zIndex 20, the pill landed on `memory`'s "Two
          players" button (chip 526-556, button 512-549) and, on the same
          reading of `maze`, across the direction pad's DOWN arrow (chip
          443-495, arrow 432-492). Every DirectionPad game puts its steering at
          the bottom centre of this box, which is exactly where a centred
          floating pill goes. Nothing in the suite could see it: a chip that
          covers a button renders, mounts, tests and type-checks perfectly.

          So the rule here is not "pick a safer offset" - it is that this chip
          does not get to occupy space a game is already using. In flow, the
          same overlap check returns zero covered controls.

          Appears only through winMoment(), which never fires on a loss - see
          .claude/rules for "no fail-punishment". */}
      {share && !share.open && (
        <div
          style={{
            flex: "0 0 auto",
            display: "flex",
            justifyContent: "center",
            // WRAP: one button never needed it, two do. "Play again" beside
            // "Share my result" is the widest pair in any of eleven languages,
            // and a row that cannot wrap answers by clipping a word.
            flexWrap: "wrap",
            gap: 10,
            padding: "10px 0 max(10px, env(safe-area-inset-bottom))",
          }}
        >
          {/* PLAY AGAIN, and it is the reason this strip exists at all.
              Operator report, filed as issue #22: "Show a win screen with
              restart and share so users have actions to do when game is
              finished." Photographed on the built artifact first
              (`scripts/repro/shoot-parking-win.mjs`): the largest thing on a
              won board was the game's own Step back button, DIMMED to 0.42
              because a finished board has nothing to take back, and the only
              way to play again was a 40px icon in the page header.

              It restarts through the SAME slot the header button uses
              (`@ui/gameTools`), never a second implementation - two ways to
              start a game drift, and the one nobody plays drifts first. */}
          {share.playAgain && (
            <Button
              onClick={() => runRestart()}
              ariaLabel={t("playAgain")}
              // --brand-strong + --on-brand, not the Button's own primary pair.
              // `Button`'s primary is `--text` on `--brand-fill`, which is
              // 2.53:1 in NIGHT - night's --brand-fill is a gradient, and no
              // ink clears 4.5 across it. This pair is flat and measures
              // 5.87 market / 4.86 night; ReportSheet's Send already ships it.
              // See .claude/rules/a-contrast-floor-is-a-floor-not-a-target.md.
              // The app-wide fix to `Button` is a separate, older job the
              // operator has parked - this is one new control, not a sweep.
              style={{ background: "var(--brand-strong)", color: "var(--on-brand)" }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Icon name="redo" />
                {t("playAgain")}
              </span>
            </Button>
          )}
          {/* Ghost only once it is standing beside a primary. Alone - which is
              every mid-run milestone - it stays the filled button it has
              always been. */}
          <Button
            variant={share.playAgain ? "ghost" : "primary"}
            onClick={() => void openShareSheet()}
            ariaLabel={t("shareResult")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Icon name="share" />
              {t("shareResult")}
            </span>
          </Button>
        </div>
      )}

      {share?.open && shareSheetMod && (
        <shareSheetMod.ShareSheet
          locale={locale}
          game={{
            gameId: sheetGame?.gameId ?? gameId,
            title: sheetGame?.title ?? "",
            emoji: sheetGame?.emoji,
            resultLine: share.resultLine,
          }}
          url={sheetGame?.url ?? ""}
          onClose={() => setShare((s) => (s ? { ...s, open: false } : s))}
        />
      )}
    </div>
  );
}
