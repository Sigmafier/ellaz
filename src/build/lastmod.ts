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
import { basename } from "node:path";
import { GAMES } from "../portal/games";
import { ROUTES, type Route } from "./routes";

/**
 * One answer per distinct path set, for the life of a build.
 *
 * The four locales of one game ask git the IDENTICAL question four times, and
 * every non-game route resolves to the same three paths - so 164 routes spawn
 * 164 `git log` processes to ask ~42 distinct questions. On a `/mnt/c`
 * OneDrive checkout each spawn measures ~2.6 s, which is ~8 minutes of a local
 * build spent re-asking. Keyed on the RESOLVED path list rather than the
 * route, because that is what the answer actually depends on.
 */
const gitCache = new Map<string, string | null>();

/** Ask git when a set of paths last changed. `null` on any doubt at all. */
function lastCommitISO(paths: string[]): string | null {
  const present = paths.filter((p) => existsSync(p));
  if (present.length === 0) return null;
  const key = present.join("\u0000");
  const hit = gitCache.get(key);
  if (hit !== undefined) return hit;
  const answer = askGit(present);
  gitCache.set(key, answer);
  return answer;
}

function askGit(present: string[]): string | null {
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

const CONTENT_ROOT = "src/content/games";

/**
 * Every prose file in the content tree, indexed by its bare name.
 *
 * TWO NAMING CONVENTIONS ARE LIVE AT ONCE, and reading the tree is the only
 * thing that answers for both. The top-level file is named after the game's
 * DIRECTORY (`n2048.ts`); the per-locale ones under `fr/` are named after its
 * ID (`2048.ts`). Assume either and you silently drop the other, because
 * `lastCommitISO` filters missing paths and then answers from whatever is
 * left rather than failing.
 *
 * That shipped. `/games/2048/` advertised 2026-08-12 - the last change to its
 * RENDERER - while its prose had been rewritten on the 16th, because the code
 * here asked for `src/content/games/2048.ts`, which has never existed. The
 * comment on `gameDirs()` above names this exact trap for the game directory
 * and the next line then hardcoded it for the content file.
 */
function contentIndex(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const scan = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        scan(path);
      } else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) {
        const key = e.name.slice(0, -3);
        out.set(key, [...(out.get(key) ?? []), path]);
      }
    }
  };
  if (existsSync(CONTENT_ROOT)) scan(CONTENT_ROOT);
  return out;
}

/**
 * The sources whose change genuinely changes what a GAME page says - its
 * renderer, and every locale's prose wherever that lives and whatever it is
 * called. Exported because the bug above was in this resolution and not in
 * anything `lastmodByPath` does with the result, so this is the layer the
 * control has to reach.
 */
export function gameSources(
  id: string,
  dirs: Map<string, string> = gameDirs(),
  content: Map<string, string[]> = contentIndex(),
): string[] {
  const dir = dirs.get(id);
  // A game answers to its id and to its directory name. They are the same for
  // 28 of 29 games, which is exactly why assuming it held went unnoticed.
  const names = new Set([id, ...(dir ? [basename(dir)] : [])]);
  return [...(dir ? [dir] : []), ...[...names].flatMap((n) => content.get(n) ?? [])];
}

/** The sources whose change genuinely changes what this page says. */
function sourcesFor(
  route: Route,
  dirs: Map<string, string>,
  content: Map<string, string[]>,
): string[] {
  if (route.kind === "game" && route.id) return gameSources(route.id, dirs, content);
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
  const content = contentIndex();
  for (const route of ROUTES.filter((r) => r.indexable)) {
    const iso = lastCommitISO(sourcesFor(route, dirs, content));
    if (iso) out.set(route.path, iso);
  }

  // Every game resolving to one date means the per-game lookup did not
  // actually discriminate - a shallow clone that lied about not being one, or
  // a directory map that came back empty.
  //
  // It also fires on a legitimate state, and that is FINE rather than a bug to
  // fix: a repo-wide refactor genuinely touches every game in one commit, so
  // every page really did last change at the same instant. `<lastmod>` exists
  // to tell a crawler WHICH pages changed; 48 identical dates answer "all of
  // them", which is exactly as useful as saying nothing. Omitting is the
  // honest response either way, and the field returns on its own as the games
  // diverge again.
  //
  // So do not "fix" this by emitting uniform dates to make the number appear -
  // `assert-pages.mjs` rejects 48 identical dates for the same reason, and the
  // two would then contradict each other.
  // (Seen live 2026-08-08: one commit touched all 21 game directories.)
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
