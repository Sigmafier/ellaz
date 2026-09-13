// Every game's data files against the engine's schemas - the population is
// games/*/data/, walked from the tree, never a hand-kept list.
//
// The schemas live here, under schemas/, one per KIND directory and named
// after it (data/fighters/*.json is held to schemas/fighters.schema.json), so
// there is no table mapping a directory to its schema that could go stale. A
// game with no data/modes/ is refused - a game is what its modes say it is -
// and a kind directory with no schema is refused too, both watched failing on
// scratch trees below.
//
// The schemas are checked with the studio's OWN validator, scripts/lib/schema.mjs
// - the same sixty-line subset assert-manifest-schema.mjs uses - so there is one
// notion of what `additionalProperties: false` means in this repository and not
// two. It is imported by URL rather than by a literal specifier because it is an
// untyped .mjs and a literal would need an allowJs the rest of the workspace
// does not want; the tradeoff is that TypeScript types it `any`, which is why
// every call below is wrapped in `check()` with a real signature.
//
// Two things the validator subset CANNOT express, asserted here by hand and
// watched failing before they were believed:
//
//   - `ai` is required on a cast entry when control is "ai" (no if/then, no oneOf)
//   - a tick range is exactly two entries, lo <= hi (no maxItems)
//
// And one thing no schema can express at all: that a fighter's `sprites` names
// a sprite set that EXISTS on disk. A schema validates a string; only the
// filesystem knows whether that string is a directory.
//
// The invariants below that name numbers (the roster cap, the fall threshold
// against the moves files, tickRate 60) are the ENGINE's; the values they are
// measured on are the fight's, the one game today.

import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GAMES, gameDir, loadMode, loadTurnMode, readModeKind } from "./load";
import { compileFight } from "../sim/compile";
import type { AiFile, CastEntry, FighterFile, MatchFile, ModeFile } from "../sim/types";
import type { BattleFile, UnitFile } from "../turn/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMAS = join(HERE, "schemas");

const schemaLib = await import(new URL("../../scripts/lib/schema.mjs", import.meta.url).href);
const check = (schema: unknown, value: unknown): string[] => schemaLib.validate(schema, value) as string[];

const readJson = (path: string): Record<string, unknown> => JSON.parse(readFileSync(path, "utf8"));

/** every game under studio/games/ that carries a data/ directory */
function gamesWithData(): string[] {
  return readdirSync(GAMES).filter((g) => existsSync(join(GAMES, g, "data"))).sort();
}

interface DataFile { name: string; path: string; schemaPath: string }

/**
 * every data file of one game, paired with the engine schema for its kind.
 * Throws on a game with no modes/ and on a kind with no schema: an empty
 * corpus must never read as a clean one.
 */
function corpusOf(gameRoot: string): DataFile[] {
  const dataDir = join(gameRoot, "data");
  if (!existsSync(join(dataDir, "modes"))) throw new Error(`${gameRoot} has no data/modes/ - a game is what its modes say it is`);
  const out: DataFile[] = [];
  for (const dir of readdirSync(dataDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const schemaPath = join(SCHEMAS, `${dir.name}.schema.json`);
    if (!existsSync(schemaPath)) throw new Error(`data/${dir.name}/ has no schema - toybox/data/schemas/${dir.name}.schema.json is missing`);
    for (const f of readdirSync(join(dataDir, dir.name)).filter((x) => x.endsWith(".json") && !x.endsWith(".schema.json"))) {
      out.push({ name: `${dir.name}/${f}`, path: join(dataDir, dir.name, f), schemaPath });
    }
  }
  return out;
}

/** a game's mode files of the FIGHT kind: the cast and stage conditionals below are the fight's, and a turn mode has no cast to hold them to */
function fightModeFiles(g: string): DataFile[] {
  return corpusOf(gameDir(g)).filter((x) => x.name.startsWith("modes/") && readModeKind(x.name.slice("modes/".length).replace(/\.json$/, ""), gameDir(g)) === "fight");
}

const games = gamesWithData();
const FIGHT = gameDir("fight");
const EMBER = gameDir("ember");
const FIGHT_DATA = join(FIGHT, "data");
const ASSETS = join(FIGHT, "assets");
const FILES = corpusOf(FIGHT);

describe("the games on disk", () => {
  it("are the crypt, ember and the fight, so nothing below runs over an empty list", () => {
    expect(games).toEqual(["crypt", "ember", "fight"]);
  });

  it("two are the fight's kind and one is the turn's, read off the one field that says so", () => {
    expect(readModeKind("versus", FIGHT)).toBe("fight");
    expect(readModeKind("crypt", gameDir("crypt"))).toBe("fight");
    expect(readModeKind("meadow", EMBER)).toBe("turn");
  });

  it("every schema names a kind some game holds, and every kind has a schema", () => {
    const schemas = readdirSync(SCHEMAS).filter((f) => f.endsWith(".schema.json")).map((f) => f.replace(/\.schema\.json$/, "")).sort();
    const kinds = new Set<string>();
    for (const g of games) for (const d of readdirSync(join(gameDir(g), "data"), { withFileTypes: true })) if (d.isDirectory()) kinds.add(d.name);
    expect(schemas).toEqual([...kinds].sort());
    expect(schemas).toEqual(["ai", "arena", "battles", "fighters", "match", "modes", "rules", "stage", "units"]);
  });

  it("refuses a game with no modes/ - the control for the walk", () => {
    const root = mkdtempSync(join(tmpdir(), "toybox-game-"));
    mkdirSync(join(root, "data", "ai"), { recursive: true });
    expect(() => corpusOf(root)).toThrow(/no data\/modes/);
  });

  it("refuses a kind directory with no schema - the other control", () => {
    const root = mkdtempSync(join(tmpdir(), "toybox-game-"));
    mkdirSync(join(root, "data", "modes"), { recursive: true });
    mkdirSync(join(root, "data", "weather"), { recursive: true });
    writeFileSync(join(root, "data", "weather", "rain.json"), "{}");
    expect(() => corpusOf(root)).toThrow(/weather\.schema\.json is missing/);
  });
});

describe("every data file validates against the engine schema for its kind", () => {
  it("found the fight's whole corpus, so nothing below passes over an empty list", () => {
    expect(FILES.map((f) => f.name).sort()).toEqual([
      "ai/bat-cpu.json",
      "ai/slime-cpu.json",
      "ai/teddy-cpu.json",
      "arena/playroom.json",
      "arena/toybox.json",
      "fighters/bat.json",
      "fighters/robot.json",
      "fighters/slime.json",
      "fighters/teddy-boss.json",
      "fighters/teddy.json",
      "match/versus.json",
      "modes/stage.json",
      "modes/versus.json",
      "stage/toybox-quest.json",
    ]);
  });

  for (const g of games) {
    for (const f of corpusOf(gameDir(g))) {
      it(`${g}: ${f.name} is clean`, () => {
        expect(check(readJson(f.schemaPath), readJson(f.path))).toEqual([]);
      });
    }
  }

  it("names every file's id after the file", () => {
    for (const g of games) {
      for (const f of corpusOf(gameDir(g))) expect(readJson(f.path).id).toBe(f.name.split("/")[1].replace(/\.json$/, ""));
    }
  });
});

describe("the validator can actually fail - planted defects, one per shape", () => {
  const arena = FILES.find((f) => f.name === "arena/playroom.json")!;

  it("reds on a stray key", () => {
    const bad = { ...readJson(arena.path), thisIsNotAField: 1 };
    const errs = check(readJson(arena.schemaPath), bad);
    expect(errs.join("\n")).toMatch(/thisIsNotAField/);
  });

  it("reds on a stray key nested inside an object", () => {
    const raw = readJson(arena.path) as { sim: Record<string, unknown> };
    const bad = { ...raw, sim: { ...raw.sim, wobble: 2 } };
    expect(check(readJson(arena.schemaPath), bad).join("\n")).toMatch(/wobble/);
  });

  it("reds on a missing required field", () => {
    const bad = { ...readJson(arena.path) } as Record<string, unknown>;
    delete bad.sim;
    expect(check(readJson(arena.schemaPath), bad).join("\n")).toMatch(/sim/);
  });

  it("reds on a float where an integer is required", () => {
    const raw = readJson(arena.path) as { sim: Record<string, unknown> };
    const bad = { ...raw, sim: { ...raw.sim, gravity: 900.5 } };
    expect(check(readJson(arena.schemaPath), bad).join("\n")).toMatch(/expected integer/);
  });

  it("leaves the arena's loose art alone, which is what loose means here", () => {
    const raw = readJson(arena.path) as { art: Record<string, unknown> };
    const loose = { ...raw, art: { ...raw.art, shimmer: true } };
    expect(check(readJson(arena.schemaPath), loose)).toEqual([]);
  });
});

describe("the conditional the validator subset cannot write", () => {
  const modes = FILES.filter((f) => f.name.startsWith("modes/"));

  /** an "ai" control with no ai named, or an ai named by something else */
  function aiViolations(mode: ModeFile): string[] {
    return mode.cast.flatMap((c: CastEntry, i: number) => {
      if (c.control === "ai" && c.ai === undefined) return [`cast ${i} is ai-controlled and names no ai`];
      if (c.control !== "ai" && c.ai !== undefined) return [`cast ${i} is not ai-controlled but names ai "${c.ai}"`];
      return [];
    });
  }

  it("every real mode of every game satisfies it", () => {
    expect(modes.length).toBeGreaterThan(0);
    for (const g of games) {
      for (const f of fightModeFiles(g)) expect(aiViolations(readJson(f.path) as unknown as ModeFile)).toEqual([]);
    }
  });

  const versus = modes.find((f) => f.name === "modes/versus.json")!;

  it("fires when an ai-controlled entry names no ai", () => {
    const mode = readJson(versus.path) as unknown as ModeFile;
    delete mode.cast[1].ai;
    expect(aiViolations(mode)).toEqual(["cast 1 is ai-controlled and names no ai"]);
  });

  it("fires the other way, when a player entry names one", () => {
    const mode = readJson(versus.path) as unknown as ModeFile;
    mode.cast[0].ai = "teddy-cpu";
    expect(aiViolations(mode).join("\n")).toMatch(/cast 0 is not ai-controlled/);
  });

  it("keeps face to 1 or -1, which the subset has no enum for", () => {
    for (const f of modes) {
      for (const c of (readJson(f.path) as unknown as ModeFile).cast) expect([1, -1]).toContain(c.face);
    }
  });
});

describe("the stage conditionals the validator subset cannot write", () => {
  const modes = FILES.filter((f) => f.name.startsWith("modes/"));
  const fighters = FILES.filter((f) => f.name.startsWith("fighters/"));
  const stage = readJson(modes.find((f) => f.name === "modes/stage.json")!.path) as unknown as ModeFile;

  /** `stage` and `waves` come together or not at all; a spawn's side is 1 or -1 */
  function stageViolations(mode: ModeFile): string[] {
    const out: string[] = [];
    const hasWaves = (mode.waves?.length ?? 0) > 0;
    if (hasWaves !== (mode.stage !== undefined)) out.push(`mode "${mode.id}" has ${hasWaves ? "waves without a stage" : "a stage without waves"}`);
    (mode.waves ?? []).forEach((w, wi) => w.spawns.forEach((s, si) => {
      if (s.side !== 1 && s.side !== -1) out.push(`wave ${wi} spawn ${si} side is ${s.side}`);
    }));
    return out;
  }

  it("every real mode of every game satisfies it", () => {
    expect(modes.length).toBe(2);
    for (const g of games) {
      for (const f of fightModeFiles(g)) expect(stageViolations(readJson(f.path) as unknown as ModeFile)).toEqual([]);
    }
  });

  it("fires on waves without a stage file, and on a stage file without waves", () => {
    const noStage = { ...stage }; delete noStage.stage;
    expect(stageViolations(noStage)).toEqual(['mode "stage" has waves without a stage']);
    const noWaves = { ...stage }; delete noWaves.waves;
    expect(stageViolations(noWaves)).toEqual(['mode "stage" has a stage without waves']);
  });

  it("fires on a spawn side that is neither edge", () => {
    const bad = JSON.parse(JSON.stringify(stage)) as ModeFile;
    (bad.waves![1].spawns[2] as { side: number }).side = 0;
    expect(stageViolations(bad)).toEqual(["wave 1 spawn 2 side is 0"]);
  });

  it("keeps the roster at 31 rows or fewer - the hit mask is one bit per target", () => {
    const rows = stage.cast.length + stage.waves!.reduce((n, w) => n + w.spawns.length, 0);
    expect(rows).toBe(13);
    expect(rows).toBeLessThanOrEqual(31);
    // and the compiler refuses one row over
    const fat = JSON.parse(JSON.stringify(loadMode("stage", FIGHT)));
    while (fat.mode.cast.length + fat.mode.waves.reduce((n: number, w: { spawns: unknown[] }) => n + w.spawns.length, 0) < 32) {
      fat.mode.waves[0].spawns.push({ ...fat.mode.waves[0].spawns[0] });
    }
    expect(() => compileFight(fat)).toThrow(/32 roster rows; the hit mask holds 31/);
  });

  it("a hover height requires flying: the bat has both, and a grounded fighter with a hover is refused", () => {
    for (const f of fighters) {
      const ff = readJson(f.path) as unknown as FighterFile;
      if (ff.hover !== undefined) expect({ id: ff.id, flying: ff.flying }).toEqual({ id: ff.id, flying: true });
    }
    const loaded = JSON.parse(JSON.stringify(loadMode("stage", FIGHT)));
    const slime = loaded.fighters.find((f: FighterFile) => f.id === "slime");
    slime.hover = 30;
    expect(() => compileFight(loaded)).toThrow(/"slime" has a hover height but does not fly/);
  });

  /** every mode of every game that names a stage file, loaded: the population the geometry below ranges over */
  function stageModes(): { game: string; mode: string; loaded: ReturnType<typeof loadMode> }[] {
    const out: { game: string; mode: string; loaded: ReturnType<typeof loadMode> }[] = [];
    for (const g of games) {
      for (const f of fightModeFiles(g)) {
        const id = f.name.slice("modes/".length).replace(/\.json$/, "");
        const loaded = loadMode(id, gameDir(g));
        if (loaded.stage) out.push({ game: g, mode: id, loaded });
      }
    }
    return out;
  }

  it("every spawn lane lies inside the arena's z band, the camera lead inside one screen, the world holds every wave, and a door is where the hero can reach", () => {
    const all = stageModes();
    expect(all.map((m) => `${m.game}/${m.mode}`)).toEqual(["crypt/crypt", "fight/stage"]);
    for (const { game, mode, loaded } of all) {
      const st = loaded.stage!;
      const at = `${game}/${mode}`;
      expect({ at, ok: st.spawn.zMin >= loaded.arena.sim.zMin }).toEqual({ at, ok: true });
      expect({ at, ok: st.spawn.zMax <= loaded.arena.sim.zMax }).toEqual({ at, ok: true });
      expect({ at, ok: st.spawn.zMin <= st.spawn.zMax }).toEqual({ at, ok: true });
      expect({ at, ok: st.camera.lead < loaded.arena.view.w }).toEqual({ at, ok: true });
      expect({ at, ok: loaded.arena.world!.w >= loaded.arena.view.w * loaded.mode.waves!.length }).toEqual({ at, ok: true });
      if (st.door) expect({ at, door: st.door.x, reach: loaded.arena.view.w - st.screen.heroPad, ok: st.door.x <= loaded.arena.view.w - st.screen.heroPad }).toMatchObject({ at, ok: true });
    }
  });

  it("the crypt's rooms are locked by a door and its left spawns walk in: the arena floor is below the spawn line", () => {
    const crypt = loadMode("crypt", gameDir("crypt"));
    expect(crypt.stage!.door).toEqual({ x: 560 });
    // a spawn from the left appears at camX - spawnPad; the fight's floor of 20 clamps it inside the edge on its first tick (the parked pop)
    expect(crypt.arena.sim.xMin).toBeLessThanOrEqual(-crypt.stage!.screen.spawnPad);
    expect(crypt.arena.sim.xMax).toBeGreaterThanOrEqual(crypt.arena.world!.w + crypt.stage!.screen.spawnPad);
    expect(crypt.mode.waves!.length).toBe(3);
    expect(crypt.mode.waves!.map((w) => w.spawns.map((s) => s.fighter))).toEqual([
      ["bat", "bat", "bat"],
      ["ninja", "ninja", "bat"],
      ["bat", "wizard-boss", "bat"],
    ]);
  });
});

describe("the turn kind: what the validator subset cannot write, and the loader", () => {
  const EMBER_FILES = corpusOf(EMBER);
  const modes = readJson(join(SCHEMAS, "modes.schema.json"));

  it("found ember's whole corpus, so nothing below passes over an empty list", () => {
    expect(EMBER_FILES.map((f) => f.name).sort()).toEqual([
      "battles/meadow.json",
      "modes/meadow.json",
      "rules/ember.json",
      "units/bat.json",
      "units/knight.json",
      "units/slime.json",
      "units/wizard.json",
    ]);
  });

  it("a fight mode with a stray `kind` is held to the turn branch and refused by it, whole", () => {
    const bad = { ...(readJson(join(FIGHT_DATA, "modes", "versus.json")) as object), kind: "turn" };
    const errs = check(modes, bad);
    expect(errs.join("\n")).toMatch(/missing required "battle"/);
    expect(errs.join("\n")).toMatch(/unexpected key "arena"/);
    expect(errs.join("\n")).not.toMatch(/missing required "cast"/);
  });

  it("a turn mode missing its rules is refused naming the rules, and not the fight branch's complaints", () => {
    const bad = { ...(readJson(join(EMBER, "data", "modes", "meadow.json")) as object) } as Record<string, unknown>;
    delete bad.rules;
    const errs = check(modes, bad);
    expect(errs).toEqual(['$: missing required "rules"']);
  });

  it("a mode naming a kind no branch knows is refused naming the branches", () => {
    const bad = { ...(readJson(join(EMBER, "data", "modes", "meadow.json")) as object), kind: "dance" };
    expect(check(modes, bad).join("\n")).toMatch(/kind "dance" matches no oneOf branch \(branch 0 \(no kind\), turn\)/);
  });

  it("a fight mode with no kind and a defect is held to the kind-less branch", () => {
    const bad = { ...(readJson(join(FIGHT_DATA, "modes", "versus.json")) as object) } as Record<string, unknown>;
    delete bad.arena;
    expect(check(modes, bad)).toEqual(['$: missing required "arena"']);
  });

  it("a value clean under two branches is refused: exactly one must fit", () => {
    const twin = { oneOf: [{ type: "object" }, { type: "object", properties: { x: { type: "integer" } } }] };
    expect(check(twin, { x: 1 })).toEqual(["$: matches 2 of 2 oneOf branches, expected exactly one"]);
    expect(check(twin, { x: 1.5 })).toEqual([]);
  });

  /** every placement on the grid, off the blocked tiles, alone on its tile */
  function placementViolations(b: BattleFile): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    b.placements.forEach((p, i) => {
      const key = `${p.c},${p.r}`;
      if (p.c >= b.grid.cols || p.r >= b.grid.rows) out.push(`placement ${i} (${p.unit}) at (${p.c}, ${p.r}) is off the ${b.grid.cols}x${b.grid.rows} grid`);
      if (b.blocked.some((t) => t.c === p.c && t.r === p.r)) out.push(`placement ${i} (${p.unit}) stands on blocked tile (${p.c}, ${p.r})`);
      if (seen.has(key)) out.push(`placement ${i} (${p.unit}) shares tile (${p.c}, ${p.r})`);
      seen.add(key);
    });
    return out;
  }

  const meadow = readJson(join(EMBER, "data", "battles", "meadow.json")) as unknown as BattleFile;

  it("the meadow's five placements are on the grid, off the fire, one per tile", () => {
    expect(placementViolations(meadow)).toEqual([]);
    expect(meadow.placements.length).toBe(5);
  });

  it("fires on a placement off the grid, on the fire, and on a shared tile", () => {
    const off = JSON.parse(JSON.stringify(meadow)) as BattleFile; off.placements[0].c = 8;
    expect(placementViolations(off)).toEqual(["placement 0 (knight) at (8, 2) is off the 8x4 grid"]);
    const fire = JSON.parse(JSON.stringify(meadow)) as BattleFile; fire.placements[1] = { unit: "wizard", c: 5, r: 0 };
    expect(placementViolations(fire)).toEqual(["placement 1 (wizard) stands on blocked tile (5, 0)"]);
    const twin = JSON.parse(JSON.stringify(meadow)) as BattleFile; twin.placements[4] = { ...twin.placements[3] };
    expect(placementViolations(twin)).toEqual(["placement 4 (bat) shares tile (7, 2)"]);
  });

  it("a hover height requires flying: the bat has both, and nothing else hovers", () => {
    const units = EMBER_FILES.filter((f) => f.name.startsWith("units/")).map((f) => readJson(f.path) as unknown as UnitFile);
    expect(units.length).toBe(4);
    for (const u of units) if (u.hover !== undefined) expect({ id: u.id, flying: u.flying }).toEqual({ id: u.id, flying: true });
    expect(units.filter((u) => u.flying).map((u) => u.id)).toEqual(["bat"]);
  });

  it("every unit's sprite set is on disk in ember's assets with its manifest and sheet", () => {
    const seen: string[] = [];
    for (const f of EMBER_FILES.filter((x) => x.name.startsWith("units/"))) {
      const set = (readJson(f.path) as unknown as UnitFile).sprites;
      seen.push(set);
      expect({ set, manifest: existsSync(join(EMBER, "assets", set, `${set}.manifest.json`)) }).toEqual({ set, manifest: true });
      expect({ set, png: existsSync(join(EMBER, "assets", set, `${set}.png`)) }).toEqual({ set, png: true });
    }
    expect(seen.sort()).toEqual(["bat--snes16", "knight--snes16", "slime--snes16", "wizard--snes16"]);
  });

  it("every timing in the rules file is a whole number of ticks at the engine's rate", () => {
    const rules = readJson(join(EMBER, "data", "rules", "ember.json"));
    expect(rules.tickRate).toBe(60);
    for (const [k, v] of Object.entries(rules)) if (typeof v === "number") expect({ k, int: Number.isInteger(v) }).toEqual({ k, int: true });
  });

  it("loadTurnMode reads the battle, the rules, the units in first-appearance order, and one manifest per set", () => {
    const loaded = loadTurnMode("meadow", EMBER);
    expect(loaded.mode.kind).toBe("turn");
    expect(loaded.battle.id).toBe("meadow");
    expect(loaded.rules.id).toBe("ember");
    expect(loaded.units.map((u) => u.id)).toEqual(["knight", "wizard", "slime", "bat"]);
    expect(Object.keys(loaded.sets).sort()).toEqual(["bat--snes16", "knight--snes16", "slime--snes16", "wizard--snes16"]);
    expect(Object.keys(loaded.sets["bat--snes16"].manifest.animations).sort()).toEqual(["attack", "hurt", "idle", "ko", "walk"]);
  });

  it("loadMode refuses a turn mode naming its kind, and loadTurnMode refuses a fight mode", () => {
    expect(() => loadMode("meadow", EMBER)).toThrow(/"meadow" is a "turn" mode, not a fight/);
    expect(() => loadTurnMode("versus", FIGHT)).toThrow(/"versus" is not a turn mode/);
  });

  it("readModeKind throws naming an unknown kind", () => {
    const root = mkdtempSync(join(tmpdir(), "toybox-game-"));
    mkdirSync(join(root, "data", "modes"), { recursive: true });
    writeFileSync(join(root, "data", "modes", "odd.json"), JSON.stringify({ id: "odd", kind: "dance" }));
    expect(() => readModeKind("odd", root)).toThrow(/unknown kind "dance"/);
  });
});

describe("every tick field is a whole number of ticks", () => {
  /** every number reachable in the file, with its path */
  function ints(v: unknown, path: string, out: string[] = []): string[] {
    if (typeof v === "number") {
      if (!Number.isInteger(v)) out.push(`${path} = ${v}`);
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => ints(x, `${path}[${i}]`, out));
    } else if (v !== null && typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) ints(x, `${path}.${k}`, out);
    }
    return out;
  }

  it("holds for every match, ai, stage and mode file", () => {
    const timed = FILES.filter((f) => /^(match|ai|stage|modes)\//.test(f.name));
    expect(timed.length).toBe(7);
    for (const f of timed) expect(ints(readJson(f.path), f.name)).toEqual([]);
  });

  it("the same walk can see a fraction, so the pass above is not vacuous", () => {
    expect(ints({ a: { b: [1, 2.5] } }, "$")).toEqual(["$.a.b[1] = 2.5"]);
  });

  it("keeps every ai range to exactly [lo, hi] with lo <= hi", () => {
    for (const f of FILES.filter((x) => x.name.startsWith("ai/"))) {
      const ai = readJson(f.path) as unknown as AiFile;
      for (const key of ["cooldownTicks", "reactTicks", "retreatTicks"] as const) {
        const range = ai[key];
        expect({ key, len: range.length, ordered: range[0] <= range[1] }).toEqual({ key, len: 2, ordered: true });
      }
    }
  });

  it("keeps the match's tickRate at the rate the sim is built for", () => {
    const match = readJson(join(FIGHT_DATA, "match", "versus.json")) as unknown as MatchFile;
    expect(match.tickRate).toBe(60);
  });
});

// hitZBand, fallThreshold and friction were not in the brief this data was
// written from - MatchFile grew them while it was being written - so the three
// values here were CHOSEN, and the reasons are arithmetic against files in
// another directory. A reason that lives only in a schema description is a
// sentence; these are the two that a change can actually break.
describe("the match thresholds against the moves files they are measured from", () => {
  const match = readJson(join(FIGHT_DATA, "match", "versus.json")) as unknown as MatchFile;

  /** every `fall` any authored hit carries, across every DISTINCT sprite set a fighter names (the teddy boss shares the teddy's) */
  function authoredFalls(): number[] {
    const out: number[] = [];
    const sets = new Set(FILES.filter((x) => x.name.startsWith("fighters/")).map((f) => (readJson(f.path) as unknown as FighterFile).sprites));
    for (const set of sets) {
      const moves = readJson(join(ASSETS, set, `${set}.moves.json`)) as unknown as {
        states: Record<string, { frames: { itr?: { fall?: number }[] }[] }>;
      };
      for (const st of Object.values(moves.states)) {
        for (const fr of st.frames) for (const hit of fr.itr ?? []) if (hit.fall !== undefined) out.push(hit.fall);
      }
    }
    return out;
  }

  it("keeps fallThreshold above what hitsToKnockdown-1 of the heaviest hit accumulates", () => {
    const falls = authoredFalls();
    // the population: the bat's 8, the slime's 10, the teddy's 12 and the robot's 20, each on two active frames
    expect(falls.sort((a, b) => a - b)).toEqual([8, 8, 10, 10, 12, 12, 20, 20]);
    // below this, `fall` knocks a fighter down a hit EARLY and hitsToKnockdown
    // stops meaning anything - the two thresholds would be fighting each other
    const heaviest = Math.max(...falls);
    expect(match.fallThreshold).toBeGreaterThan((match.hitsToKnockdown - 1) * heaviest);
  });

  it("keeps friction at 2 or more, because fixed.ts would divide by zero below it", () => {
    // vx' = floorDiv(vx * (friction - 1), friction): 0 divides, 1 is an instant stop
    expect(match.friction).toBeGreaterThanOrEqual(2);
  });

  it("keeps hitZBand above every ai's zTolerance, or a lined-up opponent cannot reach", () => {
    const ais = FILES.filter((f) => f.name.startsWith("ai/"));
    expect(ais.length).toBeGreaterThan(0);
    for (const f of ais) {
      const ai = readJson(f.path) as unknown as AiFile;
      expect({ id: ai.id, ok: match.hitZBand > ai.zTolerance }).toEqual({ id: ai.id, ok: true });
    }
  });
});

describe("every fighter's sprite set is on disk, with both halves, in its own game's assets", () => {
  it("finds a manifest and a moves file for each, in every game", () => {
    const seen: string[] = [];
    for (const g of games) {
      const assets = join(gameDir(g), "assets");
      for (const f of corpusOf(gameDir(g)).filter((x) => x.name.startsWith("fighters/"))) {
        const set = (readJson(f.path) as unknown as FighterFile).sprites;
        seen.push(`${g}/${set}`);
        expect({ set, manifest: existsSync(join(assets, set, `${set}.manifest.json`)) }).toEqual({ set, manifest: true });
        expect({ set, moves: existsSync(join(assets, set, `${set}.moves.json`)) }).toEqual({ set, moves: true });
      }
    }
    // the population: the fight's five fighter files over four sets, the crypt's four over four
    expect(seen.sort()).toEqual([
      "crypt/bat--snes16", "crypt/knight--snes16", "crypt/ninja--snes16", "crypt/wizard--snes16",
      "fight/bat--snes16", "fight/robot--snes16", "fight/slime--snes16", "fight/teddy--snes16", "fight/teddy--snes16",
    ]);
  });

  it("and the same check can see an absence", () => {
    expect(existsSync(join(ASSETS, "ghost--snes16", "ghost--snes16.moves.json"))).toBe(false);
  });
});

describe("loadMode reads a mode and everything it names", () => {
  it("returns the whole set, parsed", () => {
    const loaded = loadMode("versus", FIGHT);
    expect(loaded.mode.id).toBe("versus");
    expect(loaded.arena.id).toBe("playroom");
    expect(loaded.match.id).toBe("versus");
    expect(loaded.fighters.map((f) => f.id)).toEqual(["robot", "teddy"]);
    expect(loaded.ais.map((a) => a.id)).toEqual(["teddy-cpu"]);
    expect(Object.keys(loaded.sets).sort()).toEqual(["robot--snes16", "teddy--snes16"]);
    expect(loaded.sets["robot--snes16"].manifest.character).toBe("robot");
    expect(loaded.sets["robot--snes16"].moves.initial).toBe("idle");
  });

  it("reads the stage mode: the waves' fighters and ais join the cast's, and the stage file rides along", () => {
    const loaded = loadMode("stage", FIGHT);
    expect(loaded.arena.id).toBe("toybox");
    expect(loaded.fighters.map((f) => f.id)).toEqual(["robot", "slime", "bat", "teddy-boss"]);
    expect(loaded.ais.map((a) => a.id)).toEqual(["slime-cpu", "bat-cpu", "teddy-cpu"]);
    expect(Object.keys(loaded.sets).sort()).toEqual(["bat--snes16", "robot--snes16", "slime--snes16", "teddy--snes16"]);
    expect(loaded.stage?.id).toBe("toybox-quest");
    const data = compileFight(loaded);
    expect(data.cast.length).toBe(13);
    expect(data.cast.slice(1).map((c) => c.wave)).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2]);
    expect(data.stage?.waves).toBe(3);
    expect(data.arena.worldW).toBe(1920 * 256);
  });

  it("a Versus load carries no stage, and compiles to none", () => {
    const loaded = loadMode("versus", FIGHT);
    expect(loaded.stage).toBeUndefined();
    expect(compileFight(loaded).stage).toBeNull();
  });

  it("throws naming the mode when there is no such mode", () => {
    expect(() => loadMode("no-such-mode", FIGHT)).toThrow(/no-such-mode/);
  });

  it("throws naming the ARENA when a mode points at one that is not there", () => {
    // a scratch GAME root: the loader reads <root>/data/modes, so the fixture is shaped like a game
    const root = mkdtempSync(join(tmpdir(), "toybox-game-"));
    mkdirSync(join(root, "data", "modes"), { recursive: true });
    const mode = { ...(readJson(join(FIGHT_DATA, "modes", "versus.json")) as object), id: "orphan", arena: "ghost-arena" };
    writeFileSync(join(root, "data", "modes", "orphan.json"), JSON.stringify(mode));
    expect(() => loadMode("orphan", root)).toThrow(/ghost-arena/);
  });
});
