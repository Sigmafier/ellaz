import Phaser from "phaser";
import type { GameContext } from "@sdk/index";
import { winMoment } from "@shared/index";
import {
  ARENA, KINDS, RUN_MS, TIER, applyUpgrade, newRun, offerUpgrades, rngFor, step,
  type EnemyKind, type LevelKey, type RunState, type UpgradeId,
} from "./logic";

// Phaser draws the arena and reads the input. Every rule is in `logic.ts`, so this
// class owns exactly three things: pixels, pointers, and telling the React chrome
// what just happened. It is the single source of truth for every number on screen -
// it publishes on each frame, and the chrome only ever asks it to do things.

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
};

/** A mid-run ping every this many shapes. A nudge, not an achievement. */
const MILESTONE_EVERY = 25;

const INK = {
  ground: 0x0b0d1f,
  grid: 0x171a33,
  ship: 0x22e7ff,
  shipHurt: 0xff5a7a,
  bolt: 0xd8fbff,
  gem: 0x6bff9e,
  flash: 0xffffff,
} as const;

const ENEMY_INK: Record<EnemyKind, number> = {
  runner: 0xff4d9d,
  orb: 0xffc24b,
  brute: 0xa56bff,
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number; ink: number };

/**
 * A filled diamond, drawn as a PATH rather than through `fillPoints`.
 *
 * `fillPoints` wants real `Phaser.Math.Vector2` instances, so every gem and
 * every brute would mean four `new` calls per frame - dozens of throwaway
 * objects sixty times a second, on a phone. Four numbers cost nothing.
 */
function diamond(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number) {
  g.beginPath();
  g.moveTo(x, y - ry);
  g.lineTo(x + rx, y);
  g.lineTo(x, y + ry);
  g.lineTo(x - rx, y);
  g.closePath();
  g.fillPath();
}

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
  private gfx!: Phaser.GameObjects.Graphics;
  private sparks: Spark[] = [];
  private rng: () => number = Math.random;

  /** Where a finger is holding, in arena units, or null when nothing is held. */
  private hold: { x: number; y: number } | null = null;
  /** Keys currently down. */
  private keys = new Set<string>();
  /** The pad's persistent direction, for a player who would rather tap than drag. */
  private padDir: { dx: number; dy: number } | null = null;

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

  create() {
    this.rng = rngFor(Date.now() >>> 0);
    this.run = newRun(this.selectedLevel);
    this.gfx = this.add.graphics();

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.paused) return;
      if (this.phase !== "playing") return void this.startFromChrome();
      this.hold = { x: p.worldX, y: p.worldY };
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.paused) return;
      if (p.isDown && this.phase === "playing") this.hold = { x: p.worldX, y: p.worldY };
    });
    this.input.on("pointerup", () => {
      this.hold = null;
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

  /** Push the current status out. Called from `draw`, so it cannot go stale. */
  private publish() {
    this.onStatus?.({
      score: this.run.popped,
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
      this.hold = null;
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
    this.hold = null;
    this.keys.clear();
    this.padDir = null;
    this.draw();
    this.publish();
  }

  /** The pad steers persistently; tapping the same arrow again stops the ship. */
  steer(dir: "up" | "down" | "left" | "right") {
    if (this.paused) return;
    if (this.phase !== "playing") return void this.startFromChrome();
    const v = { up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } }[dir];
    const same = this.padDir && this.padDir.dx === v.dx && this.padDir.dy === v.dy;
    this.padDir = same ? null : v;
  }

  /** A finger beats the keys, and the keys beat the pad's standing order. */
  private inputVector(): { dx: number; dy: number } {
    if (this.hold) {
      const dx = this.hold.x - this.run.x;
      const dy = this.hold.y - this.run.y;
      // A finger resting on the ship is a finger asking it to stay put.
      if (Math.hypot(dx, dy) > 6) return { dx, dy };
      return { dx: 0, dy: 0 };
    }
    let dx = 0;
    let dy = 0;
    const k = this.keys;
    if (k.has("arrowleft") || k.has("a")) dx -= 1;
    if (k.has("arrowright") || k.has("d")) dx += 1;
    if (k.has("arrowup") || k.has("w")) dy -= 1;
    if (k.has("arrowdown") || k.has("s")) dy += 1;
    if (dx !== 0 || dy !== 0) return { dx, dy };
    return this.padDir ?? { dx: 0, dy: 0 };
  }

  update(_time: number, delta: number) {
    if (this.phase !== "playing" || this.paused) return;
    // Nothing above this line accumulates, so a paused arena banks no time and
    // resumes exactly where it stopped rather than replaying what it "owed".
    if (this.run.choosing) {
      this.drawSparks(delta);
      return;
    }

    step(this.run, delta, this.inputVector(), this.rng);
    this.consume();
    this.drawSparks(delta);
    this.draw();
    this.publish();
  }

  /** Turn what the simulation reported into sparks, sounds and rewards. */
  private consume() {
    for (const e of this.run.events) {
      if (e.type === "pop") this.burst(e.x, e.y, ENEMY_INK[e.kind]);
      else if (e.type === "hurt") {
        this.ctx.audio.play("fail");
        this.cameras.main.shake(160, 0.008);
      } else if (e.type === "levelup") {
        this.ctx.audio.play("success");
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

  /** Where the coins should fly from: the ship, in viewport pixels. */
  private shipPoint(): { x: number; y: number } {
    const c = this.game.canvas?.getBoundingClientRect();
    if (!c) return { x: 0, y: 0 };
    return {
      x: c.left + (this.run.x / ARENA.w) * c.width,
      y: c.top + (this.run.y / ARENA.h) * c.height,
    };
  }

  private burst(x: number, y: number, ink: number) {
    for (let i = 0; i < 7; i++) {
      const a = this.rng() * Math.PI * 2;
      const v = 40 + this.rng() * 110;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 320, ink });
    }
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

  private draw() {
    const g = this.gfx;
    g.clear();

    g.fillStyle(INK.ground, 1);
    g.fillRect(0, 0, ARENA.w, ARENA.h);
    g.lineStyle(1, INK.grid, 1);
    for (let x = 42; x < ARENA.w; x += 42) g.lineBetween(x, 0, x, ARENA.h);
    for (let y = 42; y < ARENA.h; y += 42) g.lineBetween(0, y, ARENA.w, y);

    for (const gem of this.run.gems) {
      g.fillStyle(INK.gem, 1);
      diamond(g, gem.x, gem.y, 4, 5);
    }

    for (const e of this.run.enemies) {
      const r = KINDS[e.kind].r;
      g.fillStyle(e.flash > 0 ? INK.flash : ENEMY_INK[e.kind], 1);
      if (e.kind === "runner") {
        g.fillTriangle(e.x, e.y - r, e.x + r, e.y + r * 0.8, e.x - r, e.y + r * 0.8);
      } else if (e.kind === "orb") {
        g.fillCircle(e.x, e.y, r);
      } else {
        diamond(g, e.x, e.y, r, r);
      }
    }

    g.fillStyle(INK.bolt, 1);
    for (const b of this.run.bolts) g.fillCircle(b.x, b.y, 3.5);

    for (const s of this.sparks) {
      g.fillStyle(s.ink, Math.max(0, s.life / 320));
      g.fillCircle(s.x, s.y, 2.5);
    }

    // The ship. It blinks while the mercy window is open, so a player can see why
    // the next shape went through them without costing a heart.
    const blink = this.run.invuln > 0 && Math.floor(this.run.invuln / 90) % 2 === 0;
    if (!blink) {
      g.fillStyle(this.run.invuln > 0 ? INK.shipHurt : INK.ship, 1);
      g.fillCircle(this.run.x, this.run.y, 11);
      g.fillStyle(INK.ground, 1);
      g.fillCircle(this.run.x, this.run.y, 4.5);
    }
  }
}
