// A campaign ends a level on what the KIND reads off its own state: won, lost,
// or still playing. Each cell drives a real state from a real game's data to
// the phase in question, so an outcome read off the wrong field - or the wrong
// number, the dungeon's won is the turn machine's enemy phase - reds by name.
// The controls are the phases on either side: a live fight, a turn battle in
// its enemy phase and a dungeon room at its open door are all still playing.

import { gameDir, loadDungeonMode, loadMode, loadTurnMode } from "../../data/load";
import { compileDungeon } from "../../dungeon/compile";
import { createState as createRoom } from "../../dungeon/room";
import { PHASE_DOOR, PHASE_FIGHT, PHASE_LOST as ROOM_LOST, PHASE_WON as ROOM_WON } from "../../dungeon/types";
import { compileFight } from "../../sim/compile";
import { createState as createFight } from "../../sim/match";
import type { FightState, WavePhase } from "../../sim/types";
import { createState as createBattle } from "../../turn/battle";
import { compileTurn } from "../../turn/compile";
import { PHASE_ENEMY, PHASE_LOST as TURN_LOST, PHASE_PLAYER, PHASE_WON as TURN_WON } from "../../turn/types";
import { dungeonKind } from "./dungeon";
import { fightKind } from "./fight";
import { turnKind } from "./turn";

const fight = (): FightState => createFight(compileFight(loadMode("stage", gameDir("fight"))));
const withWave = (s: FightState, wphase: WavePhase): FightState => ({ ...s, stage: { ...s.stage!, wphase } });

describe("the fight kind's outcome", () => {
  it("wphase 2 (the last wave down) is won; wphase 3 (the hero down) is lost", () => {
    expect(fightKind.outcome(withWave(fight(), 2))).toBe("won");
    expect(fightKind.outcome(withWave(fight(), 3))).toBe("lost");
  });

  it("control: a fresh stage (wphase 0) and a GO (wphase 1) are still playing", () => {
    expect(fightKind.outcome(fight())).toBeNull();
    expect(fightKind.outcome(withWave(fight(), 1))).toBeNull();
  });

  it("a Versus match has no stage and is never an outcome", () => {
    expect(fightKind.outcome(createFight(compileFight(loadMode("versus", gameDir("fight")))))).toBeNull();
  });

  it("the purse is the stage's coins, xp and level (control: a Versus match has none to hand over)", () => {
    const s = fight();
    expect(fightKind.purse!({ ...s, stage: { ...s.stage!, coins: 7, xp: 25, level: 3 } })).toEqual({ coins: 7, xp: 25, level: 3 });
    expect(() => fightKind.purse!(createFight(compileFight(loadMode("versus", gameDir("fight")))))).toThrow(/no stage block/);
  });
});

describe("the turn kind's outcome", () => {
  const battle = () => createBattle(compileTurn(loadTurnMode("meadow", gameDir("ember"))));

  it("PHASE_WON is won and PHASE_LOST is lost", () => {
    expect(turnKind.outcome({ ...battle(), phase: TURN_WON })).toBe("won");
    expect(turnKind.outcome({ ...battle(), phase: TURN_LOST })).toBe("lost");
  });

  it("control: the player's and the enemy's phases are still playing", () => {
    expect(turnKind.outcome({ ...battle(), phase: PHASE_PLAYER })).toBeNull();
    expect(turnKind.outcome({ ...battle(), phase: PHASE_ENEMY })).toBeNull();
  });

  it("has no purse, so a campaign never hands a turn battle a carry", () => {
    expect(turnKind.purse).toBeUndefined();
  });
});

describe("the dungeon kind's outcome", () => {
  const room = () => createRoom(compileDungeon(loadDungeonMode("crypt", gameDir("hollow"))));

  it("PHASE_WON is won and PHASE_LOST is lost", () => {
    expect(dungeonKind.outcome({ ...room(), phase: ROOM_WON })).toBe("won");
    expect(dungeonKind.outcome({ ...room(), phase: ROOM_LOST })).toBe("lost");
  });

  it("control: a room being fought and a room with its door open are still playing", () => {
    expect(dungeonKind.outcome({ ...room(), phase: PHASE_FIGHT })).toBeNull();
    expect(dungeonKind.outcome({ ...room(), phase: PHASE_DOOR })).toBeNull();
  });

  it("has no purse", () => {
    expect(dungeonKind.purse).toBeUndefined();
  });
});
