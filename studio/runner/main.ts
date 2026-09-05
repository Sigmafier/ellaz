// The browser-side half of every headless job. Built by vite into ONE
// script (dist-runner/studio.iife.js) that a Playwright page can load with
// `addScriptTag` - no server, no port, no module CORS - and drive through
// `window.studio`.
//
// Everything here is a thin door onto art/: the registry, the scenes, and
// "render this style on this scene and hand me the PNG bytes". Nothing here
// decides anything; the node side does.

import { STYLES, styleById } from "../art/styles/registry";
import { SCENES } from "../art/scenes";
import { E, R, place, validate, type Scene } from "../art/scene-ops";
import { CHARACTERS, characterById } from "../art/characters";
import { SAMPLED, TECHNIQUES } from "../art/techniques";
import { PALETTES, toGpl, toHex } from "../art/palettes";
import { buildManifest, frameGeometry, layoutAtlas, type Manifest } from "../export/pack";
import { mk } from "../art/canvas";

export interface RenderResult {
  styleId: string;
  sceneId: string;
  w: number;
  h: number;
  /** data:image/png;base64,... */
  png: string;
  /** count of non-transparent pixels sampled on a 16x16 grid, a cheap "did it draw" */
  inkSamples: number;
}

function sampleInk(c: HTMLCanvasElement): number {
  const x = c.getContext("2d")!;
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let j = 0; j < 16; j++) {
    for (let i = 0; i < 16; i++) {
      const px = Math.floor(((i + 0.5) / 16) * c.width);
      const py = Math.floor(((j + 0.5) / 16) * c.height);
      const k = (py * c.width + px) * 4;
      // "ink" = not the pure white the canvas starts as, and opaque
      if (d[k + 3] > 0 && !(d[k] === 255 && d[k + 1] === 255 && d[k + 2] === 255)) n++;
    }
  }
  return n;
}

function renderOne(styleId: string, scene: Scene): RenderResult {
  const style = styleById(styleId);
  if (!style) throw new Error(`no style "${styleId}"`);
  const problems = validate(scene);
  if (problems.length) throw new Error(`scene ${scene.id} invalid: ${problems.join("; ")}`);
  const c = style.render(scene);
  return { styleId, sceneId: scene.id, w: c.width, h: c.height, png: c.toDataURL("image/png"), inkSamples: sampleInk(c) };
}

export interface StripResult {
  clip: string;
  frames: number;
  w: number;
  h: number;
  png: string;
}

/** One clip as a horizontal strip: every frame at `scale`, on a plain ground, feet on a line. */
function clipStrip(charId: string, styleId: string, scale: number): StripResult[] {
  const ch = characterById(charId);
  if (!ch) throw new Error(`no character "${charId}"`);
  const cell = 90 * scale, ground = 74 * scale;
  return ch.clips().map((clip) => {
    const w = cell * clip.frames.length, h = 90 * scale;
    const ops = [R(0, 0, w, h, "#e8eef7", false), R(0, ground, w, h - ground, "#c9d3e3", false)];
    clip.frames.forEach((f, i) => {
      const cx = cell * i + cell / 2;
      ops.push(E(cx, ground + 2 * scale, 16 * scale, 3 * scale, "rgba(0,0,0,.2)", false));
      ops.push(...place(f.ops, cx, ground, scale));
    });
    const r = renderOne(styleId, { id: `${charId}-${clip.id}`, w, h, ops });
    return { clip: clip.id, frames: clip.frames.length, w, h, png: r.png };
  });
}

/** The eight sampled techniques' robots in a row, one style. */
function techniqueStrip(styleId: string, scale: number): { ids: string[]; w: number; h: number; png: string } {
  const cell = 100 * scale, ground = 82 * scale, h = 100 * scale;
  const w = cell * SAMPLED.length;
  const ops = [R(0, 0, w, h, "#e8eef7", false), R(0, ground, w, h - ground, "#c9d3e3", false)];
  SAMPLED.forEach((t, i) => {
    const cx = cell * i + cell / 2;
    ops.push(E(cx, ground + 2 * scale, 18 * scale, 3 * scale, "rgba(0,0,0,.2)", false));
    ops.push(...place(t.sample(), cx, ground, scale));
  });
  const r = renderOne(styleId, { id: `techniques`, w, h, ops });
  return { ids: SAMPLED.map((t) => t.id), w, h, png: r.png };
}

export interface ExportResult {
  character: string;
  style: string;
  sheetPng: string;
  atlas: ReturnType<typeof layoutAtlas>["atlas"];
  manifest: Manifest;
  frames: number;
}

/**
 * Render every frame of a character in one style at `scale` onto a grid
 * sheet, transparent background, and return the sheet plus the atlas and
 * manifest the packer decided. The PNG is composed here because only the
 * browser has a canvas; the geometry is decided in export/pack.ts, tested
 * in node.
 */
function exportCharacter(charId: string, styleId: string, scale: number, built: Manifest["built"]): ExportResult {
  const ch = characterById(charId);
  if (!ch) throw new Error(`no character "${charId}"`);
  const style = styleById(styleId);
  if (!style) throw new Error(`no style "${styleId}"`);
  const clips = ch.clips();
  const geo = frameGeometry(clips, scale);
  const image = `${charId}--${styleId}.png`;
  const { atlas, cells } = layoutAtlas(clips, geo, image);
  const [sheet, sx] = mk(atlas.meta.size.w, atlas.meta.size.h);
  const byName = new Map(clips.flatMap((c) => c.frames.map((f) => [f.name, f] as const)));
  for (const cell of cells) {
    const f = byName.get(cell.name)!;
    const scene: Scene = { id: cell.name, w: geo.w, h: geo.h, ops: place(f.ops, geo.pivot.x, geo.pivot.y, scale) };
    const c = style.render(scene, { transparent: true, seed: `${styleId}:${cell.name}` });
    sx.drawImage(c, cell.col * geo.w, cell.row * geo.h);
  }
  const manifest = buildManifest(charId, styleId, scale, clips, geo, ch.rig?.hitbox ?? null, `${charId}--${styleId}.atlas.json`, built);
  return { character: charId, style: styleId, sheetPng: sheet.toDataURL("image/png"), atlas, manifest, frames: cells.length };
}

/** One sampled technique's robot on the plain ground, one style. */
function techniqueTile(id: string, styleId: string, scale: number): { id: string; w: number; h: number; png: string } {
  const t = SAMPLED.find((x) => x.id === id);
  if (!t) throw new Error(`no sampled technique "${id}"`);
  const w = 100 * scale, h = 100 * scale, ground = 82 * scale;
  const ops = [R(0, 0, w, h, "#e8eef7", false), R(0, ground, w, h - ground, "#c9d3e3", false), E(w / 2, ground + 2 * scale, 18 * scale, 3 * scale, "rgba(0,0,0,.2)", false), ...place(t.sample(), w / 2, ground, scale)];
  const r = renderOne(styleId, { id: `technique-${id}`, w, h, ops });
  return { id, w, h, png: r.png };
}

const api = {
  renderTechniqueTile: techniqueTile,
  exportCharacter,
  paletteExports: () => PALETTES.map((p) => ({ id: p.id, gpl: toGpl(p), hex: toHex(p), json: JSON.stringify(p, null, 2) + "\n" })),
  techniques: TECHNIQUES.map(({ id, name, input, costPerAnimation, summary, sample, blockedOn }) => ({ id, name, input, costPerAnimation, summary, sampled: sample !== null, blockedOn })),
  renderTechniqueStrip: techniqueStrip,
  characterIds: CHARACTERS.map((c) => c.id),
  characters: CHARACTERS.map(({ id, name, side, technique }) => ({ id, name, side, technique })),
  renderClipStrips: clipStrip,
  styles: STYLES.map(({ id, name, tier, family, tagline }) => ({ id, name, tier, family, tagline })),
  sceneIds: Object.keys(SCENES),
  render(styleId: string, sceneId: string): RenderResult {
    const scene = SCENES[sceneId];
    if (!scene) throw new Error(`no scene "${sceneId}"`);
    return renderOne(styleId, scene);
  },
  /** Render an ad-hoc scene the node side hands over (used by controls and, later, sprites). */
  renderScene(styleId: string, scene: Scene): RenderResult {
    return renderOne(styleId, scene);
  },
};

declare global {
  interface Window { studio: typeof api }
}
window.studio = api;
