// The browser-side loader for a DUNGEON mode: the same shape data/load.ts's
// loadDungeonMode builds from disk, assembled from fetches, so a page compiles
// the room from `<root>/data` and finds its sheets under `<root>/assets`. One
// thing more than the disk loader: the room's SCENERY set (its picture and
// props) rides in `sets` too, because the cell draws it and the kind reads its
// clip names - the sim on disk never opens the art. Throws naming the URL that
// failed; a 404 here must never turn into an empty room.

import type { ActorFile, DungeonModeFile, DungeonRulesFile, LoadedDungeon, RoomFile } from "../../dungeon/types";
import type { Manifest } from "../../sim/types";

/** the room file's art block, as the cell reads it */
export interface RoomArt { scenery: string; room: string; props: { kind: string; i: number; j: number }[]; void: string }

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`dungeon: ${r.status} fetching ${url}`);
  return (await r.json()) as T;
}

export async function loadDungeonHttp(root: string, modeId: string): Promise<LoadedDungeon> {
  const mode = await json<DungeonModeFile>(`${root}/data/modes/${modeId}.json`);
  if (mode.kind !== "dungeon") throw new Error(`dungeon: mode "${modeId}" is not a dungeon mode (kind ${JSON.stringify(mode.kind)})`);
  const [room, rules] = await Promise.all([
    json<RoomFile>(`${root}/data/rooms/${mode.room}.json`),
    json<DungeonRulesFile>(`${root}/data/dungeon/${mode.dungeon}.json`),
  ]);
  const actorIds = [...new Set([room.start.actor, ...room.spawns.map((s) => s.actor)])];
  const actors = await Promise.all(actorIds.map((id) => json<ActorFile>(`${root}/data/actors/${id}.json`)));
  const art = room.art as RoomArt;
  if (typeof art?.scenery !== "string") throw new Error(`dungeon: room "${room.id}" names no art.scenery set`);
  const setNames = [...new Set([...actors.flatMap((a) => (a.facings ? [a.sprites, a.facings] : [a.sprites])), art.scenery])];
  const sets: LoadedDungeon["sets"] = {};
  await Promise.all(setNames.map(async (name) => {
    sets[name] = { manifest: await json<Manifest>(`${root}/assets/${name}/${name}.manifest.json`) };
  }));
  return { mode, room, rules, actors, sets };
}
