// The KAPLAY 3001 arm. Same look as the canvas bar, same draw scale, same HUD
// layout, same box colours - and, unlike the pixi and phaser arms, no scene
// graph: KAPLAY's draw calls are IMMEDIATE, so this cell is shaped like the
// bar and not like a retained-mode cell.
//
// What it cannot copy from the bar is WHEN it paints. KAPLAY owns its
// requestAnimationFrame loop and exposes no stop/render pair, so the harness's
// draw calls only RECORD the plan into flat arrays and one `k.onDraw` handler
// repaints the last recorded plan inside KAPLAY's own frame. `endFrame` starts
// that loop the first time it runs, which is the whole reason it is not empty -
// see `startLoop` below.
//
// One draw scale, 0.2, for the reason the canvas arm states: the arena file
// says scale {num:1, den:5} and the sheets are drawn at that art scale. A
// constant, so a cell cannot quietly disagree with the arena it draws into.

import kaplay from "kaplay";
import type { Atlas, Manifest } from "../../../../adapters/manifest";
import { NO_INPUT } from "../../core/types";
import type { InputFrame } from "../../core/types";
import type { BoxOp, HudModel, ShadowOp, SpriteOp } from "../../core/view";
import type { ArenaDrawOp, Cell, CellStats, FxOp, SpriteSetRef } from "../contract";

type K = ReturnType<typeof kaplay>;
type KColor = ReturnType<K["rgb"]>;
type KQuad = ReturnType<K["quad"]>;

const DRAW_SCALE = 1 / 5;
const VIEW = { w: 640, h: 360 };
const INK = "#1a1230";
const CREAM = "#fff4dc";
const PANEL = "#f7e2b8";
const SHADOW = "#28140a";
const SHADOW_ALPHA = 0.28;
const TICK_ALPHA = 0.25;
const FONT = "fight-hud-font";
const BAR = [
  { fill: "#ff4d8d", light: "#ff9dc0" },   // side 0, the player
  { fill: "#4a8cff", light: "#9dc0ff" },   // side 1, the CPU
];
const BOX_COLOR: Record<BoxOp["kind"], string> = { bdy: "#2ec08a", itr: "#ff3b30", push: "#4a8cff" };

// The demo brawler's 5x7 bitmap font, the same table the canvas arm carries.
// Duplicated rather than imported for the reason the pixi arm logged: two arms
// importing `canvas/font.ts` makes the build emit a SHARED chunk, which moves
// the canvas bar's authored byte count - a number the tournament reads.
const GLYPHS: Record<string, string> = {
  " ": "00000000000000", "0": "0E11131519110E", "1": "040C040404040E", "2": "0E11010204081F",
  "3": "1F02040201110E", "4": "02060A121F0202", "5": "1F101E0101110E", "6": "0608101E11110E",
  "7": "1F010204080808", "8": "0E11110E11110E", "9": "0E11110F01020C", A: "0E1111111F1111",
  B: "1E11111E11111E", C: "0E11101010110E", D: "1C12111111121C", E: "1F10101E10101F",
  F: "1F10101E101010", G: "0E11101711110F", H: "1111111F111111", I: "0E04040404040E",
  J: "0702020202120C", K: "11121418141211", L: "1010101010101F", M: "111B1515111111",
  N: "11111915131111", O: "0E11111111110E", P: "1E11111E101010", Q: "0E11111115120D",
  R: "1E11111E141211", S: "0F10100E01011E", T: "1F040404040404", U: "1111111111110E",
  V: "11111111110A04", W: "1111111515150A", X: "11110A040A1111", Y: "1111110A040404",
  Z: "1F01020408101F", "+": "0004041F040400", "-": "0000001F000000", ">": "08040201020408",
  "<": "02040810080402", ":": "000C0C000C0C00", "!": "04040404040004", ".": "00000000000C0C",
  "/": "00010204081000", x: "00110A040A1100",
};
const KEYS = Object.keys(GLYPHS);
const CELL_W = 5;
const ADVANCE = 6;
const ROWS = 7;

/** width in view pixels of `str` at `size` (the trailing inter-glyph gap is not counted) */
function textWidth(str: string, size = 1): number {
  return Math.max(0, str.length * ADVANCE - 1) * size;
}

/** the glyph sheet: every glyph in the table, 5x7, in one row, white on nothing */
function bakeGlyphSheet(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = KEYS.length * CELL_W;
  c.height = ROWS;
  const g = c.getContext("2d");
  if (!g) throw new Error("kaplay cell: no 2d context to bake the glyph sheet");
  g.fillStyle = "#ffffff";
  KEYS.forEach((key, i) => {
    const glyph = GLYPHS[key];
    for (let r = 0; r < ROWS; r++) {
      const bits = parseInt(glyph.substr(r * 2, 2), 16);
      for (let b = 0; b < CELL_W; b++) if (bits & (16 >> b)) g.fillRect(i * CELL_W + b, r, 1, 1);
    }
  });
  return c;
}

interface Sheet { frames: Map<string, number>; anchors: { x: number; y: number }[] }
interface Plan {
  arena: readonly ArenaDrawOp[];
  shadows: ShadowOp[];
  sprites: SpriteOp[];
  fx: FxOp[];
  boxes: BoxOp[];
  hud: HudModel | null;
  ox: number;
  oy: number;
}

interface Loadable<T> { onLoad(cb: (d: T) => void): unknown; onError(cb: (e: Error) => void): unknown }

/** KAPLAY's Asset is thenable but swallows nothing on failure; onLoad/onError is the honest await */
function ready<T>(asset: Loadable<T>): Promise<T> {
  return new Promise<T>((res, rej) => { asset.onLoad(res); asset.onError(rej); });
}

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`kaplay cell: ${r.status} fetching ${url}`);
  return (await r.json()) as T;
}

export class KaplayCell implements Cell {
  readonly id = "kaplay";
  private k: K | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private sheets = new Map<string, Sheet>();
  private colors = new Map<string, KColor>();
  private glyphs = new Map<string, number>();
  private view = VIEW;
  private drawn = 0;
  private startLoop: (() => void) | null = null;
  private plan: Plan = { arena: [], shadows: [], sprites: [], fx: [], boxes: [], hud: null, ox: 0, oy: 0 };

  /**
   * KAPLAY registers its loop from inside `kaplay()`, which the harness awaits
   * INSIDE `load()` - so its rAF callback is queued before the harness's and
   * every frame it paints the plan recorded one frame EARLIER. The registration
   * is held here and re-issued from the first `endFrame` (via a timer, so it
   * lands after the harness has queued its own next frame), which puts the
   * paint back in the frame that recorded the plan. The two arms are measured
   * against the bar in tournament/defects/kaplay.md.
   */
  private boot(): K {
    const raf = window.requestAnimationFrame.bind(window);
    let held: FrameRequestCallback | null = null;
    window.requestAnimationFrame = (cb: FrameRequestCallback): number => { held = cb; return 0; };
    try {
      const k = kaplay({
        width: VIEW.w, height: VIEW.h, canvas: this.canvasEl(), global: false, crisp: true,
        pixelDensity: 1, letterbox: false, background: CREAM, texFilter: "nearest",
        touchToMouse: false, focus: false, debug: false, loadingScreen: false,
      });
      this.startLoop = (): void => { const cb = held; held = null; if (cb) raf(cb); };
      return k;
    } finally {
      window.requestAnimationFrame = raf;
    }
  }

  private canvasEl(): HTMLCanvasElement {
    if (!this.canvas) this.canvas = document.createElement("canvas");
    return this.canvas;
  }

  private need(): K {
    if (!this.k) throw new Error("kaplay cell: used before load()");
    return this.k;
  }

  async load(sets: readonly SpriteSetRef[]): Promise<void> {
    const k = this.boot();
    this.k = k;
    await ready(k.loadSprite(FONT, bakeGlyphSheet(), { frames: this.glyphFrames(k) }));
    await Promise.all(sets.map(async (set) => {
      const [atlas, manifest] = await Promise.all([json<Atlas>(set.atlas), json<Manifest>(set.manifest)]);
      const names = Object.keys(atlas.frames);
      const size = atlas.meta.size;
      const frames: KQuad[] = [];
      const sheet: Sheet = { frames: new Map(), anchors: [] };
      names.forEach((name, i) => {
        const f = atlas.frames[name].frame;
        frames.push(k.quad(f.x / size.w, f.y / size.h, f.w / size.w, f.h / size.h));
        // the manifest's pivot is the ONE source of truth for the feet, as the
        // canvas bar uses it; KAPLAY's anchor is a -1..1 centre-based vec2, so
        // a 0..1 pivot fraction p maps to 2p - 1. Proven with ?boxes=1.
        sheet.anchors.push({ x: (manifest.pivot.x / f.w) * 2 - 1, y: (manifest.pivot.y / f.h) * 2 - 1 });
        sheet.frames.set(name, i);
      });
      await ready(k.loadSprite(set.name, set.png, { frames }));
      this.sheets.set(set.name, sheet);
    }));
  }

  private glyphFrames(k: K): KQuad[] {
    const w = KEYS.length * CELL_W;
    return KEYS.map((key, i) => { this.glyphs.set(key, i); return k.quad((i * CELL_W) / w, 0, CELL_W / w, 1); });
  }

  mount(host: HTMLElement, view: { w: number; h: number }): void {
    const k = this.need();
    if (view.w !== VIEW.w || view.h !== VIEW.h) {
      throw new Error(`kaplay cell: the arena asks for ${view.w}x${view.h} and KAPLAY was built at ${VIEW.w}x${VIEW.h}; it has no public resize`);
    }
    this.view = view;
    const canvas = this.canvasEl();
    // kaplay writes canvas.style.cssText at init, so this must come after it
    canvas.style.cssText += ";display:block;touch-action:none;margin:0 auto";
    host.appendChild(canvas);
    const fit = (): void => {
      const s = Math.max(1, Math.floor(Math.min(window.innerWidth / view.w, window.innerHeight / view.h)));
      canvas.style.width = `${view.w * s}px`;
      canvas.style.height = `${view.h * s}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    k.onDraw(() => this.paint());
  }

  /** the harness reads the keyboard through shared/input; a cell may add its own later */
  readInput(_side: number): InputFrame {
    return NO_INPUT;
  }

  private color(hex: string): KColor {
    const hit = this.colors.get(hex);
    if (hit) return hit;
    // KAPLAY's Color.fromHex takes EXACTLY six hex digits and THROWS on
    // anything else - no `#abc`, no 8-digit alpha, no `rgba()`, all of which a
    // 2D context's fillStyle accepts. Measured: `background: "#000"` throws
    // `Invalid hex color format`, which names no colour and, raised inside
    // onDraw, reaches the harness as one of KAPLAY's own console.errors. This
    // check runs once per distinct colour and says which one.
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new Error(`kaplay cell: colour "${hex}" is not a 6-digit hex, and kaplay's rgb() accepts nothing else`);
    const c = this.need().rgb(hex);
    this.colors.set(hex, c);
    return c;
  }

  beginFrame(camX: number, shakeX: number, shakeY: number): void {
    const p = this.plan;
    p.shadows = [];
    p.sprites = [];
    p.fx = [];
    p.boxes = [];
    p.hud = null;
    p.ox = Math.round(shakeX - camX);
    p.oy = Math.round(shakeY);
  }

  drawArena(ops: readonly ArenaDrawOp[]): void { this.plan.arena = ops; }
  drawShadow(op: ShadowOp): void { this.plan.shadows.push(op); }
  drawFx(ops: readonly FxOp[]): void { for (const op of ops) this.plan.fx.push(op); }
  drawHud(model: HudModel): void { this.plan.hud = model; }
  drawBoxes(boxes: readonly BoxOp[]): void { for (const b of boxes) this.plan.boxes.push(b); }

  drawSprite(op: SpriteOp): void {
    const sheet = this.sheets.get(op.set);
    if (!sheet) throw new Error(`kaplay cell: no sprite set "${op.set}"`);
    if (sheet.frames.get(op.frame) === undefined) throw new Error(`kaplay cell: atlas has no frame "${op.frame}"`);
    this.plan.sprites.push(op);
    this.drawn += 1;
  }

  /** the plan is recorded, never painted here: KAPLAY paints it from its own loop */
  endFrame(): void {
    const start = this.startLoop;
    if (!start) return;
    this.startLoop = null;
    // after the harness has queued ITS next frame, so KAPLAY's paint lands in
    // the frame that recorded the plan rather than one frame behind it
    window.setTimeout(start, 0);
  }

  private paint(): void {
    const p = this.plan;
    const k = this.need();
    for (const op of p.arena) {
      k.drawRect({ pos: k.vec2(op.x + p.ox, op.y + p.oy), width: op.w, height: op.h, color: this.color(op.color) });
    }
    for (const s of p.shadows) this.paintShadow(s, p.ox, p.oy);
    for (const s of p.sprites) this.paintSprite(s, p.ox, p.oy);
    for (const f of p.fx) this.paintFx(f, p.ox, p.oy);
    if (p.hud) this.paintHud(p.hud);
    for (const b of p.boxes) this.paintBox(b, p.ox, p.oy);
  }

  /** a pixel ellipse: rows of rect, so it lands on the same grid as the sprites */
  private paintShadow(op: ShadowOp, ox: number, oy: number): void {
    const k = this.need();
    const rx = Math.max(1, Math.round(op.w / 2));
    const ry = Math.max(1, Math.round(op.h / 2));
    const cx = Math.round(op.x) + ox;
    const cy = Math.round(op.y) + oy;
    const color = this.color(SHADOW);
    for (let dy = -ry; dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
      if (hw > 0) k.drawRect({ pos: k.vec2(cx - hw, cy + dy), width: hw * 2, height: 1, color, opacity: SHADOW_ALPHA });
    }
  }

  private paintSprite(op: SpriteOp, ox: number, oy: number): void {
    const k = this.need();
    const sheet = this.sheets.get(op.set);
    const frame = sheet?.frames.get(op.frame);
    if (!sheet || frame === undefined) return;
    const a = sheet.anchors[frame];
    k.drawSprite({
      sprite: op.set,
      frame,
      pos: k.vec2(op.x + ox, op.y + oy),
      anchor: k.vec2(a.x, a.y),
      // the flip is a NEGATIVE x scale, not `flipX`: KAPLAY's flipX swaps the
      // quad's uvs and so mirrors about the frame's CENTRE, while the contract
      // says mirror about the PIVOT column. They agree only while the pivot is
      // centred, which is true of both sheets today and need not stay true.
      scale: k.vec2(op.flip ? -DRAW_SCALE : DRAW_SCALE, DRAW_SCALE),
    });
  }

  private paintFx(op: FxOp, ox: number, oy: number): void {
    const k = this.need();
    const color = this.color(op.color);
    const opacity = Math.max(0, Math.min(1, op.alpha));
    const pos = k.vec2(op.x + ox, op.y + oy);
    if (op.kind === "dot") k.drawCircle({ pos, radius: Math.max(0.5, op.r), color, opacity });
    else if (op.kind === "ring") k.drawCircle({ pos, radius: Math.max(0.5, op.r), fill: false, opacity, outline: { width: 1, color } });
    else this.paintStar(op, ox, oy, color, opacity);
  }

  private paintStar(op: FxOp, ox: number, oy: number, color: KColor, opacity: number): void {
    const k = this.need();
    const r = Math.max(1, Math.round(op.r));
    const x = Math.round(op.x) + ox;
    const y = Math.round(op.y) + oy;
    const d = Math.max(1, Math.round(r / 2));
    const dot = (px: number, py: number, w: number, h: number): void => {
      k.drawRect({ pos: k.vec2(px, py), width: w, height: h, color, opacity });
    };
    dot(x - r, y, r * 2 + 1, 1);
    dot(x, y - r, 1, r * 2 + 1);
    dot(x - d, y - d, 1, 1);
    dot(x + d, y - d, 1, 1);
    dot(x - d, y + d, 1, 1);
    dot(x + d, y + d, 1, 1);
  }

  /** a chunky panelled bar per side, the demo brawler's look, in the bitmap font */
  private hpBar(x: number, y: number, w: number, h: number, frac: number, side: number, rtl: boolean): void {
    const k = this.need();
    const c = BAR[side % BAR.length];
    const rect = (px: number, py: number, rw: number, rh: number, hex: string, opacity = 1): void => {
      k.drawRect({ pos: k.vec2(px, py), width: rw, height: rh, color: this.color(hex), opacity });
    };
    rect(x - 2, y - 2, w + 4, h + 4, INK);
    rect(x, y, w, h, PANEL);
    const n = Math.round(w * Math.max(0, Math.min(1, frac)));
    if (n > 0) {
      const sx = rtl ? x + w - n : x;
      rect(sx, y, n, h, c.fill);
      rect(sx, y, n, 2, c.light);
    }
    for (let i = 1; i < 10; i++) rect(x + Math.round((w * i) / 10), y + 2, 1, h - 2, INK, TICK_ALPHA);
  }

  private paintHud(model: HudModel): void {
    const w = 180;
    const h = 12;
    model.hp.forEach((hp, side) => {
      const rtl = side > 0;
      const x = rtl ? this.view.w - 12 - w : 12;
      this.hpBar(x, 14, w, h, hp / Math.max(1, model.maxHp[side]), side, rtl);
      const name = (model.names[side] ?? "").toUpperCase();
      const tx = rtl ? x + w - textWidth(name, 1) : x;
      this.paintText(name, tx, 30, 1, INK);
    });
    if (model.phase >= 2) this.paintKo(model);
  }

  private paintKo(model: HudModel): void {
    const name = model.winner >= 0 ? (model.names[model.winner] ?? "").toUpperCase() : "";
    const line = name ? `KO  ${name} WINS` : "KO  DRAW";
    const k = this.need();
    const scale = 2;
    const x = Math.round((this.view.w - textWidth(line, scale)) / 2);
    const y = Math.round(this.view.h / 2 - ROWS * scale);
    const box = (px: number, py: number, w: number, h: number, hex: string): void => {
      k.drawRect({ pos: k.vec2(px, py), width: w, height: h, color: this.color(hex) });
    };
    box(x - 6, y - 5, textWidth(line, scale) + 12, ROWS * scale + 10, INK);
    box(x - 4, y - 3, textWidth(line, scale) + 8, ROWS * scale + 6, CREAM);
    this.paintText(line, x, y, scale, INK);
  }

  /** one baked glyph per character, so the HUD costs a quad each and not 35 rects */
  private paintText(str: string, x: number, y: number, size: number, hex: string): void {
    const k = this.need();
    const color = this.color(hex);
    const left = Math.round(x);
    const top = Math.round(y);
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const frame = this.glyphs.get(ch) ?? this.glyphs.get(ch.toUpperCase()) ?? this.glyphs.get(" ");
      if (frame === undefined) continue;
      k.drawSprite({ sprite: FONT, frame, pos: k.vec2(left + i * ADVANCE * size, top), scale: k.vec2(size), color });
    }
  }

  /** four 1px rects, which is exactly the pixels the bar's 1px strokeRect covers */
  private paintBox(b: BoxOp, ox: number, oy: number): void {
    const k = this.need();
    const color = this.color(BOX_COLOR[b.kind]);
    const x = Math.round(b.x) + ox;
    const y = Math.round(b.y) + oy;
    const w = Math.max(1, Math.round(b.w) - 1) + 1;
    const h = Math.max(1, Math.round(b.h) - 1) + 1;
    const line = (px: number, py: number, lw: number, lh: number): void => {
      k.drawRect({ pos: k.vec2(px, py), width: lw, height: lh, color });
    };
    line(x, y, w, 1);
    line(x, y + h - 1, w, 1);
    line(x, y + 1, 1, Math.max(0, h - 2));
    line(x + w - 1, y + 1, 1, Math.max(0, h - 2));
  }

  stats(): CellStats {
    const c = this.canvas;
    const gl = c ? (c.getContext("webgl2") ?? c.getContext("webgl")) : null;
    return {
      engine: "kaplay",
      version: this.k ? this.k.VERSION : "3001.0.19",
      drawn: this.drawn,
      backbuffer: [c ? c.width : 0, c ? c.height : 0],
      dpr: window.devicePixelRatio,
      samples: gl ? (gl.getParameter(gl.SAMPLES) as number) : null,
    };
  }
}
