// Frame geometry and atlas layout, as pure functions: given a character's
// baked clips and a scale, decide the frame size, the pivot inside it, and
// where each frame sits on the sheet. Tested in node; the browser side only
// draws what this decides.
//
// Frames are UNIFORM and untrimmed - every frame of a character x style is
// the same size, laid out on a grid. That is the simplest thing every engine
// loads correctly, and a game that wants a trimmed pack can derive one.

import { bounds } from "../art/scene-ops";
import type { BakedClip } from "../art/rig/types";

export interface FrameGeometry {
  /** frame size in pixels */
  w: number;
  h: number;
  /** where body-space (0,0) lands inside the frame, in pixels */
  pivot: { x: number; y: number };
  /** body-space bounds over every frame, before scaling */
  body: [number, number, number, number];
}

/** Frame size to hold every frame of every clip at `scale`, with `pad` pixels of margin. */
export function frameGeometry(clips: BakedClip[], scale: number, pad = 4): FrameGeometry {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of clips) {
    for (const f of c.frames) {
      const b = bounds(f.ops);
      if (!b) continue;
      x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[0] + b[2]); y1 = Math.max(y1, b[1] + b[3]);
    }
  }
  if (!Number.isFinite(x0)) throw new Error("frameGeometry: no frames have any ops");
  // symmetric about x=0 so a flipped sprite keeps its pivot column
  const half = Math.max(-x0, x1) * scale + pad;
  const top = -y0 * scale + pad;
  const bottom = Math.max(0, y1) * scale + pad;
  const w = Math.ceil(half * 2), h = Math.ceil(top + bottom);
  return { w, h, pivot: { x: w / 2, y: Math.ceil(top) }, body: [x0, y0, x1 - x0, y1 - y0] };
}

export interface AtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: false;
  trimmed: false;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  pivot: { x: number; y: number };
}

export interface Atlas {
  frames: Record<string, AtlasFrame>;
  meta: { app: string; version: string; image: string; format: "RGBA8888"; size: { w: number; h: number }; scale: string };
}

/** Grid layout: `cols` columns, one cell per frame, in clip order. Returns the atlas and the sheet size. */
export function layoutAtlas(clips: BakedClip[], geo: FrameGeometry, image: string): { atlas: Atlas; cells: { name: string; col: number; row: number }[] } {
  const names = clips.flatMap((c) => c.frames.map((f) => f.name));
  if (new Set(names).size !== names.length) throw new Error("layoutAtlas: duplicate frame names");
  const cols = Math.max(1, Math.ceil(Math.sqrt(names.length)));
  const rows = Math.ceil(names.length / cols);
  const frames: Record<string, AtlasFrame> = {};
  const cells: { name: string; col: number; row: number }[] = [];
  names.forEach((name, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    cells.push({ name, col, row });
    frames[name] = {
      frame: { x: col * geo.w, y: row * geo.h, w: geo.w, h: geo.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: geo.w, h: geo.h },
      sourceSize: { w: geo.w, h: geo.h },
      pivot: { x: geo.pivot.x / geo.w, y: geo.pivot.y / geo.h },
    };
  });
  return {
    atlas: { frames, meta: { app: "ellaz-studio", version: "1", image, format: "RGBA8888", size: { w: cols * geo.w, h: rows * geo.h }, scale: "1" } },
    cells,
  };
}

export interface Manifest {
  character: string;
  style: string;
  scale: number;
  frameSize: { w: number; h: number };
  pivot: { x: number; y: number };
  animations: Record<string, { fps: number; loop: boolean; frames: string[] }>;
  sockets: Record<string, Record<string, { x: number; y: number }>>;
  hitbox: { x: number; y: number; w: number; h: number };
  atlas: string;
  built: { commit: string; dirty: boolean; at: string };
}

export function buildManifest(
  character: string, style: string, scale: number, clips: BakedClip[], geo: FrameGeometry,
  hitboxBody: [number, number, number, number] | null, atlasFile: string, built: Manifest["built"],
): Manifest {
  const px = (x: number, y: number) => ({ x: geo.pivot.x + x * scale, y: geo.pivot.y + y * scale });
  const animations: Manifest["animations"] = {};
  const sockets: Manifest["sockets"] = {};
  for (const c of clips) {
    animations[c.id] = { fps: c.fps, loop: c.loop, frames: c.frames.map((f) => f.name) };
    for (const f of c.frames) {
      for (const [name, p] of Object.entries(f.sockets)) {
        (sockets[name] ??= {})[f.name] = px(p.x, p.y);
      }
    }
  }
  const hb = hitboxBody ?? geo.body;
  const tl = px(hb[0], hb[1]);
  return {
    character, style, scale,
    frameSize: { w: geo.w, h: geo.h },
    pivot: { ...geo.pivot },
    animations, sockets,
    hitbox: { x: tl.x, y: tl.y, w: hb[2] * scale, h: hb[3] * scale },
    atlas: atlasFile,
    built,
  };
}
