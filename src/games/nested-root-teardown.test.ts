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
 * IT IMPORTS `react-dom/client`, AND THAT IS THE POINT. `vitest.config.ts` now
 * carries the same two aliases `vite.config.ts` does, so this import travels the
 * exact path 125 files in `src/` travel. Importing `preact/compat` by name - what
 * this file did until 2026-08-26, while vitest had no alias - proves preact works
 * and proves nothing about what the site is built with.
 *
 * WHICH MAKES THE FIRST TEST BELOW LOAD-BEARING: if the alias is ever dropped,
 * these imports quietly become React 18 (still installed, still a dependency for
 * its types and for a one-line revert) and every assertion here passes about a
 * runtime nobody ships. Preact impersonates React too well to catch by the
 * obvious markers - measured, `preact/compat` reports `version: "18.3.1"`, the
 * same `$$typeof: Symbol(react.element)`, and even React's
 * `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` key. The one thing that
 * differs is a vnode's `constructor`: `undefined` in preact, `Object` in React.
 *
 * IT IS NOT A SUBSTITUTE FOR THE BROWSER PROBE, and does not pretend to be.
 * Measured 2026-08-26: the teardown path is DORMANT in production. `GameHost`'s
 * cleanup runs when `gameId` or `locale` changes, and on a game page every
 * language control is a real `<a href>` - a document navigation, where React
 * cleanup does not run at all. This pins the property before something makes it
 * live again. `scripts/repro/repro-preact-swap.mjs` is what proves the games run.
 */
describe("a nested root torn down after its parent is detached", () => {
  it("CONTROL: `react` really is preact here, or nothing below means anything", async () => {
    const { createElement } = await import("react");
    // The only honest discriminator. version, $$typeof and the secret-internals
    // key are all identical between the two, so each of them passes on React.
    expect(createElement("div", null, "x").constructor).toBeUndefined();
  });

  it("does not throw, on the reconciler the site actually ships", async () => {
    const { createRoot } = await import("react-dom/client");
    const { createElement } = await import("react");

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
    const { createRoot } = await import("react-dom/client");
    const { createElement } = await import("react");

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
