// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

/**
 * The nested-root teardown, against the reconciler that actually ships.
 *
 * `reactHost.tsx` mounts every DOM game into its OWN child element inside the
 * portal's React tree, and tears that root down in a `queueMicrotask` - because
 * unmounting a nested root DURING the parent's own unmount commit makes two
 * reconcilers race to remove the same, already-detached nodes and throws
 * `removeChild: node is not a child`. That is `react-nested-root-teardown.md`,
 * and it is the reason the deferral exists.
 *
 * `vite.config.ts` aliases `react-dom` onto `preact/compat`, whose `createRoot`
 * is a thin wrapper over `render`/`unmountComponentAtNode` - a different code
 * path from React 18's. So the property the deferral depends on has to be
 * re-established against preact rather than inherited from React.
 *
 * IT IMPORTS `preact/compat` BY NAME, deliberately. `vitest.config.ts` carries
 * no react alias, so importing `react-dom/client` here would silently exercise
 * React and report green about a runtime this site does not ship.
 *
 * IT IS NOT A SUBSTITUTE FOR THE BROWSER PROBE, and does not pretend to be.
 * Measured 2026-08-26: the teardown path is DORMANT in production. `GameHost`'s
 * cleanup runs when `gameId` or `locale` changes, and on a game page every
 * language control is a real `<a href>` - a document navigation, where React
 * cleanup does not run at all. This pins the property before something makes it
 * live again. `scripts/repro/repro-preact-swap.mjs` is what proves the games run.
 */
describe("a nested root torn down after its parent is detached", () => {
  it("does not throw, on the reconciler the site actually ships", async () => {
    const { createRoot } = await import("preact/compat/client");
    const { createElement } = await import("preact/compat");

    const portal = document.createElement("div");
    document.body.appendChild(portal);

    // What `reactHost.mount` does: its own child, never the portal's node.
    const container = document.createElement("div");
    portal.appendChild(container);
    const root = createRoot(container);
    root.render(createElement("p", null, "a game"));
    expect(container.textContent).toBe("a game");

    // What the PORTAL does on its way out: it removes the subtree first...
    portal.remove();

    // ...and only then does the deferred microtask run.
    let threw: unknown;
    queueMicrotask(() => {
      try {
        root.unmount();
        container.remove();
      } catch (e) {
        threw = e;
      }
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(threw, `teardown threw: ${String(threw)}`).toBeUndefined();
  });

  it("survives the game's own node being gone too", async () => {
    // The harsher shape, and the reason `reactHost.tsx` wraps its unmount in a
    // try/catch at all: if the container itself has already been removed by
    // someone else, tearing down must still be survivable. A test that only
    // exercised the tidy case above would say nothing about that branch.
    const { createRoot } = await import("preact/compat/client");
    const { createElement } = await import("preact/compat");

    const portal = document.createElement("div");
    document.body.appendChild(portal);
    const container = document.createElement("div");
    portal.appendChild(container);
    const root = createRoot(container);
    root.render(createElement("p", null, "a game"));

    container.remove();
    portal.remove();

    let threw: unknown;
    try {
      root.unmount();
    } catch (e) {
      threw = e;
    }
    expect(threw, `teardown threw: ${String(threw)}`).toBeUndefined();
  });
});
