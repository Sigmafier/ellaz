// Neon Survival - the whole simulation, with no DOM, no Phaser and no clock of
// its own. The scene hands it a frame's worth of milliseconds and a steering
// vector; everything that happens in the arena happens in here, so the rules can
// be played out a hundred times in node without a canvas.
//
// `step` MUTATES the state it is given rather than returning a fresh one. That
// is deliberate and it is the one place this file departs from the shape the
// rest of the roster uses: at 60 frames a second with up to 64 shapes, 48 bolts
// and their gems, rebuilding the world every frame is thousands of short-lived
// objects a second for a phone to collect. It stays testable because the
// function is still a pure function of (state, dt, input, rng) - the same seed
// plays the same run, which is exactly what `logic.test.ts` leans on.
//
// The direct module, never the `@shared` barrel: the barrel re-exports React
// components, and `logic-is-pure.test.ts` fails the build for importing it here.

import { mulberry32 } from "@shared/rng";

/** The arena, in logical units. The canvas is scaled to fit; these never change. */
export const ARENA = { w: 420, h: 560 } as const;

/** Survive this long and the run is WON. Three minutes, chosen to be a bus ride. */
export const RUN_MS = 180_000;

export type LevelKey = "calm" | "normal" | "wild";

/**
 * What the three levels actually change: how fast the wave clock tightens, how
 * quickly the shapes come at you, and how soon the tough ones appear. Nothing
 * here touches your own ship - a calm run is a smaller crowd, never a stronger
 * player, so an upgrade means the same thing on all three.
 */
export const RULES: Record<
  LevelKey,
  { spawnMs: number; floorMs: number; tighten: number; speed: number; orbAt: number; bruteAt: number }
> = {
  calm: { spawnMs: 1150, floorMs: 320, tighten: 3.6, speed: 0.82, orbAt: 45_000, bruteAt: 75_000 },
  normal: { spawnMs: 900, floorMs: 230, tighten: 4.4, speed: 1, orbAt: 30_000, bruteAt: 55_000 },
  wild: { spawnMs: 680, floorMs: 165, tighten: 5.2, speed: 1.18, orbAt: 18_000, bruteAt: 35_000 },
};

/** Which reward tier a survived run is worth. One table, so nothing has to guess. */
export const TIER: Record<LevelKey, "easy" | "medium" | "hard"> = {
  calm: "easy",
  normal: "medium",
  wild: "hard",
};

export type EnemyKind = "runner" | "orb" | "brute";

/** Size, toughness, pace and worth of each kind. The scene draws from the same row. */
export const KINDS: Record<EnemyKind, { hp: number; r: number; speed: number; xp: number }> = {
  runner: { hp: 1, r: 9, speed: 62, xp: 1 },
  orb: { hp: 2, r: 12, speed: 44, xp: 2 },
  brute: { hp: 5, r: 17, speed: 30, xp: 4 },
};

export type UpgradeId = "rapid" | "power" | "spread" | "swift" | "magnet" | "heart" | "pierce";

/** How many times each may be taken, so a run cannot end up as all of one thing. */
export const UPGRADE_CAP: Record<UpgradeId, number> = {
  rapid: 6,
  power: 5,
  spread: 3,
  swift: 4,
  magnet: 3,
  heart: 2,
  pierce: 3,
};

export const UPGRADE_IDS = Object.keys(UPGRADE_CAP) as UpgradeId[];

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  /** Milliseconds of white flash left after taking a hit. Drawn, never simulated. */
  flash: number;
}

export type WeaponId = "bolt" | "arc" | "burst";

/**
 * The three weapons, and every way they differ lives in this one row each.
 *
 * They fire in ROTATION off the single `fireIn` cadence rather than each owning
 * a timer. That is a deliberate design choice and not a shortcut: three
 * independent timers would mean a burst going off on the frame a test places a
 * shape on the ship, and `fireIn` is what every collision test in
 * `logic.test.ts` sets to hold the gun still. One clock keeps the gun
 * suppressible by one field, and the player still sees all three inside two
 * seconds because the rotation advances on every shot.
 *
 * `turn` is what makes the three MOTIONS different rather than one projectile
 * at three speeds - the arc is the only one that steers after it leaves, and the
 * burst is the only one that ignores the target and goes out as a ring. Colour
 * and sound are the scene's to draw and play; they are named here so that one
 * row is the whole answer to "what is this weapon".
 */
export const WEAPONS: Record<
  WeaponId,
  {
    /** Units per second. */
    speed: number;
    /** Milliseconds before it expires on its own. */
    life: number;
    /** Radians per second it may steer toward its target. 0 never steers. */
    turn: number;
    /** How many go out per shot, before the spread upgrade adds more. */
    count: number;
    /** Extra damage over the base bolt. */
    bonus: number;
    /** Collision radius, so a fat burst fragment is not a pinpoint. */
    r: number;
    /** The sound the scene plays. One of the nine real sfx names - never invent one. */
    sfx: "tap" | "flip" | "star";
  }
> = {
  // Straight, fast, cheap. The one this game already had.
  bolt: { speed: 330, life: 1500, turn: 0, count: 1, bonus: 0, r: 4, sfx: "tap" },
  // Slower, and it CURVES - it keeps steering at the nearest shape after it has
  // left, so it rounds corners the bolt drives past. Hits harder to pay for it.
  arc: { speed: 205, life: 2200, turn: 3.4, count: 1, bonus: 1, r: 5, sfx: "flip" },
  // A ring, thrown outward in every direction at once, dying quickly. It ignores
  // the target entirely, which is what makes it the answer to being surrounded.
  burst: { speed: 150, life: 520, turn: 0, count: 7, bonus: 0, r: 6, sfx: "star" },
};

/** The order the ship cycles through. Rotation index lives on the run. */
export const WEAPON_ORDER: WeaponId[] = ["bolt", "arc", "burst"];

export interface Bolt {
  id: number;
  /** Which weapon threw this. The scene draws and sounds each one differently. */
  kind: WeaponId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  pierce: number;
  life: number;
  /** Counted down for the trail the scene draws, so a curve leaves a comet. */
  age: number;
  /** What this bolt has already touched, so passing through cannot hit twice. */
  hit: number[];
}

export interface Gem {
  id: number;
  x: number;
  y: number;
  value: number;
}

/**
 * What happened during one step, for the scene to turn into sparks and sounds and
 * for the chrome to turn into the upgrade cards. The simulation neither draws nor
 * plays anything - it only says what occurred.
 */
export type RunEvent =
  | { type: "pop"; x: number; y: number; kind: EnemyKind }
  /** A shot left the ship. Carries WHICH weapon, so the scene can sound it. */
  | { type: "shot"; weapon: WeaponId; x: number; y: number }
  | { type: "hurt" }
  | { type: "gem" }
  | { type: "levelup" }
  | { type: "won" }
  | { type: "over" };

export interface RunState {
  level: LevelKey;
  /** Milliseconds survived. The clock, and the only thing that ends a run well. */
  t: number;
  phase: "playing" | "won" | "over";
  hp: number;
  maxHp: number;
  /** Milliseconds of mercy left after a knock, so one mistake is not three. */
  invuln: number;
  xp: number;
  need: number;
  /** How many upgrades deep this run is. Shown as the power level. */
  power: number;
  /** The score: shapes popped. `ms` would rank the wrong way round, and kills read plainly. */
  popped: number;
  /** True while an upgrade is being chosen. Nothing moves, and the clock stops too. */
  choosing: boolean;
  x: number;
  y: number;
  enemies: Enemy[];
  bolts: Bolt[];
  gems: Gem[];
  up: Record<UpgradeId, number>;
  /** How many shots this run has fired. Drives the weapon rotation, nothing else. */
  shots: number;
  fireIn: number;
  spawnIn: number;
  nextId: number;
  /** Reused between frames rather than replaced, for the reason at the top. */
  events: RunEvent[];
}

const CAP_ENEMIES = 64;
const CAP_BOLTS = 48;
// The bolt's old speed, life and radius are not constants any more: they are the
// `bolt` row of WEAPONS, beside the two weapons that differ from it. Keeping a
// second copy here is how the row and the constant drift apart.
const PLAYER_R = 11;
const GEM_R = 16;
/** How far your ship can see a target. Beyond it the shot is saved. */
const TARGET_RANGE = 240;
/** The longest frame the simulation will believe, in ms. See `step`. */
const MAX_FRAME_MS = 50;
const MERCY_MS = 900;
const FLASH_MS = 90;
const SPREAD_RAD = 0.16;

export function newRun(level: LevelKey): RunState {
  return {
    level,
    t: 0,
    phase: "playing",
    hp: 3,
    maxHp: 3,
    invuln: 0,
    xp: 0,
    need: xpNeeded(1),
    power: 1,
    popped: 0,
    choosing: false,
    x: ARENA.w / 2,
    y: ARENA.h / 2,
    enemies: [],
    bolts: [],
    gems: [],
    up: { rapid: 0, power: 0, spread: 0, swift: 0, magnet: 0, heart: 0, pierce: 0 },
    shots: 0,
    fireIn: 0,
    spawnIn: RULES[level].spawnMs,
    nextId: 1,
    events: [],
  };
}

/* Every number the upgrades move, derived in one place so nothing drifts. */
export const fireEvery = (s: RunState) => Math.max(130, Math.round(620 * Math.pow(0.86, s.up.rapid)));
export const boltDamage = (s: RunState) => 1 + s.up.power;
export const boltCount = (s: RunState) => 1 + s.up.spread;
export const playerSpeed = (s: RunState) => 148 + 20 * s.up.swift;
export const magnetRange = (s: RunState) => 46 + 30 * s.up.magnet;
export const xpNeeded = (power: number) => 1 + power * 3;

/** How often a shape arrives: tightening with the clock, never below the floor. */
export function spawnEvery(s: RunState): number {
  const r = RULES[s.level];
  return Math.max(r.floorMs, r.spawnMs - (s.t / 1000) * r.tighten);
}

/** Which kinds the clock has unlocked. Always at least the little fast one. */
export function kindsAt(s: RunState): EnemyKind[] {
  const r = RULES[s.level];
  const kinds: EnemyKind[] = ["runner"];
  if (s.t >= r.orbAt) kinds.push("orb");
  if (s.t >= r.bruteAt) kinds.push("brute");
  return kinds;
}

const dist2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;

/** Nearest shape within firing range, or null when the screen is clear. */
/**
 * The nearest shape to a point, within sight of it.
 *
 * `fromX`/`fromY` DEFAULT to the ship, so every caller that asks "what is the
 * gun pointing at" is unchanged. The arc passes its own position instead: a
 * curving shot must steer at what is nearest to IT, not at what was nearest to
 * the ship when it left, or two arcs fired a second apart both bend toward the
 * same shape and the second one chases a corpse.
 */
export function nearestEnemy(s: RunState, fromX = s.x, fromY = s.y): Enemy | null {
  let best: Enemy | null = null;
  let bestD = TARGET_RANGE ** 2;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const d = dist2(fromX, fromY, e.x, e.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/** A point just outside the arena, on a random edge. */
function edgePoint(rng: () => number): { x: number; y: number } {
  const m = 26;
  switch (Math.floor(rng() * 4)) {
    case 0:
      return { x: rng() * ARENA.w, y: -m };
    case 1:
      return { x: rng() * ARENA.w, y: ARENA.h + m };
    case 2:
      return { x: -m, y: rng() * ARENA.h };
    default:
      return { x: ARENA.w + m, y: rng() * ARENA.h };
  }
}

function spawn(s: RunState, rng: () => number) {
  if (s.enemies.length >= CAP_ENEMIES) return;
  const kinds = kindsAt(s);
  const kind = kinds[Math.floor(rng() * kinds.length)];
  const p = edgePoint(rng);
  s.enemies.push({ id: s.nextId++, kind, x: p.x, y: p.y, hp: KINDS[kind].hp, flash: 0 });
}

/** Which weapon this shot uses. Rotation, so all three are seen within seconds. */
export const weaponAt = (shots: number): WeaponId =>
  WEAPON_ORDER[((shots % WEAPON_ORDER.length) + WEAPON_ORDER.length) % WEAPON_ORDER.length];

function fire(s: RunState) {
  const target = nearestEnemy(s);
  // The burst does not aim, but it still holds its shot when the arena is empty:
  // a ring thrown at nothing is noise and a wasted rotation slot.
  if (!target) return;

  const id = weaponAt(s.shots);
  const w = WEAPONS[id];
  s.shots += 1;

  const aim = Math.atan2(target.y - s.y, target.x - s.x);
  // The spread upgrade widens every weapon, but the burst is already a full
  // circle, so there it adds fragments to the ring instead of fanning it.
  const n = w.count + (boltCount(s) - 1);

  for (let i = 0; i < n; i++) {
    if (s.bolts.length >= CAP_BOLTS) break;
    const a =
      id === "burst"
        ? aim + (i / n) * Math.PI * 2
        : aim + (n === 1 ? 0 : (i - (n - 1) / 2) * SPREAD_RAD);
    s.bolts.push({
      id: s.nextId++,
      kind: id,
      x: s.x,
      y: s.y,
      vx: Math.cos(a) * w.speed,
      vy: Math.sin(a) * w.speed,
      dmg: boltDamage(s) + w.bonus,
      pierce: s.up.pierce,
      life: w.life,
      age: 0,
      hit: [],
    });
  }
  s.events.push({ type: "shot", weapon: id, x: s.x, y: s.y });
}

function grantXp(s: RunState, value: number) {
  s.xp += value;
  while (s.xp >= s.need) {
    s.xp -= s.need;
    s.power += 1;
    s.need = xpNeeded(s.power);
    s.choosing = true;
    s.events.push({ type: "levelup" });
  }
}

/**
 * One frame. `dt` is milliseconds and is CLAMPED: a tab that spent a minute in
 * the background must not teleport sixty seconds of shapes into the player's
 * face on the frame it comes back.
 */
export function step(
  s: RunState,
  dtMs: number,
  input: { dx: number; dy: number },
  rng: () => number = Math.random,
): RunState {
  s.events.length = 0;
  if (s.phase !== "playing" || s.choosing) return s;
  const dt = Math.min(MAX_FRAME_MS, Math.max(0, dtMs));
  const sec = dt / 1000;

  s.t += dt;
  if (s.t >= RUN_MS) {
    s.t = RUN_MS;
    s.phase = "won";
    s.events.push({ type: "won" });
    return s;
  }
  if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);

  // Steering. The vector arrives in -1..1; normalise it, or a diagonal is faster
  // than a straight line - the oldest bug in the genre.
  const len = Math.hypot(input.dx, input.dy);
  if (len > 0.02) {
    const v = playerSpeed(s) * sec;
    s.x += (input.dx / len) * v;
    s.y += (input.dy / len) * v;
    s.x = Math.min(ARENA.w - PLAYER_R, Math.max(PLAYER_R, s.x));
    s.y = Math.min(ARENA.h - PLAYER_R, Math.max(PLAYER_R, s.y));
  }

  s.spawnIn -= dt;
  while (s.spawnIn <= 0) {
    spawn(s, rng);
    s.spawnIn += spawnEvery(s);
  }

  s.fireIn -= dt;
  if (s.fireIn <= 0) {
    fire(s);
    s.fireIn = fireEvery(s);
  }

  const pace = RULES[s.level].speed;
  for (const e of s.enemies) {
    const d = Math.hypot(s.x - e.x, s.y - e.y) || 1;
    const v = KINDS[e.kind].speed * pace * sec;
    e.x += ((s.x - e.x) / d) * v;
    e.y += ((s.y - e.y) / d) * v;
    if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
  }

  for (const b of s.bolts) {
    // The arc is the only one that steers, and it steers by a capped turn rate
    // rather than snapping to the target - a shot that turns instantly is a
    // homing missile and never misses, which is not a weapon, it is an autowin.
    const turn = WEAPONS[b.kind].turn;
    if (turn > 0) {
      const t = nearestEnemy(s, b.x, b.y);
      if (t) {
        const want = Math.atan2(t.y - b.y, t.x - b.x);
        const have = Math.atan2(b.vy, b.vx);
        // Wrapped into -PI..PI, or steering across the seam takes the long way
        // round and the arc visibly loops the wrong direction.
        let d = ((want - have + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const cap = turn * sec;
        d = Math.max(-cap, Math.min(cap, d));
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(have + d) * sp;
        b.vy = Math.sin(have + d) * sp;
      }
    }
    b.x += b.vx * sec;
    b.y += b.vy * sec;
    b.life -= dt;
    b.age += dt;
  }

  // Bolts against shapes. A bolt remembers what it has already touched, so one
  // that passes through cannot hit the same shape on every frame of the journey.
  for (const b of s.bolts) {
    if (b.life <= 0) continue;
    for (const e of s.enemies) {
      if (e.hp <= 0 || b.hit.includes(e.id)) continue;
      const r = KINDS[e.kind].r + WEAPONS[b.kind].r;
      if (dist2(b.x, b.y, e.x, e.y) > r * r) continue;
      e.hp -= b.dmg;
      e.flash = FLASH_MS;
      b.hit.push(e.id);
      if (e.hp <= 0) {
        s.popped += 1;
        s.events.push({ type: "pop", x: e.x, y: e.y, kind: e.kind });
        s.gems.push({ id: s.nextId++, x: e.x, y: e.y, value: KINDS[e.kind].xp });
      }
      if (b.pierce > 0) b.pierce -= 1;
      else {
        b.life = 0;
        break;
      }
    }
  }

  // Shapes against the player. The one that reaches you is spent doing it, so a
  // crowd arriving together costs a heart rather than all of them at once. It is
  // not scored: a shape that got through is not a shape you popped.
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const r = KINDS[e.kind].r + PLAYER_R;
    if (dist2(s.x, s.y, e.x, e.y) > r * r) continue;
    e.hp = 0;
    s.events.push({ type: "pop", x: e.x, y: e.y, kind: e.kind });
    if (s.invuln > 0) continue;
    s.hp -= 1;
    s.invuln = MERCY_MS;
    s.events.push({ type: "hurt" });
  }

  // Gems drift in once they are close enough, and are collected on touch.
  const pull = magnetRange(s);
  for (const g of s.gems) {
    const d = Math.hypot(s.x - g.x, s.y - g.y) || 1;
    if (d >= pull) continue;
    const v = Math.max(90, 260 - d) * sec * 1.8;
    g.x += ((s.x - g.x) / d) * v;
    g.y += ((s.y - g.y) / d) * v;
  }
  let gained = 0;
  s.gems = s.gems.filter((g) => {
    if (dist2(s.x, s.y, g.x, g.y) > GEM_R * GEM_R) return true;
    gained += g.value;
    return false;
  });
  if (gained > 0) {
    s.events.push({ type: "gem" });
    grantXp(s, gained);
  }

  s.enemies = s.enemies.filter((e) => e.hp > 0);
  s.bolts = s.bolts.filter(
    (b) => b.life > 0 && b.x > -40 && b.x < ARENA.w + 40 && b.y > -40 && b.y < ARENA.h + 40,
  );

  if (s.hp <= 0) {
    s.phase = "over";
    s.events.push({ type: "over" });
  }
  return s;
}

/**
 * Three upgrades to choose between: never one already maxed, never the same one
 * twice. With fewer than three left it offers what there is, and with none left
 * it offers nothing - the caller reads an empty offer as "carry on", so a fully
 * upgraded run keeps playing instead of stopping dead in front of no cards.
 */
export function offerUpgrades(s: RunState, rng: () => number = Math.random, count = 3): UpgradeId[] {
  const left = UPGRADE_IDS.filter((id) => s.up[id] < UPGRADE_CAP[id]);
  const out: UpgradeId[] = [];
  while (out.length < count && left.length > 0) {
    out.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  }
  return out;
}

/** Take one. `heart` is the only one that changes the present rather than the future. */
export function applyUpgrade(s: RunState, id: UpgradeId): RunState {
  s.choosing = false;
  if (s.up[id] >= UPGRADE_CAP[id]) return s;
  s.up[id] += 1;
  if (id === "heart") {
    s.maxHp += 1;
    s.hp = Math.min(s.maxHp, s.hp + 1);
  }
  return s;
}

/** A seeded run, for tests and for anything that needs the same arena twice. */
export const rngFor = (seed: number) => mulberry32(seed);
