import { createRoot, type Root } from "react-dom/client";
import type { AppLocale, PageLocale } from "@i18n/locales";
import { DEFAULT_LOCALE, DIR, loadDict, pageLocaleFor } from "@i18n/index";
// `locales.ts` is a leaf that imports nothing, so reaching past the barrel for
// the two names it does not re-export costs the chunk nothing extra.
import { CANONICAL_LOCALE, isAppLocale } from "@i18n/locales";
import { analytics, startCloudSync } from "@sdk/index";
import { Boards } from "./Boards";
import { fitStage } from "./fitStage";
import { GameHost } from "./GameHost";
import { World } from "./world/World";
import { WalletChip } from "./WalletChip";
import { audioPort } from "@sdk/audio";
import { iconNode } from "@ui/icons";
import {
  claimRestartSlot,
  getPause,
  hasRestart,
  onPauseChange,
  onRestartChange,
  runRestart,
  type PauseSlot,
} from "@ui/gameTools";
import { homeHref } from "./paths";
import type { ShareSheetProps } from "./ShareSheet";
import type { PageContext, PageKind } from "./pageContext";
import { armCrashReporting, openReport, watchErrors } from "./openReport";

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
 * NO STREAK CHIP. Operator ruling 2026-08-25, after the same removal from the
 * home bar: "in the game channel itself, remove the firestreak from the header.
 * i still see it there."
 *
 * So the wallet is the only thing in this slot now, and the span around it is
 * kept rather than collapsed - it is the arrangement the emitter expects, and
 * removing it would be a second change to keep in step for no gain.
 *
 * WHAT THIS COSTS, stated rather than discovered later: the streak COUNT is
 * now displayed nowhere. The streak itself is untouched - it accrues, it pays
 * its milestones through `dueMilestone`/`paid`, and the daily card on the home
 * screen still marks the day done. Only the readout went.
 */
function mountWallet(slot: HTMLElement | undefined): Root | null {
  if (!slot) return null;
  const root = createRoot(slot);
  root.render(
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)" }}>
      <WalletChip bare />
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

/**
 * Reveal and wire the utility row's pause.
 *
 * It carries STATE where restart carries only a handler, so this repaints the
 * glyph and the label on every change - a pause button stuck on the pause icon
 * is the single most likely way for a player to lose track of which state they
 * are in, and it is why the game owns the flag rather than this.
 *
 * The two labels ride on `data-` attributes rather than being looked up in the
 * app dictionary: the runtime may not import `src/content`, and this button is
 * emitted by the build, so the strings come with it. Same arrangement as the
 * poster's three.
 */
function wirePause(): () => void {
  const button = document.querySelector<HTMLButtonElement>("[data-pause]");
  if (!button) return () => {};

  const paint = (state: PauseSlot | null) => {
    button.hidden = state === null;
    if (!state) return;
    button.innerHTML = "";
    button.append(iconNode(state.paused ? "play" : "pause"));
    const label = state.paused
      ? button.dataset.labelResume
      : button.dataset.labelPause;
    if (label) button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(state.paused));
  };
  paint(getPause());
  // Read the slot at CLICK time, never close over it: this listener is
  // attached once and the game replaces the slot object on every toggle.
  button.addEventListener("click", () => getPause()?.toggle());
  return onPauseChange(paint);
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


/**
 * The Design Bench, at `?design`.
 *
 * A layout gets approved as a picture and ships as a different half-done one,
 * because there is nowhere to LOOK at the real chrome and turn it. This mounts
 * the bench over the real page - real emitted header, real `GameChrome`, real
 * board - and it turns the tokens those already read.
 *
 * Three properties, and each is load-bearing:
 *
 * - The `import()` is INSIDE the guard, so a page without the param fetches
 *   not one byte of it. `src/lab/**` is its own `lab-*` chunk with a matching
 *   `globIgnores` entry, so it is neither precached nor modulepreloaded.
 *   See .claude/rules/precache-glob-sweeps-new-chunks.md.
 * - It mounts into a SIBLING of `#game-frame`, never a child. A node React
 *   does not know about inside a tree it reconciles is
 *   react-nested-root-teardown in a different costume - the same reason
 *   `#game-poster` sits beside the frame rather than in it.
 * - It is its own root, so nothing about the game's mount changes.
 */
function mountDesignBench(frame: HTMLElement): void {
  if (!/[?&]design\b/.test(location.search)) return;
  const host = document.createElement("div");
  host.id = "design-bench";
  frame.parentElement?.insertBefore(host, frame);
  void import("../lab/design/Drawer").then(({ Drawer }) => {
    createRoot(host).render(<Drawer />);
  });
}

/**
 * Reveal and wire the utility row's share.
 *
 * Emitted `hidden` like its three neighbours, and here the reason is the
 * BROWSER rather than the game: what a tap can do is decided by
 * `navigator.share` and the clipboard, neither of which the build can see. A
 * device that can do none of them still gets the sheet - it shows the link to
 * copy by hand - so the only case that keeps the button hidden is a page with
 * no game id, which is every screen except a game.
 *
 * The sheet's chunk is fetched INSIDE the handler, never at module scope. A
 * module-scope `lazy(() => import(...))` keeps the chunk in the production
 * module graph, so Vite writes a `<link rel="modulepreload">` for it and every
 * child downloads it on first paint - with the dynamic import, the named
 * `manualChunks` branch and the `globIgnores` entry all correctly in place and
 * nothing failing. That shipped live once already.
 * See `.claude/rules/precache-glob-sweeps-new-chunks.md`.
 *
 * Plain DOM on an element the emitter owns and React never reconciles, and a
 * root of its own for the sheet - the same arrangement as the poster.
 */
function wireShare(ctx: PageContext, locale: PageLocale): () => void {
  const button = document.querySelector<HTMLButtonElement>("[data-share]");
  // The NAME and the GLYPH come off the button the emitter wrote, never from
  // the roster. `metaFor(id)` would import all 33 metas into a chunk that needs
  // one of them, which `no-app-imports.test.ts` refuses by name - and the
  // emitter's title is in the PAGE's language, which `meta.title` could not be:
  // that record carries only the two SHIPPED locales.
  const title = button?.dataset.shareTitle ?? "";
  if (!button || !ctx.gameId || title === "") return () => {};
  const emoji = button.dataset.shareEmoji || undefined;

  let root: Root | null = null;
  let host: HTMLElement | null = null;

  const close = () => {
    // Deferred out of React's own commit, exactly as `reactHost.tsx` defers a
    // nested root's teardown: unmounting from inside a handler React is
    // running is how `removeChild: node is not a child` happens here.
    const dying = root;
    const node = host;
    root = null;
    host = null;
    queueMicrotask(() => {
      dying?.unmount();
      node?.remove();
    });
  };

  const open = async () => {
    if (root) return;
    let mod: { ShareSheet: React.ComponentType<ShareSheetProps> };
    try {
      mod = await import("./ShareSheet");
    } catch {
      // A failed chunk fetch - an open tab meeting a new deploy is the usual
      // cause - costs the share and nothing else.
      return;
    }
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    root.render(
      <mod.ShareSheet
        locale={locale}
        game={{ gameId: ctx.gameId!, title, emoji }}
        url={location.href.split(/[?#]/)[0]}
        onClose={close}
      />,
    );
  };

  button.hidden = false;
  button.addEventListener("click", () => void open());
  // The sheet's own teardown, not an unsubscribe - `wireSound` and `wirePause`
  // return one because they subscribe to a port and this does not. It is
  // returned rather than dropped so a caller that ever tears this page down has
  // a way to take the dialog with it.
  return close;
}

/**
 * Reveal and wire the utility row's reporter.
 *
 * Emitted `hidden` like the sound and full-screen buttons and for the same
 * reason: a document with no JavaScript running must not offer a button that
 * does nothing. The sheet itself is opened by `openReport`, which is the one
 * implementation Home and the crash card also call.
 */
function wireReport(ctx: PageContext, locale: PageLocale): void {
  const button = document.querySelector<HTMLButtonElement>("[data-report]");
  if (!button) return;
  button.hidden = false;
  button.addEventListener("click", () => {
    void openReport({ locale, gameId: ctx.gameId, frame: ctx.frame });
  });
}

/**
 * Whether a page may open the two connections that leave the machine on their
 * own - analytics and cloud sync.
 *
 * Every page of ours may. The EMBED page may not: it runs inside a third
 * party's page, and a frame that phones home from somebody else's site is the
 * one thing that makes a game un-listable on a portal. `src/standalone.tsx`
 * exists for exactly this reason and names all three calls in its header.
 *
 * HERE AND NOT IN `pageContext.ts`, and the difference is 89 B gz on every
 * child's first visit: `main.tsx` imports `pageContext` STATICALLY, so
 * anything added there lands in the shell, while this module is the lazy
 * `page-*` chunk that only a content page fetches. Measured both ways on one
 * tree - 55,067 B gz with the two helpers in `pageContext`, 54,978 B here,
 * against a 56,000 ceiling. A decision, not a placement.
 *
 * A named function rather than `ctx.kind !== "embed"` inline, so a test can
 * ask it without a DOM and so the answer has one owner.
 */
export function mayReachOut(kind: PageKind): boolean {
  return kind !== "embed";
}

/**
 * The language an embed was asked for: `?lang=xx`, validated against the
 * languages the app actually speaks, falling back to the canonical locale.
 *
 * Validated, never trusted. The value is typed by a stranger into a snippet
 * on their own site, so `?lang=<script>` and `?lang=klingon` both arrive here
 * and both mean English. `CANONICAL_LOCALE` rather than a literal, for the
 * same reason `bootContentPage` falls back to `DEFAULT_LOCALE`: the answer to
 * "we could not tell" has to be the same everywhere and it has moved once.
 */
export function requestedLocale(search: string): AppLocale {
  const value = new URLSearchParams(search).get("lang");
  return isAppLocale(value) ? value : CANONICAL_LOCALE;
}

/**
 * Reveal and wire the game page's "copy the code" button.
 *
 * It copies `textContent` of the `<pre>` the emitter wrote - the RAW snippet,
 * decoded by the browser from the escaped bytes in the document - and never
 * `innerHTML`, which would hand a stranger `&lt;iframe`. The reach board's copy
 * control got exactly that wrong once, and the difference is invisible in
 * every test that reads the page rather than the clipboard.
 *
 * With no clipboard - an older browser, an insecure context, a denied
 * permission - it selects the code instead and SAYS so on the button, so the
 * next thing to do is obvious. Emitted `hidden` like every other control the
 * runtime owns, for the same reason: without a script the button would do
 * nothing, and the code is already selectable by hand.
 */
function wireEmbedCopy(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-embed-copy]");
  const code = document.querySelector<HTMLElement>("[data-embed-code]");
  if (!button || !code) return;

  const idle = button.textContent ?? "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const say = (label: string | undefined) => {
    if (!label) return;
    button.textContent = label;
    clearTimeout(timer);
    timer = setTimeout(() => {
      button.textContent = idle;
    }, 2500);
  };
  const select = () => {
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    say(button.dataset.labelSelect);
  };

  button.hidden = false;
  button.addEventListener("click", () => {
    const text = code.textContent ?? "";
    const clipboard = navigator.clipboard;
    if (!clipboard || typeof clipboard.writeText !== "function") {
      select();
      return;
    }
    clipboard.writeText(text).then(
      () => say(button.dataset.labelCopied),
      // A refused write is the same situation as no clipboard at all.
      select,
    );
  });
}

/**
 * The embed page's one link, in the language the frame was asked for.
 *
 * The emitter wrote the anchor in the canonical locale with every page
 * locale's label and target on `data-say-*` / `data-to-*`; this picks the
 * pair for `pageLocaleFor(locale)` - the app may be speaking one of eleven
 * languages and the page it points at exists in four. Returns the href the
 * game's own back control should use, so the two ways out agree.
 */
function wireEmbedHome(locale: AppLocale): string | undefined {
  const link = document.getElementById("embed-home") as HTMLAnchorElement | null;
  if (!link) return undefined;
  const page = pageLocaleFor(locale);
  const key = `${page[0].toUpperCase()}${page.slice(1)}`;
  const say = link.dataset[`say${key}`];
  const to = link.dataset[`to${key}`];
  if (say) link.textContent = say;
  if (to) link.setAttribute("href", to);
  return link.href;
}

/**
 * Where the framed game's own back control goes: OUT of the frame.
 *
 * `window.top.location` rather than `window.location`: inside an iframe the
 * latter navigates the FRAME, which leaves the visitor on the host page
 * staring at our game page squeezed into 600px with no way back. A sandboxed
 * frame may refuse top navigation, in which case a new tab is the honest
 * fallback - never a navigation of the frame itself.
 */
function exitFrame(url: string | undefined): () => void {
  return () => {
    const target = url ?? location.href;
    try {
      (window.top ?? window).location.assign(target);
    } catch {
      window.open(target, "_blank", "noopener");
    }
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

  const embed = ctx.kind === "embed";
  // The language the game and its chrome speak. On our own pages that is the
  // page's language; inside a stranger's frame it is whatever `?lang=` asked
  // for, validated, because the embed document is emitted in one language and
  // answers in eleven.
  const appLocale: AppLocale = embed ? requestedLocale(location.search) : locale;
  if (embed) {
    document.documentElement.lang = appLocale;
    document.documentElement.dir = DIR[appLocale];
  }

  // The three calls that leave the machine on their own. NOT on an embed: it
  // runs inside a third party's page, and a frame that phones home from
  // somebody else's site is the one thing that makes a game un-listable on a
  // portal. `src/standalone.tsx` exists for exactly this reason and names all
  // three in its header; this is the same decision for the framed document,
  // decided by `mayReachOut` so a test can ask it without a DOM.
  if (mayReachOut(ctx.kind)) {
    analytics.init();
    analytics.track("session_start", { locale });
    startCloudSync();
  }
  // Always bare: every screen that has a wallet slot draws the pill around it
  // in the header (`.wallet-wrap`), so a chip carrying its own would be a
  // lozenge inside a lozenge. The room used to float its own chip over the
  // scene instead, which is exactly the per-screen difference this removed.
  mountWallet(ctx.walletSlot);
  watchErrors();
  armCrashReporting(locale);
  wireFullScreen();
  wireSound();
  wireReport(ctx, locale);
  // NOT on an embed. `wireRestart` CLAIMS the restart slot whether or not it
  // finds a button, and the embed page has no utility row - so claiming it
  // would take restart away from `GameChrome` and offer none in its place.
  // The app variant of `GameHost` draws its own chrome; this page adds none.
  if (!embed) {
    wireRestart();
    wirePause();
    wireShare(ctx, locale);
    wireEmbedCopy();
  }
  const exitHref = embed ? wireEmbedHome(appLocale) : undefined;

  mountDesignBench(frame);

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
    await loadDict(appLocale);
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
      ) : embed ? (
        // The embed variant: this frame has no emitted header, so the host's
        // own bar is the only chrome there is - and it draws MUTE alone. No
        // back arrow (inside an iframe it would navigate the host's page and
        // trap the visitor), no wallet (it belongs to a player this visitor is
        // not). `onExit` still leaves the FRAME for a game that asks to exit.
        <GameHost
          gameId={ctx.gameId ?? ""}
          locale={appLocale}
          onExit={exitFrame(exitHref)}
          variant="embed"
        />
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
