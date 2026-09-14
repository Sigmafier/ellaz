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
  ARENA, KINDS, RUN_MS, TIER, WEAPONS, bossOf, newRun, rngFor, step,
  type Arena, type EnemyKind, type LevelKey, type RunState, type ShotKind, type UpgradeId, type WeaponId,
} from "./logic";
import { WALL, cameraOf } from "./world";
import { BLADES, bladePositions, dronePosition, holds } from "./arsenal";
import { chargeOf, dashReady, triggerFreeze } from "./powers";
import { applyCard, offerCards, type Card } from "./cards";

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
  /**
   * The weapons this run carries, in slot order. The HUD draws four slots from
   * this - the run's own list, so the HUD cannot show a weapon the run does not
   * fire.
   */
  slots: WeaponId[];
  /** The dash: 1 when ready, rising from 0 while it recharges. */
  dash: number;
  /** The freeze: how full its ring is, 0..1. The button can be pressed at 1. */
  charge: number;
  /** True while everything is frozen. */
  frozen: boolean;
  xp: number;
  need: number;
  level: LevelKey;
  phase: Phase;
  /**
   * Published rather than mirrored in React, for the same reason snake publishes
   * its own: the scene is what stops moving, so the scene is the one that knows.
   */
  paused: boolean;
  /** The cards on offer - upgrades, and a new weapon while a slot is free - or empty. */
  offer: Card[];
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
const WEAPON_INK: Record<ShotKind, number> = {
  bolt: 0xd8fbff,
  arc: 0xffd166,
  burst: 0xff5ce1,
  // Mint, the one hue no shape and no other shot uses, so the drone's shots are
  // told from the robot's own at a glance.
  drone: 0x7df9a6,
};

/** The blades' ink. Pink is a runner's colour, so the blades are a PALER pink with a white edge. */
const BLADE_INK = 0xff8fc0;
/** Ice, for the freeze: the frozen shapes' tint and the cover over the view. */
const ICE = 0x9fe3ff;
/** The world's scenery and walls. Dim on purpose: nothing decorative may read as a shape. */
const SCENERY = { crystal: 0x6a5cff, rock: 0x262b52, tuft: 0x2f8f73, crack: 0x252a4d, wall: 0x1a1d38, stripe: 0xffb020, edge: 0xffd166 } as const;

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
  /**
   * The floor this scene draws and plays on.
   *
   * Handed in by the component, which is the only party that knows how much
   * room the screen has. It DEFAULTS to the phone's portrait arena so a caller
   * that says nothing gets what this game has always had, and it is read once:
   * the canvas is sized from it at boot, so a scene cannot change shape under a
   * run that is already going.
   */
  private arena: Arena = ARENA;
  private phase: Phase = "ready";
  /**
   * NOT a fourth phase. A phase is where the run is; a pause is a lid over
   * whichever of those is current.
   */
  private paused = false;
  private selectedLevel: LevelKey = "normal";
  /** The weapon a run starts with, chosen on the entrance. */
  private startWeapon: WeaponId = "bolt";
  private offer: Card[] = [];
  private nextMilestone = MILESTONE_EVERY;
  /** Ground and grid. Drawn ONCE - they never change, and clearing a Graphics
   *  every frame to redraw the same 22 lines was work for nothing. */
  private bg!: Phaser.GameObjects.Graphics;
  /** Bolts, gems and sparks. These do change, so this one is cleared per frame. */
  private fg!: Phaser.GameObjects.Graphics;
  /**
   * Things drawn in SCREEN space, over the scrolling world: the stick, the boss
   * bar, the minimap and the freeze cover. `setScrollFactor(0)` pins it to the
   * view, so none of them slides away as the camera follows the robot.
   */
  private hud!: Phaser.GameObjects.Graphics;
  /** Whether the shapes were frozen last frame, so their clips pause and resume once. */
  private wasFrozen = false;
  private sparks: Spark[] = [];
  private rng: () => number = Math.random;

  private ship!: Phaser.GameObjects.Sprite;
  /** One sprite per live enemy, keyed by the id `logic.ts` gave it. */
  private mobs = new Map<number, Phaser.GameObjects.Sprite>();
  private corpses: Phaser.GameObjects.Sprite[] = [];
  /** When the ship's one-shot clips stop holding, in scene time. */
  private attackUntil = 0;
  private hurtUntil = 0;
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
    /** Portrait on a phone, landscape on a desktop. The component decides. */
    arena?: Arena;
    onStatus?: (s: SurvivorsStatus) => void;
    onReady?: (scene: SurvivorsScene) => void;
  }) {
    this.ctx = data.ctx;
    this.arena = data.arena ?? ARENA;
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
    this.run = newRun(this.selectedLevel, this.arena, this.startWeapon);
    // The camera never shows past the world; its scroll is set from `cameraOf`
    // every frame, so the view the scene draws is the view the simulation spawns around.
    this.cameras.main.setBounds(0, 0, this.run.world.w, this.run.world.h);

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
    this.hud = this.add.graphics().setDepth(DEPTH.fg + 1).setScrollFactor(0);

    this.ship = this.spriteFor(PLAYER, this.run.x, this.run.y, DEPTH.player);
    this.ship.play(animKey(PLAYER, "idle"));

    // A thumb down BORNS the stick. For the tap style that is wherever the thumb
    // landed; for the corner style the origin is fixed and the touch only says
    // where the knob starts. One `originFor` decides, so the two styles cannot
    // drift into two different controls.
    // SCREEN coordinates (`p.x`), never world ones (`p.worldX`). The stick is a
    // thing under a thumb on the glass; once the camera follows the robot the
    // world point under that thumb moves every frame while the thumb does not,
    // and a stick read in world units would steer by the scroll.
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.paused) return;
      if (this.phase !== "playing") return void this.startFromChrome();
      const o = stickOriginFor(this.stickStyle, p.x, p.y, this.arena);
      this.stick = { ox: o.ox, oy: o.oy, px: p.x, py: p.y };
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.paused) return;
      if (p.isDown && this.phase === "playing" && this.stick) {
        this.stick.px = p.x;
        this.stick.py = p.y;
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
      // Space is the freeze on a keyboard - the same action as the button.
      if (e.key === " ") return void this.freezeFromChrome();
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
      slots: this.run.slots.map((k) => k.id),
      dash: dashReady(this.run),
      charge: chargeOf(this.run),
      frozen: this.run.frozen > 0,
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

  /** The chrome's level-up cards. An empty offer simply carries on. */
  choose(card: Card) {
    if (this.offer.length === 0) return;
    applyCard(this.run, card);
    this.offer = [];
    this.ctx.audio.play("pop");
    this.publish();
  }

  /**
   * The entrance's weapon pick. Only a run that has not started takes a new
   * starting weapon - a run in progress keeps the loadout it is playing.
   */
  setStartWeapon(next: WeaponId) {
    if (this.startWeapon === next) return;
    this.startWeapon = next;
    if (this.phase === "ready") this.restart();
  }

  /** The freeze button, and Space. Plays the moment only when a freeze really started. */
  freezeFromChrome() {
    if (this.paused || this.phase !== "playing") return;
    if (!triggerFreeze(this.run)) return;
    this.ctx.audio.play("success");
    haptic.tap();
    this.cameras.main.flash(260, 180, 230, 255);
    this.publish();
  }

  private restart() {
    this.run = newRun(this.selectedLevel, this.arena, this.startWeapon);
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
    this.wasFrozen = false;
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
      } else if (e.type === "dash") {
        // The dash saved a heart. A streak of ice from where the robot was to
        // where it is, and a sound that is not the hurt sound - a save must never
        // be mistaken for a hit.
        this.ctx.audio.play("pop");
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          this.sparks.push({
            x: e.x + (this.run.x - e.x) * t,
            y: e.y + (this.run.y - e.y) * t,
            vx: 0,
            vy: 0,
            life: 180 + 140 * t,
            ink: WEAPON_INK.bolt,
          });
        }
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
        this.offer = offerCards(this.run, this.rng);
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
    // A WORLD point, so the camera comes off first - without this every coin and
    // puff would fly from where the robot would be if the camera had never moved.
    const cam = cameraOf(this.run);
    return {
      x: c.left + ((x - cam.x) / this.arena.w) * c.width,
      y: c.top + ((y - cam.y) / this.arena.h) * c.height,
    };
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
    const frozen = this.run.frozen > 0;

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
      // Ice while frozen, and the walk cycle stops with them: a shape that keeps
      // walking on the spot reads as a shape that is only slowed.
      else if (frozen) s.setTint(ICE).setTintMode(Phaser.TintModes.MULTIPLY);
      else s.clearTint();
      if (frozen) {
        if (!this.wasFrozen || !s.anims.isPaused) s.anims.pause();
      } else {
        if (s.anims.isPaused) s.anims.resume();
        this.want(s, key, e.flash > 0 ? "hurt" : "walk");
      }
    }
    this.wasFrozen = frozen;
    for (const [id, s] of this.mobs) {
      if (seen.has(id)) continue;
      s.destroy();
      this.mobs.delete(id);
    }
  }

  /** The arena floor. Static, so this runs once rather than sixty times a second. */
  private drawGround() {
    const g = this.bg;
    const { w, h } = this.run.world;
    g.clear();
    g.fillStyle(INK.ground, 1);
    g.fillRect(0, 0, w, h);
    g.lineStyle(1, INK.grid, 1);
    // The grid pitch stays 42 units on every floor rather than scaling with it:
    // it is a sense of SPEED, and with the camera following the robot it is also
    // what tells a player they are moving at all.
    for (let x = 42; x < w; x += 42) g.lineBetween(x, 0, x, h);
    for (let y = 42; y < h; y += 42) g.lineBetween(0, y, w, y);
    this.drawScenery(g, w, h);
    this.drawWalls(g, w, h);
  }

  /**
   * Scenery you walk over (operator ruling 2026-09-14: decoration, not
   * obstacles). Seeded, so a floor looks the same every run and a landmark can be
   * learned. Dim, so nothing here can be mistaken for a shape coming at you, and
   * sparse near the start so the first seconds read clearly.
   */
  private drawScenery(g: Phaser.GameObjects.Graphics, w: number, h: number) {
    const rnd = rngFor(20260914);
    const n = Math.round((w * h) / 5200);
    for (let i = 0; i < n; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const k = rnd();
      if (Math.hypot(x - w / 2, y - h / 2) < 70) continue;
      if (k < 0.25) {
        g.fillStyle(SCENERY.crystal, 0.32);
        g.fillTriangle(x, y - 7, x + 4, y, x, y + 7);
        g.fillTriangle(x, y - 7, x - 4, y, x, y + 7);
      } else if (k < 0.5) {
        g.fillStyle(SCENERY.rock, 1);
        g.fillRoundedRect(x, y, 10, 7, 2);
        g.fillRoundedRect(x + 6, y - 4, 8, 6, 2);
      } else if (k < 0.8) {
        g.lineStyle(1.6, SCENERY.tuft, 0.55);
        g.lineBetween(x, y, x - 3, y - 7);
        g.lineBetween(x, y, x, y - 9);
        g.lineBetween(x, y, x + 3, y - 7);
      } else {
        g.lineStyle(1.6, SCENERY.crack, 1);
        g.lineBetween(x, y, x + 9, y + 4);
        g.lineBetween(x + 9, y + 4, x + 14, y + 1);
        g.lineBetween(x + 14, y + 1, x + 22, y + 7);
      }
    }
  }

  /** The edge of the world: a striped band the robot cannot cross, `WALL` units thick. */
  private drawWalls(g: Phaser.GameObjects.Graphics, w: number, h: number) {
    g.fillStyle(SCENERY.wall, 1);
    g.fillRect(0, 0, w, WALL);
    g.fillRect(0, h - WALL, w, WALL);
    g.fillRect(0, 0, WALL, h);
    g.fillRect(w - WALL, 0, WALL, h);
    g.fillStyle(SCENERY.stripe, 0.9);
    for (let x = 0; x < w; x += 16) {
      g.fillRect(x, 0, 8, WALL);
      g.fillRect(x, h - WALL, 8, WALL);
    }
    for (let y = 0; y < h; y += 16) {
      g.fillRect(0, y, WALL, 8);
      g.fillRect(w - WALL, y, WALL, 8);
    }
    g.lineStyle(2, SCENERY.edge, 0.9);
    g.strokeRect(WALL, WALL, w - WALL * 2, h - WALL * 2);
  }

  /** Everything that is still a primitive: the shots, the gems and the sparks. */
  private draw() {
    const g = this.fg;
    g.clear();
    const hud = this.hud;
    hud.clear();
    // The view follows the robot. Set from `cameraOf`, the same function the
    // simulation spawns around, so what is drawn and what is played agree.
    const cam = cameraOf(this.run);
    this.cameras.main.setScroll(cam.x, cam.y);

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
      if (b.kind === "bolt" || b.kind === "drone") {
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

    this.drawBlades(g);
    this.drawDrone(g);

    if (this.run.frozen > 0) {
      // A cool cover over the whole view, fading out over the last half second
      // so the thaw is seen coming.
      hud.fillStyle(ICE, 0.14 * Math.min(1, this.run.frozen / 500));
      hud.fillRect(0, 0, this.arena.w, this.arena.h);
    }

    // The joystick, drawn where the thumb put it - in SCREEN space, on the HUD
    // layer. Only while a thumb is down: a ring sitting on an untouched screen is
    // furniture, and this game's whole point is that the arena is the control.
    if (this.stick) {
      const k = knobAt(this.stick);
      hud.lineStyle(2, INK.bolt, 0.35);
      hud.strokeCircle(this.stick.ox, this.stick.oy, STICK_RADIUS);
      hud.fillStyle(INK.bolt, 0.14);
      hud.fillCircle(this.stick.ox, this.stick.oy, STICK_RADIUS);
      hud.fillStyle(INK.bolt, 0.8);
      hud.fillCircle(k.x, k.y, 13);
    }

    // Only mid-run: on the entrance and the end screens it would show through the cover.
    if (this.phase === "playing") this.drawMinimap(hud, cam);

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
      const w = this.arena.w - m * 2;
      const p = Math.max(0, Math.min(1, boss.hp / KINDS.golem.hp));
      hud.fillStyle(INK.ground, 0.9);
      hud.fillRect(m - 3, 11, w + 6, 13);
      hud.fillStyle(INK.grid, 1);
      hud.fillRect(m, 14, w, 7);
      hud.fillStyle(ENEMY_INK.golem, 1);
      hud.fillRect(m, 14, w * p, 7);
    }
  }

  /** The blades, where the simulation cuts with them: `bladePositions` is the one source. */
  private drawBlades(g: Phaser.GameObjects.Graphics) {
    if (!holds(this.run, "blades")) return;
    g.lineStyle(1, BLADE_INK, 0.28);
    g.strokeCircle(this.run.x, this.run.y, BLADES.radius);
    for (const b of bladePositions(this.run)) {
      // A crescent leading in the direction of spin: a wide triangle along the
      // tangent, with a pale edge on its outer side.
      const t = b.a + Math.PI / 2;
      const cx = Math.cos(t);
      const cy = Math.sin(t);
      const ox = Math.cos(b.a);
      const oy = Math.sin(b.a);
      g.fillStyle(BLADE_INK, 1);
      g.fillTriangle(
        b.x + cx * 11, b.y + cy * 11,
        b.x - cx * 9 + ox * 4, b.y - cy * 9 + oy * 4,
        b.x - cx * 9 - ox * 4, b.y - cy * 9 - oy * 4,
      );
      g.lineStyle(1.5, 0xffffff, 0.8);
      g.lineBetween(b.x + cx * 11, b.y + cy * 11, b.x - cx * 9 + ox * 4, b.y - cy * 9 + oy * 4);
    }
  }

  /** The drone at the robot's shoulder: a saucer with a dome and one dark eye. */
  private drawDrone(g: Phaser.GameObjects.Graphics) {
    if (!holds(this.run, "drone")) return;
    const d = dronePosition(this.run);
    const bob = Math.sin(this.time.now / 180) * 1.5;
    g.fillStyle(WEAPON_INK.drone, 0.25);
    g.fillEllipse(d.x, d.y + 9, 16, 4);
    g.fillStyle(0xd6ffe6, 1);
    g.fillCircle(d.x, d.y - 2 + bob, 5);
    g.fillStyle(WEAPON_INK.drone, 1);
    g.fillEllipse(d.x, d.y + 1 + bob, 22, 7);
    g.fillStyle(INK.ground, 1);
    g.fillCircle(d.x, d.y - 3 + bob, 1.6);
  }

  /**
   * The minimap (the operator took it with the build, 2026-09-14): the world,
   * the view, the robot, every shape and the golem, top-right under the score.
   *
   * Sized in CSS pixels and converted to arena units here, because the HUD's
   * score block is DOM and sized in CSS pixels - a minimap sized in units would
   * slide under the score on one screen and float away from it on another.
   */
  private drawMinimap(g: Phaser.GameObjects.Graphics, cam: { x: number; y: number }) {
    const cssPerUnit = this.scale.displaySize.width / this.arena.w || 1;
    const wide = this.arena.w > this.arena.h;
    const size = (wide ? 104 : 72) / cssPerUnit;
    const top = (wide ? 122 : 118) / cssPerUnit;
    const right = 14 / cssPerUnit;
    const world = this.run.world;
    // Keep the world's shape inside a square box.
    const k = Math.min(size / world.w, size / world.h);
    const mw = world.w * k;
    const mh = world.h * k;
    const x0 = this.arena.w - right - size + (size - mw) / 2;
    const y0 = top + (size - mh) / 2;

    g.fillStyle(INK.ground, 0.82);
    g.fillRoundedRect(x0 - 3, y0 - 3, mw + 6, mh + 6, 4);
    g.lineStyle(1, SCENERY.stripe, 0.9);
    g.strokeRect(x0, y0, mw, mh);
    g.fillStyle(ENEMY_INK.runner, 0.85);
    for (const e of this.run.enemies) {
      if (e.id === this.run.boss) continue;
      g.fillRect(x0 + e.x * k - 1, y0 + e.y * k - 1, 2, 2);
    }
    const boss = bossOf(this.run);
    if (boss) {
      g.fillStyle(ENEMY_INK.golem, 1);
      g.fillCircle(x0 + boss.x * k, y0 + boss.y * k, 3);
    }
    g.lineStyle(1, 0xffffff, 0.9);
    g.strokeRect(x0 + cam.x * k, y0 + cam.y * k, this.arena.w * k, this.arena.h * k);
    g.fillStyle(WEAPON_INK.bolt, 1);
    g.fillCircle(x0 + this.run.x * k, y0 + this.run.y * k, 2.2);
  }
}
