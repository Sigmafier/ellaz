// The hash router, RETIRED as navigation and kept as a READER.
//
// Every route is a real URL now (`/games/snake/`, `/world/`), so nothing in the
// app writes a hash any more. What survives is the parser, because the old
// fragments are in bookmarks and in messages people already sent:
// `legacyHash.ts` reads one here and redirects it once, at boot. Every hash the
// parser still recognises now has a real URL behind it.
//
// `hashFor` is kept as the parser's inverse - it is what makes every
// parseHash/hashFor round-trip in `route.test.ts` a real assertion rather than
// a restatement of the parser. Deleting it would not shrink the shipped bundle
// (tree-shaking already drops it) and would cost the round-trip tests.
//
// Pure string in, route out: every stale-link case is a unit test instead of a
// click-through.

export type Route =
  | { kind: "home" }
  | { kind: "game"; id: string }
  | { kind: "world" }
  // The leaderboards. Reachable from Home, and safe to link to directly.
  | { kind: "boards" };

const GAME_PREFIX = "game/";

/** Percent-decode, but never throw — a malformed escape keeps its raw text. */
function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Read a route out of a location hash. Anything unrecognised is home, so a bad
 * link lands a player on the game grid rather than a blank screen.
 */
export function parseHash(hash: string): Route {
  const withoutHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const path = withoutHash.startsWith("/") ? withoutHash.slice(1) : withoutHash;

  if (path === "world") return { kind: "world" };
  if (path === "boards") return { kind: "boards" };
  if (path.startsWith(GAME_PREFIX)) {
    const id = decodeSafe(path.slice(GAME_PREFIX.length));
    // "#/game/" carries no game, so it is not a game route.
    if (id !== "") return { kind: "game", id };
  }
  return { kind: "home" };
}

/** The hash that `parseHash` reads back as this exact route. */
export function hashFor(route: Route): string {
  switch (route.kind) {
    case "game":
      // Encoded so a slash, a space, or another "#" inside an id cannot split
      // the fragment. parseHash decodes it back.
      return `#/game/${encodeURIComponent(route.id)}`;
    case "world":
      return "#/world";
    case "boards":
      return "#/boards";
    default:
      return "#/";
  }
}
