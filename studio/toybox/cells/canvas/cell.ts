// The bar. Plain Canvas2D, no library, no scene graph, no retained state
// between frames: every arm of the tournament is measured against what this
// costs in bytes and in milliseconds, so it must do exactly the work the
// contract asks for and not one thing more.
//
// One draw scale, 0.2, because data/arena/playroom.json says scale {num:1,
// den:5} and the sheets are drawn at that art scale. It is a constant here
// rather than a computed value so a cell cannot quietly disagree with the
// arena it is drawing into.

import type { Atlas, Manifest } from "../../../adapters/manifest";
import { drawFrame } from "../../../adapters/canvas/draw-frame";
import { NO_INPUT } from "../../sim/types";
import type { InputFrame } from "../../sim/types";
import type { BoxOp, HudModel, PropOp, ShadowOp, SpriteOp } from "../../sim/view";
import type { ArenaDrawOp, Cell, CellStats, FxOp, SpriteSetRef } from "../contract";
import { propOps } from "../shared/props";
import { drawText, textWidth } from "./font";
import { stageHudOps } from "./hud-stage";

const DRAW_SCALE = 1 / 5;
const INK = "#1a1230";
const CREAM = "#fff4dc";
const SHADOW = "rgba(40,20,10,0.28)";
const BAR = [
  { fill: "#ff4d8d", light: "#ff9dc0" },   // side 0, the player
  { fill: "#4a8cff", light: "#9dc0ff" },   // side 1, the CPU
];
const BOX_COLOR: Record<BoxOp["kind"], string> = { bdy: "#2ec08a", itr: "#ff3b30", push: "#4a8cff" };

interface Sheet { img: CanvasImageSource; atlas: Atlas; manifest: Manifest }

async function decode(url: string): Promise<CanvasImageSource> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`canvas cell: ${r.status} fetching ${url}`);
  return (await r.json()) as T;
}

export class CanvasCell implements Cell {
  readonly id = "canvas";
  private sheets = new Map<string, Sheet>();
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private view = { w: 0, h: 0 };
  private drawn = 0;
  /** device px per game px: the backbuffer is the view times this, so a position can land on any device pixel */
  private k = 1;

  async load(sets: readonly SpriteSetRef[]): Promise<void> {
    await Promise.all(sets.map(async (set) => {
      const [atlas, manifest, img] = await Promise.all([
        json<Atlas>(set.atlas),
        json<Manifest>(set.manifest),
        decode(set.png),
      ]);
      this.sheets.set(set.name, { img, atlas, manifest });
    }));
  }

  mount(host: HTMLElement, view: { w: number; h: number }): void {
    const canvas = document.createElement("canvas");
    canvas.width = view.w;
    canvas.height = view.h;
    canvas.style.cssText = "display:block;image-rendering:pixelated;touch-action:none;margin:0 auto";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("canvas cell: no 2d context");
    ctx.imageSmoothingEnabled = false;
    this.canvas = canvas;
    this.ctx = ctx;
    this.view = view;
    // the backbuffer is the view at the integer upscale, not the view upscaled by CSS: a sprite then
    // sits on any device pixel, and a half-px move between two sim ticks is a move the display shows
    const fit = (): void => {
      const k = Math.max(1, Math.floor(Math.min(window.innerWidth / view.w, window.innerHeight / view.h)));
      this.k = k;
      canvas.width = view.w * k;
      canvas.height = view.h * k;
      canvas.style.width = `${view.w * k}px`;
      canvas.style.height = `${view.h * k}px`;
    };
    fit();
    window.addEventListener("resize", fit);
  }

  /** a game-px coordinate on this canvas's grid: whole device pixels, so the art stays crisp */
  private snap(v: number): number {
    return Math.round(v * this.k) / this.k;
  }

  /** the harness reads the keyboard through shared/input; a cell may add its own later */
  readInput(_side: number): InputFrame {
    return NO_INPUT;
  }

  private g(): CanvasRenderingContext2D {
    if (!this.ctx) throw new Error("canvas cell: beginFrame before mount");
    return this.ctx;
  }

  beginFrame(camX: number, shakeX: number, shakeY: number): void {
    const ctx = this.g();
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, this.view.w, this.view.h);
    ctx.imageSmoothingEnabled = false;
    ctx.translate(this.snap(shakeX - camX), Math.round(shakeY));
  }

  drawArena(ops: readonly ArenaDrawOp[]): void {
    const ctx = this.g();
    for (const op of ops) {
      ctx.fillStyle = op.color;
      ctx.fillRect(op.x, op.y, op.w, op.h);
    }
  }

  /** a pixel ellipse: rows of fillRect, so it lands on the same grid as the sprites */
  drawShadow(op: ShadowOp): void {
    const ctx = this.g();
    const rx = Math.max(1, Math.round(op.w / 2));
    const ry = Math.max(1, Math.round(op.h / 2));
    const cx = this.snap(op.x);
    const cy = this.snap(op.y);
    ctx.fillStyle = SHADOW;
    for (let dy = -ry; dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
      if (hw > 0) ctx.fillRect(cx - hw, cy + dy, hw * 2, 1);
    }
  }

  /** the coins: the shared painter's rects, in world space like the arena */
  drawProps(ops: readonly PropOp[]): void {
    this.drawArena(propOps(ops.map((p) => ({ ...p, x: this.snap(p.x), y: this.snap(p.y) }))));
  }

  drawSprite(op: SpriteOp): void {
    const sheet = this.sheets.get(op.set);
    if (!sheet) throw new Error(`canvas cell: no sprite set "${op.set}"`);
    drawFrame(this.g(), sheet.img, sheet.atlas, sheet.manifest, op.frame, this.snap(op.x), this.snap(op.y), DRAW_SCALE, op.flip);
    this.drawn += 1;
  }

  drawFx(ops: readonly FxOp[]): void {
    const ctx = this.g();
    for (const op of ops) {
      ctx.globalAlpha = Math.max(0, Math.min(1, op.alpha));
      if (op.kind === "dot") this.fxDot(op);
      else if (op.kind === "star") this.fxStar(op);
      else this.fxRing(op);
    }
    ctx.globalAlpha = 1;
  }

  private fxDot(op: FxOp): void {
    const ctx = this.g();
    ctx.fillStyle = op.color;
    ctx.beginPath();
    ctx.arc(op.x, op.y, Math.max(0.5, op.r), 0, Math.PI * 2);
    ctx.fill();
  }

  private fxStar(op: FxOp): void {
    const ctx = this.g();
    const r = Math.max(1, Math.round(op.r));
    ctx.fillStyle = op.color;
    const x = Math.round(op.x);
    const y = Math.round(op.y);
    ctx.fillRect(x - r, y, r * 2 + 1, 1);
    ctx.fillRect(x, y - r, 1, r * 2 + 1);
    const d = Math.max(1, Math.round(r / 2));
    ctx.fillRect(x - d, y - d, 1, 1);
    ctx.fillRect(x + d, y - d, 1, 1);
    ctx.fillRect(x - d, y + d, 1, 1);
    ctx.fillRect(x + d, y + d, 1, 1);
  }

  private fxRing(op: FxOp): void {
    const ctx = this.g();
    ctx.strokeStyle = op.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(op.x, op.y, Math.max(0.5, op.r), 0, Math.PI * 2);
    ctx.stroke();
  }

  /** a chunky panelled bar per side, the demo brawler's look, in the bitmap font */
  private hpBar(x: number, y: number, w: number, h: number, frac: number, side: number, rtl: boolean): void {
    const ctx = this.g();
    const c = BAR[side % BAR.length];
    ctx.fillStyle = INK;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = "#f7e2b8";
    ctx.fillRect(x, y, w, h);
    const n = Math.round(w * Math.max(0, Math.min(1, frac)));
    if (n > 0) {
      const sx = rtl ? x + w - n : x;
      ctx.fillStyle = c.fill;
      ctx.fillRect(sx, y, n, h);
      ctx.fillStyle = c.light;
      ctx.fillRect(sx, y, n, 2);
    }
    ctx.fillStyle = "rgba(26,18,48,0.25)";
    for (let i = 1; i < 10; i++) ctx.fillRect(x + Math.round((w * i) / 10), y + 2, 1, h - 2);
  }

  drawHud(model: HudModel): void {
    const ctx = this.g();
    // the HUD never shakes, but the boxes drawn after it do - so restore
    ctx.save();
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    ctx.globalAlpha = 1;
    if (model.stage) { this.drawStage(model); ctx.restore(); return; }
    const w = 180;
    const h = 12;
    model.hp.forEach((hp, side) => {
      const rtl = side > 0;
      const x = rtl ? this.view.w - 12 - w : 12;
      this.hpBar(x, 14, w, h, hp / Math.max(1, model.maxHp[side]), side, rtl);
      const name = (model.names[side] ?? "").toUpperCase();
      const tx = rtl ? x + w - textWidth(name, 1) : x;
      drawText(ctx, name, tx, 30, 1, INK);
    });
    if (model.phase >= 2) this.drawKo(model);
    ctx.restore();
  }

  /** the stage HUD: the shared layout's rects and text runs, in screen space */
  private drawStage(model: HudModel): void {
    const s = model.stage!;
    const ctx = this.g();
    const ops = stageHudOps(s, model.hp[s.hero] ?? 0, model.maxHp[s.hero] ?? 1, model.names[s.hero] ?? "", this.view);
    for (const r of ops.rects) { ctx.fillStyle = r.color; ctx.fillRect(r.x, r.y, r.w, r.h); }
    for (const t of ops.texts) drawText(ctx, t.text, t.x, t.y, t.scale, t.color);
  }

  private drawKo(model: HudModel): void {
    const ctx = this.g();
    const name = model.winner >= 0 ? (model.names[model.winner] ?? "").toUpperCase() : "";
    const line = name ? `KO  ${name} WINS` : "KO  DRAW";
    const scale = 2;
    const x = Math.round((this.view.w - textWidth(line, scale)) / 2);
    const y = Math.round(this.view.h / 2 - 7 * scale);
    ctx.fillStyle = INK;
    ctx.fillRect(x - 6, y - 5, textWidth(line, scale) + 12, 7 * scale + 10);
    ctx.fillStyle = CREAM;
    ctx.fillRect(x - 4, y - 3, textWidth(line, scale) + 8, 7 * scale + 6);
    drawText(ctx, line, x, y, scale, INK);
  }

  drawBoxes(boxes: readonly BoxOp[]): void {
    const ctx = this.g();
    ctx.lineWidth = 1;
    for (const b of boxes) {
      ctx.strokeStyle = BOX_COLOR[b.kind];
      ctx.strokeRect(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5, Math.max(1, Math.round(b.w) - 1), Math.max(1, Math.round(b.h) - 1));
    }
  }

  endFrame(): void {
    // nothing to flush: every draw above already landed on the backbuffer
  }

  stats(): CellStats {
    const c = this.canvas;
    return {
      engine: "canvas",
      version: "-",
      drawn: this.drawn,
      backbuffer: [c ? c.width : 0, c ? c.height : 0],
      dpr: window.devicePixelRatio,
      samples: null,
    };
  }
}
