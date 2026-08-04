import { createRoot, type Root } from "react-dom/client";
import type { Locale } from "@i18n/index";
import { analytics, startCloudSync } from "@sdk/index";
import { Boards } from "./Boards";
import { GameHost } from "./GameHost";
import { World } from "./world/World";
import { WalletChip } from "./WalletChip";
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

function whenIdle(run: () => void): void {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number })
    .requestIdleCallback;
  if (ric) ric(run, { timeout: 2000 });
  else window.setTimeout(run, 200);
}

function mountWallet(slot: HTMLElement | undefined): Root | null {
  if (!slot) return null;
  const root = createRoot(slot);
  root.render(<WalletChip />);
  return root;
}

/** Where the in-game back control goes. Real history first, the home page as a floor. */
function exitTo(locale: Locale): () => void {
  return () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign(homeHref(locale));
  };
}

export function bootContentPage(ctx: PageContext): void {
  const locale: Locale = ctx.locale ?? "he";
  const frame = ctx.frame;
  if (!frame) return;

  analytics.init();
  analytics.track("session_start", { locale });
  startCloudSync();
  mountWallet(ctx.walletSlot);

  const poster = document.getElementById("game-poster");
  const message = document.getElementById("game-msg");
  const button = document.getElementById("game-play") as HTMLButtonElement | null;

  const start = () => {
    poster?.setAttribute("hidden", "");
    const root = createRoot(frame);
    root.render(
      ctx.kind === "world" ? (
        <World locale={locale} onExit={exitTo(locale)} />
      ) : ctx.kind === "boards" ? (
        <Boards locale={locale} onExit={exitTo(locale)} />
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
      start();
    });
    return;
  }

  // The emitted state is the honest one for a visitor with no JavaScript: a
  // real button and "the game needs a script". Now that a script is demonstrably
  // running, both can be replaced with the truth.
  if (button) button.hidden = true;
  if (message && poster) message.textContent = poster.dataset.loading ?? message.textContent;
  whenIdle(start);
}
