// Raw files -> the frozen DungeonData step() reads. Every centi-tile goes to
// FP once, every centi-tile-per-second to FP per tick once (ROUNDED, so 2.8
// tiles/s is 12 and not the 11 a floor would give), every view-px height to
// FP px, every clip's frame to whole ticks. Every tile the room names is
// checked against the grid and the props; every actor's set against the clips
// the rules will ask for. A refusal names the room, the row and the actor,
// because a rule armed by data can be armed by wrong data.

import { floorDiv } from "../sim/fixed";
import { isBlocked, tileIndex, tileOf } from "./grid";
import { CLIPS, FACE_CLIPS, FACE_DOWN, FACE_LEFT, FACE_RIGHT, FACE_UP, KIND_BAT, KIND_KNIGHT, KIND_SLIME, TILE } from "./types";
import type { ActorFile, BatBlock, CActor, CBat, CClip, CKnight, CRoom, CRules, CSlime, DungeonData, KnightBlock, LoadedDungeon, SlimeBlock } from "./types";

const CENTI = 100;

/** centi-tiles -> FP, floored */
const len = (c: number): number => floorDiv(c * TILE, CENTI);
/** a / b rounded to the nearest integer */
const roundDiv = (a: number, b: number): number => floorDiv(2 * a + b, 2 * b);
/** centi-tiles per second -> FP per tick, rounded */
const perTick = (c: number, tickRate: number): number => roundDiv(c * TILE, CENTI * tickRate);
/** view px -> FP px */
const pxFP = (p: number): number => p * TILE;

const FACES: Record<string, number> = { down: FACE_DOWN, up: FACE_UP, left: FACE_LEFT, right: FACE_RIGHT };

function compileRoom(loaded: LoadedDungeon): CRoom {
  const r = loaded.room, n = r.grid.n;
  const blocked: boolean[] = new Array(n * n).fill(false);
  const off = (t: { i: number; j: number }): boolean => t.i < 0 || t.j < 0 || t.i >= n || t.j >= n;
  for (const t of r.blocked) {
    if (off(t)) throw new Error(`dungeon: room "${r.id}" blocks (${t.i}, ${t.j}), off its ${n}x${n} grid`);
    blocked[tileIndex(n, t.i, t.j)] = true;
  }
  const room: CRoom = { n, blocked: Object.freeze(blocked), door: [], startX: len(r.start.x), startY: len(r.start.y), startFace: FACES[r.start.face], ox: r.grid.ox, oy: r.grid.oy, tileW: r.grid.tileW, tileH: r.grid.tileH };
  const door = r.door.map((t, i) => {
    if (off(t)) throw new Error(`dungeon: room "${r.id}" door ${i} (${t.i}, ${t.j}) is off the grid`);
    if (t.i !== 0 && t.j !== 0 && t.i !== n - 1 && t.j !== n - 1) throw new Error(`dungeon: room "${r.id}" door ${i} (${t.i}, ${t.j}) is not against a wall`);
    if (isBlocked(room, t.i, t.j)) throw new Error(`dungeon: room "${r.id}" door ${i} (${t.i}, ${t.j}) is a blocked tile`);
    return tileIndex(n, t.i, t.j);
  });
  if (isBlocked(room, tileOf(room.startX), tileOf(room.startY))) throw new Error(`dungeon: room "${r.id}" starts the hero on blocked tile (${tileOf(room.startX)}, ${tileOf(room.startY)})`);
  return Object.freeze({ ...room, door: Object.freeze(door) });
}

function compileRules(loaded: LoadedDungeon): CRules {
  const r = loaded.rules;
  return Object.freeze({
    tickRate: r.tickRate, aggroStartTicks: r.aggroStartTicks,
    swingSeek: len(r.swingSeek), clickRadius: len(r.clickRadius), lineStep: Math.max(1, len(r.lineStep)),
    facingNum: r.facing.num, facingDen: r.facing.den,
    sepFoes: len(r.separate.foes), sepFoesNum: r.separate.foesPush.num, sepFoesDen: r.separate.foesPush.den,
    sepHero: len(r.separate.hero), sepHeroNum: r.separate.heroPush.num, sepHeroDen: r.separate.heroPush.den,
    dropBeyond: len(r.drop.beyond), dropRadius: len(r.drop.radius), pickup: len(r.drop.pickup), pickupDelayTicks: r.drop.pickupDelayTicks,
    doorBannerTicks: r.doorBannerTicks, fadeTicks: r.fadeTicks, flashTicks: r.flashTicks, floatTicks: r.floatTicks, floatRise: r.floatRise, markerTicks: r.markerTicks,
  });
}

/** the named clips of one set, each frame lasting `tickRate / fps` whole ticks (never fewer than one) */
function compileClips(loaded: LoadedDungeon, actor: ActorFile, setName: string, names: readonly string[]): CClip[] {
  const set = loaded.sets[setName];
  if (!set) throw new Error(`dungeon: actor "${actor.id}" names set "${setName}", which was not loaded`);
  return names.map((name) => {
    const anim = set.manifest.animations[name];
    if (!anim || anim.frames.length === 0) throw new Error(`dungeon: set "${setName}" (actor "${actor.id}") has no "${name}" clip, which the rules need`);
    return Object.freeze({ frames: Object.freeze([...anim.frames]), ticksPerFrame: Math.max(1, floorDiv(loaded.rules.tickRate, anim.fps)), loop: anim.loop });
  });
}

function compileKnight(k: KnightBlock): CKnight {
  return Object.freeze({
    mp: k.mp, mpCost: k.mpCost, mpRegenAmount: k.mpRegen.amount, mpRegenEvery: k.mpRegen.everyTicks,
    hpRegenAmount: k.hpRegen.amount, hpRegenEvery: k.hpRegen.everyTicks, hpRegenAfter: k.hpRegen.afterTicks,
    reach: len(k.reach), pointBlank: len(k.pointBlank), cone: k.cone, dmgMin: k.dmgMin, dmgMax: k.dmgMax, approach: len(k.approach), repathTicks: k.repathTicks,
  });
}

function compileSlime(s: SlimeBlock, rate: number): CSlime {
  return Object.freeze({
    aggro: len(s.aggro), speed: perTick(s.speed, rate), hopFrom: s.hopFrom, hopTo: s.hopTo, repathTicks: s.repathTicks,
    biteAt: len(s.biteAt), biteReach: len(s.biteReach), lungeSpeed: perTick(s.lungeSpeed, rate), lungeFrom: s.lungeFrom, lungeTo: s.lungeTo, lungeStop: len(s.lungeStop), strikeFrame: s.strikeFrame,
    dmg: s.dmg, cooldownTicks: s.cooldownTicks, pauseTicks: s.pauseTicks, hurtPauseTicks: s.hurtPauseTicks, walkAt: len(s.walkAt),
  });
}

function compileBat(b: BatBlock, rate: number): CBat {
  return Object.freeze({
    aggro: len(b.aggro), speed: perTick(b.speed, rate), closeNum: b.closeNum, closeDen: b.closeDen,
    everyTicks: b.everyTicks, range: len(b.range), beyond: len(b.beyond), swoopSpeed: perTick(b.swoopSpeed, rate),
    swoopAlt: pxFP(b.swoopAlt), swoopAltDiv: b.swoopAltDiv, hit: len(b.hit), stop: len(b.stop), dmg: b.dmg, cooldownTicks: b.cooldownTicks,
    retreatSpeed: perTick(b.retreatSpeed, rate), retreatTicks: b.retreatTicks, retreatAlt: pxFP(b.retreatAlt), retreatAltDiv: b.retreatAltDiv,
    edgePad: len(b.edgePad), hurtPauseTicks: b.hurtPauseTicks,
  });
}

function compileActor(loaded: LoadedDungeon, a: ActorFile): CActor {
  const rate = loaded.rules.tickRate;
  const blocks = [a.knight, a.slime, a.bat].filter((b) => b !== undefined).length;
  if (blocks !== 1) throw new Error(`dungeon: actor "${a.id}" carries ${blocks} behaviour blocks, expected exactly one of knight, slime, bat`);
  if (a.hover !== undefined && !a.flying) throw new Error(`dungeon: actor "${a.id}" has a hover height but does not fly`);
  if (a.drawScale !== undefined && (!Number.isInteger(a.drawScale) || a.drawScale < 1 || a.drawScale > 4)) throw new Error(`dungeon: actor "${a.id}" is drawn at ${a.drawScale}, outside 1..4`);
  if (a.facings !== undefined && !a.knight) throw new Error(`dungeon: actor "${a.id}" names facings but is not a knight`);
  if (a.knight && a.speed === undefined) throw new Error(`dungeon: actor "${a.id}" is a knight with no speed`);
  if (a.knight && a.knight.dmgMin > a.knight.dmgMax) throw new Error(`dungeon: actor "${a.id}" rolls dmgMin ${a.knight.dmgMin} above dmgMax ${a.knight.dmgMax}`);
  return Object.freeze({
    id: a.id, set: a.sprites, facings: a.facings ?? null,
    kind: a.knight ? KIND_KNIGHT : a.slime ? KIND_SLIME : KIND_BAT,
    hp: a.hp, speed: a.speed === undefined ? 0 : perTick(a.speed, rate), radius: len(a.radius), tall: a.tall, bar: a.bar,
    flying: !!a.flying, size: a.drawScale ?? 1, boss: !!a.boss, hover: a.flying ? pxFP(a.hover ?? 0) : 0, bobPx: a.bobPx ?? 0, bobTicks: a.bobTicks ?? 1,
    knockSpeed: perTick(a.knockback.speed, rate), knockNum: a.knockback.decay.num, knockDen: a.knockback.decay.den,
    coins: a.coins ?? 0,
    clips: Object.freeze(compileClips(loaded, a, a.sprites, CLIPS)),
    faceClips: a.facings === undefined ? null : Object.freeze(compileClips(loaded, a, a.facings, FACE_CLIPS)),
    knight: a.knight ? compileKnight(a.knight) : null,
    slime: a.slime ? compileSlime(a.slime, rate) : null,
    bat: a.bat ? compileBat(a.bat, rate) : null,
  });
}

export function compileDungeon(loaded: LoadedDungeon): DungeonData {
  const room = compileRoom(loaded);
  const actors = loaded.actors.map((a) => compileActor(loaded, a));
  const indexOf = (id: string, what: string): number => {
    const i = actors.findIndex((a) => a.id === id);
    if (i < 0) throw new Error(`dungeon: room "${loaded.room.id}" ${what} names actor "${id}", which was not loaded`);
    return i;
  };
  const hero = indexOf(loaded.room.start.actor, "start");
  if (actors[hero].kind !== KIND_KNIGHT) throw new Error(`dungeon: room "${loaded.room.id}" starts "${actors[hero].id}", which is not a knight`);
  const cast = [{ actor: hero, x: room.startX, y: room.startY, wait: 0 }, ...loaded.room.spawns.map((s, i) => {
    const actor = indexOf(s.actor, `spawn ${i}`);
    if (actors[actor].kind === KIND_KNIGHT) throw new Error(`dungeon: room "${loaded.room.id}" spawn ${i} is a knight; the hero is the start`);
    const x = len(s.x), y = len(s.y);
    if (isBlocked(room, tileOf(x), tileOf(y))) throw new Error(`dungeon: room "${loaded.room.id}" spawn ${i} (${s.actor}) at (${s.x}, ${s.y}) stands on blocked tile (${tileOf(x)}, ${tileOf(y)})`);
    return { actor, x, y, wait: s.wait };
  })];
  return Object.freeze({
    rules: compileRules(loaded), room, actors: Object.freeze(actors), cast: Object.freeze(cast.map((c) => Object.freeze(c))),
    view: Object.freeze({ w: loaded.room.view.w, h: loaded.room.view.h }), seed: loaded.mode.seed,
  });
}
