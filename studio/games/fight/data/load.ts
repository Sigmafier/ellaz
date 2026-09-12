// The node side of the fight. This file reads the disk so core/ never has to:
// nothing under core/ imports fs, a DOM, or the studio, which is what lets the
// whole directory be `git mv`d into a game with its sibling imports intact.
//
// It returns PLAIN PARSED JSON - the raw file shapes from core/types.ts, not
// the compiled ones. Compiling is core/compile.ts's job and it is pure, so a
// browser cell can fetch the same five files and compile them with no loader at
// all. The split is deliberate: reading and converting are different failures.
//
// Every missing file throws NAMING THE PATH. A loader that returns undefined
// for a file it could not open hands the mistake to whatever reads the result,
// and by then the name of the thing that was missing is gone.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AiFile, ArenaFile, FighterFile, Manifest, MatchFile, ModeFile, MovesFile, StageFile } from "../core/types";

const HERE = dirname(fileURLToPath(import.meta.url));

export interface SpriteSet {
  manifest: Manifest;
  moves: MovesFile;
}

export interface LoadedFight {
  mode: ModeFile;
  arena: ArenaFile;
  match: MatchFile;
  /** one per DISTINCT fighter the cast names, in first-appearance order */
  fighters: FighterFile[];
  /** one per DISTINCT ai the cast names, in first-appearance order */
  ais: AiFile[];
  /** keyed by a fighter's `sprites` name */
  sets: Record<string, SpriteSet>;
  /** the stage file, when the mode names one */
  stage?: StageFile;
}

function readJson<T>(path: string, what: string): T {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    throw new Error(`fight: no ${what} at ${path}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(`fight: ${what} at ${path} is not JSON: ${(err as Error).message}`);
  }
}

/** the distinct values of `pick` across `rows`, in first-appearance order */
function distinct<T>(rows: T[], pick: (row: T) => string | undefined): string[] {
  const out: string[] = [];
  for (const row of rows) {
    const id = pick(row);
    if (id !== undefined && !out.includes(id)) out.push(id);
  }
  return out;
}

/** the manifest + moves pair for every sprite set the fighters name */
function loadSets(fighters: FighterFile[], assetsRoot: string): Record<string, SpriteSet> {
  const sets: Record<string, SpriteSet> = {};
  for (const f of fighters) {
    if (sets[f.sprites]) continue;
    const dir = join(assetsRoot, f.sprites);
    sets[f.sprites] = {
      manifest: readJson<Manifest>(join(dir, `${f.sprites}.manifest.json`), `sprite manifest for "${f.sprites}"`),
      moves: readJson<MovesFile>(join(dir, `${f.sprites}.moves.json`), `moves file for "${f.sprites}"`),
    };
  }
  return sets;
}

/**
 * Read a mode and everything it names. `root` is this directory by default;
 * the sprite sets are read from `<root>/../assets/<set>/`, so a caller pointing
 * `root` at a fixture tree gets that tree's assets too.
 */
export function loadMode(modeId: string, root: string = HERE): LoadedFight {
  const mode = readJson<ModeFile>(join(root, "modes", `${modeId}.json`), `mode "${modeId}"`);
  const arena = readJson<ArenaFile>(join(root, "arena", `${mode.arena}.json`), `arena "${mode.arena}" (named by mode "${modeId}")`);
  const match = readJson<MatchFile>(join(root, "match", `${mode.match}.json`), `match "${mode.match}" (named by mode "${modeId}")`);

  // the roster is the cast plus every wave's spawns; both name fighters and ais
  const rows: { fighter: string; ai?: string }[] = [...mode.cast, ...(mode.waves ?? []).flatMap((w) => w.spawns)];
  const fighters = distinct(rows, (c) => c.fighter).map((id) =>
    readJson<FighterFile>(join(root, "fighters", `${id}.json`), `fighter "${id}" (named by mode "${modeId}")`),
  );
  const ais = distinct(rows, (c) => c.ai).map((id) =>
    readJson<AiFile>(join(root, "ai", `${id}.json`), `ai "${id}" (named by mode "${modeId}")`),
  );
  const stage = mode.stage === undefined ? undefined
    : readJson<StageFile>(join(root, "stage", `${mode.stage}.json`), `stage "${mode.stage}" (named by mode "${modeId}")`);

  return { mode, arena, match, fighters, ais, sets: loadSets(fighters, join(root, "..", "assets")), ...(stage ? { stage } : {}) };
}
