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
import { GAMES, gameDir, loadDungeonMode, loadMode, loadTurnMode, readModeKind } from "../data/load";
import { compileDungeon } from "../dungeon/compile";
import { hashDungeonEvents, hashDungeonState } from "../dungeon/hash";
import { alive } from "../dungeon/hits";
import { createState as createDungeon } from "../dungeon/room";
import { stepDungeon } from "../dungeon/step";
import { inputsAtDungeon } from "../dungeon/tape";
import { PHASE_LOST as D_LOST, PHASE_WON as D_WON } from "../dungeon/types";
import type { DungeonData, DungeonEvent, DungeonInput } from "../dungeon/types";
import { createState as createTurn } from "../turn/battle";
import { compileTurn } from "../turn/compile";
import { hashTurnEvents, hashTurnState } from "../turn/hash";
import { stepTurn } from "../turn/step";
import { inputsAtTurn } from "../turn/tape";
import { PHASE_LOST, PHASE_WON } from "../turn/types";
import type { TurnData, TurnEvent, TurnInput } from "../turn/types";
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
  /** a turn tape also pins where the battle stood: the turn, the phase, the selection */
  turn?: { turn: number; phase: number; sel: number };
  /** a dungeon tape also pins where the room stood: the phase, the purse, how many foes still stand */
  dungeon?: { phase: number; coins: number; alive: number };
}

/** every tape a game holds, by name; a golden sits beside its tape and is not one */
const tapeNames = (game: string): string[] => readdirSync(tapesDir(game)).filter((f) => f.endsWith(".json") && !f.endsWith(".golden.json")).map((f) => f.replace(/\.json$/, "")).sort();
const readTapeFile = (game: string, name: string): Tape => readTape(JSON.parse(readFileSync(join(tapesDir(game), `${name}.json`), "utf8")));
const goldenPath = (game: string, name: string): string => join(tapesDir(game), `${name}.golden.json`);

export function replay(data: FightData, tape: Tape, name: string, ticks = tape.ticks): Golden {
  // a tape's carry (a mid-campaign stage's purse) seeds the create; absent, the create is the one every older golden was recorded through
  let s = createState(data, tape.carry);
  const all: FightEvent[] = [];
  const perTick: string[] = [];
  for (let t = 0; t < ticks; t++) { s = step(s, inputsAtTick(tape, t, s.fighters.length), data); all.push(...s.events); perTick.push(hashState(s)); }
  const g: Golden = { tape: name, ticks, hash: hashState(s), chain: chainOf(perTick), eventHash: hashEvents(all), hp: s.fighters.map((f) => f.hp), winner: s.winner, hits: all.filter((e) => e.kind === "hit").length };
  if (s.stage) g.stage = { wave: s.stage.wave, wphase: s.stage.wphase, coins: s.stage.coins, xp: s.stage.xp, level: s.stage.level };
  return g;
}

/** the turn kind's replay, the same triple over the turn machine; winner is 0 for VICTORY, 1 for DEFEAT, -1 while the battle runs */
export function replayTurn(data: TurnData, tape: Tape<TurnInput>, name: string, ticks = tape.ticks): Golden {
  let s = createTurn(data);
  const all: TurnEvent[] = [];
  const perTick: string[] = [];
  for (let t = 0; t < ticks; t++) { s = stepTurn(s, inputsAtTurn(tape, t, 1), data); all.push(...s.events); perTick.push(hashTurnState(s)); }
  const winner = s.phase === PHASE_WON ? 0 : s.phase === PHASE_LOST ? 1 : -1;
  return { tape: name, ticks, hash: hashTurnState(s), chain: chainOf(perTick), eventHash: hashTurnEvents(all), hp: s.units.map((u) => u.hp), winner, hits: all.filter((e) => e.kind === "hit").length, turn: { turn: s.turn, phase: s.phase, sel: s.sel } };
}

/** the dungeon kind's replay, the same triple over the room; winner is 0 for VICTORY, 1 for DEFEAT, -1 while the room runs; hits counts every hit either way */
export function replayDungeon(data: DungeonData, tape: Tape<DungeonInput>, name: string, ticks = tape.ticks): Golden {
  let s = createDungeon(data);
  const all: DungeonEvent[] = [];
  const perTick: string[] = [];
  for (let t = 0; t < ticks; t++) { s = stepDungeon(s, inputsAtDungeon(tape, t, 1), data); all.push(...s.events); perTick.push(hashDungeonState(s)); }
  const winner = s.phase === D_WON ? 0 : s.phase === D_LOST ? 1 : -1;
  return {
    tape: name, ticks, hash: hashDungeonState(s), chain: chainOf(perTick), eventHash: hashDungeonEvents(all), hp: s.actors.map((a) => a.hp), winner,
    hits: all.filter((e) => e.kind === "hit").length, dungeon: { phase: s.phase, coins: s.coins, alive: s.actors.slice(1).filter((a) => alive(a)).length },
  };
}

/** one tape replayed through whichever sim its mode names */
function replayAny(game: string, name: string): Golden {
  const tape = readTapeFile(game, name);
  const kind = readModeKind(tape.mode, gameDir(game));
  if (kind === "turn") return replayTurn(compileTurn(loadTurnMode(tape.mode, gameDir(game))), tape as unknown as Tape<TurnInput>, name);
  if (kind === "dungeon") return replayDungeon(compileDungeon(loadDungeonMode(tape.mode, gameDir(game))), tape as unknown as Tape<DungeonInput>, name);
  return replay(compileFight(loadMode(tape.mode, gameDir(game))), tape, name);
}

describe("the tapes on disk", () => {
  it("are the crypt's one, ember's one, the fight's three (the campaign's carry tape joined 2026-09-13) and the hollow's two, so nothing below runs over an empty list", () => {
    expect(Object.fromEntries(games.map((g) => [g, tapeNames(g)]))).toEqual({ crypt: ["crypt-600"], ember: ["meadow-1200"], fight: ["shelf-boss-900", "stage-600", "versus-600"], hollow: ["crypt-lose-1200", "crypt-win-2400"] });
  });
});

for (const game of games) {
  for (const name of tapeNames(game)) {
    describe(`golden tape ${game}/${name}`, () => {
      it("reproduces the committed golden (WRITE_GOLDEN=1 re-records it and prints old and new whole)", () => {
        const now = replayAny(game, name);
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

describe("the control that tells the carry tape from the six older goldens (2026-09-13)", () => {
  it("the carry's level one higher moves the shelf-boss chain, and the six older goldens stay exactly their committed selves", () => {
    const tape = readTapeFile("fight", "shelf-boss-900");
    expect(tape.carry).toEqual({ coins: 41, xp: 30, level: 4 });
    const data = compileFight(loadMode(tape.mode, FIGHT));
    const higher: Tape = { ...tape, carry: { ...tape.carry!, level: tape.carry!.level + 1 } };
    expect(replay(data, higher, "shelf-boss-900").chain).not.toBe(replay(data, tape, "shelf-boss-900").chain);
    // the six older tapes carry nothing, so createState(data, undefined) is the create they were recorded through
    for (const [game, name] of [["crypt", "crypt-600"], ["ember", "meadow-1200"], ["fight", "stage-600"], ["fight", "versus-600"], ["hollow", "crypt-lose-1200"], ["hollow", "crypt-win-2400"]] as const) {
      expect(readTapeFile(game, name).carry).toBeUndefined();
      const golden = JSON.parse(readFileSync(goldenPath(game, name), "utf8")) as Golden;
      expect(replayAny(game, name)).toEqual(golden);
    }
  });

  it("the carry golden pins a stage started mid-campaign: level 4 from the first tick, hits landed, the purse above the carry's", () => {
    const g = replayAny("fight", "shelf-boss-900");
    expect(g.stage).toBeDefined();
    expect(g.stage!.level).toBeGreaterThanOrEqual(4);
    expect(g.hits).toBeGreaterThan(0);
    expect(g.hp.length).toBe(14);
  });
});

describe("the control that tells the turn golden from the fight's", () => {
  const EMBER = gameDir("ember");

  it("walkTicks one longer moves the MEADOW chain, and the three fight and crypt goldens stay exactly their committed selves", () => {
    const tape = readTapeFile("ember", "meadow-1200") as unknown as Tape<TurnInput>;
    const data = compileTurn(loadTurnMode(tape.mode, EMBER));
    const slower: TurnData = { ...data, rules: { ...data.rules, walkTicks: data.rules.walkTicks + 1 } };
    expect(replayTurn(slower, tape, "meadow-1200").chain).not.toBe(replayTurn(data, tape, "meadow-1200").chain);
    // the fight's sim never reads a rules file: its goldens are what the files say, whatever the turn's rules do
    for (const [game, name] of [["crypt", "crypt-600"], ["fight", "stage-600"], ["fight", "versus-600"]] as const) {
      const golden = JSON.parse(readFileSync(goldenPath(game, name), "utf8")) as Golden;
      expect(replayAny(game, name)).toEqual(golden);
    }
  });

  it("the meadow golden pins a battle that did something: two turns played, a hero's strike landed, the enemies struck back", () => {
    const g = replayAny("ember", "meadow-1200");
    expect(g.turn).toBeDefined();
    expect(g.turn!.turn).toBeGreaterThanOrEqual(3);
    expect(g.hits).toBeGreaterThan(2);
    expect(g.hp.length).toBe(5);
    expect(g.hp[2]).toBeLessThan(14);
    expect(g.winner).toBe(-1);
  });
});

describe("the control that tells the dungeon goldens from the other three kinds'", () => {
  const HOLLOW = gameDir("hollow");

  it("the knight's speed one FP a tick faster moves the WIN chain, and the four older goldens stay exactly their committed selves", () => {
    const tape = readTapeFile("hollow", "crypt-win-2400") as unknown as Tape<DungeonInput>;
    const data = compileDungeon(loadDungeonMode(tape.mode, HOLLOW));
    const faster: DungeonData = { ...data, actors: data.actors.map((a, i) => (i === data.cast[0].actor ? { ...a, speed: a.speed + 1 } : a)) };
    expect(replayDungeon(faster, tape, "crypt-win-2400").chain).not.toBe(replayDungeon(data, tape, "crypt-win-2400").chain);
    // the fight's and the turn's sims never read an actor file: their goldens are what their files say, whatever the dungeon's actors do
    for (const [game, name] of [["crypt", "crypt-600"], ["ember", "meadow-1200"], ["fight", "stage-600"], ["fight", "versus-600"]] as const) {
      const golden = JSON.parse(readFileSync(goldenPath(game, name), "utf8")) as Golden;
      expect(replayAny(game, name)).toEqual(golden);
    }
  });

  it("the win golden pins a room that was won: six foes fallen, the door walked, coins taken, the knight's strikes landed", () => {
    const g = replayAny("hollow", "crypt-win-2400");
    expect(g.dungeon).toEqual({ phase: D_WON, coins: expect.any(Number), alive: 0 });
    expect(g.dungeon!.coins).toBeGreaterThan(0);
    expect(g.winner).toBe(0);
    expect(g.hits).toBeGreaterThan(6);
    expect(g.hp.length).toBe(7);
    expect(g.hp.slice(1).every((hp) => hp === 0)).toBe(true);
  });

  it("the lose golden pins a room that was lost: the knight at 0 with foes standing", () => {
    const g = replayAny("hollow", "crypt-lose-1200");
    expect(g.dungeon!.phase).toBe(D_LOST);
    expect(g.winner).toBe(1);
    expect(g.hp[0]).toBe(0);
    expect(g.dungeon!.alive).toBeGreaterThan(0);
  });
});
