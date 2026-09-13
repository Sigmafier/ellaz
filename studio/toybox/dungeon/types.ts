// The dungeon kind's vocabulary, first half: the raw files (what a game
// writes) and what the loader hands the compiler. A real-time isometric room
// on an n x n tile grid: a knight the player clicks and steers, slimes that hop
// and bite, bats that swoop; clear the room and the door opens, walk out and
// the room is won.
//
// The same rules as the fight's and the turn's sims: integers only, no DOM, no
// clock, no Math.random. Every number that tunes play is a field of a room, an
// actor or a dungeon rules file; this file names the fields and never a value.
//
// UNITS, chosen so a human can read the files and the sim never divides by a
// float: lengths and positions are CENTI-TILES (100 = one tile, 250 = the
// centre of tile 2 on that axis), speeds are centi-tiles per second, times are
// ticks at `tickRate`, and view-space heights (a hover, a float's rise) are view
// px. compile.ts turns every one into FP tile units (256 = one tile) or FP per
// tick, once. The compiled data and the state arrive with the sim (D2).

// ---- the raw files -----------------------------------------------------------

/** a num/den pair: the sim multiplies by num and floor-divides by den */
export interface Ratio { num: number; den: number }

/** a tile by its indices on the n x n grid: i runs down-right on screen, j down-left */
export interface Tile { i: number; j: number }

/** a point in centi-tiles */
export interface CentiPoint { x: number; y: number }

/** what stands where when the room begins */
export interface SpawnEntry {
  /** a basename under ../actors/ */
  actor: string;
  x: number;
  y: number;
  /** ticks before this foe's first attack may come (its cooldown at spawn) */
  wait: number;
}

/** a room: the grid, what is in the way, where the door and the knight are, and its picture */
export interface RoomFile {
  id: string;
  view: { w: number; h: number };
  /** the iso grid in view px: n tiles a side, the top corner of tile (0, 0) at (ox, oy), a tile tileW wide and tileH tall on screen */
  grid: { n: number; ox: number; oy: number; tileW: number; tileH: number };
  /** tiles nobody may stand on or walk through (the props) */
  blocked: Tile[];
  /** the threshold tiles just inside the archway: standing on one once the door is open wins the room */
  door: Tile[];
  /** the hero: which actor, where he begins, and which way he faces */
  start: { actor: string; x: number; y: number; face: "down" | "up" | "left" | "right" };
  spawns: SpawnEntry[];
  /** the room's picture and its props: only a cell opens it, except that the gate checks the scenery set exists */
  art: unknown;
}

/** what a knight is: the one actor the player drives */
export interface KnightBlock {
  mp: number;
  /** a swing costs this much mp; a swing with less still swings */
  mpCost: number;
  /** mp regained: `amount` every `everyTicks` */
  mpRegen: { amount: number; everyTicks: number };
  /** hp regained after `afterTicks` unhurt: `amount` every `everyTicks` */
  hpRegen: { amount: number; everyTicks: number; afterTicks: number };
  /** the strike: lands within `reach` (centi-tiles) when the foe is inside the cone (dot product > cone/100) or closer than `pointBlank` */
  reach: number;
  pointBlank: number;
  cone: number;
  /** the roll: dmgMin + rng in [0, dmgMax - dmgMin] */
  dmgMin: number;
  dmgMax: number;
  /** a targeted foe closer than `approach` gets struck instead of walked to; the path to it is re-planned every `repathTicks` */
  approach: number;
  repathTicks: number;
}

/** what a slime does: hop toward the knight, bite when close */
export interface SlimeBlock {
  /** the knight closer than this wakes the slime */
  aggro: number;
  /** hops toward the knight at `speed` (centi-tiles/s), moving only on walk frames `hopFrom`..`hopTo`; re-plans a blocked line every `repathTicks` */
  speed: number;
  hopFrom: number;
  hopTo: number;
  repathTicks: number;
  /** a bite starts within `biteAt`; on attack frames `lungeFrom`..`lungeTo` it lunges at `lungeSpeed` while farther than `lungeStop`; on frame `strikeFrame` it lands `dmg` within `biteReach` */
  biteAt: number;
  biteReach: number;
  lungeSpeed: number;
  lungeFrom: number;
  lungeTo: number;
  lungeStop: number;
  strikeFrame: number;
  dmg: number;
  /** after a bite: no bite for `cooldownTicks`, no move for `pauseTicks`; after a hurt clip: no move for `hurtPauseTicks` */
  cooldownTicks: number;
  pauseTicks: number;
  hurtPauseTicks: number;
  /** a slime idles again when the knight is farther than this (hysteresis under `biteAt`) */
  walkAt: number;
}

/** what a bat does: hover, fly at the knight, swoop, retreat */
export interface BatBlock {
  aggro: number;
  /** flies straight at the knight, at most `speed`, slowing as it closes (speed = min(speed, gap * closeNum / closeDen)) */
  speed: number;
  closeNum: number;
  closeDen: number;
  /** a swoop begins every `everyTicks` while aggroed and within `range`: aimed `beyond` past the knight at `swoopSpeed`, dropping toward `swoopAlt` (view px) by 1/`swoopAltDiv` of the gap per tick */
  everyTicks: number;
  range: number;
  beyond: number;
  swoopSpeed: number;
  swoopAlt: number;
  swoopAltDiv: number;
  /** contact: `dmg` within `hit`, then a retreat; a swoop that reaches within `stop` of its aim retreats too */
  hit: number;
  stop: number;
  dmg: number;
  cooldownTicks: number;
  /** the retreat: away at `retreatSpeed` for `retreatTicks`, climbing toward `retreatAlt` by 1/`retreatAltDiv` per tick */
  retreatSpeed: number;
  retreatTicks: number;
  retreatAlt: number;
  retreatAltDiv: number;
  /** a bat never leaves this margin from the room's edge */
  edgePad: number;
  hurtPauseTicks: number;
}

/** what an actor IS: its body, its picture, its hp, and one behaviour block per kind */
export interface ActorFile {
  id: string;
  /** the side-view sprite set under the game's assets/ (four files: an export set) */
  sprites: string;
  /** a knight's front/back set (three files: no moves file) with idle_down/up, walk_down/up, attack_down/up */
  facings?: string;
  hp: number;
  /** centi-tiles/s for a knight's walk; a foe's blocks carry their own speeds */
  speed?: number;
  /** the body's half-width in centi-tiles: what the walls and props stop */
  radius: number;
  /** view px above the feet where the damage float starts, and where the hp bar sits */
  tall: number;
  bar: number;
  /** drawn `hover` view px above its tile, bobbing `bobPx` over `bobTicks` (cosmetic); REQUIRES `flying` */
  flying?: boolean;
  hover?: number;
  bobPx?: number;
  bobTicks?: number;
  /** a hit pushes the body away at `speed` centi-tiles/s, decaying by `decay` per tick */
  knockback: { speed: number; decay: Ratio };
  /** the coins a foe's body drops; absent means none (a knight) */
  coins?: number;
  knight?: KnightBlock;
  slime?: SlimeBlock;
  bat?: BatBlock;
}

/** every timing and distance of the room that belongs to no one actor */
export interface DungeonRulesFile {
  id: string;
  tickRate: number;
  /** foes ignore the knight for this long after the room begins */
  aggroStartTicks: number;
  /** Space swings at the nearest live foe within this, turning to face it; none in reach, the swing goes straight ahead */
  swingSeek: number;
  /** a click within this of a live foe (a flier's hover compensated) targets it; within this of a coin walks to the coin */
  clickRadius: number;
  /** a path waypoint is dropped when the straight line to the next is clear, sampled every `lineStep` centi-tiles */
  lineStep: number;
  /** a screen-space direction reads as up/down when |dy| > |dx| * facing.num / facing.den */
  facing: Ratio;
  /** ground foes push apart within `foes` by (gap * foesPush) and off the knight within `hero` by (gap * heroPush) */
  separate: { foes: number; foesPush: Ratio; hero: number; heroPush: Ratio };
  /** a body's coins land `beyond` past it away from the knight (a `radius`-wide drop never inside a prop); the knight takes a coin within `pickup` once it has lain `pickupDelayTicks` */
  drop: { beyond: number; radius: number; pickup: number; pickupDelayTicks: number };
  /** THE DOOR OPENS stays up this long; a fallen foe fades over `fadeTicks` after its ko clip; a hit flashes for `flashTicks` (cosmetic) */
  doorBannerTicks: number;
  fadeTicks: number;
  flashTicks: number;
  /** a damage float lives `floatTicks` and climbs `floatRise` view px; a click marker lives `markerTicks` (both cosmetic) */
  floatTicks: number;
  floatRise: number;
  markerTicks: number;
}

export interface DungeonModeFile {
  id: string;
  kind: "dungeon";
  /** a basename under ../rooms/ */
  room: string;
  /** a basename under ../dungeon/ */
  dungeon: string;
  seed: number;
}

/** the part of a sprite manifest the dungeon reads: its clips */
export interface ClipSheet {
  animations: Record<string, { fps: number; loop: boolean; frames: string[] }>;
}

/** what the loader (disk or http) hands the compiler */
export interface LoadedDungeon {
  mode: DungeonModeFile;
  room: RoomFile;
  rules: DungeonRulesFile;
  /** one per DISTINCT actor the spawns and the start name (the knight first), in first-appearance order */
  actors: ActorFile[];
  /** keyed by a set's name: every `sprites` and every `facings` the actors name */
  sets: Record<string, { manifest: ClipSheet }>;
}
