import type { ReactElement } from "react";
import { ART, nothing } from "./art";
import { STREAK_ART } from "./streakArt";
import type { AnyArtId, ItemCategory, ShopItem } from "./items";
import { SHELL_ITEMS, defaultFor } from "./items";

// The room's art registry — one map, filled from two places at two times.
//
// WHY THIS EXISTS AT ALL: `items.ts`, `Scene.tsx` and `art.tsx` are pinned to
// the SHELL chunk, because Home draws the child's real room in its world card.
// So every drawing reachable from a plain `Record<AnyArtId, …>` is downloaded
// by every child before they have chosen a game. On the day the second shelf
// landed the first visit had 718 B gz of headroom, and the shelf is fifty-odd
// new scenes.
//
// So the drawings split the way the catalogue splits:
//
//   art.tsx      SHELL   everything a returning player can already have
//                        equipped, plus every category's free default
//   streakArt.tsx SHELL  the three streak-shelf pieces, same reason
//   artRest.tsx  LAZY    the second shelf, in its own `world-art` chunk
//
// A missing drawing is NOT an error here, and that is the whole design: it
// means "the lazy half has not landed yet", and the slot draws its category's
// free default until it does — which is exactly what an unknown id has always
// done (see `artFor`). Nothing blocks, nothing throws, nothing is empty.
//
// EXHAUSTIVENESS IS STILL A TYPE. `ART`, `STREAK_ART` and `REST_ART` are each
// keyed by their own art-id union, so a drawing with no catalogue row (or a
// row with no drawing) is a `tsc --noEmit` failure in the file that owns it,
// exactly as before. What this module gives up is only that the three maps are
// checked SEPARATELY, which is what lets one of them arrive later.

export type Piece = () => ReactElement;

/**
 * Every piece the room can draw RIGHT NOW. Mutable on purpose: the lazy half
 * is folded in when it arrives.
 */
const REGISTRY: Partial<Record<AnyArtId, Piece>> = { ...ART, ...STREAK_ART };

/**
 * The second shelf's CATALOGUE ROWS, once they have arrived.
 *
 * Held here beside the drawings rather than imported by the shop, because a
 * static import from `World.tsx` puts the whole shelf in the `page` chunk —
 * and `page` is fetched by every visitor who opens a GAME. Measured on the
 * artifact: that arrangement moved a game page's runtime from 19.3 to 28.5 KB
 * gz, a 47% rise, to carry pictures of shop items no game will ever draw.
 */
const EXTRA_ROWS: ShopItem<AnyArtId>[] = [];

let restState: "idle" | "loading" | "ready" = "idle";
let revision = 0;
const listeners = new Set<() => void>();

/**
 * Fold a set of drawings into the registry.
 *
 * Exported because `artRest.tsx` is imported STATICALLY by the World screen
 * (which is itself lazy, so it costs a first visit nothing) and DYNAMICALLY by
 * Home. Both routes end here, so there is one place where the room learns a
 * new drawing rather than two that can disagree.
 */
export function registerRoomArt(more: Partial<Record<AnyArtId, Piece>>): void {
  Object.assign(REGISTRY, more);
  restState = "ready";
  revision += 1;
  for (const notify of [...listeners]) notify();
}

/**
 * What to draw in this slot, given the art id the catalogue resolved.
 *
 * Falls back to the category's free default — whose drawing is always in the
 * shell — so this is total. A slot is never blank and never throws.
 */
export function roomPiece(category: ItemCategory, art: AnyArtId): Piece {
  return REGISTRY[art] ?? REGISTRY[defaultFor(category).art] ?? nothing;
}

/** Fold the second shelf's catalogue rows in. Paired with `registerRoomArt`. */
export function registerRoomItems(rows: readonly ShopItem<AnyArtId>[]): void {
  if (EXTRA_ROWS.length) return;
  EXTRA_ROWS.push(...rows);
}

/**
 * THE WHOLE CATALOGUE the shop may render right now.
 *
 * Grows once, from 33 rows to 82, when the lazy chunk lands. The shop reads it
 * through `useSyncExternalStore`, so it re-renders on that one event.
 *
 * It grows rather than starting whole because the alternative — a static
 * import — charges every game page for the shop (see `EXTRA_ROWS`). A shelf
 * that fills in is a moment of fewer items; a shelf held statically is 8.6 KB
 * gz on every game a child opens, for ever.
 */
export function shopItems(): readonly ShopItem<AnyArtId>[] {
  return EXTRA_ROWS.length ? [...SHELL_ITEMS, ...EXTRA_ROWS] : SHELL_ITEMS;
}

/**
 * Fetch the second shelf — its drawings AND its rows, which share one chunk so
 * this is one request. Idempotent, and never throws: a failed
 * fetch leaves those slots on their defaults, which is a fallback and not a
 * bug.
 *
 * THE IMPORT IS INSIDE THIS FUNCTION and must stay there. A module-scope
 * `import()` keeps the chunk in the production module graph, and Vite then
 * writes a `<link rel="modulepreload">` for it into index.html — an eager
 * download no globIgnores entry can prevent, because a preload is not the
 * precache. That has shipped here once already; see
 * .claude/rules/precache-glob-sweeps-new-chunks.md.
 */
export function loadRoomArtRest(): void {
  if (restState !== "idle") return;
  restState = "loading";
  void Promise.all([import("./artRest"), import("./itemsRest")])
    .then(([art, items]) => {
      // Rows first, drawings second: `registerRoomArt` is what bumps the
      // revision, so subscribers wake once, with both halves already in.
      registerRoomItems(items.EXTRA_ITEMS);
      registerRoomArt(art.REST_ART);
    })
    .catch(() => {
      // Let a later mount try again. An offline first paint should not cost a
      // player the look of their own room for the whole session.
      restState = "idle";
    });
}

/** Re-render when drawings arrive. Paired with `roomArtRevision`. */
export function subscribeRoomArt(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** A value that CHANGES when new drawings land, and is stable otherwise. */
export function roomArtRevision(): number {
  return revision;
}
