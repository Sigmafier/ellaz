// The node side of the engine. This file reads the disk so sim/ never has to:
// nothing under sim/ imports fs, a DOM, or the studio, which is what lets the
// whole directory be `git mv`d into a game with its sibling imports intact.
//
// It returns PLAIN PARSED JSON - the raw file shapes from sim/types.ts, not
// the compiled ones. Compiling is sim/compile.ts's job and it is pure, so a
// browser cell can fetch the same five files and compile them with no loader at
// all. The split is deliberate: reading and converting are different failures.
//
// A GAME is a directory holding data/ (the json, by kind) and assets/ (the
// sprite sets its fighters name); every caller says which game, because the
// engine has no game of its own. `gameDir("fight")` resolves a game under
// studio/games/ - the one convention the harness and the gates share.
//
// Every missing file throws NAMING THE PATH. A loader that returns undefined
// for a file it could not open hands the mistake to whatever reads the result,
// and by then the name of the thing that was missing is gone.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AiFile, ArenaFile, FighterFile, Manifest, MatchFile, ModeFile, MovesFile, StageFile } from "../sim/types";
import type { BattleFile, LoadedTurn, RulesFile, TurnModeFile, UnitFile } from "../turn/types";
import type { ActorFile, DungeonModeFile, DungeonRulesFile, LoadedDungeon, RoomFile } from "../dungeon/types";
import type { CampaignFile } from "../campaign/flow";

const HERE = dirname(fileURLToPath(import.meta.url));

/** where the games live: studio/games/<name>/ - each holds data/ and assets/ */
export const GAMES = join(HERE, "..", "..", "games");

/** a game's root directory by name; the caller passes this to loadMode */
export const gameDir = (name: string): string => join(GAMES, name);

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
 * Read a mode and everything it names from `<gameRoot>/data/`, with the sprite
 * sets from `<gameRoot>/assets/<set>/`. A caller pointing `gameRoot` at a
 * fixture tree gets that tree's data and assets, and nothing else's.
 */
export function loadMode(modeId: string, gameRoot: string): LoadedFight {
  const root = join(gameRoot, "data");
  const mode = readJson<ModeFile & { kind?: unknown }>(join(root, "modes", `${modeId}.json`), `mode "${modeId}"`);
  // a mode file that names a kind is not a fight's: reading its arena would throw about a path, not about the kind
  if (mode.kind !== undefined) throw new Error(`fight: mode "${modeId}" is a ${JSON.stringify(mode.kind)} mode, not a fight - readModeKind first, then loadTurnMode or loadDungeonMode`);
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

  return { mode, arena, match, fighters, ais, sets: loadSets(fighters, join(gameRoot, "assets")), ...(stage ? { stage } : {}) };
}

/**
 * Read a CAMPAIGN file (`<gameRoot>/data/campaign/<id>.json`) and prove every
 * level it names loads as ONE kind of mode: the first level's kind is the
 * campaign's, a level of another kind throws, a fight level must name a stage
 * file (a Versus match has no waves to clear), and a turn battle or a dungeon
 * room must load whole. Every refusal names the world and the level - a
 * campaign that reaches the page with a level the sim cannot end would show a
 * card that never comes. (Fight-only until 2026-09-13; any kind since three
 * levels and a boss reached every game.)
 */
export function loadCampaign(campaignId: string, gameRoot: string): CampaignFile {
  const c = readJson<CampaignFile>(join(gameRoot, "data", "campaign", `${campaignId}.json`), `campaign "${campaignId}"`);
  let campaignKind: ModeKind | undefined;
  for (const w of c.worlds) {
    for (const stage of w.stages) {
      const where = `campaign "${campaignId}" world "${w.id}" names stage "${stage}"`;
      let kind: ModeKind;
      try { kind = readModeKind(stage, gameRoot); } catch (err) { throw new Error(`${where}: ${(err as Error).message}`); }
      campaignKind ??= kind;
      if (kind !== campaignKind) throw new Error(`${where}, a ${kind} mode in a ${campaignKind} campaign - one campaign plays one kind`);
      checkLevel(where, kind, stage, gameRoot);
    }
  }
  return c;
}

/** a level loads whole for its kind; a fight level must name a stage file */
function checkLevel(where: string, kind: ModeKind, stage: string, gameRoot: string): void {
  try {
    if (kind === "turn") { loadTurnMode(stage, gameRoot); return; }
    if (kind === "dungeon") { loadDungeonMode(stage, gameRoot); return; }
    if (loadMode(stage, gameRoot).stage) return;
  } catch (err) {
    throw new Error(`${where}: ${(err as Error).message}`);
  }
  throw new Error(`${where}, which names no stage file - a Versus match has no waves to clear`);
}

/** the three kinds of simulation a mode file can name: `kind` absent is the fight's (its files predate the second kind) */
export type ModeKind = "fight" | "turn" | "dungeon";

/** which sim a mode belongs to, from the one field that says so; an unknown kind throws naming it */
export function readModeKind(modeId: string, gameRoot: string): ModeKind {
  const mode = readJson<{ kind?: unknown }>(join(gameRoot, "data", "modes", `${modeId}.json`), `mode "${modeId}"`);
  if (mode.kind === undefined) return "fight";
  if (mode.kind === "turn") return "turn";
  if (mode.kind === "dungeon") return "dungeon";
  throw new Error(`mode "${modeId}" names an unknown kind ${JSON.stringify(mode.kind)} (fight modes name none; turn modes name "turn"; dungeon modes name "dungeon")`);
}

/**
 * Read a TURN mode and everything it names: the battle, the rules, one file per
 * distinct unit the placements name, and each unit's sprite manifest (a turn
 * unit has no moves file: a strike is a rule, not a hitbox).
 */
export function loadTurnMode(modeId: string, gameRoot: string): LoadedTurn {
  const root = join(gameRoot, "data");
  const mode = readJson<TurnModeFile>(join(root, "modes", `${modeId}.json`), `mode "${modeId}"`);
  if (mode.kind !== "turn") throw new Error(`turn: mode "${modeId}" is not a turn mode (kind ${JSON.stringify(mode.kind)})`);
  const battle = readJson<BattleFile>(join(root, "battles", `${mode.battle}.json`), `battle "${mode.battle}" (named by mode "${modeId}")`);
  const rules = readJson<RulesFile>(join(root, "rules", `${mode.rules}.json`), `rules "${mode.rules}" (named by mode "${modeId}")`);
  const units = distinct(battle.placements, (p) => p.unit).map((id) =>
    readJson<UnitFile>(join(root, "units", `${id}.json`), `unit "${id}" (named by battle "${mode.battle}")`),
  );
  const sets: LoadedTurn["sets"] = {};
  for (const u of units) {
    if (sets[u.sprites]) continue;
    const dir = join(gameRoot, "assets", u.sprites);
    sets[u.sprites] = { manifest: readJson<Manifest>(join(dir, `${u.sprites}.manifest.json`), `sprite manifest for "${u.sprites}"`) };
  }
  return { mode, battle, rules, units, sets };
}

/**
 * Read a DUNGEON mode and everything it names: the room, the rules, one file
 * per distinct actor the start and the spawns name (the hero first), and one
 * manifest per set - a side-view `sprites` set for every actor and the
 * `facings` set a knight adds. Like a turn unit, an actor needs no moves file:
 * a strike is a rule, not a hitbox.
 */
export function loadDungeonMode(modeId: string, gameRoot: string): LoadedDungeon {
  const root = join(gameRoot, "data");
  const mode = readJson<DungeonModeFile>(join(root, "modes", `${modeId}.json`), `mode "${modeId}"`);
  if (mode.kind !== "dungeon") throw new Error(`dungeon: mode "${modeId}" is not a dungeon mode (kind ${JSON.stringify(mode.kind)})`);
  const room = readJson<RoomFile>(join(root, "rooms", `${mode.room}.json`), `room "${mode.room}" (named by mode "${modeId}")`);
  const rules = readJson<DungeonRulesFile>(join(root, "dungeon", `${mode.dungeon}.json`), `dungeon rules "${mode.dungeon}" (named by mode "${modeId}")`);
  const actors = distinct([room.start, ...room.spawns], (p) => p.actor).map((id) =>
    readJson<ActorFile>(join(root, "actors", `${id}.json`), `actor "${id}" (named by room "${mode.room}")`),
  );
  const sets: LoadedDungeon["sets"] = {};
  for (const a of actors) {
    for (const set of [a.sprites, ...(a.facings ? [a.facings] : [])]) {
      if (sets[set]) continue;
      sets[set] = { manifest: readJson<Manifest>(join(gameRoot, "assets", set, `${set}.manifest.json`), `sprite manifest for "${set}"`) };
    }
  }
  return { mode, room, rules, actors, sets };
}
