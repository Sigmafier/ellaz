import { useEffect, useSyncExternalStore } from "react";
import { artReady, artRevision, gameArt, hasArt, loadRestArt, subscribeArt } from "./gameArt";
import { useCardStyle } from "./useCardStyle";
import type { CardStyle } from "./cardStyle";

/**
 * Does this card draw its scene right now?
 *
 * ONE predicate, because more than one caller needs the answer and they need
 * the SAME answer: `GameArt` picks what to render, and a card decides whether
 * to lay the `.ellaz-tint` wash behind it. Let those drift and you get a card
 * washing a picture that already has its own ground - mud - or an emoji sitting
 * on bare card stock with nothing behind it.
 *
 * Two ways to reach the emoji and they are different facts: the player asked
 * for icons, or this game has no scene yet. Same render either way, which means
 * everyone who uses the toggle is exercising the missing-art fallback too.
 *
 * `hasArt` answers for the LAZY half as well, and that is load-bearing here
 * rather than a nicety. The home grid calls this once per card to choose
 * between the picture branch and the emoji-on-a-tint branch, and nothing
 * re-renders that choice when the scenes land - so a card that answered "no"
 * at first paint would keep the emoji for the whole session. Answering "yes,
 * shortly" keeps the branch fixed and lets `GameArt` swap only its own
 * contents, which is also one fewer layout change on the first screen.
 */
export function showsArt(id: string, style: CardStyle): boolean {
  return style === "art" && hasArt(id);
}

/**
 * A game's key art, with the emoji as the fallback.
 *
 * `dangerouslySetInnerHTML` is the right tool and not a shortcut: the art is
 * authored in this repo as an SVG string so that `src/build` can emit the very
 * same markup into a page that has no React at all. Nothing here comes from a
 * user, a network response, or a game.
 *
 * The fallback is not decoration either. A game added tomorrow has no scene
 * yet, and it must still render - `gameArt()` returning "" would otherwise
 * leave a silent empty box, which is the failure this whole component exists
 * to end.
 *
 * It lives in `@ui` rather than beside the home grid because the boards screen
 * shows the same games and must show them the same way; a second copy would be
 * a second answer to "what does this game look like".
 *
 * The file is `gameArtView.tsx` and not `GameArt.tsx` on purpose: this repo
 * sits on `/mnt/c`, which is case-INSENSITIVE, so `@ui/GameArt` and
 * `@ui/gameArt` are the same path there and a different path in CI. The import
 * silently resolved to the SVG module instead. Never name a file here as a
 * case-variant of a neighbour.
 */
export function GameArt({
  id,
  emoji,
  height,
}: {
  id: string;
  emoji: string;
  height: number | string;
}) {
  const [style] = useCardStyle();

  // Re-render when the lazy scenes arrive. `useSyncExternalStore` and not a
  // `useState` in an effect because every card on the grid subscribes to the
  // same one event, and this is the shape React gives for exactly that.
  useSyncExternalStore(subscribeArt, artRevision, artRevision);

  // Fetch them, from the first card that mounts. On idle rather than
  // immediately, so it cannot compete with the first paint it exists to
  // protect; `requestIdleCallback` is missing on Safari, hence the timeout.
  // Idempotent, so 25 cards asking is one request.
  useEffect(() => {
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => void })
      .requestIdleCallback;
    if (idle) {
      idle(loadRestArt);
      return;
    }
    const t = setTimeout(loadRestArt, 200);
    return () => clearTimeout(t);
  }, []);

  // The emoji stands in for a scene that has not arrived YET as well as for one
  // that does not exist - the same render, which is why the below-the-fold
  // cards need no placeholder of their own.
  if (!showsArt(id, style) || !artReady(id)) {
    return (
      <span
        style={{
          display: "grid",
          placeItems: "center",
          height,
          fontSize: typeof height === "number" ? Math.round(height * 0.5) : 42,
        }}
        aria-hidden="true"
      >
        {emoji}
      </span>
    );
  }
  return (
    <span
      style={{ display: "block", height, overflow: "hidden" }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: gameArt(id) }}
    />
  );
}
