// The browser-side loader: the same shape data/load.ts builds from disk,
// assembled from fetches so a cell page can compile the fight from
// `<root>/data` and find its sheets under `<root>/assets`. Throws naming the
// URL that failed; a 404 here must never turn into an empty fight.

import type { AiFile, ArenaFile, FighterFile, Manifest, MatchFile, ModeFile, MovesFile, StageFile } from "../../core/types";
import type { SpriteSetRef } from "../contract";

export interface LoadedFightHttp {
  mode: ModeFile;
  arena: ArenaFile;
  match: MatchFile;
  fighters: FighterFile[];
  ais: AiFile[];
  sets: Record<string, { manifest: Manifest; moves: MovesFile }>;
  /** the stage file, when the mode names one */
  stage?: StageFile;
}

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fight: ${r.status} fetching ${url}`);
  return (await r.json()) as T;
}

export function spriteRefs(root: string, sets: string[]): SpriteSetRef[] {
  return sets.map((name) => ({
    name,
    png: `${root}/assets/${name}/${name}.png`,
    atlas: `${root}/assets/${name}/${name}.atlas.json`,
    manifest: `${root}/assets/${name}/${name}.manifest.json`,
  }));
}

export async function loadFightHttp(root: string, modeId: string): Promise<LoadedFightHttp> {
  const mode = await json<ModeFile>(`${root}/data/modes/${modeId}.json`);
  const [arena, match, stage] = await Promise.all([
    json<ArenaFile>(`${root}/data/arena/${mode.arena}.json`),
    json<MatchFile>(`${root}/data/match/${mode.match}.json`),
    mode.stage === undefined ? Promise.resolve(undefined) : json<StageFile>(`${root}/data/stage/${mode.stage}.json`),
  ]);
  // the roster is the cast plus every wave's spawns, the same walk data/load.ts makes on disk
  const rows: { fighter: string; ai?: string }[] = [...mode.cast, ...(mode.waves ?? []).flatMap((w) => w.spawns)];
  const fighterIds = [...new Set(rows.map((c) => c.fighter))];
  const aiIds = [...new Set(rows.filter((c) => c.ai !== undefined).map((c) => c.ai as string))];
  const fighters = await Promise.all(fighterIds.map((id) => json<FighterFile>(`${root}/data/fighters/${id}.json`)));
  const ais = await Promise.all(aiIds.map((id) => json<AiFile>(`${root}/data/ai/${id}.json`)));
  const setNames = [...new Set(fighters.map((f) => f.sprites))];
  const sets: LoadedFightHttp["sets"] = {};
  await Promise.all(setNames.map(async (name) => {
    const [manifest, moves] = await Promise.all([
      json<Manifest>(`${root}/assets/${name}/${name}.manifest.json`),
      json<MovesFile>(`${root}/assets/${name}/${name}.moves.json`),
    ]);
    sets[name] = { manifest, moves };
  }));
  return { mode, arena, match, fighters, ais, sets, ...(stage ? { stage } : {}) };
}
