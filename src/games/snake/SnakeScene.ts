import { textFor } from "@i18n/index";
import Phaser from "phaser";
import type { GameContext } from "@sdk/index";
import { winMoment } from "@shared/index";
import { newGame, step, turn, type SnakeState, type Dir } from "./logic";

const COLS = 17;
const ROWS = 17;

// Base tick rates (ms/step) the player picks on the ready screen.
export type SpeedKey = "slow" | "normal" | "fast";
const SPEEDS: Record<SpeedKey, number> = { slow: 170, normal: 130, fast: 90 };

// Progressive difficulty: every FOOD_PER_LEVEL food eaten bumps the level; each
// level shaves STEP_DECAY_MS off the effective tick, never faster than STEP_FLOOR.
const FOOD_PER_LEVEL = 5;
const STEP_DECAY_MS = 8;
const STEP_FLOOR = 60;

type Phase = "ready" | "playing" | "over";

/**
 * What the scene tells the React chrome around it. Read-only - the chrome never
 * reaches into the scene's fields, it calls `setSpeed` / `restartFromChrome`
 * and waits to be told what happened. Two owners of one number is how the
 * canvas and the header end up disagreeing about the score.
 */
export type SnakeStatus = {
  score: number;
  level: number;
  speed: SpeedKey;
  phase: Phase;
  /**
   * Published rather than mirrored in React, for the reason the whole type
   * exists: the scene is what stops moving, so the scene is the one that knows.
   * A `useState` in the chrome beside a flag in here is two owners of one fact,
   * and they disagree the first time anything but the button changes it — a
   * restart, say, which clears the pause down here and would leave a chrome
   * still drawing its cover over a snake that had already set off.
   */
  paused: boolean;
};

// Phaser scene: draws the pure SnakeState and feeds it input. The snake does not
// move until the player's first input (ready → playing), so it never dies before
// they're looking. All game rules live in logic.ts; this class is render + input.
export class SnakeScene extends Phaser.Scene {
  private ctx!: GameContext;
  private state!: SnakeState;
  private phase: Phase = "ready";
  /**
   * NOT a fourth `Phase`. A phase is where the run is — waiting to start,
   * running, dead — and a pause is a lid over whichever of those is current.
   * As a phase it would have to remember what it interrupted in order to give
   * it back, and every `phase !== "playing"` test in this file (there are five)
   * would have to learn about it separately.
   */
  private paused = false;
  private cell = 20;
  private acc = 0;
  // Base speed the player selected; persists across restarts within the session.
  private selectedSpeed: SpeedKey = "normal";
  private baseStepMs = SPEEDS.normal;
  private gfx!: Phaser.GameObjects.Graphics;
  private overText!: Phaser.GameObjects.Text;
  /** Told to the chrome on every change. Set from `init`. */
  private onStatus?: (s: SnakeStatus) => void;
  /**
   * Handed to the chrome once this scene exists, so the chrome's buttons have
   * something to call.
   *
   * The chrome CANNOT get here by asking Phaser: `scene.start()` only QUEUES a
   * start, so a `game.scene.getScene("snake")` on the next line returns null and
   * the reference stays null forever. Measured - the toggle and the restart
   * button both silently did nothing, because `ref?.setSpeed()` on a null ref is
   * a no-op that throws no error and logs nothing, while status kept flowing the
   * other way and made the bridge look alive.
   */
  private onReady?: (scene: SnakeScene) => void;

  constructor() {
    super("snake");
  }

  init(data: {
    ctx: GameContext;
    onStatus?: (s: SnakeStatus) => void;
    onReady?: (scene: SnakeScene) => void;
  }) {
    this.ctx = data.ctx;
    this.onStatus = data.onStatus;
    this.onReady = data.onReady;
  }

  /** Push the current status out. Called from `draw`, so it cannot go stale. */
  private publish() {
    this.onStatus?.({
      score: this.state.score,
      level: this.level(),
      speed: this.selectedSpeed,
      phase: this.phase,
      paused: this.paused,
    });
  }

  /**
   * The chrome's pause button.
   *
   * `acc` is deliberately left alone. `update` returns before touching it while
   * paused, so no delta is banked in the meantime and the snake resumes with
   * whatever fraction of a step it had — it does not lurch forward by however
   * long the tablet was face-down, which is what a running accumulator would
   * have made it do.
   */
  setPaused(next: boolean) {
    // Only a moving snake can be stopped. On the ready screen or the game-over
    // screen there is nothing to hold, and a lid over either hides the words
    // telling the player how to leave it.
    if (this.phase !== "playing") return;
    if (this.paused === next) return;
    this.paused = next;
    this.draw();
  }

  /**
   * The chrome's difficulty toggle. Unlike the old in-canvas picker this does
   * NOT start the game: the toggle is reachable mid-run, and a speed change
   * must never also be a "go". Changing speed mid-run is deliberate and takes
   * effect on the next tick.
   */
  setSpeed(key: SpeedKey) {
    this.selectedSpeed = key;
    this.baseStepMs = SPEEDS[key];
    this.draw();
  }

  /** The chrome's restart button. */
  restartFromChrome() {
    this.restart();
  }

  /**
   * An on-screen D-pad press. Same path as an arrow key: unlock audio, restart
   * from the game-over screen, otherwise start play on the first press and turn.
   * Kept here (not in the chrome) so the canvas stays the single owner of input.
   */
  steer(dir: Dir) {
    // Behind the cover, and that is the whole point of checking here rather
    // than in the chrome: the D-pad is in the FOOTER, outside the cover the
    // chrome draws, so it stays tappable. Without this a paused snake can be
    // steered into a wall the player cannot see.
    if (this.paused) return;
    this.ctx.audio.unlock();
    this.ctx.speech.unlock();
    if (this.phase === "over") {
      this.restart();
      return;
    }
    this.startPlaying();
    this.state = turn(this.state, dir);
    this.draw();
  }

  create() {
    this.state = newGame(COLS, ROWS);
    this.phase = "ready";
    this.computeCell();
    this.gfx = this.add.graphics();
    // The score and level used to be drawn here, at 20px in the canvas corner.
    // They live in the chrome's stat row now - one place per number, and a
    // number a five-year-old can actually read.
    this.overText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "", {
        fontFamily: "Fredoka, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.ctx.lifecycle.gameplayStart();
    this.ctx.analytics.levelStart("classic");

    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const dir = map[e.key];
      if (this.paused) return;
      this.ctx.audio.unlock();
      this.ctx.speech.unlock();
      if (this.phase === "over") {
        this.restart();
        return;
      }
      if (dir) {
        this.startPlaying(); // first arrow starts at the selected speed
        this.state = turn(this.state, dir);
      } else {
        this.startPlaying();
      }
    });

    // Swipe via pointer; a plain tap starts the game (or restarts after game over).
    let sx = 0, sy = 0;
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      // The canvas IS covered while paused, so these two should never fire.
      // They are guarded anyway because Phaser's input runs off the canvas
      // element rather than off the DOM node the cover sits over, and a
      // pointer the cover lets through would restart a finished run.
      if (this.paused) return;
      sx = p.x;
      sy = p.y;
      this.ctx.audio.unlock();
      this.ctx.speech.unlock();
      if (this.phase === "over") this.restart();
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.paused) return;
      const dx = p.x - sx;
      const dy = p.y - sy;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
        this.startPlaying(); // tap = start at the selected (default normal) speed
        return;
      }
      this.startPlaying();
      if (this.phase === "playing") {
        this.state =
          Math.abs(dx) > Math.abs(dy)
            ? turn(this.state, dx > 0 ? "right" : "left")
            : turn(this.state, dy > 0 ? "down" : "up");
      }
    });

    this.scale.on("resize", () => this.computeCell());
    this.draw();
    // LAST in create, so the chrome only ever gets a scene that is fully built.
    this.onReady?.(this);
  }

  private computeCell() {
    this.cell = Math.floor(Math.min(this.scale.width, this.scale.height) / COLS);
  }

  // Board origin inside the canvas, in canvas pixels (shared by draw + headPoint).
  private boardOrigin(): { ox: number; oy: number } {
    return {
      ox: Math.floor((this.scale.width - COLS * this.cell) / 2),
      oy: Math.floor((this.scale.height - ROWS * this.cell) / 2),
    };
  }

  /**
   * The snake's head in VIEWPORT coordinates — where the flying coins should
   * start from. Canvas pixels are not viewport pixels: Phaser's FIT scale mode
   * letterboxes the canvas, so the canvas's CSS size differs from
   * `scale.width/height` and both axes need their own factor.
   */
  private headPoint(): { x: number; y: number } | undefined {
    const canvas = this.game.canvas;
    if (!canvas) return undefined;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return undefined;
    const { ox, oy } = this.boardOrigin();
    const head = this.state.body[0];
    const sx = rect.width / this.scale.width;
    const sy = rect.height / this.scale.height;
    return {
      x: rect.left + (ox + head.x * this.cell + this.cell / 2) * sx,
      y: rect.top + (oy + head.y * this.cell + this.cell / 2) * sy,
    };
  }

  // Current level (1-based) and the effective tick after progressive speed-up.
  private level(): number {
    return 1 + Math.floor(this.state.score / FOOD_PER_LEVEL);
  }
  private effectiveStep(): number {
    return Math.max(STEP_FLOOR, this.baseStepMs - (this.level() - 1) * STEP_DECAY_MS);
  }

  // Single entry for every ready → playing transition.
  private startPlaying() {
    if (this.phase !== "ready") return;
    this.phase = "playing";
    this.draw();
  }

  private restart() {
    this.state = newGame(COLS, ROWS);
    this.phase = "ready";
    // A new run is never a paused one. Restarting from behind the cover
    // otherwise leaves the chrome holding a lid over a ready screen whose
    // "tap to start" nobody can read or reach.
    this.paused = false;
    this.acc = 0;
    // NB: baseStepMs / selectedSpeed intentionally kept — speed persists across restarts.
    this.ctx.analytics.levelStart("classic");
    this.draw();
  }

  update(_time: number, delta: number) {
    if (this.phase !== "playing" || this.paused) return;
    this.acc += delta;
    const stepMs = this.effectiveStep();
    while (this.acc >= stepMs) {
      this.acc -= stepMs;
      const prevScore = this.state.score;
      this.state = step(this.state);
      if (this.state.score > prevScore) {
        this.ctx.audio.play("success");
        // Endless game: a mid-run ping every 5 food. Coins, no star, no confetti.
        if (this.state.score % 5 === 0) {
          winMoment(this.ctx, {
            reason: "milestone",
            level: `score-${this.state.score}`,
            at: this.headPoint(),
            confetti: false,
          });
        }
      }
      if (!this.state.alive) {
        this.phase = "over";
        this.ctx.audio.play("fail");
        this.ctx.analytics.levelFail("classic", "collision");
        // A run that beat the stored record ends on a high note. The port owns
        // the record outright now — it compares, persists and answers, so the
        // scene keeps no copy to drift out of sync (snake never displays it).
        // Reported once, at death: snake's score only ever climbs, so asking
        // per food would put the same question dozens of times a run.
        const record = this.ctx.score?.report({ value: this.state.score, unit: "points" });
        if (record?.isPersonalBest) {
          winMoment(this.ctx, {
            reason: "personal_best",
            level: `score-${this.state.score}`,
            at: this.headPoint(),
          });
        }
      }
      this.draw();
    }
  }

  private draw() {
    const g = this.gfx;
    const c = this.cell;
    const boardW = COLS * c;
    const boardH = ROWS * c;
    const { ox, oy } = this.boardOrigin();
    g.clear();
    // board: lighter fill + border so the play area reads clearly against the page
    g.fillStyle(0x1e2240, 1).fillRoundedRect(ox - 6, oy - 6, boardW + 12, boardH + 12, 12);
    g.lineStyle(3, 0x6c5ce7, 1).strokeRoundedRect(ox - 6, oy - 6, boardW + 12, boardH + 12, 12);
    g.lineStyle(1, 0x2a2f58, 0.6);
    for (let i = 1; i < COLS; i++) {
      g.lineBetween(ox + i * c, oy, ox + i * c, oy + boardH);
      g.lineBetween(ox, oy + i * c, ox + boardW, oy + i * c);
    }
    // food
    g.fillStyle(0xff7675, 1).fillCircle(
      ox + this.state.food.x * c + c / 2,
      oy + this.state.food.y * c + c / 2,
      c * 0.38,
    );
    // snake
    this.state.body.forEach((p, i) => {
      const color = i === 0 ? 0x55efc4 : 0x00cec9;
      g.fillStyle(color, 1).fillRoundedRect(ox + p.x * c + 1, oy + p.y * c + 1, c - 2, c - 2, 5);
    });
    const T = textFor(
      {
        he: { ready: "הקישו כדי להתחיל", over: "המשחק נגמר", again: "הקישו לשחק שוב" },
        en: { ready: "Tap to start", over: "Game over", again: "Tap to play again" },
        es: { ready: "Toca para empezar", over: "Fin del juego", again: "Toca para jugar otra vez" },
      },
      this.ctx.locale,
    );
    // Keep the overlay off the snake's spawn row.
    this.overText.setPosition(this.scale.width / 2, this.scale.height * 0.28);
    if (this.phase === "ready") {
      this.overText.setText(T.ready);
    } else if (this.phase === "over") {
      this.overText.setText(
        T.over +
          `\n${this.ctx.t("score")}: ${this.state.score}\n` +
          T.again,
      );
    } else {
      this.overText.setText("");
    }
    // LAST in draw, so every published status reflects a frame that has already
    // been rendered - the chrome can never show a score the canvas has not.
    this.publish();
  }
}
