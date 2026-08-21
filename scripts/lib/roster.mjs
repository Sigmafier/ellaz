/**
 * The roster, read from source - ONE reader, for every script that needs it.
 *
 * WHY THIS FILE EXISTS. Three scripts parsed `src/portal/games.ts` for the same
 * fact, each with its own regex, and on 2026-08-21 one change to that file broke
 * two of them at once: `assert-slope` reported "cannot find the GAMES array" and
 * `assert-outreach` refused with "the roster parsed to zero games". Both refusals
 * were correct and both were expensive, because the defect was one file away from
 * where each script was looking. A fourth copy lives in `vite.config.ts` and reads
 * a different question (which half is a game's meta in), so it stays.
 *
 * IT READS `ROSTER_IDS`, NOT `GAMES`. `games.ts` is now the concatenation of two
 * halves and holds no array literal at all; `ROSTER_IDS` in `shellRoster.ts` is
 * the whole roster in roster order, one id per line, and `roster-split.test.ts`
 * pins it equal to `GAMES`. It is also what the SHELL actually ships, so a script
 * reading it is reading the thing the browser gets rather than a build-time list.
 *
 * A ZERO PARSE IS A REFUSAL, NEVER A NUMBER. A matcher that quietly stops matching
 * reports a confident wrong figure - and these figures reach published prose and a
 * public GitHub field. See
 * .claude/rules/a-diagnostic-that-truncates-what-it-compares.md
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const ROSTER_FILE = "src/portal/shellRoster.ts";

/** Every game id, in roster order, parsed out of already-read source text. */
export function rosterIdsFrom(src, where = ROSTER_FILE) {
  const open = src.indexOf("export const ROSTER_IDS");
  const start = src.indexOf("[", open);
  const end = src.indexOf("\n];", start);
  if (open < 0 || start < 0 || end < 0) throw new Error(`${where}: cannot find ROSTER_IDS`);
  const ids = [...src.slice(start, end).matchAll(/^\s{2}"([^"]+)",\s*$/gm)].map((m) => m[1]);
  if (ids.length === 0) throw new Error(`${where}: ROSTER_IDS parsed to zero games - refusing to answer`);
  return ids;
}

/** Every game id, in roster order, read from a repository root. */
export function rosterIds(repo) {
  return rosterIdsFrom(readFileSync(join(repo, ROSTER_FILE), "utf8"), ROSTER_FILE);
}

/** How many games the roster holds. */
export function gameCount(repo) {
  return rosterIds(repo).length;
}

/**
 * Every game's Hebrew title, by id - read from the DOM-free `meta.ts` files.
 *
 * The roster's own reader cannot answer this: `ROSTER_IDS` holds ids and the
 * titles live one file away, per game. Read here rather than in each caller so
 * a renamed title is one parse, and so a game whose directory name is not its
 * id (`src/games/n2048` publishes as `2048`) resolves the same way everywhere.
 */
export function heTitles(repo) {
  const dir = join(repo, "src/games");
  const out = new Map();
  for (const name of readdirSync(dir)) {
    const meta = join(dir, name, "meta.ts");
    if (!existsSync(meta)) continue;
    const src = readFileSync(meta, "utf8");
    const id = /\bid:\s*"([^"]+)"/.exec(src)?.[1];
    const he = /\bhe:\s*"([^"]+)"/.exec(src)?.[1];
    if (id && he) out.set(id, he);
  }
  if (out.size === 0) throw new Error("roster: no meta.ts yielded an id and a Hebrew title");
  return out;
}
