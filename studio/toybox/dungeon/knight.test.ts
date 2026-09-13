// The knight on the crypt's real data: a click walks or targets, held keys
// move him a speed a tick, the facing follows the screen, Space swings at the
// nearest foe and the strike lands on the clip's middle frame, mp falls and
// regains, hp regains only after a stretch unhurt.

import { gameDir, loadDungeonMode } from "../data/load";
import { compileDungeon } from "./compile";
import { centre, tileIndex, tileOf } from "./grid";
import { hurt } from "./hits";
import { facingOf } from "./knight";
import { createState } from "./room";
import { stepDungeon } from "./step";
import { inputsAtDungeon } from "./tape";
import { ACT_INPUT_CLICK, ACT_INPUT_SWING, FACE_DOWN, FACE_LEFT, FACE_RIGHT, FACE_UP, NO_DUNGEON_INPUT, ST_ATTACK, ST_GONE, ST_IDLE, ST_WALK, TILE } from "./types";
import type { DungeonData, DungeonInput, DungeonState } from "./types";

const data: DungeonData = compileDungeon(loadDungeonMode("crypt", gameDir("hollow")));
const HERO = 0, SLIME3 = 3;
const input = (p: Partial<DungeonInput>): DungeonInput[] => [{ ...NO_DUNGEON_INPUT, ...p }];
const click = (x: number, y: number): DungeonInput[] => input({ act: ACT_INPUT_CLICK, x, y });
const none = (): DungeonInput[] => [NO_DUNGEON_INPUT];
function run(s: DungeonState, ticks: number, at: (t: number) => DungeonInput[] = none): DungeonState {
  for (let t = 0; t < ticks; t++) s = stepDungeon(s, at(s.tick), data);
  return s;
}
/** a room with every foe gone, so the knight is alone with the walls */
function alone(): DungeonState {
  const s = createState(data);
  for (let i = 1; i < s.actors.length; i++) s.actors[i].state = ST_GONE;
  return s;
}

describe("a click", () => {
  it("on a free tile makes a path ending there, leaves a marker, and the knight walks it to the tile", () => {
    let s = stepDungeon(alone(), click(centre(9), centre(7)), data);
    const k = s.actors[HERO];
    expect(k.path.length).toBeGreaterThan(0);
    expect(k.path[k.path.length - 1]).toBe(tileIndex(12, 9, 7));
    // the marker is laid with markerTicks and the same tick's cosmetics take one off it
    expect(s.markers).toEqual([{ i: 9, j: 7, t: data.rules.markerTicks - 1 }]);
    expect(k.state).toBe(ST_WALK);
    s = run(s, 200);
    expect([tileOf(s.actors[HERO].x), tileOf(s.actors[HERO].y)]).toEqual([9, 7]);
    expect(s.actors[HERO].path).toEqual([]);
    expect(s.actors[HERO].state).toBe(ST_IDLE);
  });

  it("on a blocked tile does nothing, and neither does one off the grid", () => {
    const s = stepDungeon(alone(), click(centre(3), centre(7)), data);
    expect(s.actors[HERO].path).toEqual([]);
    expect(s.markers).toEqual([]);
    const t = stepDungeon(alone(), click(-100, centre(7)), data);
    expect(t.actors[HERO].path).toEqual([]);
  });

  it("within clickRadius of a live foe targets it, and the knight chases and strikes it", () => {
    const s0 = createState(data);
    const foe = s0.actors[SLIME3];
    let s = stepDungeon(s0, click(foe.x + 50, foe.y - 40), data);
    expect(s.actors[HERO].target).toBe(SLIME3);
    // the chase plans its first path on the click's own tick
    expect(s.actors[HERO].path.length).toBeGreaterThan(0);
    expect(s.markers).toEqual([]);
    const before = s.actors[SLIME3].hp;
    s = run(s, 240);
    expect(s.actors[SLIME3].hp).toBeLessThan(before);
  });

  it("a click just past clickRadius walks to the tile instead", () => {
    const s0 = createState(data);
    const foe = s0.actors[SLIME3];
    const s = stepDungeon(s0, click(foe.x + data.rules.clickRadius + 1, foe.y), data);
    expect(s.actors[HERO].target).toBe(-1);
    expect(s.actors[HERO].path.length).toBeGreaterThan(0);
  });
});

describe("held keys", () => {
  it("move the knight `speed` a tick on one axis and speed * 181 / 256 on each of two", () => {
    const s = alone();
    const k = s.actors[HERO];
    const a = stepDungeon(s, input({ dx: 1 }), data).actors[HERO];
    expect(a.x - k.x).toBe(12);
    expect(a.y - k.y).toBe(0);
    const b = stepDungeon(s, input({ dx: 1, dy: 1 }), data).actors[HERO];
    expect(b.x - k.x).toBe(8);
    expect(b.y - k.y).toBe(8);
    expect(a.state).toBe(ST_WALK);
  });

  it("the facing follows the screen-space direction: down-right world is down, and so on", () => {
    for (const [dx, dy, face] of [[1, 1, FACE_DOWN], [-1, -1, FACE_UP], [-1, 1, FACE_LEFT], [1, -1, FACE_RIGHT]] as const) {
      expect(stepDungeon(alone(), input({ dx, dy }), data).actors[HERO].face).toBe(face);
    }
    const { facingNum: n, facingDen: d } = data.rules;
    expect(facingOf(0, 0, FACE_LEFT, n, d)).toBe(FACE_LEFT);
    expect(facingOf(256, 0, FACE_DOWN, n, d)).toBe(FACE_RIGHT);
    expect(facingOf(0, 256, FACE_DOWN, n, d)).toBe(FACE_LEFT);
  });

  it("stop at a wall on the held axis: a step that would put the body's edge in the wall is refused whole", () => {
    let s = alone();
    s.actors[HERO].x = data.actors[0].radius + 20;
    s = run(s, 1, () => input({ dx: -1 }));
    expect(s.actors[HERO].x).toBe(data.actors[0].radius + 8);
    s = run(s, 5, () => input({ dx: -1 }));
    expect(s.actors[HERO].x).toBe(data.actors[0].radius + 8);
  });

  it("a held key cancels a path and a target", () => {
    let s = stepDungeon(alone(), click(centre(9), centre(7)), data);
    expect(s.actors[HERO].path.length).toBeGreaterThan(0);
    s = stepDungeon(s, input({ dy: 1 }), data);
    expect(s.actors[HERO].path).toEqual([]);
  });
});

describe("Space", () => {
  /** a slime one tile to the knight's +x, alive, the others gone */
  function withFoeRight(): DungeonState {
    const s = alone();
    s.actors[SLIME3].state = ST_IDLE;
    s.actors[SLIME3].x = s.actors[HERO].x + TILE;
    s.actors[SLIME3].y = s.actors[HERO].y;
    return s;
  }

  it("swings at the nearest foe within swingSeek, turning to face it, and spends mpCost", () => {
    const s = stepDungeon(withFoeRight(), input({ act: ACT_INPUT_SWING }), data);
    const k = s.actors[HERO];
    expect(k.state).toBe(ST_ATTACK);
    expect(k.face).toBe(FACE_RIGHT);
    expect(k.mp).toBe(data.actors[0].knight!.mp - data.actors[0].knight!.mpCost);
  });

  it("the strike lands on the side clip's middle frame - the foe's hp drops between 10 and 15 at tick 15, not before", () => {
    let s = stepDungeon(withFoeRight(), input({ act: ACT_INPUT_SWING }), data);
    const hp0 = s.actors[SLIME3].hp;
    s = run(s, 14);
    expect(s.actors[SLIME3].hp).toBe(hp0);
    s = run(s, 1);
    expect(s.events.some((e) => e.kind === "hit" && e.attacker === HERO && e.target === SLIME3)).toBe(true);
    const dmg = hp0 - s.actors[SLIME3].hp;
    expect(dmg).toBeGreaterThanOrEqual(10);
    expect(dmg).toBeLessThanOrEqual(15);
    // the attack clip is 6 frames of 5 ticks: the knight is idle again at tick 30
    s = run(s, 15);
    expect(s.actors[HERO].state).toBe(ST_IDLE);
  });

  it("with no foe in reach swings straight ahead and hits nothing", () => {
    const s = run(stepDungeon(alone(), input({ act: ACT_INPUT_SWING }), data), 30);
    expect(s.events.filter((e) => e.kind === "hit")).toEqual([]);
    expect(s.actors[HERO].face).toBe(FACE_DOWN);
  });

  it("a swing at a foe up-screen reads the facings set's shorter attack clip: the strike lands at tick 5", () => {
    const s0 = alone();
    s0.actors[SLIME3].state = ST_IDLE;
    s0.actors[SLIME3].x = s0.actors[HERO].x - TILE;
    s0.actors[SLIME3].y = s0.actors[HERO].y - TILE;
    let s = stepDungeon(s0, input({ act: ACT_INPUT_SWING }), data);
    expect(s.actors[HERO].face).toBe(FACE_UP);
    s = run(s, 4);
    expect(s.actors[SLIME3].hp).toBe(data.actors[1].hp);
    s = run(s, 1);
    expect(s.actors[SLIME3].hp).toBeLessThan(data.actors[1].hp);
  });
});

describe("a tape", () => {
  it("holds a row's direction until the next row and fires its act on the row's own tick only", () => {
    const tape = { mode: "crypt", seed: 1, ticks: 20, frames: [[3, [{ dx: 1, dy: 0, act: ACT_INPUT_CLICK, x: 500, y: 600 }]], [8, [{ dx: 0, dy: -1, act: ACT_INPUT_SWING, x: 0, y: 0 }]]] as [number, DungeonInput[]][] };
    expect(inputsAtDungeon(tape, 2, 1)).toEqual([NO_DUNGEON_INPUT]);
    expect(inputsAtDungeon(tape, 3, 1)).toEqual([{ dx: 1, dy: 0, act: ACT_INPUT_CLICK, x: 500, y: 600 }]);
    expect(inputsAtDungeon(tape, 4, 1)).toEqual([{ dx: 1, dy: 0, act: 0, x: 0, y: 0 }]);
    expect(inputsAtDungeon(tape, 7, 1)).toEqual([{ dx: 1, dy: 0, act: 0, x: 0, y: 0 }]);
    expect(inputsAtDungeon(tape, 8, 1)).toEqual([{ dx: 0, dy: -1, act: ACT_INPUT_SWING, x: 0, y: 0 }]);
    expect(inputsAtDungeon(tape, 9, 1)).toEqual([{ dx: 0, dy: -1, act: 0, x: 0, y: 0 }]);
    expect(inputsAtDungeon(tape, 9, 2)).toEqual([{ dx: 0, dy: -1, act: 0, x: 0, y: 0 }, NO_DUNGEON_INPUT]);
  });
});

describe("regen", () => {
  it("mp comes back mpRegenAmount every mpRegenEvery ticks, capped at the orb", () => {
    let s = stepDungeon(alone(), input({ act: ACT_INPUT_SWING }), data);
    expect(s.actors[HERO].mp).toBe(50);
    s = run(s, 60);
    expect(s.actors[HERO].mp).toBe(58);
    s = run(s, 60);
    expect(s.actors[HERO].mp).toBe(60);
  });

  it("hp comes back only after hpRegenAfter ticks unhurt, and a hit resets the wait", () => {
    const s0 = alone();
    hurt(s0, data, SLIME3, HERO, 10, s0.actors[HERO].x + TILE, s0.actors[HERO].y);
    expect(s0.actors[HERO].hp).toBe(90);
    expect(s0.actors[HERO].since).toBe(0);
    let s = run(s0, 170);
    expect(s.actors[HERO].hp).toBe(90);
    s = run(s, 60);
    expect(s.actors[HERO].hp).toBeGreaterThan(90);
    // the control: hit again at 170, and 60 more ticks bring nothing back
    let t = run(s0, 170);
    hurt(t, data, SLIME3, HERO, 1, t.actors[HERO].x + TILE, t.actors[HERO].y);
    t = run(t, 60);
    expect(t.actors[HERO].hp).toBe(89);
  });
});
