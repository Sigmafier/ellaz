// Phaser 3 / 4: load the sheet + atlas, then create one animation per clip
// from the manifest. No import of Phaser here - the two methods used are
// typed as the narrowest interface that fits, so this file is copied into
// a game untouched and the studio never depends on an engine.
//
//   preload() { loadStudioAtlas(this, "robot", "assets/robot--snes16") }
//   create()  { createStudioAnims(this, "robot", manifest); this.add.sprite(x, y, "robot").play("robot:idle") }
//
// Frame names follow <character>_<clip>_<nnnn>, so generateFrameNames with
// prefix `<character>_<clip>_` and zeroPad 4 walks each clip exactly.

import type { Manifest } from "../manifest";

export interface PhaserLoaderLike {
  load: { atlas(key: string, textureURL: string, atlasURL: string): unknown };
}
export interface PhaserAnimsLike {
  anims: {
    generateFrameNames(key: string, config: { prefix: string; start: number; end: number; zeroPad: number }): unknown[];
    create(config: { key: string; frames: unknown[]; frameRate: number; repeat: number }): unknown;
    exists?(key: string): boolean;
  };
}

/** Queue the sheet and atlas under `key`. `base` is the path without extension. */
export function loadStudioAtlas(scene: PhaserLoaderLike, key: string, base: string): void {
  scene.load.atlas(key, `${base}.png`, `${base}.atlas.json`);
}

/** The animation key a clip gets: "<key>:<clip>". */
export const animKey = (key: string, clip: string): string => `${key}:${clip}`;

/** One Phaser animation per manifest clip. Returns the keys created. Idempotent when `anims.exists` is available. */
export function createStudioAnims(scene: PhaserAnimsLike, key: string, manifest: Manifest): string[] {
  const made: string[] = [];
  for (const [clip, a] of Object.entries(manifest.animations)) {
    const k = animKey(key, clip);
    if (scene.anims.exists?.(k)) { made.push(k); continue; }
    const frames = scene.anims.generateFrameNames(key, { prefix: `${manifest.character}_${clip}_`, start: 0, end: a.frames.length - 1, zeroPad: 4 });
    scene.anims.create({ key: k, frames, frameRate: a.fps, repeat: a.loop ? -1 : 0 });
    made.push(k);
  }
  return made;
}

/** Phaser sets origin as a fraction of the frame; this is the pivot as that fraction. */
export function originFor(manifest: Manifest): { x: number; y: number } {
  return { x: manifest.pivot.x / manifest.frameSize.w, y: manifest.pivot.y / manifest.frameSize.h };
}
