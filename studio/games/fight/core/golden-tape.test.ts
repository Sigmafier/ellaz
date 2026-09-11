// The golden tape: versus-600.json replayed through the core pins the state
// hash, the event hash, both hp values and the winner. Two negative controls
// stand beside it, because a golden that proves only "the code is the code"
// is not a gate: a truncating divide and a one-unit gravity change must both
// move the hash. Re-record with tools/write-golden.mjs, never by hand.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMode } from "../data/load";
import { compileFight } from "./compile";
import { fnv1a, hashEvents, hashState } from "./hash";
import { createState } from "./match";
import { step } from "./step";
import { inputsAtTick, readTape } from "./tape";
import type { FightData, FightEvent } from "./types";

const HERE = dirname(fileURLToPath(import.meta.url));
const TAPE = join(HERE, "..", "tournament", "tapes", "versus-600.json");
const GOLDEN = join(HERE, "..", "tournament", "data", "versus-600.golden.json");
const tape = readTape(JSON.parse(readFileSync(TAPE, "utf8")));

/**
 * hash: the terminal state · chain: every tick's state hash folded in order, so a
 * flight that differs mid-air and lands on the same pixel still moves the golden
 * (gravity +1 moved the apex 7680 -> 7560 FP and NOTHING else - measured 2026-09-12)
 * · eventHash: every event of the run.
 */
export interface Golden { tape: string; ticks: number; hash: string; chain: string; eventHash: string; hp: number[]; winner: number; hits: number }

/** fold a sequence of 8-hex-char tick hashes into one FNV-1a word */
export function chainOf(tickHashes: readonly string[]): string {
  const bytes: number[] = [];
  for (const h of tickHashes) for (let i = 0; i < h.length; i++) bytes.push(h.charCodeAt(i));
  return fnv1a(bytes).toString(16).padStart(8, "0");
}

export function replay(data: FightData, ticks = tape.ticks): Golden {
  let s = createState(data);
  const all: FightEvent[] = [];
  const perTick: string[] = [];
  for (let t = 0; t < ticks; t++) { s = step(s, inputsAtTick(tape, t, s.fighters.length), data); all.push(...s.events); perTick.push(hashState(s)); }
  return { tape: "versus-600", ticks, hash: hashState(s), chain: chainOf(perTick), eventHash: hashEvents(all), hp: s.fighters.map((f) => f.hp), winner: s.winner, hits: all.filter((e) => e.kind === "hit").length };
}

describe("golden tape", () => {
  const data = compileFight(loadMode(tape.mode));

  it("reproduces the committed golden (WRITE_GOLDEN=1 re-records it and prints old and new whole)", () => {
    const now = replay(data);
    if (process.env.WRITE_GOLDEN === "1") {
      const old = existsSync(GOLDEN) ? readFileSync(GOLDEN, "utf8").trim() : "(none)";
      writeFileSync(GOLDEN, JSON.stringify(now, null, 2) + "\n");
      console.log(`write-golden: old ${old}\nwrite-golden: new ${JSON.stringify(now)}`);
    }
    expect(existsSync(GOLDEN)).toBe(true);
    const golden = JSON.parse(readFileSync(GOLDEN, "utf8")) as Golden;
    expect(now).toEqual(golden);
  });

  it("control: gravity one unit heavier moves the CHAIN, and only the chain (the flight the terminal state forgets)", () => {
    const heavier = JSON.parse(JSON.stringify(data)) as FightData;
    heavier.arena.gravity += 1;
    const a = replay(heavier), b = replay(data);
    // measured 2026-09-12 over this tape: apex 7680 -> 7560 FP, every hit lands on a grounded
    // target, and friction decays vx back to the same integer - so hash and eventHash agree
    // and a golden without the chain would have called the two sims identical
    expect(a.chain).not.toBe(b.chain);
    expect([a.hash, a.eventHash]).toEqual([b.hash, b.eventHash]);
  });

  it("control: friction one unit higher moves the terminal hash itself", () => {
    const slicker = JSON.parse(JSON.stringify(data)) as FightData;
    slicker.match.friction += 1;
    expect(replay(slicker).hash).not.toBe(replay(data).hash);
  });

  it("control: a truncating divide instead of a flooring one moves the hash", async () => {
    vi.resetModules();
    vi.doMock("./fixed", async (importOriginal) => {
      const real = await importOriginal<typeof import("./fixed")>();
      return { ...real, floorDiv: (a: number, b: number) => Math.trunc(a / b) };
    });
    const { step: stepT } = await import("./step");
    const { createState: createT } = await import("./match");
    const { compileFight: compileT } = await import("./compile");
    const { hashState: hashT } = await import("./hash");
    const dataT = compileT(loadMode(tape.mode));
    let s = createT(dataT);
    for (let t = 0; t < tape.ticks; t++) s = stepT(s, inputsAtTick(tape, t, 2), dataT);
    vi.doUnmock("./fixed");
    expect(hashT(s)).not.toBe(replay(data).hash);
  });
});
