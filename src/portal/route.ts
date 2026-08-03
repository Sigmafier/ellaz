// The portal's hash router — pure string in, route out.
//
// It lives on its own (rather than inline in App.tsx) because it is the only
// part of the shell a browser can feed arbitrary input to: a shared link, a
// stale bookmark, a hand-typed fragment. Pure functions mean every one of those
// cases is a unit test instead of a click-through.

export type Route =
  | { kind: "home" }
  | { kind: "game"; id: string }
  | { kind: "world" }
  // The Juice Lab: a dev-only tournament surface. Deliberately unreachable from
  // the UI - nothing links to it and it is not in the catalog - so it is only
  // ever found by typing the hash. Lazily loaded, so it costs the shell nothing.
  | { kind: "lab" };

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
  if (path === "lab") return { kind: "lab" };
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
    case "lab":
      return "#/lab";
    default:
      return "#/";
  }
}
