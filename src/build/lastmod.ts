/* `<lastmod>`, derived from git. Build-time only.
   ===========================================================================

   Google uses `<lastmod>` for crawl scheduling ONLY while it stays accurate,
   and an inaccurate one is worse than none: the signal gets discounted and
   does not come back. So the whole design here is about refusing to guess.

   THE OBVIOUS IMPLEMENTATION IS THE WRONG ONE. Stamping build time on all 48
   rows says "every page changed" on every deploy, which is false for 47 of
   them and teaches Google the field is noise. The date has to come from the
   last commit that actually touched each page's own sources.

   AND THE OBVIOUS IMPLEMENTATION FAILS SILENTLY IN CI. `actions/checkout`
   clones at depth 1 by default, so `git log` sees exactly one commit and
   reports the SAME timestamp for every path - which is the build-time bug
   again, wearing a disguise, on the one machine that publishes. Both deploy
   workflows now set `fetch-depth: 0`, and `allSame()` below is the backstop
   for the day someone removes it.

   Every failure here omits the field rather than inventing one. A sitemap
   with no `<lastmod>` is exactly what this site had until now and is
   perfectly valid; a sitemap where all 48 dates agree is a lie. */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { GAMES } from "../portal/games";
import { ROUTES, type Route } from "./routes";

/** Ask git when a set of paths last changed. `null` on any doubt at all. */
function lastCommitISO(paths: string[]): string | null {
  const present = paths.filter((p) => existsSync(p));
  if (present.length === 0) return null;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...present], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

/**
 * A game's id is not its directory - `src/games/n2048/` publishes as `2048`.
 * Read the mapping off the meta files rather than assuming they agree, which
 * is the same trap `slugFor` exists to name.
 */
function gameDirs(): Map<string, string> {
  const out = new Map<string, string>();
  const root = "src/games";
  if (!existsSync(root)) return out;
  for (const dir of readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const meta = `${root}/${dir.name}/meta.ts`;
    if (!existsSync(meta)) continue;
    const id = readFileSync(meta, "utf8").match(/\bid:\s*["']([^"']+)["']/)?.[1];
    if (id) out.set(id, `${root}/${dir.name}`);
  }
  return out;
}

/** The sources whose change genuinely changes what this page says. */
function sourcesFor(route: Route, dirs: Map<string, string>): string[] {
  if (route.kind === "game" && route.id) {
    const dir = dirs.get(route.id);
    return [...(dir ? [dir] : []), `src/content/games/${route.id}.ts`];
  }
  // Home, world and boards are assembled from the roster and the shared copy,
  // so they change when either does.
  return ["src/portal", "src/content/site.ts", "src/build"];
}

function allSame(values: string[]): boolean {
  return values.length > 1 && new Set(values).size === 1;
}

/**
 * `<lastmod>` per route path, or an EMPTY map meaning "omit the field".
 *
 * Empty is returned - deliberately, not as an error - when git is missing, the
 * clone is shallow, or every page comes back with the same timestamp. Each of
 * those produces a date that is either absent or untrue, and an untrue one
 * costs more than none.
 */
export function lastmodByPath(): Map<string, string> {
  const out = new Map<string, string>();

  // A shallow clone cannot answer "when did this path last change" - it can
  // only answer "when was the one commit I have". Ask directly rather than
  // inferring it from suspicious-looking output.
  try {
    const shallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (shallow === "true") {
      console.warn(
        "[lastmod] shallow clone - omitting <lastmod> rather than stamping 48 identical dates. " +
          "Set fetch-depth: 0 on actions/checkout to restore it.",
      );
      return out;
    }
  } catch {
    return out; // no git at all
  }

  const dirs = gameDirs();
  for (const route of ROUTES.filter((r) => r.indexable)) {
    const iso = lastCommitISO(sourcesFor(route, dirs));
    if (iso) out.set(route.path, iso);
  }

  // Every game resolving to one date means the per-game lookup did not
  // actually discriminate - a shallow clone that lied about not being one, or
  // a directory map that came back empty.
  const gameDates = ROUTES.filter((r) => r.kind === "game" && r.indexable)
    .map((r) => out.get(r.path))
    .filter((d): d is string => Boolean(d));
  if (allSame(gameDates) && GAMES.length > 1) {
    console.warn(
      `[lastmod] all ${gameDates.length} game pages resolved to one timestamp - omitting, ` +
        "because a uniform lastmod is the build-time bug wearing a disguise.",
    );
    return new Map();
  }

  return out;
}
