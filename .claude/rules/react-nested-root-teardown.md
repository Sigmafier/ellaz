---
paths: "**/reactHost.tsx,**/portal/**,**/games/**"
---

# Nested React Root — Defer Teardown

**Scope**: Any code mounting a nested React `createRoot()` inside the portal's React tree (currently `src/games/reactHost.tsx`).

## Core Rule

When a DOM game mounts its own React root into `GameContext.mount` (a node the
portal's outer React tree also owns), the inner `root.unmount()` MUST be deferred
out of the portal's synchronous unmount commit (via `queueMicrotask`), and the
portal must NOT also clear that node.

Unmounting a nested root *during* the parent's own unmount makes the two
reconcilers race to remove the same (now-detached) nodes → `NotFoundError: Failed
to execute 'removeChild' on 'Node': The node to be removed is not a child`.

## When to Apply

- Editing `reactHost.tsx` or adding any new imperative React-root mount.
- Adding a renderer that mounts a framework root into `ctx.mount`.
- Seeing `removeChild`/`NotFoundError` on exiting a game.

## Pattern (see `src/games/reactHost.tsx`)

- Mount the inner root into a dedicated child element the portal never touches.
- On unmount: null the refs first, then `queueMicrotask(() => { root.unmount(); container.remove(); })`.
- `GameHost` must NOT do `el.innerHTML = ""` — the game owns and frees its own DOM.
