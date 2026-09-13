import Phaser from "phaser";
import type { GameContext } from "@sdk/index";
import { winMoment } from "@shared/index";
// The MODULE, not the `@shared` barrel: the barrel is reachable from the shell,
// which is why `rng.ts` is pinned shell-side. Sprite code must never be dragged
// in behind a re-export - see the header of `@shared/sprites/manifest`.
import { animKey, createStudioAnims, originFor, type PhaserAnimsLike } from "@shared/sprites/load-atlas";
// Two REAL effects, not an import to satisfy a grep. `haptic.fail()` is physical
// and says something the camera shake cannot; `burst` is a DOM confetti puff and
// is deliberately reserved for LEVEL-UP, which happens a handful of times a run.
// Calling it per kill would mean ~14 DOM nodes several times a second on a
// phone, which is why the cheap in-canvas sparks below still do every pop.
import { burst as juiceBurst, haptic } from "@juice/index";
import { CAST, CAST_KEYS, FOR_ENEMY, PLAYER, scaleFor, type CastKey, type Clip } from "./sprites";
// ALIASED, and not for tidiness: `@shared/sprites/load-atlas` already exports an
// `originFor` and this file imports it for the sprite PIVOT. Two functions of
// that name in one module is a duplicate identifier, and the two mean entirely
// different things - one is where a character's feet are, the other is where a
// joystick is born.
import {
  STICK_RADIUS, knobAt, originFor as stickOriginFor, stickVector,
  type Stick, type StickStyle,
} from "./stick";
import {
  ARENA, KINDS, RUN_MS, TIER, WEAPONS, applyUpgrade, bossOf, newRun, offerUpgrades, rngFor, step,
  type EnemyKind, type LevelKey, type RunState, type UpgradeId, type WeaponId,
} from "./logic";

// Phaser draws the arena and reads the input. Every rule is in `logic.ts`, so this
// class owns exactly three things: pixels, pointers, and telling the React chrome
// what just happened. It is the single source of truth for every number on screen -
// it publishes on each frame, and the chrome only ever asks it to do things.
//
// THE CAST ARRIVED 2026-09-12. Until then every shape in here was a Graphics
// primitive - a cyan circle, a pink triangle, a purple diamond. They are studio
// sprites now, five clips each, through the copied Phaser adapter. What did NOT
// change is that `logic.ts` still knows nothing about any of it: it reports
// positions, a `flash` countdown and events, and this file decides what those
// look like. A sprite is a drawing decision, so it lives on this side of the line.

export type Phase = "ready" | "playing" | "won" | "over";

export type SurvivorsStatus = {
  score: number;
  /** Milliseconds left of the three minutes. */
  timeLeft: number;
  hp: number;
  maxHp: number;
  power: number;
  xp: number;
  need: number;
  level: LevelKey;
  phase: Phase;
  /**
   * Published rather than mirrored in React, for the same reason snake publishes
   * its own: the scene is what stops moving, so the scene is the one that knows.
   */
  paused: boolean;
  /** The three upgrades on offer, or empty when nothing is being chosen. */
  offer: UpgradeId[];
  /**
   * The golem's health once it is on the board, and null for the first three
   * minutes. The chrome swaps its countdown cell for this: after 3:00 the clock
   * is pinned at zero and has nothing left to say, while this is the one number
   * that decides how the run ends.
   */
  boss: { hp: number; maxHp: number } | null;
  /**
   * How many of each upgrade this run has taken, for the pips on the cards. A
   * COPY rather than the run's own object: handing React the live record would
   * mean a state object that mutates underneath it between renders.
   */
  taken: Record<UpgradeId, number>;
};

/** A mid-run ping every this many shapes. A nudge, not an achievement. */
const MILESTONE_EVERY = 25;

const INK = {
  ground: 0x0b0d1f,
  grid: 0x171a33,
  bolt: 0xd8fbff,
  gem: 0x6bff9e,
} as const;

/**
 * One ink per weapon, and they are far apart on purpose: three weapons that
 * differ only in shape are still hard to tell apart at speed on a phone, so
 * colour carries the difference first and motion confirms it. Ice for the
 * straight bolt, amber for the curving arc, magenta for the burst ring.
 *
 * They are NOT the enemy inks - a shot drawn in a shape's colour reads as that
 * shape throwing it. Checked against ENEMY_INK above: none of these three is
 * within reach of runner pink, orb amber-orange or brute violet at speed.
 */
const WEAPON_INK: Record<WeaponId, number> = {
  bolt: 0xd8fbff,
  arc: 0xffd166,
  burst: 0xff5ce1,
};

/** Kept for the sparks a kill throws, which are still drawn rather than sprited. */
const ENEMY_INK: Record<EnemyKind, number> = {
  runner: 0xff4d9d,
  orb: 0xffc24b,
  brute: 0xa56bff,
  // Stone, and checked against the other six inks in this file rather than
  // picked: it is the only cool grey among three saturated shapes (pink, amber,
  // violet) and three weapons (ice, amber, magenta). It is the golem's death
  // sparks AND its health bar, so the bar reads as belonging to the thing it
  // measures.
  golem: 0x9fb3d9,
};

/** Ground and grid at the bottom, the cast in the middle, shots and sparks on top. */
const DEPTH = { bg: 0, corpse: 5, enemy: 10, player: 20, fg: 30 } as const;

/** How long the one-shot clips hold before the sprite goes back to idle/walk. */
const ATTACK_MS = 260;

/**
 * The shortest gap between two shot sounds, in milliseconds.
 *
 * Measured against the cadence rather than picked: `fireEvery` starts at 620 ms
 * and `rapid` at its cap of 6 takes it to 130 ms (620 * 0.86^6 = 237, floored at
 * 130). At 130 ms a sound on every shot is roughly eight beeps a second. 260
 * keeps every shot audible at the opening cadence - where the player is still
 * learning that the weapon changed - and thins it to every other shot once the
 * gun is fully upgraded, which is exactly when the screen is loud anyway.
 */
const SHOT_SFX_GAP_MS = 260;
const HURT_MS = 380;
/** A cap on KO sprites, so a wave dying together cannot pile up game objects. */
const MAX_CORPSES = 12;

type Spark = { x: number; y: number; vx: number; vy: number; life: number; ink: number };

export class SurvivorsScene extends Phaser.Scene {
  private ctx!: GameContext;
  private run!: RunState;
  private phase: Phase = "ready";
  /**
   * NOT a fourth phase. A phase is where the run is; a pause is a lid over
   * whichever of those is current.
   */
  private paused = false;
  private selectedLevel: LevelKey = "normal";
  private offer: UpgradeId[] = [];
  private nextMilestone = MILESTONE_EVERY;
  /** Ground and grid. Drawn ONCE - they never change, and clearing a Graphics
   *  every frame to redraw the same 22 lines was work for nothing. */
  private bg!: Phaser.GameObjects.Graphics;
  /** Bolts, gems and sparks. These do change, so this one is cleared per frame. */
  private fg!: Phaser.GameObjects.Graphics;
  private sparks: Spark[] = [];
  private rng: () => number = Math.random;

  private ship!: Phaser.GameObjects.Sprite;
  /** One sprite per live enemy, keyed by the id `logic.ts` gave it. */
  private mobs = new Map<number, Phaser.GameObjects.Sprite>();
  private corpses: Phaser.GameObjects.Sprite[] = [];
  /** When the ship's one-shot clips stop holding, in scene time. */
  private attackUntil = 0;
  private hurtUntil = 0;
  /**
   * Last frame's `fireIn`. Kept, but no longer how a shot is detected: `logic.ts`
   * now announces one with a `shot` event carrying WHICH weapon, which the
   * inference could never have told us.
   */
  private lastFireIn = 0;
  /** Scene time the next shot may sound at. See the throttle in `consume`. */
  private nextShotSfx = 0;

  /**
   * The live joystick, or null when no thumb is down.
   *
   * This REPLACED a `hold` point, and the difference is the whole control: a
   * hold steers the ship TOWARD an absolute spot, so the ship stops the moment
   * it arrives and the thumb has to keep moving to keep the ship moving. A stick
   * steers by a vector FROM its origin, so a thumb that stays put keeps walking.
   * They are different games to play, and the second is what a joystick is.
   */
  private stick: Stick | null = null;
  /** Which stick this player chose. Their own setting, on this game's chrome. */
  private stickStyle: StickStyle = "tap";
  /** Keys currently down. */
  private keys = new Set<string>();

  private onStatus?: (s: SurvivorsStatus) => void;
  /**
   * The scene hands ITSELF over once it exists. Asking Phaser for it does not
   * work: `scene.start()` only QUEUES a start, so `getScene` on the next line
   * returns null and the chrome's buttons silently do nothing forever.
   */
  private onReady?: (scene: SurvivorsScene) => void;

  constructor() {
    super("survivors");
  }

  init(data: {
    ctx: GameContext;
    onStatus?: (s: SurvivorsStatus) => void;
    onReady?: (scene: SurvivorsScene) => void;
  }) {
    this.ctx = data.ctx;
    this.onStatus = data.onStatus;
    this.onReady = data.onReady;
  }

  /**
   * The sheets. Two URLs per character rather than one base path, because Vite
   * content-hashes both and they cannot be derived from each other - which is
   * why the adapter's own `loadStudioAtlas` is unusable in a bundled game and
   * this calls `load.atlas` directly. See the header of `./sprites.ts`.
   */
  preload() {
    for (const key of CAST_KEYS) {
      this.load.atlas(key, CAST[key].png, CAST[key].atlas);
    }
  }

  create() {
    this.rng = rngFor(Date.now() >>> 0);
    this.run = newRun(this.selectedLevel);

    // NEAREST, per texture, and this is the whole reason the art survives. Every
    // authored pixel is a 5x5 block on the sheet and is drawn at 0.2, so one
    // block becomes one arena unit; a smoothed filter would blur exactly the
    // edges this style is made of. Set here rather than in the game config
    // because that lives in SurvivorsGame.tsx and this change stays in one file.
    for (const key of CAST_KEYS) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      // THE CAST IS THE BOUNDARY, and it is here rather than in the adapter on
      // purpose. `PhaserAnimsLike` declares `frames: unknown[]` - the studio
      // wrote it engine-neutrally so the file could be copied into any game -
      // but Phaser 4's real `anims.create` wants `string | AnimationFrame[]`,
      // and `unknown[]` is not assignable to that. So the adapter's header claim
      // of "Phaser 3 / 4" does not hold for this one method under Phaser 4's
      // types. The copy is held byte-equal to the studio's by
      // `copies-match-the-studio.test.ts`, so widening the interface is the
      // STUDIO's change to make, not a local edit that would red that gate.
      createStudioAnims(this as unknown as PhaserAnimsLike, key, CAST[key].manifest);
    }

    this.bg = this.add.graphics().setDepth(DEPTH.bg);
    this.drawGround();
    this.fg = this.add.graphics().setDepth(DEPTH.fg);

    this.ship = this.spriteFor(PLAYER, this.run.x, this.run.y, DEPTH.player);
    this.ship.play(animKey(PLAYER, "idle"));

    // A thumb down BORNS the stick. For the tap style that is wherever the thumb
    // landed; for the corner style the origin is fixed and the touch only says
    // where the knob starts. One `originFor` decides, so the two styles cannot
    // drift into two different controls.
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.paused) return;
      if (this.phase !== "playing") return void this.startFromChrome();
      const o = stickOriginFor(this.stickStyle, p.worldX, p.worldY, ARENA);
      this.stick = { ox: o.ox, oy: o.oy, px: p.worldX, py: p.worldY };
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.paused) return;
      if (p.isDown && this.phase === "playing" && this.stick) {
        this.stick.px = p.worldX;
        this.stick.py = p.worldY;
      }
    });
    this.input.on("pointerup", () => {
      this.stick = null;
    });
    // A thumb that leaves the canvas mid-drag never sends `pointerup` here, and
    // the ship would then walk forever in the last direction held. Phaser emits
    // this when the pointer leaves the game surface, which is the only tell.
    this.input.on("gameout", () => {
      this.stick = null;
    });

    const kb = this.input.keyboard;
    kb?.on("keydown", (e: KeyboardEvent) => {
      if (this.paused) return;
      this.keys.add(e.key.toLowerCase());
    });
    kb?.on("keyup", (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    });

    this.draw();
    this.publish();
    this.onReady?.(this);
  }

  /** A cast member at true game size, pivot (the feet) on the point given. */
  private spriteFor(key: CastKey, x: number, y: number, depth: number) {
    const m = CAST[key].manifest;
    const o = originFor(m);
    return this.add
      .sprite(x, y, key)
      .setOrigin(o.x, o.y)
      .setScale(scaleFor(m))
      .setDepth(depth);
  }

  /** Push the current status out. Called from `draw`, so it cannot go stale. */
  private publish() {
    const boss = bossOf(this.run);
    this.onStatus?.({
      score: this.run.popped,
      boss: boss ? { hp: boss.hp, maxHp: KINDS.golem.hp } : null,
      taken: { ...this.run.up },
      timeLeft: Math.max(0, RUN_MS - this.run.t),
      hp: this.run.hp,
      maxHp: this.run.maxHp,
      power: this.run.power,
      xp: this.run.xp,
      need: this.run.need,
      level: this.selectedLevel,
      phase: this.phase,
      paused: this.paused,
      offer: this.offer,
    });
  }

  /** The chrome's pause button. Only a moving arena can be stopped. */
  setPaused(next: boolean) {
    if (this.phase !== "playing") return;
    if (this.paused === next) return;
    this.paused = next;
    // Every key is released on the way in: a key held when the lid came down
    // would otherwise still be held when it lifts, and the ship sets off alone.
    if (next) {
      this.keys.clear();
      this.stick = null;
    }
    this.publish();
  }

  setLevel(next: LevelKey) {
    if (this.selectedLevel === next) return;
    this.selectedLevel = next;
    this.restart();
  }

  restartFromChrome() {
    this.restart();
  }

  /** The ready and game-over screens both start a run, the way a canvas tap does. */
  startFromChrome() {
    this.ctx.audio.unlock();
    if (this.phase === "playing") return;
    if (this.phase !== "ready") this.restart();
    this.phase = "playing";
    this.ctx.analytics.levelStart(this.selectedLevel);
    this.publish();
  }

  /** The chrome's upgrade cards. An empty offer simply carries on. */
  choose(id: UpgradeId) {
    if (this.offer.length === 0) return;
    applyUpgrade(this.run, id);
    this.offer = [];
    this.ctx.audio.play("pop");
    this.publish();
  }

  private restart() {
    this.run = newRun(this.selectedLevel);
    this.phase = "ready";
    // A new run is never a paused one: restarting from behind the cover would
    // otherwise leave a lid over a ready screen nobody can read or reach.
    this.paused = false;
    this.offer = [];
    this.nextMilestone = MILESTONE_EVERY;
    this.sparks.length = 0;
    this.stick = null;
    this.keys.clear();
    // Every sprite the last run owned goes with it. A mob left behind would be
    // drawn forever at the place its enemy died, with nothing to move it.
    for (const s of this.mobs.values()) s.destroy();
    this.mobs.clear();
    for (const c of this.corpses) c.destroy();
    this.corpses.length = 0;
    this.attackUntil = 0;
    this.hurtUntil = 0;
    this.lastFireIn = 0;
    this.ship.setPosition(this.run.x, this.run.y).clearTint().setAlpha(1);
    this.ship.play(animKey(PLAYER, "idle"));
    this.draw();
    this.publish();
  }

  /**
   * The player's choice of stick, from this game's own chrome.
   *
   * Changing it drops any live stick rather than moving it: a thumb that is
   * mid-drag when the style flips would otherwise find its origin teleported to
   * the corner, and the ship would bolt in whatever direction that implied.
   */
  setStickStyle(next: StickStyle) {
    if (this.stickStyle === next) return;
    this.stickStyle = next;
    this.stick = null;
    this.publish();
  }

  /** A thumb beats the keys; with neither, the ship holds still. */
  private inputVector(): { dx: number; dy: number } {
    // The stick's own deadzone decides "not moving", so a thumb resting still
    // is a request to stand still rather than a drift - the same judgement the
    // old hold-point made with its 6 units, now made in one place.
    if (this.stick) return stickVector(this.stick);
    let dx = 0;
    let dy = 0;
    const k = this.keys;
    if (k.has("arrowleft") || k.has("a")) dx -= 1;
    if (k.has("arrowright") || k.has("d")) dx += 1;
    if (k.has("arrowup") || k.has("w")) dy -= 1;
    if (k.has("arrowdown") || k.has("s")) dy += 1;
    return { dx, dy };
  }

  update(_time: number, delta: number) {
    if (this.phase !== "playing" || this.paused) return;
    // Nothing above this line accumulates, so a paused arena banks no time and
    // resumes exactly where it stopped rather than replaying what it "owed".
    if (this.run.choosing) {
      this.drawSparks(delta);
      return;
    }

    const input = this.inputVector();
    step(this.run, delta, input, this.rng);
    this.consume();
    this.drawSparks(delta);
    this.syncSprites(input);
    this.draw();
    this.publish();
  }

  /** Turn what the simulation reported into sparks, sounds and rewards. */
  private consume() {
    for (const e of this.run.events) {
      if (e.type === "pop") {
        this.burst(e.x, e.y, ENEMY_INK[e.kind]);
        this.layCorpse(e.x, e.y, FOR_ENEMY[e.kind]);
      } else if (e.type === "shot") {
        // Each weapon has its own voice, from the nine real sfx names - a name
        // that is not in that table is a silent no-op with nothing in the log.
        //
        // THROTTLED, and this is the whole reason the throttle exists: `rapid`
        // takes the cadence to 130 ms, and a sound on every shot at that rate is
        // a machine-gun of beeps that makes a child put the phone down. The
        // weapon still always LOOKS different; it just does not always speak.
        const now = this.time.now;
        if (now >= this.nextShotSfx) {
          this.ctx.audio.play(WEAPONS[e.weapon].sfx);
          this.nextShotSfx = now + SHOT_SFX_GAP_MS;
        }
        this.attackUntil = now + ATTACK_MS;
      } else if (e.type === "hurt") {
        this.ctx.audio.play("fail");
        this.cameras.main.shake(160, 0.008);
        // Physical, and it says something the shake cannot. No-ops silently off
        // Android-Chrome, which is what makes it safe to fire unconditionally.
        haptic.fail();
        this.hurtUntil = this.time.now + HURT_MS;
      } else if (e.type === "boss") {
        // The arrival is the loudest thing in the run, and it is the only place
        // `streak` is played: three minutes of the same handful of sounds, then
        // one this game has never made before. The shake is longer and harder
        // than the one a hit costs (160 ms at 0.008) so the two cannot be
        // confused - this is the ground moving, not you being hurt.
        this.ctx.audio.play("streak");
        this.cameras.main.shake(420, 0.016);
      } else if (e.type === "levelup") {
        this.ctx.audio.play("success");
        // The one DOM effect in the arena, and it is here because a level-up is
        // rare and worth a puff. Per-kill it would be a DOM storm.
        const at = this.screenPoint(this.run.x, this.run.y);
        juiceBurst(at.x, at.y, { count: 12 });
        this.offer = offerUpgrades(this.run, this.rng);
        // Nothing left to offer: carry on rather than stopping dead in front of
        // no cards. `logic.ts` returns an empty list for exactly this case.
        if (this.offer.length === 0) this.run.choosing = false;
      } else if (e.type === "won") this.finish(true);
      else if (e.type === "over") this.finish(false);
    }
    // An endless-feeling mid-run ping. Coins, no star, no confetti.
    while (this.run.popped >= this.nextMilestone) {
      this.nextMilestone += MILESTONE_EVERY;
      winMoment(this.ctx, {
        reason: "milestone",
        level: `score-${this.run.popped}`,
        at: this.shipPoint(),
        confetti: false,
      });
    }
  }

  private finish(survived: boolean) {
    this.phase = survived ? "won" : "over";
    this.offer = [];
    this.ctx.audio.play(survived ? "win" : "fail");
    // The ship falls over when the hearts run out. `ko` is a one-shot, so it
    // holds its last frame rather than looping a death forever.
    if (!survived) this.ship.play(animKey(PLAYER, "ko"));
    if (survived) {
      this.ctx.analytics.levelComplete(this.selectedLevel, this.run.t);
      // The score rides the win rather than being a second announcement, so the
      // run is reported exactly once either way.
      winMoment(this.ctx, {
        reason: "level_complete",
        tier: TIER[this.selectedLevel],
        level: this.selectedLevel,
        ms: this.run.t,
        at: this.shipPoint(),
        score: { value: this.run.popped, unit: "points", board: this.selectedLevel },
      });
    } else {
      this.ctx.analytics.levelFail(this.selectedLevel, "out of hearts");
      const record = this.ctx.score?.report({
        value: this.run.popped,
        unit: "points",
        board: this.selectedLevel,
      });
      if (record?.isPersonalBest) {
        winMoment(this.ctx, {
          reason: "personal_best",
          level: `score-${this.run.popped}`,
          at: this.shipPoint(),
        });
      }
    }
    this.draw();
    this.publish();
  }

  /** An arena point in viewport pixels - what the DOM effects and coins need. */
  private screenPoint(x: number, y: number): { x: number; y: number } {
    const c = this.game.canvas?.getBoundingClientRect();
    if (!c) return { x: 0, y: 0 };
    return { x: c.left + (x / ARENA.w) * c.width, y: c.top + (y / ARENA.h) * c.height };
  }

  /** Where the coins should fly from: the ship, in viewport pixels. */
  private shipPoint(): { x: number; y: number } {
    return this.screenPoint(this.run.x, this.run.y);
  }

  private burst(x: number, y: number, ink: number) {
    for (let i = 0; i < 7; i++) {
      const a = this.rng() * Math.PI * 2;
      const v = 40 + this.rng() * 110;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 320, ink });
    }
  }

  /** A body that plays `ko` once and removes itself. Capped, oldest first. */
  private layCorpse(x: number, y: number, key: CastKey) {
    while (this.corpses.length >= MAX_CORPSES) this.corpses.shift()?.destroy();
    const s = this.spriteFor(key, x, y, DEPTH.corpse);
    s.play(animKey(key, "ko"));
    s.once("animationcomplete", () => {
      const i = this.corpses.indexOf(s);
      if (i >= 0) this.corpses.splice(i, 1);
      s.destroy();
    });
    this.corpses.push(s);
  }

  private drawSparks(delta: number) {
    const sec = Math.min(50, delta) / 1000;
    for (const s of this.sparks) {
      s.x += s.vx * sec;
      s.y += s.vy * sec;
      s.life -= delta;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);
  }

  /**
   * Play `clip` unless it is already the one running. Without this guard a
   * looping clip is restarted sixty times a second and never leaves frame zero -
   * a walk cycle that looks like a statue, with nothing in the log to say why.
   */
  private want(sprite: Phaser.GameObjects.Sprite, key: CastKey, clip: Clip) {
    const k = animKey(key, clip);
    if (sprite.anims.currentAnim?.key === k) return;
    sprite.play(k);
  }

  /** Every cast member follows the simulation: position, facing, clip, flash. */
  private syncSprites(input: { dx: number; dy: number }) {
    const now = this.time.now;

    // A shot, SEEN rather than announced: `logic.ts` emits no event for firing,
    // and `fireIn` counting back up is the one honest tell that it just did.
    if (this.run.fireIn > this.lastFireIn) this.attackUntil = now + ATTACK_MS;
    this.lastFireIn = this.run.fireIn;

    // The ship. It blinks while the mercy window is open, so a player can see why
    // the next shape went through them without costing a heart.
    const blink = this.run.invuln > 0 && Math.floor(this.run.invuln / 90) % 2 === 0;
    this.ship.setPosition(this.run.x, this.run.y).setAlpha(blink ? 0.25 : 1);
    if (Math.abs(input.dx) > 0.02) this.ship.setFlipX(input.dx < 0);
    if (this.phase === "playing") {
      const moving = Math.hypot(input.dx, input.dy) > 0.02;
      this.want(this.ship, PLAYER, now < this.hurtUntil ? "hurt" : now < this.attackUntil ? "attack" : moving ? "walk" : "idle");
    }

    // Enemies. One sprite per id, made on first sight and destroyed with its
    // enemy - keyed by id rather than by index, because `logic.ts` filters the
    // dead out and every index after one would otherwise shift onto a stranger.
    const seen = new Set<number>();
    for (const e of this.run.enemies) {
      seen.add(e.id);
      const key = FOR_ENEMY[e.kind];
      let s = this.mobs.get(e.id);
      if (!s) {
        s = this.spriteFor(key, e.x, e.y, DEPTH.enemy);
        this.mobs.set(e.id, s);
      }
      s.setPosition(e.x, e.y);
      s.setFlipX(this.run.x < e.x);
      // White on the frame it was hit, straight off the `flash` countdown the
      // simulation already keeps. FILL replaces the texture colour while
      // respecting its alpha, so the SILHOUETTE flashes and a dark sprite reads
      // as brightly as a pale one - Phaser's default MULTIPLY would barely move
      // the crab's own dark shell.
      //
      // This was `setTintFill(0xffffff)`, which does not compile under Phaser 4:
      // the method survives only as a DEPRECATED ZERO-ARGUMENT stub, so the
      // colour had nowhere to go. Its own declaration names the replacement and
      // this is it verbatim. `clearTint()` below was checked rather than
      // assumed - it is unchanged at 0 args, and had it moved too, fixing only
      // the line above would have left the other half of the pair broken with
      // nothing to say so.
      if (e.flash > 0) s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else s.clearTint();
      this.want(s, key, e.flash > 0 ? "hurt" : "walk");
    }
    for (const [id, s] of this.mobs) {
      if (seen.has(id)) continue;
      s.destroy();
      this.mobs.delete(id);
    }
  }

  /** The arena floor. Static, so this runs once rather than sixty times a second. */
  private drawGround() {
    const g = this.bg;
    g.clear();
    g.fillStyle(INK.ground, 1);
    g.fillRect(0, 0, ARENA.w, ARENA.h);
    g.lineStyle(1, INK.grid, 1);
    for (let x = 42; x < ARENA.w; x += 42) g.lineBetween(x, 0, x, ARENA.h);
    for (let y = 42; y < ARENA.h; y += 42) g.lineBetween(0, y, ARENA.w, y);
  }

  /** Everything that is still a primitive: the shots, the gems and the sparks. */
  private draw() {
    const g = this.fg;
    g.clear();

    for (const gem of this.run.gems) {
      g.fillStyle(INK.gem, 1);
      g.beginPath();
      g.moveTo(gem.x, gem.y - 5);
      g.lineTo(gem.x + 4, gem.y);
      g.lineTo(gem.x, gem.y + 5);
      g.lineTo(gem.x - 4, gem.y);
      g.closePath();
      g.fillPath();
    }

    // Three weapons, three MOTIONS and three SHAPES - never one shape at three
    // sizes, which reads as one weapon with a zoom. The bolt is a hard streak
    // along its own heading, the arc is a comet with a tail that curves because
    // its velocity does, and a burst fragment is a square that spins and fades
    // as it dies. Each is drawn in its own ink.
    for (const b of this.run.bolts) {
      const ink = WEAPON_INK[b.kind];
      if (b.kind === "bolt") {
        const sp = Math.hypot(b.vx, b.vy) || 1;
        g.lineStyle(3, ink, 1);
        g.lineBetween(b.x, b.y, b.x - (b.vx / sp) * 9, b.y - (b.vy / sp) * 9);
      } else if (b.kind === "arc") {
        const sp = Math.hypot(b.vx, b.vy) || 1;
        // Three tail dots behind the head, fading. They trail the CURRENT
        // heading, so the tail swings as the shot turns and the curve is legible.
        for (let i = 3; i >= 1; i--) {
          g.fillStyle(ink, 0.16 * i);
          g.fillCircle(b.x - (b.vx / sp) * (i * 5), b.y - (b.vy / sp) * (i * 5), 3);
        }
        g.fillStyle(ink, 1);
        g.fillCircle(b.x, b.y, 4);
      } else {
        const w = WEAPONS.burst;
        const fade = Math.max(0, Math.min(1, b.life / w.life));
        const spin = b.age / 90;
        g.fillStyle(ink, 0.35 + 0.65 * fade);
        // A square on its own rotation, so a ring of them tumbles outward.
        const r = 4;
        const c = Math.cos(spin) * r;
        const s2 = Math.sin(spin) * r;
        g.beginPath();
        g.moveTo(b.x + c, b.y + s2);
        g.lineTo(b.x - s2, b.y + c);
        g.lineTo(b.x - c, b.y - s2);
        g.lineTo(b.x + s2, b.y - c);
        g.closePath();
        g.fillPath();
      }
    }

    for (const s of this.sparks) {
      g.fillStyle(s.ink, Math.max(0, s.life / 320));
      g.fillCircle(s.x, s.y, 2.5);
    }

    // The joystick, drawn where the thumb put it. Only while a thumb is down -
    // a ring sitting on an untouched screen is furniture, and this game's whole
    // point is that the arena is the control now.
    if (this.stick) {
      const k = knobAt(this.stick);
      g.lineStyle(2, INK.bolt, 0.35);
      g.strokeCircle(this.stick.ox, this.stick.oy, STICK_RADIUS);
      g.fillStyle(INK.bolt, 0.14);
      g.fillCircle(this.stick.ox, this.stick.oy, STICK_RADIUS);
      g.fillStyle(INK.bolt, 0.8);
      g.fillCircle(k.x, k.y, 13);
    }

    // The golem's health, along the top of the arena. It is a LENGTH, not a
    // colour code - the bar shortens, and nothing in it has to be read as red
    // against green, which is a channel the operator cannot use and a sizeable
    // fraction of players cannot either.
    //
    // Read through `bossOf` rather than from a number kept on the side, so the
    // bar cannot disagree with the enemy it is drawing.
    const boss = bossOf(this.run);
    if (boss) {
      const m = 16;
      const w = ARENA.w - m * 2;
      const p = Math.max(0, Math.min(1, boss.hp / KINDS.golem.hp));
      g.fillStyle(INK.ground, 0.9);
      g.fillRect(m - 3, 11, w + 6, 13);
      g.fillStyle(INK.grid, 1);
      g.fillRect(m, 14, w, 7);
      g.fillStyle(ENEMY_INK.golem, 1);
      g.fillRect(m, 14, w * p, 7);
    }
  }
}
