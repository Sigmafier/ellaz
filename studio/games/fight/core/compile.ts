// Raw files in, one frozen integer table out. Everything a human authored in
// the units a human can reason about - frame pixels, view pixels per second,
// pixels per second squared - is converted here, ONCE, and the sim then reads
// nothing but integers in 1/256 px (FP) per tick.
//
// That is the whole reason this file exists. A conversion done in step() is a
// conversion done sixty times a second, in a place where a `/` would have to
// live; done here it is a `floorDiv` in a pure function nothing calls twice.
//
// Three rules the whole file obeys:
//
//   - no bare `/`. fixed.ts is the only file allowed to divide.
//   - every number on the way out is an integer. moves-compile.test.ts walks
//     the entire FightData and asserts it, so an authored float REDS rather
//     than arriving as a fraction the sim then carries forever.
//   - every name that does not resolve THROWS, naming the thing. A state
//     pointing at a clip that is not in the manifest is a data defect, and the
//     alternative - an index of -1 quietly meaning "idle" - is a fighter that
//     plays the wrong animation and nothing to grep for.
//
// The output is deep-frozen. The sim is supposed to hold its whole mutable
// state in FightState; anything writing to FightData is a bug that would
// otherwise survive as a value that changed between two ticks.

import { FP, TICK_RATE } from "./types";
import type {
  AiFile,
  ArenaFile,
  CArena,
  CAi,
  CBox,
  CCast,
  CFighter,
  CFrame,
  CHit,
  CMatch,
  CStage,
  CState,
  FighterFile,
  FightData,
  Manifest,
  MatchFile,
  ModeFile,
  MovesFile,
  MovesFrame,
  MovesHit,
  MovesState,
  Point,
  Rect,
  StageFile,
} from "./types";
import { floorDiv, toFP } from "./fixed";

export interface SpriteSet {
  manifest: Manifest;
  moves: MovesFile;
}

export interface CompileInput {
  mode: ModeFile;
  arena: ArenaFile;
  match: MatchFile;
  fighters: FighterFile[];
  ais: AiFile[];
  sets: Record<string, SpriteSet>;
  /** the stage file the mode names, when it names one */
  stage?: StageFile;
}

/** the hit mask is one bit per target in an int32, so a roster is at most this many rows */
export const ROSTER_CAP = 31;

/** the draw scale, as the rational the arena file carries */
interface Scale {
  num: number;
  den: number;
}

/** the `on` keys compile.ts resolves; the moves file's `inputs` vocabulary */
const MOVE = "move";
const STOP = "stop";
const ATTACK = "attack";

function fail(what: string): never {
  throw new Error(`fight/compile: ${what}`);
}

// ---- unit conversions -------------------------------------------------------

/** a frame-pixel rect -> a pivot-relative FP box, y down */
function box(r: Rect, pivot: Point, s: Scale): CBox {
  return {
    x: floorDiv((r.x - pivot.x) * FP * s.num, s.den),
    y: floorDiv((r.y - pivot.y) * FP * s.num, s.den),
    w: floorDiv(r.w * FP * s.num, s.den),
    h: floorDiv(r.h * FP * s.num, s.den),
  };
}

/**
 * a knock or impulse component, frame px -> FP per tick.
 * frame px -> view px is the draw scale; * knockScale makes it view px per
 * SECOND; / TICK_RATE makes it per tick. y is down, so a negative dy lifts.
 */
function vel(n: number, s: Scale, knockScale: number): number {
  return floorDiv(n * FP * s.num * knockScale, s.den * TICK_RATE);
}

/** view px per second -> FP per tick */
function perTick(viewPerSecond: number): number {
  return floorDiv(viewPerSecond * FP, TICK_RATE);
}

// ---- frames -----------------------------------------------------------------

function hit(h: MovesHit, pivot: Point, s: Scale, knockScale: number, liftScale: number): CHit {
  const k = h.knock;
  return {
    kind: h.kind,
    box: box(h.box, pivot, s),
    damage: h.damage,
    knockX: k ? vel(k.dx, s, knockScale) : 0,
    knockY: k ? vel(k.dy, s, liftScale) : 0,
    stun: h.stun ?? 0,
    fall: h.fall ?? 0,
    effect: h.effect ?? "none",
  };
}

function frame(f: MovesFrame, pivot: Point, s: Scale, knockScale: number, liftScale: number): CFrame {
  const imp = f.impulse;
  return {
    bdy: (f.bdy ?? []).map((r) => box(r, pivot, s)),
    itr: (f.itr ?? []).map((h) => hit(h, pivot, s, knockScale, liftScale)),
    push: f.push ? box(f.push, pivot, s) : null,
    impulseX: imp ? vel(imp.dx, s, knockScale) : 0,
    impulseY: imp ? vel(imp.dy, s, liftScale) : 0,
  };
}

/**
 * When ANY frame in a state authored `wait`, the state runs on explicit tick
 * starts and `total` is their sum - a frame with no `wait` in such a state
 * falls back to what its fps would have given it. When none did, `starts` is
 * empty and the fps rule alone decides; `total` is still the length of one
 * pass, which a looping state uses as its period.
 */
function timing(frames: MovesFrame[], fps: number): { starts: number[]; total: number } {
  if (!frames.some((f) => f.wait !== undefined)) {
    return { starts: [], total: floorDiv(frames.length * TICK_RATE, fps) };
  }
  const perFrame = floorDiv(TICK_RATE, fps);
  const starts: number[] = [];
  let t = 0;
  for (const f of frames) {
    starts.push(t);
    t += f.wait ?? perFrame;
  }
  return { starts, total: t };
}

// ---- states -----------------------------------------------------------------

/** a state index, or -1 when the name is absent; a name that is PRESENT and unknown throws */
function stateRef(names: string[], target: string | undefined, where: string): number {
  if (target === undefined) return -1;
  const i = names.indexOf(target);
  if (i < 0) fail(`${where} transitions to state "${target}", which its moves file does not define`);
  return i;
}

function compileState(
  name: string,
  st: MovesState,
  names: string[],
  set: SpriteSet,
  setName: string,
  fighterId: string,
  s: Scale,
  knockScale: number,
  liftScale: number,
): CState {
  const where = `fighter "${fighterId}" state "${name}"`;
  const clip = set.manifest.animations[st.clip];
  if (!clip) fail(`${where} names clip "${st.clip}", which sprite set "${setName}" does not have`);
  if (clip.frames.length !== st.frames.length) {
    fail(`${where} has ${st.frames.length} frames but clip "${st.clip}" has ${clip.frames.length}`);
  }
  const on = st.on ?? {};
  const pivot = set.manifest.pivot;
  return {
    name,
    clip: st.clip,
    frameNames: clip.frames.slice(),
    fps: clip.fps,
    loop: clip.loop,
    ...timing(st.frames, clip.fps),
    next: stateRef(names, st.next, where),
    onMove: stateRef(names, on[MOVE], where),
    onStop: stateRef(names, on[STOP], where),
    onAttack: stateRef(names, on[ATTACK], where),
    cancelFrom: st.cancelFrom ?? -1,
    frames: st.frames.map((f) => frame(f, pivot, s, knockScale, liftScale)),
  };
}

function compileFighter(f: FighterFile, sets: Record<string, SpriteSet>, s: Scale, knockScale: number, liftScale: number): CFighter {
  const set = sets[f.sprites];
  if (!set) fail(`fighter "${f.id}" names sprite set "${f.sprites}", which was not loaded`);
  const names = Object.keys(set.moves.states).sort();
  const states = names.map((n) => compileState(n, set.moves.states[n], names, set, f.sprites, f.id, s, knockScale, liftScale));
  const pick = (target: string, what: string): number => {
    const i = names.indexOf(target);
    if (i < 0) fail(`fighter "${f.id}" names ${what} state "${target}", which its moves file does not define`);
    return i;
  };
  if (f.hover !== undefined && !f.flying) fail(`fighter "${f.id}" has a hover height but does not fly`);
  return {
    id: f.id,
    set: f.sprites,
    hp: f.hp,
    speed: perTick(f.speed),
    zSpeed: perTick(f.zSpeed),
    xp: f.xp ?? 0,
    flying: f.flying ?? false,
    hover: toFP(f.hover ?? 0),
    initial: pick(set.moves.initial, "initial"),
    hurt: pick(set.moves.onHit.light, "onHit.light"),
    ko: pick(set.moves.onHit.heavy, "onHit.heavy"),
    states,
  };
}

// ---- the rest ---------------------------------------------------------------

function compileArena(a: ArenaFile): CArena {
  const worldW = a.world?.w ?? a.view.w;
  if (worldW < a.view.w) fail(`arena "${a.id}" world is ${worldW} wide, narrower than its ${a.view.w} view`);
  return {
    zMin: toFP(a.sim.zMin),
    zMax: toFP(a.sim.zMax),
    xMin: toFP(a.sim.xMin),
    xMax: toFP(a.sim.xMax),
    gravity: floorDiv(a.sim.gravity * FP, TICK_RATE * TICK_RATE),
    viewW: toFP(a.view.w),
    worldW: toFP(worldW),
  };
}

/** fighter and ai names -> indices, throwing with `where` when a name was not loaded */
function resolveRow(where: string, fighterId: string, aiId: string | undefined, control: "player" | "ai", fighters: CFighter[], ais: CAi[]): { fighter: number; ai: number } {
  const fighter = fighters.findIndex((f) => f.id === fighterId);
  if (fighter < 0) fail(`${where} names fighter "${fighterId}", which was not loaded`);
  let ai = -1;
  if (aiId !== undefined) {
    ai = ais.findIndex((a) => a.id === aiId);
    if (ai < 0) fail(`${where} names ai "${aiId}", which was not loaded`);
  }
  if (control === "ai" && ai < 0) fail(`${where} is controlled by ai but names none`);
  return { fighter, ai };
}

/**
 * the roster: the fixed cast (live from tick 0, wave -1), then every wave's spawns in
 * order (dormant until their wave and delay). One flat list, because the sim carries a
 * fixed roster and nothing is added or removed while it runs.
 */
function compileCast(mode: ModeFile, fighters: CFighter[], ais: CAi[]): CCast[] {
  const rows: CCast[] = mode.cast.map((c, i) => ({
    ...resolveRow(`mode "${mode.id}" cast ${i}`, c.fighter, c.ai, c.control, fighters, ais),
    control: c.control, team: c.team, x: toFP(c.x), z: toFP(c.z), face: c.face, wave: -1, delayTicks: 0, side: 0,
  }));
  (mode.waves ?? []).forEach((w, wi) => {
    w.spawns.forEach((s, si) => {
      rows.push({
        ...resolveRow(`mode "${mode.id}" wave ${wi} spawn ${si}`, s.fighter, s.ai, "ai", fighters, ais),
        control: "ai", team: s.team, x: 0, z: 0, face: (-s.side) as 1 | -1, wave: wi, delayTicks: s.delayTicks, side: s.side,
      });
    });
  });
  if (rows.length > ROSTER_CAP) fail(`mode "${mode.id}" has ${rows.length} roster rows; the hit mask holds ${ROSTER_CAP}`);
  return rows;
}

/** the stage file, every view px to FP and every per-second rate to per tick */
function compileStage(s: StageFile, waves: number): CStage {
  const c = s.coin;
  return {
    camera: { lead: toFP(s.camera.lead), divisor: s.camera.divisor, snap: toFP(s.camera.snap) },
    screen: { heroPad: toFP(s.screen.heroPad), enemyPad: toFP(s.screen.enemyPad), outsidePad: toFP(s.screen.outsidePad), spawnPad: toFP(s.screen.spawnPad) },
    spawn: { zMin: s.spawn.zMin, zMax: s.spawn.zMax },
    xp: { base: s.xp.base, perLevel: s.xp.perLevel },
    levelUp: { hp: s.levelUp.hp, heal: s.levelUp.heal, damage: s.levelUp.damage },
    coin: {
      launchVh: perTick(c.launchVh),
      launchVx: perTick(c.launchVx),
      gravity: floorDiv(c.gravity * FP, TICK_RATE * TICK_RATE),
      bounceKeep: { num: c.bounceKeep.num, den: c.bounceKeep.den },
      bounceMinVh: perTick(c.bounceMinVh),
      slideKeep: { num: c.slideKeep.num, den: c.slideKeep.den },
      magnetDivisor: c.magnetDivisor,
      pickupX: toFP(c.pickupX), pickupZ: toFP(c.pickupZ), pickupH: toFP(c.pickupH),
    },
    waves,
  };
}

function copyAi(a: AiFile): CAi {
  return {
    ...a,
    cooldownTicks: [a.cooldownTicks[0], a.cooldownTicks[1]],
    reactTicks: [a.reactTicks[0], a.reactTicks[1]],
    retreatTicks: [a.retreatTicks[0], a.retreatTicks[1]],
    reachPad: { ...a.reachPad },
  };
}

function deepFreeze<T>(v: T): T {
  if (v !== null && typeof v === "object") {
    for (const k of Object.keys(v as Record<string, unknown>)) deepFreeze((v as Record<string, unknown>)[k]);
  }
  return Object.freeze(v);
}

export function compileFight(input: CompileInput): FightData {
  const { mode, arena, match } = input;
  if (mode.arena !== arena.id) fail(`mode "${mode.id}" names arena "${mode.arena}" but was given "${arena.id}"`);
  if (mode.match !== match.id) fail(`mode "${mode.id}" names match "${mode.match}" but was given "${match.id}"`);
  if (match.tickRate !== TICK_RATE) fail(`match "${match.id}" runs at ${match.tickRate} ticks, but the core is built for ${TICK_RATE}`);
  const hasWaves = (mode.waves?.length ?? 0) > 0;
  if (hasWaves !== (mode.stage !== undefined)) fail(`mode "${mode.id}" must name a stage file and waves together, or neither`);
  if (mode.stage !== undefined && input.stage?.id !== mode.stage) fail(`mode "${mode.id}" names stage "${mode.stage}" but was given "${input.stage?.id ?? "none"}"`);

  const s: Scale = { num: arena.scale.num, den: arena.scale.den };
  const fighters = input.fighters.map((f) => compileFighter(f, input.sets, s, match.knockScale, match.liftScale));
  const ais = input.ais.map(copyAi);
  const cMatch: CMatch = { ...match };

  return deepFreeze({
    seed: mode.seed,
    arena: compileArena(arena),
    match: cMatch,
    fighters,
    ais,
    cast: compileCast(mode, fighters, ais),
    stage: input.stage && hasWaves ? compileStage(input.stage, mode.waves!.length) : null,
  });
}
