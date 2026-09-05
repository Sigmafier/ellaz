// A clip player with no engine in it: give it a manifest, tell it time has
// passed, ask it which frame to show. Looping clips wrap; one-shots hold
// their last frame and say so. Every adapter that plays clips can use this
// (the canvas one does; Phaser has its own clock).

import type { Manifest } from "../manifest";

export class ClipPlayer {
  private clip: string;
  private t = 0;

  constructor(private readonly manifest: Manifest, initial = "idle") {
    if (!manifest.animations[initial]) throw new Error(`ClipPlayer: no clip "${initial}" on ${manifest.character}`);
    this.clip = initial;
  }

  get current(): string {
    return this.clip;
  }

  /** Switch clips; time restarts at the first frame. Switching to the same clip is a restart too. */
  play(clip: string): void {
    if (!this.manifest.animations[clip]) throw new Error(`ClipPlayer: no clip "${clip}" on ${this.manifest.character}`);
    this.clip = clip;
    this.t = 0;
  }

  /** Advance by `dt` seconds. */
  advance(dt: number): void {
    if (!(dt >= 0)) throw new Error(`ClipPlayer: dt must be >= 0, got ${dt}`);
    this.t += dt;
  }

  /** The frame index for the current time, honouring loop / hold. */
  get index(): number {
    const a = this.manifest.animations[this.clip];
    const raw = Math.floor(this.t * a.fps);
    return a.loop ? raw % a.frames.length : Math.min(raw, a.frames.length - 1);
  }

  get frame(): string {
    return this.manifest.animations[this.clip].frames[this.index];
  }

  /** True once a one-shot clip has reached its last frame; never true for a loop. */
  get finished(): boolean {
    const a = this.manifest.animations[this.clip];
    return !a.loop && Math.floor(this.t * a.fps) >= a.frames.length - 1;
  }
}
