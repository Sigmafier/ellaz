// The five clips every rigged character carries, as a builder over bone
// names, so robot and knight share one timing vocabulary and a game can rely
// on every character having the same clip ids at the same tempo.
//
// Bone ids are a convention: root, torso, head, armL, armR, legL, legR.
// A character may add bones; it may not rename these.

import type { Clip, Op } from "../rig/types-reexport";

export interface ClipSwaps {
  /** shown during attack only (a spark, a slash) */
  attack?: Record<string, Op[]>;
  /** shown during hurt only (a wince) */
  hurt?: Record<string, Op[]>;
  /** shown during ko only (closed eyes) */
  ko?: Record<string, Op[]>;
}

export function standardClips(sw: ClipSwaps = {}): Clip[] {
  return [
    {
      id: "idle", frames: 4, fps: 6, loop: true,
      keys: [
        { at: 0, pose: {} },
        { at: 2, pose: { torso: { dy: -1 }, head: { dy: -1, rot: 0.03 } } },
      ],
    },
    {
      id: "walk", frames: 6, fps: 10, loop: true,
      keys: [
        { at: 0, pose: { legL: { rot: -0.45 }, legR: { rot: 0.45 }, armL: { rot: 0.35 }, armR: { rot: -0.35 }, torso: { dy: -1 } } },
        { at: 3, pose: { legL: { rot: 0.45 }, legR: { rot: -0.45 }, armL: { rot: -0.35 }, armR: { rot: 0.35 }, torso: { dy: -1 } } },
      ],
    },
    {
      id: "attack", frames: 6, fps: 12, loop: false, swaps: sw.attack,
      keys: [
        { at: 0, pose: { armR: { rot: 0.7, dx: -2 }, torso: { rot: -0.12 } } },
        { at: 2, pose: { armR: { rot: -0.15, dx: 7 }, torso: { rot: 0.18, dx: 3 }, legR: { rot: -0.3 } } },
        { at: 5, pose: {} },
      ],
    },
    {
      id: "hurt", frames: 3, fps: 10, loop: false, swaps: sw.hurt,
      keys: [
        { at: 0, pose: { torso: { rot: -0.3, dx: -4 }, head: { rot: -0.25 }, armL: { rot: -0.6 }, armR: { rot: 0.6 } } },
        { at: 2, pose: { torso: { rot: -0.08, dx: -1 } } },
      ],
    },
    {
      id: "ko", frames: 6, fps: 8, loop: false, swaps: sw.ko,
      keys: [
        { at: 0, pose: { torso: { rot: -0.2 }, head: { rot: -0.2 } } },
        { at: 5, pose: { root: { rot: -1.45, dy: -7 }, head: { rot: -0.4 }, armL: { rot: 0.9 }, armR: { rot: -0.9 } } },
      ],
    },
  ];
}
