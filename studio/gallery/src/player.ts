// The animation player: packs a character x style into an in-memory sheet
// (the exact path export-all takes), then plays it through the canvas
// adapter - ClipPlayer + drawFrame - so this page IS the canvas adapter's
// test scene. Controls: clip, fps override, onion skin, play/pause, step.

import { mk } from "../../art/canvas";
import { place, type Scene } from "../../art/scene-ops";
import { styleById } from "../../art/styles/registry";
import { characterById } from "../../art/characters";
import { buildManifest, frameGeometry, layoutAtlas } from "../../export/pack";
import { ClipPlayer } from "../../adapters/canvas/player";
import { drawFrame } from "../../adapters/canvas/draw-frame";
import type { Atlas, Manifest } from "../../adapters/manifest";
import { chips, el } from "./ui";

export interface Packed { sheet: HTMLCanvasElement; atlas: Atlas; manifest: Manifest }

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
  const packed = { sheet, atlas: atlas as unknown as Atlas, manifest };
  cache.set(key, packed);
  return packed;
}

export function animationPlayer(charId: string, styleId: string, scale = 2): HTMLElement {
  const packed = packInBrowser(charId, styleId, scale);
  const { manifest } = packed;
  const fw = manifest.frameSize.w, fh = manifest.frameSize.h;
  const canvas = el("canvas", { width: fw * 2 + 40, height: fh + 40 });
  const ctx = canvas.getContext("2d")!;
  const player = new ClipPlayer(manifest);
  let playing = true, onion = false, fpsScale = 1, last = performance.now();
  const clipIds = Object.keys(manifest.animations);
  const info = el("div", { class: "kv" });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e8eef7"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#c9d3e3"; ctx.fillRect(0, manifest.pivot.y + 20, canvas.width, canvas.height);
    const x = fw + 20, y = manifest.pivot.y + 20;
    const a = manifest.animations[player.current];
    if (onion && player.index > 0) {
      ctx.globalAlpha = 0.3;
      drawFrame(ctx, packed.sheet, packed.atlas, manifest, a.frames[player.index - 1], x, y);
      ctx.globalAlpha = 1;
    }
    drawFrame(ctx, packed.sheet, packed.atlas, manifest, player.frame, x, y);
    // hitbox and pivot, so what the engine sees is what you see
    ctx.strokeStyle = "rgba(255,77,141,.7)"; ctx.lineWidth = 1;
    ctx.strokeRect(x - manifest.pivot.x + manifest.hitbox.x, y - manifest.pivot.y + manifest.hitbox.y, manifest.hitbox.w, manifest.hitbox.h);
    ctx.fillStyle = "#ff4d8d"; ctx.fillRect(x - 2, y - 2, 4, 4);
    info.replaceChildren(
      el("dt", { text: "frame" }), el("dd", { text: `${player.frame} (${player.index + 1}/${a.frames.length})` }),
      el("dt", { text: "fps" }), el("dd", { text: `${a.fps} x ${fpsScale.toFixed(2)}${a.loop ? " · loop" : player.finished ? " · held" : ""}` }),
      el("dt", { text: "frame size" }), el("dd", { text: `${fw} x ${fh} px at scale ${scale}` }),
    );
  }
  function tick(now: number) {
    if (!canvas.isConnected) return;
    // a rAF timestamp is the FRAME's start and can precede a performance.now() taken between frames - clamp, never throw
    const dt = Math.max(0, now - last) / 1000; last = now;
    if (playing) player.advance(dt * fpsScale);
    draw();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  const clipRow = chips(clipIds.map((id) => ({ id, label: id })), player.current, (id) => { player.play(id); clipRow.replaceWith(clipRowFor(id)); });
  const clipRowFor = (id: string): HTMLElement => chips(clipIds.map((c) => ({ id: c, label: c })), id, (n) => { player.play(n); draw(); });
  const playBtn = el("button", { class: "chip", text: "pause", type: "button" });
  playBtn.addEventListener("click", () => { playing = !playing; playBtn.textContent = playing ? "pause" : "play"; });
  const stepBtn = el("button", { class: "chip", text: "step", type: "button" });
  stepBtn.addEventListener("click", () => { playing = false; playBtn.textContent = "play"; player.advance(1 / manifest.animations[player.current].fps + 0.0001); draw(); });
  const onionBtn = el("button", { class: "chip", text: "onion skin", type: "button" });
  onionBtn.addEventListener("click", () => { onion = !onion; onionBtn.classList.toggle("on", onion); draw(); });
  const fps = el("input", { type: "range", min: "0.25", max: "3", step: "0.25", value: "1" });
  fps.addEventListener("input", () => { fpsScale = Number(fps.value); });

  return el("div", { class: "stage" },
    clipRow,
    el("div", { class: "row" }, playBtn, stepBtn, onionBtn, el("label", { class: "slider" }, "speed ", fps)),
    canvas,
    info,
  );
}
