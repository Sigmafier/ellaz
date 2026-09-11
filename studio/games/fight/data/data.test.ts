// The five data files against the five schemas beside them.
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

import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMode } from "./load";
import type { AiFile, CastEntry, FighterFile, MatchFile, ModeFile } from "../core/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, "..", "assets");

const schemaLib = await import(new URL("../../../scripts/lib/schema.mjs", import.meta.url).href);
const check = (schema: unknown, value: unknown): string[] => schemaLib.validate(schema, value) as string[];

const readJson = (path: string): Record<string, unknown> => JSON.parse(readFileSync(path, "utf8"));

/** every data file in this tree, paired with the schema sitting beside it */
function corpus(): { name: string; path: string; schemaPath: string }[] {
  const out: { name: string; path: string; schemaPath: string }[] = [];
  for (const dir of readdirSync(HERE, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const files = readdirSync(join(HERE, dir.name)).filter((f) => f.endsWith(".json"));
    const schemas = files.filter((f) => f.endsWith(".schema.json"));
    if (schemas.length !== 1) throw new Error(`data/${dir.name}/ holds ${schemas.length} schemas, expected exactly 1`);
    for (const f of files.filter((x) => !x.endsWith(".schema.json"))) {
      out.push({ name: `${dir.name}/${f}`, path: join(HERE, dir.name, f), schemaPath: join(HERE, dir.name, schemas[0]) });
    }
  }
  return out;
}

const FILES = corpus();

describe("every data file validates against the schema beside it", () => {
  it("found the whole corpus, so nothing below passes over an empty list", () => {
    expect(FILES.map((f) => f.name).sort()).toEqual([
      "ai/teddy-cpu.json",
      "arena/playroom.json",
      "fighters/robot.json",
      "fighters/teddy.json",
      "match/versus.json",
      "modes/versus.json",
    ]);
  });

  for (const f of FILES) {
    it(`${f.name} is clean`, () => {
      expect(check(readJson(f.schemaPath), readJson(f.path))).toEqual([]);
    });
  }

  it("names every file's id after the file", () => {
    for (const f of FILES) {
      expect(readJson(f.path).id).toBe(f.name.split("/")[1].replace(/\.json$/, ""));
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

  it("every real mode satisfies it", () => {
    expect(modes.length).toBeGreaterThan(0);
    for (const f of modes) expect(aiViolations(readJson(f.path) as unknown as ModeFile)).toEqual([]);
  });

  it("fires when an ai-controlled entry names no ai", () => {
    const mode = readJson(modes[0].path) as unknown as ModeFile;
    delete mode.cast[1].ai;
    expect(aiViolations(mode)).toEqual(["cast 1 is ai-controlled and names no ai"]);
  });

  it("fires the other way, when a player entry names one", () => {
    const mode = readJson(modes[0].path) as unknown as ModeFile;
    mode.cast[0].ai = "teddy-cpu";
    expect(aiViolations(mode).join("\n")).toMatch(/cast 0 is not ai-controlled/);
  });

  it("keeps face to 1 or -1, which the subset has no enum for", () => {
    for (const f of modes) {
      for (const c of (readJson(f.path) as unknown as ModeFile).cast) expect([1, -1]).toContain(c.face);
    }
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

  it("holds for every match and ai file", () => {
    const timed = FILES.filter((f) => f.name.startsWith("match/") || f.name.startsWith("ai/"));
    expect(timed.length).toBe(2);
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

  it("keeps the match's tickRate at the rate the core is built for", () => {
    const match = readJson(join(HERE, "match", "versus.json")) as unknown as MatchFile;
    expect(match.tickRate).toBe(60);
  });
});

// hitZBand, fallThreshold and friction were not in the brief this data was
// written from - MatchFile grew them while it was being written - so the three
// values here were CHOSEN, and the reasons are arithmetic against files in
// another directory. A reason that lives only in a schema description is a
// sentence; these are the two that a change can actually break.
describe("the match thresholds against the moves files they are measured from", () => {
  const match = readJson(join(HERE, "match", "versus.json")) as unknown as MatchFile;

  /** every `fall` any authored hit carries, across every sprite set a fighter names */
  function authoredFalls(): number[] {
    const out: number[] = [];
    for (const f of FILES.filter((x) => x.name.startsWith("fighters/"))) {
      const set = (readJson(f.path) as unknown as FighterFile).sprites;
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
    // the population: the robot's 20 twice over and the teddy's 12 twice over
    expect(falls.sort((a, b) => a - b)).toEqual([12, 12, 20, 20]);
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
    expect(fighters.length).toBe(2);
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
    const loaded = loadMode("versus");
    expect(loaded.mode.id).toBe("versus");
    expect(loaded.arena.id).toBe("playroom");
    expect(loaded.match.id).toBe("versus");
    expect(loaded.fighters.map((f) => f.id)).toEqual(["robot", "teddy"]);
    expect(loaded.ais.map((a) => a.id)).toEqual(["teddy-cpu"]);
    expect(Object.keys(loaded.sets).sort()).toEqual(["robot--snes16", "teddy--snes16"]);
    expect(loaded.sets["robot--snes16"].manifest.character).toBe("robot");
    expect(loaded.sets["robot--snes16"].moves.initial).toBe("idle");
  });

  it("throws naming the mode when there is no such mode", () => {
    expect(() => loadMode("no-such-mode")).toThrow(/no-such-mode/);
  });

  it("throws naming the ARENA when a mode points at one that is not there", () => {
    const root = mkdtempSync(join(tmpdir(), "fight-data-"));
    mkdirSync(join(root, "modes"), { recursive: true });
    const mode = { ...(readJson(join(HERE, "modes", "versus.json")) as object), id: "orphan", arena: "ghost-arena" };
    writeFileSync(join(root, "modes", "orphan.json"), JSON.stringify(mode));
    expect(() => loadMode("orphan", root)).toThrow(/ghost-arena/);
  });
});
