import { createRoot, type Root } from "react-dom/client";
import type { ReactElement } from "react";
import type { GameContext, GameModule, GameMeta } from "@sdk/index";
import { GameBoundary } from "./GameBoundary";

// Bridges a React component into the framework-neutral GameModule interface.
// Each DOM game calls reactGame(meta, ctx => <Component ctx={ctx} />).
export function reactGame(
  meta: GameMeta,
  render: (ctx: GameContext) => ReactElement,
): GameModule {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  return {
    meta,
    async mount(ctx: GameContext) {
      ctx.lifecycle.loadingStart();
      // Mount into a dedicated child element the portal never touches, so the
      // inner React root and the portal's outer React tree own disjoint DOM
      // (prevents removeChild teardown conflicts on exit).
      container = document.createElement("div");
      container.style.cssText = "width:100%;display:flex;justify-content:center";
      ctx.mount.appendChild(container);
      root = createRoot(container);
      // INSIDE this root, not around GameHost. An error does not cross a
      // React root boundary, so a boundary in the portal could never catch a
      // DOM game's throw - it would be armed and unreachable, which reads as
      // protection in every search. Forty of the forty-two games are DOM.
      root.render(
        <GameBoundary locale={ctx.locale} resetKey={meta.id} gameId={meta.id}>
          {render(ctx)}
        </GameBoundary>,
      );
      ctx.lifecycle.loadingFinished();
    },
    unmount() {
      // Defer the inner root teardown out of the portal's synchronous unmount
      // commit. Unmounting a nested React root *during* the parent's own unmount
      // makes the two reconcilers race to remove the same (now-detached) nodes,
      // throwing "removeChild: node is not a child". A microtask runs it after
      // the parent commit settles.
      const r = root;
      const c = container;
      root = null;
      container = null;
      queueMicrotask(() => {
        try {
          r?.unmount();
        } catch {
          /* already detached — fine */
        }
        c?.remove();
      });
    },
  };
}
