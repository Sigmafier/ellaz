// The phase machine, rule by rule, each with the control that would refute
// it: a pick walks or strikes, a walk lands exactly, a wait ends a hero's
// turn, the enemies act in order with the pauses the rules name, the hp
// floors and a fallen unit leaves the board, VICTORY and DEFEAT, restart.

import { gameDir, loadTurnMode } from "../data/load";
import { createState } from "./battle";
import { compileTurn } from "./compile";
import { tileIndex, tileX, tileY, unitAt } from "./grid";
import { stepTurn } from "./step";
import { inputsAtTurn } from "./tape";
import type { Tape } from "../sim/tape";
import {
  ACT_INPUT_PICK, ACT_INPUT_RESTART, ACT_INPUT_WAIT, CLIP_ATTACK, CLIP_HURT, CLIP_IDLE, CLIP_KO, CLIP_WALK,
  LOG_HERO_DONE, LOG_HERO_PICKED, LOG_HIT, LOG_HIT_DOWN, LOG_PICK_ANOTHER, LOG_STRIKE_OR_WAIT,
  PHASE_ANIM, PHASE_ENEMY, PHASE_LOST, PHASE_PLAYER, PHASE_WON, BANNER_ENEMY_TURN, BANNER_VICTORY, BANNER_DEFEAT, BANNER_YOUR_TURN,
} from "./types";
import type { LoadedTurn, TurnData, TurnInput, TurnState } from "./types";

const EMBER = gameDir("ember");
const loaded = (): LoadedTurn => JSON.parse(JSON.stringify(loadTurnMode("meadow", EMBER)));
const data = compileTurn(loadTurnMode("meadow", EMBER));
const R = data.rules;
const KNIGHT = 0, WIZARD = 1, SLIME = 2, BAT_A = 3, BAT_B = 4;
const withEdits = (edit: (l: LoadedTurn) => void): TurnData => { const l = loaded(); edit(l); return compileTurn(l); };

const pick = (c: number, r: number): TurnInput => ({ c, r, act: ACT_INPUT_PICK });
const WAIT: TurnInput = { c: 0, r: 0, act: ACT_INPUT_WAIT };
const RESTART: TurnInput = { c: 0, r: 0, act: ACT_INPUT_RESTART };
const NONE: TurnInput[] = [];

const tick = (s: TurnState, d: TurnData, input?: TurnInput): TurnState => stepTurn(s, input ? [input] : NONE, d);
const run = (s: TurnState, d: TurnData, n: number): TurnState => { for (let i = 0; i < n; i++) s = tick(s, d); return s; };
/** step until `pred` holds, at most `max` ticks; returns the state and how many ticks it took */
function until(s: TurnState, d: TurnData, pred: (s: TurnState) => boolean, max = 5000): { s: TurnState; n: number } {
  let n = 0;
  while (!pred(s) && n < max) { s = tick(s, d); n++; }
  return { s, n };
}

/** the slime adjacent to the knight, so a strike is one pick away */
const adjacent = (): TurnData => withEdits((l) => { l.battle.placements[2] = { unit: "slime", c: 2, r: 2 }; });

describe("the player's phase", () => {
  it("starts on turn 1 with YOUR TURN up for firstBannerTicks and nobody selected", () => {
    const s = createState(data);
    expect(s).toMatchObject({ tick: 0, phase: PHASE_PLAYER, turn: 1, sel: -1, banner: BANNER_YOUR_TURN, bannerT: R.firstBannerTicks });
    expect(run(s, data, R.firstBannerTicks).bannerT).toBe(0);
  });

  it("a pick on a hero selects it; on empty ground clears; on a foe out of reach does nothing", () => {
    let s = tick(createState(data), data, pick(1, 2));
    expect(s.sel).toBe(KNIGHT);
    expect(s.log).toMatchObject({ kind: LOG_HERO_PICKED, a: KNIGHT });
    s = tick(s, data, pick(6, 1));
    expect(s.sel).toBe(KNIGHT);
    // empty ground out of the knight's reach: not a move, a deselect
    s = tick(s, data, pick(7, 0));
    expect(s.sel).toBe(-1);
    expect(s.phase).toBe(PHASE_PLAYER);
  });

  it("a pick on a blue tile walks the path over walkTicks per tile in FP, landing exactly on the tile centre (the control: one tick early it is still moving)", () => {
    let s = tick(createState(data), data, pick(1, 2));
    s = tick(s, data, pick(3, 2));
    expect(s.phase).toBe(PHASE_ANIM);
    expect(s.actor).toBe(KNIGHT);
    expect(s.units[KNIGHT].clip).toBe(CLIP_WALK);
    expect(s.units[KNIGHT].path).toEqual([tileIndex(data.grid, 2, 2), tileIndex(data.grid, 3, 2)]);
    const early = run(s, data, 2 * R.walkTicks - 1);
    expect(early.phase).toBe(PHASE_ANIM);
    expect(early.units[KNIGHT].x).not.toBe(tileX(data.grid, 3));
    const landed = tick(early, data);
    expect(landed.units[KNIGHT]).toMatchObject({ c: 3, r: 2, x: tileX(data.grid, 3), y: tileY(data.grid, 2), moved: 1, clip: CLIP_IDLE, path: [] });
    // nothing in reach from (3, 2): the knight is done, and the wizard's turn keeps the phase open
    expect(landed).toMatchObject({ phase: PHASE_PLAYER, sel: -1 });
    expect(landed.units[KNIGHT].acted).toBe(1);
    expect(landed.log).toMatchObject({ kind: LOG_HERO_DONE, a: KNIGHT });
  });

  it("a walk that ends in reach keeps the hero selected; a wait then marks it done", () => {
    const d = withEdits((l) => { l.battle.placements[2] = { unit: "slime", c: 3, r: 2 }; });
    let s = tick(createState(d), d, pick(1, 2));
    s = tick(s, d, pick(2, 2));
    s = until(s, d, (x) => x.phase === PHASE_PLAYER).s;
    expect(s).toMatchObject({ sel: KNIGHT });
    expect(s.units[KNIGHT]).toMatchObject({ moved: 1, acted: 0 });
    expect(s.log).toMatchObject({ kind: LOG_STRIKE_OR_WAIT, a: KNIGHT });
    s = tick(s, d, WAIT);
    expect(s.units[KNIGHT]).toMatchObject({ moved: 0, acted: 1 });
    expect(s).toMatchObject({ sel: -1, phase: PHASE_PLAYER });
    expect(s.log.kind).toBe(LOG_PICK_ANOTHER);
  });

  it("a moved hero cannot move again, and a pick on an acted hero does not select it", () => {
    let s = tick(createState(data), data, pick(1, 2));
    s = tick(s, data, pick(2, 2));
    s = until(s, data, (x) => x.phase === PHASE_PLAYER).s;
    // in reach of nothing: done. A pick on it now selects nothing
    expect(s.units[KNIGHT].acted).toBe(1);
    s = tick(s, data, pick(2, 2));
    expect(s.sel).toBe(-1);
    // the wizard moves one, stays selected (bat at (5,3)? no - nothing in reach), so she is done too
    const d = withEdits((l) => { l.battle.placements[2] = { unit: "slime", c: 3, r: 1 }; });
    let w = tick(createState(d), d, pick(0, 1));
    w = tick(w, d, pick(1, 1));
    w = until(w, d, (x) => x.phase === PHASE_PLAYER).s;
    expect(w.sel).toBe(WIZARD);
    expect(w.units[WIZARD].moved).toBe(1);
    const again = tick(w, d, pick(2, 1));
    expect(again.phase).toBe(PHASE_PLAYER);
    expect(again.units[WIZARD].c).toBe(1);
  });

  it("inputs during an animation are ignored, and so is a restart", () => {
    let s = tick(createState(data), data, pick(1, 2));
    s = tick(s, data, pick(3, 2));
    const mid = run(s, data, 3);
    const ignored = tick(mid, data, pick(0, 1));
    expect(ignored).toEqual(tick(mid, data));
    const noRestart = tick(mid, data, RESTART);
    expect(noRestart.phase).toBe(PHASE_ANIM);
    expect(noRestart.units[KNIGHT].c).toBe(2);
  });

  it("restart from the player's phase returns createState with only the tick carried", () => {
    let s = tick(createState(data), data, pick(1, 2));
    s = run(s, data, 10);
    const fresh = tick(s, data, RESTART);
    expect(fresh).toEqual({ ...createState(data), tick: 12 });
  });
});

describe("reading a turn tape", () => {
  const tape: Tape<TurnInput> = { mode: "meadow", seed: 1, ticks: 100, frames: [[5, [pick(1, 2)]], [6, [pick(3, 2)]], [40, [WAIT]]] };

  it("a row fires on its own tick and on no other - a click is not a held button", () => {
    expect(inputsAtTurn(tape, 5, 1)).toEqual([pick(1, 2)]);
    expect(inputsAtTurn(tape, 6, 1)).toEqual([pick(3, 2)]);
    expect(inputsAtTurn(tape, 7, 1)).toEqual([{ c: 0, r: 0, act: 0 }]);
    expect(inputsAtTurn(tape, 39, 1)).toEqual([{ c: 0, r: 0, act: 0 }]);
    expect(inputsAtTurn(tape, 40, 1)).toEqual([WAIT]);
    expect(inputsAtTurn(tape, 4, 1)).toEqual([{ c: 0, r: 0, act: 0 }]);
  });

  it("fills every player the loop asks for, with nothing for the ones the row lacks", () => {
    expect(inputsAtTurn(tape, 5, 2)).toEqual([pick(1, 2), { c: 0, r: 0, act: 0 }]);
  });

  it("heroes lose hp only in the enemies' phase: every hit on a hero has a foe attacker while the phase is ENEMY (the invariant behind 'every hero dead on the player's turn')", () => {
    let s = tick(createState(data), data, WAIT);
    for (let i = 0; i < 3000 && s.phase !== PHASE_LOST; i++) {
      const phase = s.phase;
      s = tick(s, data, s.phase === PHASE_PLAYER ? WAIT : undefined);
      for (const e of s.events) if (e.kind === "hit" && data.units[e.target].team === 0) expect({ tick: s.tick, phase, foe: data.units[e.attacker].team !== 0 }).toEqual({ tick: s.tick, phase: PHASE_ENEMY, foe: true });
    }
    expect(s.phase).toBe(PHASE_LOST);
  });
});

describe("a strike", () => {
  it("a pick on a red foe swings: the damage lands after strikeWindupTicks, the striker settles after strikeRecoverTicks, the float and the events say so", () => {
    const d = adjacent();
    let s = tick(createState(d), d, pick(1, 2));
    s = tick(s, d, pick(2, 2));
    expect(s.phase).toBe(PHASE_ANIM);
    expect(s.units[KNIGHT]).toMatchObject({ clip: CLIP_ATTACK, target: SLIME, face: 1 });
    const before = run(s, d, R.strikeWindupTicks - 1);
    expect(before.units[SLIME].hp).toBe(14);
    const hit = tick(before, d);
    expect(hit.units[SLIME].hp).toBe(7);
    expect(hit.units[SLIME].clip).toBe(CLIP_HURT);
    // the float is born on the hit tick and has already counted that tick
    expect(hit.floats).toEqual([{ x: tileX(d.grid, 2), y: tileY(d.grid, 2) - 64 * 256, value: 7, t: R.floatTicks - 1 }]);
    expect(hit.events).toEqual([{ kind: "hit", attacker: KNIGHT, target: SLIME, x: tileX(d.grid, 2), z: tileY(d.grid, 2), h: 32 * 256, damage: 7, effect: "none" }]);
    expect(hit.log).toEqual({ kind: LOG_HIT, a: KNIGHT, b: SLIME, n: 7 });
    const settling = run(hit, d, R.strikeRecoverTicks - 1);
    expect(settling.phase).toBe(PHASE_ANIM);
    const settled = tick(settling, d);
    expect(settled.phase).toBe(PHASE_PLAYER);
    expect(settled.units[KNIGHT]).toMatchObject({ acted: 1, moved: 0, target: -1, clip: CLIP_IDLE });
    expect(settled.units[SLIME].clip).toBe(CLIP_IDLE);
    expect(settled.sel).toBe(-1);
    expect(settled.floats[0].t).toBe(R.floatTicks - 1 - R.strikeRecoverTicks);
  });

  it("hp floors at 0, a fallen unit plays ko, leaves the board (unitAt skips it) and emits a ko event", () => {
    const d = withEdits((l) => { l.battle.placements[2] = { unit: "slime", c: 2, r: 2 }; l.units.find((u) => u.id === "slime")!.hp = 5; });
    let s = tick(createState(d), d, pick(1, 2));
    s = tick(s, d, pick(2, 2));
    const hit = run(s, d, R.strikeWindupTicks);
    expect(hit.units[SLIME]).toMatchObject({ hp: 0, clip: CLIP_KO });
    expect(hit.events.map((e) => e.kind)).toEqual(["hit", "ko"]);
    expect(hit.log).toEqual({ kind: LOG_HIT_DOWN, a: KNIGHT, b: SLIME, n: 7 });
    expect(unitAt(hit.units, 2, 2)).toBe(-1);
    // the ko clip holds its last frame
    const later = run(hit, d, 200);
    expect(later.units[SLIME].clip).toBe(CLIP_KO);
    expect(later.units[SLIME].clipT).toBe(d.units[SLIME].clips[CLIP_KO].frames.length * d.units[SLIME].clips[CLIP_KO].ticksPerFrame - 1);
  });

  it("a float lives floatTicks and is gone the tick after", () => {
    const d = adjacent();
    let s = tick(createState(d), d, pick(1, 2));
    s = tick(s, d, pick(2, 2));
    s = run(s, d, R.strikeWindupTicks);
    expect(s.floats.length).toBe(1);
    // born with floatTicks and counted once on its birth tick: floatTicks - 1 more ticks alive, gone on the next
    const alive = run(s, d, R.floatTicks - 2);
    expect(alive.floats).toEqual([expect.objectContaining({ t: 1 })]);
    expect(tick(alive, d).floats).toEqual([]);
  });
});

describe("the enemies' phase", () => {
  /** every hero done: the knight walks out of reach, then a wait ends the party's turn */
  function endTurn(d: TurnData): TurnState {
    return tick(createState(d), d, WAIT);
  }

  it("a wait with nobody selected ends the turn: ENEMY TURN shows, the first foe acts after enemyBannerTicks", () => {
    const s = endTurn(data);
    // a banner is raised for turnBannerTicks and counts the tick it was raised on
    expect(s).toMatchObject({ phase: PHASE_ENEMY, banner: BANNER_ENEMY_TURN, bannerT: R.turnBannerTicks - 1, cursor: -1, actor: -1 });
    expect(s.events).toEqual([{ kind: "phase", phase: PHASE_ENEMY }]);
    for (const h of [KNIGHT, WIZARD]) expect(s.units[h].acted).toBe(1);
    const waiting = run(s, data, R.enemyBannerTicks - 1);
    expect(waiting.actor).toBe(-1);
    const acting = tick(waiting, data);
    expect(acting.actor).toBe(SLIME);
    expect(acting.cursor).toBe(SLIME);
    expect(acting.units[SLIME].clip).toBe(CLIP_WALK);
  });

  it("the cursor visits the living foes in row order, each walking its intent, with betweenTicks between them, then the party's turn returns", () => {
    let s = endTurn(data);
    const visited: number[] = [];
    let last = -1;
    const timeline: { tick: number; actor: number }[] = [];
    for (let i = 0; i < 2000 && s.phase === PHASE_ENEMY; i++) {
      s = tick(s, data);
      if (s.actor !== last) { timeline.push({ tick: s.tick, actor: s.actor }); last = s.actor; }
      if (s.cursor >= 0 && visited[visited.length - 1] !== s.cursor) visited.push(s.cursor);
    }
    expect(visited).toEqual([SLIME, BAT_A, BAT_B]);
    expect(s.phase).toBe(PHASE_PLAYER);
    expect(s).toMatchObject({ turn: 2, banner: BANNER_YOUR_TURN, bannerT: R.turnBannerTicks - 1, cursor: -1, actor: -1, sel: -1 });
    expect(s.events).toEqual([{ kind: "turn", turn: 2 }, { kind: "phase", phase: PHASE_PLAYER }]);
    for (const h of [KNIGHT, WIZARD]) expect(s.units[h]).toMatchObject({ acted: 0, moved: 0 });
    // the slime walked its two tiles along its row toward the wizard
    expect(s.units[SLIME]).toMatchObject({ c: 4, r: 1 });
    // between one foe settling (actor back to -1) and the next starting: exactly betweenTicks ticks
    const gaps: number[] = [];
    for (let i = 1; i + 1 < timeline.length; i++) if (timeline[i].actor === -1 && timeline[i + 1].actor >= 0) gaps.push(timeline[i + 1].tick - timeline[i].tick);
    expect(gaps.length).toBeGreaterThanOrEqual(2);
    for (const g of gaps) expect(g).toBe(R.betweenTicks);
  });

  it("a foe in reach strikes the hero it planned on; the hero's hp drops by its atk", () => {
    const d = adjacent();
    let s = endTurn(d);
    s = until(s, d, (x) => x.events.some((e) => e.kind === "hit")).s;
    const hit = s.events.find((e) => e.kind === "hit") as Extract<typeof s.events[number], { kind: "hit" }>;
    expect(hit).toMatchObject({ attacker: SLIME, target: KNIGHT, damage: 4 });
    expect(s.units[KNIGHT].hp).toBe(26);
  });

  it("DEFEAT when the last hero falls during the enemies' phase; the phase ends there and a restart is honoured", () => {
    const d = withEdits((l) => {
      l.battle.placements = [{ unit: "knight", c: 1, r: 2 }, { unit: "slime", c: 2, r: 2 }];
      l.units.find((u) => u.id === "knight")!.hp = 3;
    });
    let s = endTurn(d);
    s = until(s, d, (x) => x.phase !== PHASE_ENEMY).s;
    expect(s).toMatchObject({ phase: PHASE_LOST, banner: BANNER_DEFEAT, actor: -1 });
    expect(s.units[0].hp).toBe(0);
    expect(s.events).toContainEqual({ kind: "phase", phase: PHASE_LOST });
    const held = run(s, d, 100);
    expect(held.phase).toBe(PHASE_LOST);
    expect(tick(held, d, pick(1, 2)).sel).toBe(-1);
    const fresh = tick(held, d, RESTART);
    expect(fresh).toEqual({ ...createState(d), tick: held.tick + 1 });
  });

  it("the edge: the first foe's strike takes the last hero's last hp, and the second foe never acts (exactly one hit)", () => {
    const d = withEdits((l) => {
      l.battle.placements = [{ unit: "knight", c: 1, r: 2 }, { unit: "slime", c: 2, r: 2 }, { unit: "bat", c: 1, r: 3 }];
      l.units.find((u) => u.id === "knight")!.hp = 4;
    });
    let s = endTurn(d), hits = 0, kos = 0;
    for (let i = 0; i < 2000 && s.phase === PHASE_ENEMY; i++) { s = tick(s, d); hits += s.events.filter((e) => e.kind === "hit").length; kos += s.events.filter((e) => e.kind === "ko").length; }
    expect(s.phase).toBe(PHASE_LOST);
    expect({ hits, kos }).toEqual({ hits: 1, kos: 1 });
    // the bat never swung: still idle, never the actor
    expect(s.units[2].clip).toBe(CLIP_IDLE);
    expect(s.actor).toBe(-1);
    const held = run(s, d, 500);
    expect(held.phase).toBe(PHASE_LOST);
    expect(held.turn).toBe(1);
  });

  it("the edge: a foe with an empty path strikes from where it stands, never playing the walk clip", () => {
    const d = adjacent();
    let s = endTurn(d);
    expect(s.units[SLIME].path).toEqual([]);
    let walked = false;
    for (let i = 0; i < 2000 && !s.events.some((e) => e.kind === "hit"); i++) { s = tick(s, d); if (s.units[SLIME].clip === CLIP_WALK) walked = true; }
    expect(walked).toBe(false);
    // the swing began the tick after the banner wait, so the hit lands enemyBannerTicks + windup ticks after the wait
    expect(s.tick).toBe(1 + R.enemyBannerTicks + R.strikeWindupTicks);
    expect(s.units[SLIME]).toMatchObject({ c: 2, r: 2 });
  });

  it("the edge: a foe boxed in with nothing in range plans no walk and no strike, sits out its turn, and the party's turn returns", () => {
    // the slime walled in at (7, 0) by the fire and a bat, the heroes far away
    const d = withEdits((l) => {
      l.battle.blocked = [{ c: 5, r: 0 }, { c: 6, r: 0 }, { c: 7, r: 1 }];
      l.battle.placements = [{ unit: "knight", c: 0, r: 3 }, { unit: "wizard", c: 0, r: 2 }, { unit: "slime", c: 7, r: 0 }];
    });
    const s0 = createState(d);
    expect(s0.units[SLIME]).toMatchObject({ target: 1, strikes: 0, path: [] });
    let s = endTurn(d), moved = false;
    for (let i = 0; i < 2000 && s.phase === PHASE_ENEMY; i++) { s = tick(s, d); if (s.units[SLIME].c !== 7 || s.units[SLIME].r !== 0 || s.units[SLIME].clip !== CLIP_IDLE) moved = true; }
    expect(moved).toBe(false);
    expect(s).toMatchObject({ phase: PHASE_PLAYER, turn: 2 });
    // the wait, then the between-pause, then the turn ends: tick 1 + enemyBannerTicks + betweenTicks
    expect(s.tick).toBe(1 + R.enemyBannerTicks + R.betweenTicks);
  });

  it("the edge: a restart during the enemies' phase is ignored, and a wait during an animation is ignored", () => {
    let s = endTurn(data);
    s = run(s, data, R.enemyBannerTicks + 3);
    expect(s.phase).toBe(PHASE_ENEMY);
    expect(tick(s, data, RESTART)).toEqual(tick(s, data));
    let a = tick(createState(data), data, pick(1, 2));
    a = tick(a, data, pick(3, 2));
    a = run(a, data, 2);
    expect(tick(a, data, WAIT)).toEqual(tick(a, data));
  });

  it("the edge: picks off the board - negative, past the last row, the fire - change nothing but the clock", () => {
    const s = tick(createState(data), data, pick(1, 2));
    for (const p of [pick(-1, 0), pick(0, -1), pick(8, 0), pick(0, 4), pick(5, 0), pick(999, 999)]) {
      expect(tick(s, data, p)).toEqual(tick(s, data));
    }
  });

  it("VICTORY when the last foe falls to a hero's strike, from either phase's end", () => {
    const d = withEdits((l) => {
      l.battle.placements = [{ unit: "knight", c: 1, r: 2 }, { unit: "wizard", c: 0, r: 1 }, { unit: "slime", c: 2, r: 2 }];
      l.units.find((u) => u.id === "slime")!.hp = 5;
    });
    let s = tick(createState(d), d, pick(1, 2));
    s = tick(s, d, pick(2, 2));
    s = until(s, d, (x) => x.phase !== PHASE_ANIM).s;
    expect(s).toMatchObject({ phase: PHASE_WON, banner: BANNER_VICTORY });
    expect(s.events).toContainEqual({ kind: "phase", phase: PHASE_WON });
    // nothing more happens; the enemies never get a turn
    const later = run(s, d, 300);
    expect(later.phase).toBe(PHASE_WON);
    expect(later.turn).toBe(1);
  });
});
