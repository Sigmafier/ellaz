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
import { GAMES, gameDir, loadMode } from "./load";
import { compileFight } from "../sim/compile";
import type { AiFile, CastEntry, FighterFile, MatchFile, ModeFile } from "../sim/types";

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

const games = gamesWithData();
const FIGHT = gameDir("fight");
const FIGHT_DATA = join(FIGHT, "data");
const ASSETS = join(FIGHT, "assets");
const FILES = corpusOf(FIGHT);

describe("the games on disk", () => {
  it("are the fight, so nothing below runs over an empty list", () => {
    expect(games).toEqual(["fight"]);
  });

  it("every schema names a kind some game holds, and every kind has a schema", () => {
    const schemas = readdirSync(SCHEMAS).filter((f) => f.endsWith(".schema.json")).map((f) => f.replace(/\.schema\.json$/, "")).sort();
    const kinds = new Set<string>();
    for (const g of games) for (const d of readdirSync(join(gameDir(g), "data"), { withFileTypes: true })) if (d.isDirectory()) kinds.add(d.name);
    expect(schemas).toEqual([...kinds].sort());
    expect(schemas).toEqual(["ai", "arena", "fighters", "match", "modes", "stage"]);
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
      for (const f of corpusOf(gameDir(g)).filter((x) => x.name.startsWith("modes/"))) expect(aiViolations(readJson(f.path) as unknown as ModeFile)).toEqual([]);
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

  it("every real mode satisfies it", () => {
    expect(modes.length).toBe(2);
    for (const f of modes) expect(stageViolations(readJson(f.path) as unknown as ModeFile)).toEqual([]);
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

  it("every spawn lane lies inside the arena's z band, and the camera lead inside one screen", () => {
    const loaded = loadMode("stage", FIGHT);
    const st = loaded.stage!;
    expect(st.spawn.zMin).toBeGreaterThanOrEqual(loaded.arena.sim.zMin);
    expect(st.spawn.zMax).toBeLessThanOrEqual(loaded.arena.sim.zMax);
    expect(st.spawn.zMin).toBeLessThanOrEqual(st.spawn.zMax);
    expect(st.camera.lead).toBeLessThan(loaded.arena.view.w);
    expect(loaded.arena.world!.w).toBeGreaterThanOrEqual(loaded.arena.view.w * stage.waves!.length);
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

describe("every fighter's sprite set is on disk, with both halves", () => {
  it("finds a manifest and a moves file for each", () => {
    const fighters = FILES.filter((f) => f.name.startsWith("fighters/"));
    expect(fighters.length).toBe(5);
    for (const f of fighters) {
      const set = (readJson(f.path) as unknown as FighterFile).sprites;
      expect({ set, manifest: existsSync(join(ASSETS, set, `${set}.manifest.json`)) }).toEqual({ set, manifest: true });
      expect({ set, moves: existsSync(join(ASSETS, set, `${set}.moves.json`)) }).toEqual({ set, moves: true });
    }
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
