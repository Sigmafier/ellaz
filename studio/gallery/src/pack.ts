// Pack a character x style into an in-memory sheet - the exact path
// export-all takes - so the Sprites page plays what an engine would load.

import { mk } from "../../art/canvas";
import { place, type Scene } from "../../art/scene-ops";
import { styleById } from "../../art/styles/registry";
import { characterById } from "../../art/characters";
import { buildManifest, frameGeometry, layoutAtlas } from "../../export/pack";
import type { Atlas, Manifest } from "../../adapters/manifest";

export interface Packed { sheet: HTMLCanvasElement; atlas: Atlas; manifest: Manifest; frames: number }

const cache = new Map<string, Packed>();

export function packInBrowser(charId: string, styleId: string, scale: number): Packed {
  const key = `${charId}|${styleId}|${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const ch = characterById(charId)!, style = styleById(styleId)!;
  const clips = ch.clips();
  const geo = frameGeometry(clips, scale);
  const { atlas, cells } = layoutAtlas(clips, geo, `${charId}--${styleId}.png`);
  const [sheet, sx] = mk(atlas.meta.size.w, atlas.meta.size.h);
  const byName = new Map(clips.flatMap((c) => c.frames.map((f) => [f.name, f] as const)));
  for (const cell of cells) {
    const f = byName.get(cell.name)!;
    const scene: Scene = { id: cell.name, w: geo.w, h: geo.h, ops: place(f.ops, geo.pivot.x, geo.pivot.y, scale) };
    sx.drawImage(style.render(scene, { transparent: true, seed: `${styleId}:${cell.name}` }), cell.col * geo.w, cell.row * geo.h);
  }
  const manifest = buildManifest(charId, styleId, scale, clips, geo, ch.rig?.hitbox ?? null, "", { commit: "gallery", dirty: true, at: new Date().toISOString() }) as unknown as Manifest;
  const packed = { sheet, atlas: atlas as unknown as Atlas, manifest, frames: Object.keys(atlas.frames).length };
  cache.set(key, packed);
  return packed;
}
