// Draw one atlas frame onto a 2D canvas so that the character's PIVOT (the
// feet) lands at (x, y). Flip is horizontal about the pivot column, which
// is why frames are laid out symmetric about it.
//
// Pure geometry plus one drawImage; the geometry is exported on its own so
// it can be tested without a canvas.

import type { Atlas, Manifest, Rect } from "../manifest";

export interface DrawPlan {
  /** source rect on the sheet */
  src: Rect;
  /** destination rect on the target canvas, before flip */
  dst: Rect;
  flip: boolean;
}

/** Where a frame goes so its pivot sits at (x, y), scaled by `zoom`. */
export function planDraw(atlas: Atlas, manifest: Manifest, frameName: string, x: number, y: number, zoom = 1, flip = false): DrawPlan {
  const f = atlas.frames[frameName];
  if (!f) throw new Error(`drawFrame: atlas has no frame "${frameName}"`);
  const src = f.frame;
  const dst = { x: x - manifest.pivot.x * zoom, y: y - manifest.pivot.y * zoom, w: src.w * zoom, h: src.h * zoom };
  return { src, dst, flip };
}

type ImageLike = CanvasImageSource;

export function drawFrame(ctx: CanvasRenderingContext2D, sheet: ImageLike, atlas: Atlas, manifest: Manifest, frameName: string, x: number, y: number, zoom = 1, flip = false): void {
  const { src, dst } = planDraw(atlas, manifest, frameName, x, y, zoom, flip);
  ctx.imageSmoothingEnabled = false;
  if (!flip) {
    ctx.drawImage(sheet, src.x, src.y, src.w, src.h, dst.x, dst.y, dst.w, dst.h);
    return;
  }
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(sheet, src.x, src.y, src.w, src.h, dst.x - x, dst.y, dst.w, dst.h);
  ctx.restore();
}

/** A socket's position in target-canvas coordinates for a frame drawn at (x, y). */
export function socketAt(manifest: Manifest, socket: string, frameName: string, x: number, y: number, zoom = 1, flip = false): { x: number; y: number } {
  const p = manifest.sockets[socket]?.[frameName];
  if (!p) throw new Error(`socketAt: no socket "${socket}" on frame "${frameName}"`);
  const dx = (p.x - manifest.pivot.x) * zoom;
  return { x: x + (flip ? -dx : dx), y: y + (p.y - manifest.pivot.y) * zoom };
}
