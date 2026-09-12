// The golden tapes: every tape under every game's tapes/ (games/*/tapes/)
// replayed through the sim pins its state hash, its chain, its event hash, the
// hp values, the winner and the hit count - one golden per tape, written
// BESIDE it as <tape>.golden.json, and a stage tape also pins its wave, coins,
// xp and level. Negative controls stand beside them, on the fight game's
// tapes, because a golden that proves only "the code is the code" is not a
// gate: a truncating divide, a one-unit gravity change and a one-unit friction
// change must each move a Versus golden; a one-unit camera change must move
// the STAGE golden and leave Versus untouched. Re-record with the fight's
// tools/write-golden.mjs, never by hand.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GAMES, gameDir, loadMode } from "../data/load";
import { compileFight } from "./compile";
import { chainOf, hashEvents, hashState } from "./hash";
import { createState } from "./match";
import { step } from "./step";
import { inputsAtTick, readTape } from "./tape";
import type { Tape } from "./tape";
import type { FightData, FightEvent } from "./types";

/** every game with a tapes/ directory - the population, from the tree, never a hand-kept list */
const games = readdirSync(GAMES).filter((g) => existsSync(join(GAMES, g, "tapes"))).sort();
const tapesDir = (game: string): string => join(gameDir(game), "tapes");

/**
 * hash: the terminal state · chain: every tick's state hash folded in order, so a
 * flight that differs mid-air and lands on the same pixel still moves the golden
 * (gravity +1 moved the apex 7680 -> 7560 FP and NOTHING else - measured 2026-09-12)
 * · eventHash: every event of the run · stage: the wave machine's purse at the end.
 */
export interface Golden {
  tape: string; ticks: number; hash: string; chain: string; eventHash: string; hp: number[]; winner: number; hits: number;
  stage?: { wave: number; wphase: number; coins: number; xp: number; level: number };
}

/** every tape a game holds, by name; a golden sits beside its tape and is not one */
const tapeNames = (game: string): string[] => readdirSync(tapesDir(game)).filter((f) => f.endsWith(".json") && !f.endsWith(".golden.json")).map((f) => f.replace(/\.json$/, "")).sort();
const readTapeFile = (game: string, name: string): Tape => readTape(JSON.parse(readFileSync(join(tapesDir(game), `${name}.json`), "utf8")));
const goldenPath = (game: string, name: string): string => join(tapesDir(game), `${name}.golden.json`);

export function replay(data: FightData, tape: Tape, name: string, ticks = tape.ticks): Golden {
  let s = createState(data);
  const all: FightEvent[] = [];
  const perTick: string[] = [];
  for (let t = 0; t < ticks; t++) { s = step(s, inputsAtTick(tape, t, s.fighters.length), data); all.push(...s.events); perTick.push(hashState(s)); }
  const g: Golden = { tape: name, ticks, hash: hashState(s), chain: chainOf(perTick), eventHash: hashEvents(all), hp: s.fighters.map((f) => f.hp), winner: s.winner, hits: all.filter((e) => e.kind === "hit").length };
  if (s.stage) g.stage = { wave: s.stage.wave, wphase: s.stage.wphase, coins: s.stage.coins, xp: s.stage.xp, level: s.stage.level };
  return g;
}

describe("the tapes on disk", () => {
  it("are the fight's two, so nothing below runs over an empty list", () => {
    expect(Object.fromEntries(games.map((g) => [g, tapeNames(g)]))).toEqual({ fight: ["stage-600", "versus-600"] });
  });
});

for (const game of games) {
  for (const name of tapeNames(game)) {
    describe(`golden tape ${game}/${name}`, () => {
      const tape = readTapeFile(game, name);
      const data = compileFight(loadMode(tape.mode, gameDir(game)));

      it("reproduces the committed golden (WRITE_GOLDEN=1 re-records it and prints old and new whole)", () => {
        const now = replay(data, tape, name);
        const file = goldenPath(game, name);
        if (process.env.WRITE_GOLDEN === "1") {
          const old = existsSync(file) ? readFileSync(file, "utf8").trim().replace(/\s+/g, " ") : "(none)";
          writeFileSync(file, JSON.stringify(now, null, 2) + "\n");
          console.log(`write-golden ${game}/${name}: old ${old}\nwrite-golden ${game}/${name}: new ${JSON.stringify(now)}`);
        }
        expect(existsSync(file)).toBe(true);
        const golden = JSON.parse(readFileSync(file, "utf8")) as Golden;
        expect(now).toEqual(golden);
      });
    });
  }
}

const FIGHT = gameDir("fight");

describe("the controls, on the Versus tape", () => {
  const name = "versus-600";
  const tape = readTapeFile("fight", name);
  const data = compileFight(loadMode(tape.mode, FIGHT));

  it("control: gravity one unit heavier moves the CHAIN (the flight the terminal state can forget)", () => {
    const heavier = JSON.parse(JSON.stringify(data)) as FightData;
    heavier.arena.gravity += 1;
    const a = replay(heavier, tape, name), b = replay(data, tape, name);
    // measured 2026-09-12 over this tape BEFORE the AI read the target's swing: apex 7680 -> 7560 FP,
    // every hit on a grounded target, friction back to the same integer - hash and eventHash agreed
    // and a golden without the chain would have called the two sims identical. With the AI drawing
    // an rng byte per held tick, a different landing tick now also moves what follows, so the
    // terminal hash may move too; the chain moving is the assertion that holds either way
    expect(a.chain).not.toBe(b.chain);
  });

  it("control: friction one unit higher moves the terminal hash itself", () => {
    const slicker = JSON.parse(JSON.stringify(data)) as FightData;
    slicker.match.friction += 1;
    expect(replay(slicker, tape, name).hash).not.toBe(replay(data, tape, name).hash);
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
    const dataT = compileT(loadMode(tape.mode, FIGHT));
    let s = createT(dataT);
    for (let t = 0; t < tape.ticks; t++) s = stepT(s, inputsAtTick(tape, t, 2), dataT);
    vi.doUnmock("./fixed");
    expect(hashT(s)).not.toBe(replay(data, tape, name).hash);
  });
});

describe("the control that tells the two goldens apart", () => {
  it("the spawn band one px narrower moves the STAGE chain and leaves Versus untouched", () => {
    // the spawn band, not the camera divisor: a 600-tick tape never unlocks the camera, so a
    // divisor edit was measured to leave the chain byte-identical (2e7dac5c) - a control that
    // cannot fire on the tape it guards is no control. Every stage tape spawns, so the lane
    // draw is exercised from tick 18
    const versus = readTapeFile("fight", "versus-600"), stage = readTapeFile("fight", "stage-600");
    const vData = compileFight(loadMode(versus.mode, FIGHT)), sData = compileFight(loadMode(stage.mode, FIGHT));
    const narrower = JSON.parse(JSON.stringify(sData)) as FightData;
    narrower.stage!.spawn.zMin += 1;
    expect(replay(narrower, stage, "stage-600").chain).not.toBe(replay(sData, stage, "stage-600").chain);
    // Versus has no stage block: the same edit is unreachable there, and its golden cannot move
    const vSame = JSON.parse(JSON.stringify(vData)) as FightData;
    expect(vSame.stage).toBeNull();
    expect(replay(vSame, versus, "versus-600")).toEqual(replay(vData, versus, "versus-600"));
  });

  it("and the stage golden itself pins a wave machine that did something: hits landed, and a spawn in the purse's reach", () => {
    const stage = readTapeFile("fight", "stage-600");
    const g = replay(compileFight(loadMode(stage.mode, FIGHT)), stage, "stage-600");
    expect(g.stage).toBeDefined();
    expect(g.hits).toBeGreaterThan(0);
    expect(g.hp.length).toBe(13);
  });
});
