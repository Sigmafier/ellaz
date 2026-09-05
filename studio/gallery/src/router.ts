// The hash router, as pure functions. `#/sprites?char=slime&style=crayon`
// is the whole address of a view, so a shot script, the Visual Hall and a
// person can all name the same thing; the page ids are fixed here and the
// shots script names them by these strings.

export const PAGE_IDS = ["styles", "characters", "sprites", "palettes", "techniques", "games"] as const;
export type PageId = (typeof PAGE_IDS)[number];

export interface Route { id: PageId; params: URLSearchParams }

/** Parse a location hash into a page id and its params; unknown pages fall back to the first. */
export function parseRoute(hash: string): Route {
  const [path, q] = hash.replace(/^#\/?/, "").split("?");
  const id = (PAGE_IDS as readonly string[]).includes(path) ? (path as PageId) : PAGE_IDS[0];
  return { id, params: new URLSearchParams(q ?? "") };
}

/** Build a hash for a page, with the given params, dropping empty ones. */
export function hashFor(id: PageId, params: Record<string, string | null | undefined> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== "") p.set(k, v);
  const q = p.toString();
  return `#/${id}${q ? `?${q}` : ""}`;
}

/** Navigate: the router is the hash, so this is the only way a page changes. */
export function go(id: PageId, params: Record<string, string | null | undefined> = {}): void {
  location.hash = hashFor(id, params);
}
