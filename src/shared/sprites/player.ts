// A clip player with no engine in it: give it a manifest, tell it time has
// passed, ask it which frame to show. Looping clips wrap; one-shots hold
// their last frame and say so.
//
// A COPY of `studio/adapters/canvas/player.ts` - see `./manifest.ts` for why
// this is copied rather than imported. The ONLY change is that import path:
// the studio lays its adapters out one directory below the types, and here they
// sit together.
//
// It is deliberately NOT re-exported from the `@shared` barrel. The barrel is
// imported by things the shell reaches, and `src/shared/rng.ts` is pinned to the
// shell chunk for that reason; `DirectionPad` is kept out of the `@ui` barrel on
// the identical argument. Import it by its own path - `@shared/sprites/player` -
// so a re-export can never drag sprite code into a first visit.

import type { Manifest } from "./manifest";

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
