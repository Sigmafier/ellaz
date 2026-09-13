// Record a fight-kind tape from the scripted hero, never by hand. A boss level
// is the last wave, seconds of exact input away, and a tape typed toward it is a
// guess; this plays the SAME policy the completability KPI measures
// (sim/scripted-hero.ts) and writes the hero's input as tape rows - one row per
// change, holding until the next.
//
// With --after, the levels named first are played to their clear, chaining the
// carry, so the tape starts with the purse a run of those levels really ends with.
// A tape is a committed literal emitted by a program, so the program lives here
// and --check re-records it and compares (.claude/rules/a-generator-of-committed-literals-lives-beside-them.md).
//
//   cd studio
//   npx vite-node toybox/harness/record-tape.ts --game fight --mode toybox-boss --ticks 1400 --after stage,toybox-2,toybox-3 --write
//   npx vite-node toybox/harness/record-tape.ts --game fight --mode toybox-boss --ticks 1400 --after stage,toybox-2,toybox-3 --check

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gameDir, loadMode } from "../data/load";
import { compileFight } from "../sim/compile";
import { createState } from "../sim/match";
import { policyFor } from "../sim/scripted-hero";
import { heroIndex } from "../sim/stage";
import { step } from "../sim/step";
import type { Tape } from "../sim/tape";
import { NO_INPUT } from "../sim/types";
import type { Carry, InputFrame } from "../sim/types";

/** the ceiling on one earlier level's play; a level the scripted hero cannot clear inside it is refused */
const LEVEL_BUDGET = 9000;

export interface RecordSpec { game: string; mode: string; ticks: number; after: string[] }

/** play one earlier level to its clear and hand back its terminal purse */
function clearLevel(game: string, mode: string, carry: Carry | undefined): Carry {
  const data = compileFight(loadMode(mode, gameDir(game)));
  const policy = policyFor(data), hero = heroIndex(data);
  let s = createState(data, carry);
  for (let t = 0; t < LEVEL_BUDGET && s.stage!.wphase !== 2; t++) s = step(s, data.fighters.map((_, i) => (i === hero ? policy(s) : NO_INPUT)), data);
  if (!s.stage || s.stage.wphase !== 2) throw new Error(`record-tape: ${game}/${mode} was not cleared by the scripted hero inside ${LEVEL_BUDGET} ticks`);
  return { coins: s.stage.coins, xp: s.stage.xp, level: s.stage.level };
}

/** the tape the scripted hero plays on `spec.mode`, after clearing `spec.after` in order */
export function recordTape(spec: RecordSpec): Tape {
  let carry: Carry | undefined;
  for (const m of spec.after) carry = clearLevel(spec.game, m, carry);
  const data = compileFight(loadMode(spec.mode, gameDir(spec.game)));
  const policy = policyFor(data), hero = heroIndex(data);
  let s = createState(data, carry);
  const frames: [number, InputFrame[]][] = [];
  let last = "";
  for (let t = 0; t < spec.ticks; t++) {
    const input = policy(s);
    const key = JSON.stringify(input);
    if (key !== last) { frames.push([s.tick, [input]]); last = key; }
    s = step(s, data.fighters.map((_, i) => (i === hero ? input : NO_INPUT)), data);
  }
  return { mode: spec.mode, seed: data.seed, ticks: spec.ticks, ...(carry ? { carry } : {}), frames };
}

/** the committed file's shape: one row per line, a note carried over from the file when it has one */
export function formatTape(tape: Tape, note: string): string {
  const d = (v: unknown): string => JSON.stringify(v, null, 0).replace(/":/g, "\": ").replace(/,"/g, ", \"");
  const head = [`  "mode": ${d(tape.mode)}`, `  "seed": ${tape.seed}`, `  "ticks": ${tape.ticks}`];
  if (tape.carry) head.push(`  "carry": ${d(tape.carry)}`);
  head.push(`  "note": ${JSON.stringify(note)}`);
  const rows = tape.frames.map(([t, inputs]) => `    [${t}, [${inputs.map(d).join(", ")}]]`).join(",\n");
  return `{\n${head.join(",\n")},\n  "frames": [\n${rows}\n  ]\n}\n`;
}

/** what a committed tape and a recording must agree on: everything the sim reads, never the note */
export const playable = (t: Tape): unknown => ({ mode: t.mode, seed: t.seed, ticks: t.ticks, carry: t.carry ?? null, frames: t.frames });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? undefined : process.argv[i + 1];
}

function main(): void {
  const game = arg("game") ?? "fight", mode = arg("mode"), ticks = Number(arg("ticks"));
  if (!mode || !Number.isInteger(ticks) || ticks <= 0) throw new Error("record-tape: --mode <id> --ticks <n> are required");
  const spec: RecordSpec = { game, mode, ticks, after: arg("after")?.split(",").filter(Boolean) ?? [] };
  const file = join(gameDir(game), "tapes", `${mode}-${ticks}.json`);
  const tape = recordTape(spec);
  const old = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Tape & { note?: string }) : null;
  if (process.argv.includes("--check")) {
    const same = old !== null && JSON.stringify(playable(old)) === JSON.stringify(playable(tape));
    console.log(`record-tape --check ${game}/${mode}-${ticks}: ${same ? "IDENTICAL" : old ? "DIFFERS" : "NO COMMITTED TAPE"} (${tape.frames.length} rows, carry ${JSON.stringify(tape.carry ?? null)})`);
    process.exit(same ? 0 : 1);
  }
  if (process.argv.includes("--write")) {
    writeFileSync(file, formatTape(tape, old?.note ?? ""));
    console.log(`record-tape wrote ${file} (${tape.frames.length} rows); run write-golden next`);
    return;
  }
  console.log(JSON.stringify({ rows: tape.frames.length, carry: tape.carry ?? null }));
}

// vite-node REMOVES the script path from argv (measured 2026-09-14: argv is node, vite-node, then the flags), so a
// path match never fires and the CLI silently did nothing; vitest sets VITEST when record-tape.test.ts imports this
if (!process.env.VITEST) main();
