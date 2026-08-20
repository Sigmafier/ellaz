import { createRoot, type Root } from "react-dom/client";
import { DEFAULT_LOCALE, loadDict } from "@i18n/index";
import type { PageLocale } from "@i18n/locales";
import { analytics, startCloudSync } from "@sdk/index";
import { Boards } from "./Boards";
import { fitStage } from "./fitStage";
import { GameHost } from "./GameHost";
import { World } from "./world/World";
import { WalletChip } from "./WalletChip";
import { audioPort } from "@sdk/audio";
import { iconNode } from "@ui/icons";
import { claimRestartSlot, hasRestart, onRestartChange, runRestart } from "@ui/gameTools";
import { DailyChip } from "./DailyChip";
import { homeHref } from "./paths";
import type { PageContext } from "./pageContext";

/**
 * Booting the app on a CONTENT page.
 *
 * React owns the children of exactly two elements here - `#game-frame` and
 * `#wallet-slot` - and nothing else on the page is ever reconciled. That is
 * not a convention, it is what makes hydration mismatch impossible: there is
 * no React copy of the prose to disagree with the emitted one.
 *
 * The poster is a SIBLING of the frame, so hiding it is a DOM attribute flip
 * rather than a React unmount. Putting it inside the frame would leave a node
 * React does not know about inside a tree it reconciles, which is the nested
 * root teardown bug in a different costume.
 *
 * This whole module is a LAZY `page-*` chunk. `/` never needs the room or the
 * game host, and a child landing there should not download either.
 */

/**
 * Someone on a metered or 2G-class connection is better served by being ASKED
 * than by a silent download they did not agree to. Everyone else gets the game
 * fetched in the first idle moment, which costs them nothing they could have
 * reacted to and keeps the fetch out of the way of first paint.
 */
function connectionIsStingy(): boolean {
  const c = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!c) return false;
  return c.saveData === true || /(^|-)2g$/.test(c.effectiveType ?? "");
}

/**
 * Start the game NOW, not on the next idle frame.
 *
 * Waiting for idle is the right instinct on a page whose main content is
 * something else - it keeps a background fetch out of the way of first paint.
 * This page is not that page: the visitor came for the game, and first paint
 * has ALREADY happened, because the poster is emitted HTML that needs no
 * JavaScript at all. So the wait bought nothing and cost a serialised gap
 * between two fetches, since the game's own chunk is only requested once
 * GameHost mounts.
 *
 * Data saver still gets the old behaviour, one branch up: their tap, their
 * bytes.
 */

/**
 * The wallet and the streak, into the one slot the emitter left for them.
 *
 * Both, from here, because `#wallet-slot` is the only element on an emitted
 * page that React owns besides the frame - the header around it is written once
 * and never reconciled. A second slot would mean a second emitter change and a
 * second thing to keep in step; a flex row inside this one costs neither.
 *
 * `DailyChip` renders null until there is a streak, so on a page belonging to a
 * player who has never finished a daily puzzle this is exactly what it was.
 */
function mountWallet(slot: HTMLElement | undefined, locale: PageLocale): Root | null {
  if (!slot) return null;
  const root = createRoot(slot);
  root.render(
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)" }}>
      <WalletChip bare />
      <DailyChip locale={locale} bare />
    </span>,
  );
  return root;
}

/**
 * Reveal and wire the header's full-screen control.
 *
 * The build emits it `hidden`, and it stays hidden unless this runs AND the
 * browser can actually do it. Two populations get nothing rather than a dead
 * button: a visitor with no JavaScript, and an iPhone - iOS Safari has no
 * Fullscreen API for an arbitrary element, only for a `<video>`. A control
 * that does nothing when tapped is worse than one that was never offered,
 * and on a platform whose audience is five-year-olds it is worse still,
 * because they will tap it repeatedly rather than conclude it is broken.
 *
 * Plain DOM on an element the emitter owns and React never reconciles - the
 * same arrangement as the poster, for the same reason.
 */
/**
 * Reveal and wire the header's mute control.
 *
 * Emitted `hidden` like the full-screen button, and for a related reason: the
 * build cannot know whether this player is muted, so a button drawn at build
 * time would draw the wrong glyph until the runtime corrected it. Hidden until
 * we can draw it right.
 *
 * Plain DOM on an element the emitter owns and React never reconciles - the
 * same arrangement as the poster and the full-screen button. `onMuteChange`
 * is what keeps the glyph honest when the mute is toggled somewhere else.
 */
function wireSound(): () => void {
  const button = document.querySelector<HTMLButtonElement>("[data-sound]");
  if (!button) return () => {};

  const paint = (muted: boolean) => {
    button.innerHTML = "";
    button.append(iconNode(muted ? "muted" : "sound"));
    button.setAttribute("aria-pressed", String(muted));
  };
  paint(audioPort.muted);
  button.hidden = false;
  button.addEventListener("click", () => audioPort.toggleMute());
  return audioPort.onMuteChange(paint);
}

/**
 * Reveal and wire the utility row's restart.
 *
 * Emitted `hidden` like the other two, and here it is not a cosmetic detail:
 * the build cannot know whether a game ever mounts, and a restart button that
 * restarts nothing is a dead control - the same failure as a full-screen
 * button on a browser with no API. `onRestartChange` reveals it when a game
 * fills the slot and hides it again when one unmounts.
 *
 * `claimRestartSlot` is what stops `GameChrome` drawing a SECOND one. It is
 * called whether or not the button is found, because the answer to "does this
 * page own the restart" is about the page, not about one query succeeding.
 */
function wireRestart(): () => void {
  claimRestartSlot();
  const button = document.querySelector<HTMLButtonElement>("[data-restart]");
  if (!button) return () => {};

  button.hidden = !hasRestart();
  button.addEventListener("click", () => runRestart());
  return onRestartChange((available) => {
    button.hidden = !available;
  });
}

function wireFullScreen(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-fullscreen]");
  const target = document.querySelector<HTMLElement>(".stage .box");
  if (!button || !target || typeof target.requestFullscreen !== "function") return;

  button.hidden = false;
  button.addEventListener("click", () => {
    // Fullscreen rejects for reasons outside our control (a permissions
    // policy, an iframe without allowfullscreen). Nothing here is worth
    // breaking the page over, so a refusal just leaves the game where it is.
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void target.requestFullscreen().catch(() => {});
  });
}

/** Where the in-game back control goes. Real history first, the home page as a floor. */
function exitTo(locale: PageLocale): () => void {
  return () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign(homeHref(locale));
  };
}

export function bootContentPage(ctx: PageContext): void {
  // Every emitted page stamps its own language, so this fallback is only ever
  // reached by a hand-edited or half-deployed document. DEFAULT_LOCALE rather
  // than a literal: the answer to "we could not tell" is the same everywhere,
  // and it moved to English with the root.
  const locale: PageLocale = ctx.locale ?? DEFAULT_LOCALE;
  const frame = ctx.frame;
  if (!frame) return;

  analytics.init();
  analytics.track("session_start", { locale });
  startCloudSync();
  // Always bare: every screen that has a wallet slot draws the pill around it
  // in the header (`.wallet-wrap`), so a chip carrying its own would be a
  // lozenge inside a lozenge. The room used to float its own chip over the
  // scene instead, which is exactly the per-screen difference this removed.
  mountWallet(ctx.walletSlot, locale);
  wireFullScreen();
  wireSound();
  wireRestart();

  const poster = document.getElementById("game-poster");
  const message = document.getElementById("game-msg");
  const button = document.getElementById("game-play") as HTMLButtonElement | null;

  /**
   * Fetch this page's chrome dictionary before anything mounts.
   *
   * A page locale is NOT static (see `STATIC_LOCALES` in `i18n/strings.ts` for
   * the 1,363 B gz that decided it), so without this the buttons inside a
   * Spanish game page resolve through English and stay there. Nothing throws;
   * the prose around them is perfect Spanish, which is what makes it invisible.
   *
   * Awaited BEFORE `createRoot`, which costs no flash at all: the poster is
   * still up and React has not rendered a thing. A failed fetch resolves false
   * and we mount anyway — English chrome beats no game.
   */
  const start = async () => {
    await loadDict(locale);
    poster?.setAttribute("hidden", "");

    // The game and the room get the whole first screen, which means a fixed
    // 100dvh box with overflow hidden - so a game taller than the window would
    // be CLIPPED rather than scrolled. fitStage scales it to what it was given.
    // The boards are a short column that never fills a screen and never needs
    // this, and their stage carries no full-height rule to fight with.
    const box = frame.closest<HTMLElement>(".stage .box");
    if (box && ctx.kind !== "boards") fitStage(frame, box);

    const root = createRoot(frame);
    root.render(
      ctx.kind === "world" ? (
        <World locale={locale} />
      ) : ctx.kind === "boards" ? (
        <Boards locale={locale} />
      ) : (
        <GameHost
          gameId={ctx.gameId ?? ""}
          locale={locale}
          onExit={exitTo(locale)}
          variant="page"
        />
      ),
    );
  };

  if (connectionIsStingy()) {
    // Their tap, their bytes. The button is already on the page and already
    // the right size; all that changes is the sentence beside it.
    if (message && poster) message.textContent = poster.dataset.saver ?? message.textContent;
    button?.addEventListener("click", () => {
      button.disabled = true;
      void start();
    });
    return;
  }

  // The emitted state is the honest one for a visitor with no JavaScript: a
  // real button and "the game needs a script". Now that a script is demonstrably
  // running, both can be replaced with the truth.
  if (button) button.hidden = true;
  if (message && poster) message.textContent = poster.dataset.loading ?? message.textContent;
  void start();
}
