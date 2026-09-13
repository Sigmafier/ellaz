// The browser-side loader for a TURN mode: the same shape data/load.ts's
// loadTurnMode builds from disk, assembled from fetches, so a page compiles
// the battle from `<root>/data` and finds its sheets under `<root>/assets`.
// Throws naming the URL that failed; a 404 here must never turn into an
// empty battle.

import type { BattleFile, LoadedTurn, RulesFile, TurnModeFile, UnitFile } from "../../turn/types";
import type { Manifest } from "../../sim/types";

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`turn: ${r.status} fetching ${url}`);
  return (await r.json()) as T;
}

export async function loadTurnHttp(root: string, modeId: string): Promise<LoadedTurn> {
  const mode = await json<TurnModeFile>(`${root}/data/modes/${modeId}.json`);
  if (mode.kind !== "turn") throw new Error(`turn: mode "${modeId}" is not a turn mode (kind ${JSON.stringify(mode.kind)})`);
  const [battle, rules] = await Promise.all([
    json<BattleFile>(`${root}/data/battles/${mode.battle}.json`),
    json<RulesFile>(`${root}/data/rules/${mode.rules}.json`),
  ]);
  const unitIds = [...new Set(battle.placements.map((p) => p.unit))];
  const units = await Promise.all(unitIds.map((id) => json<UnitFile>(`${root}/data/units/${id}.json`)));
  const setNames = [...new Set(units.map((u) => u.sprites))];
  const sets: LoadedTurn["sets"] = {};
  await Promise.all(setNames.map(async (name) => {
    sets[name] = { manifest: await json<Manifest>(`${root}/assets/${name}/${name}.manifest.json`) };
  }));
  return { mode, battle, rules, units, sets };
}
