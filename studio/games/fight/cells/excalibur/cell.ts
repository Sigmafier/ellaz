// The Excalibur 0.32 arm. Same look as the canvas bar, same draw scale, same
// HUD layout, same box colours - what differs is WHERE the painting happens.
//
// Excalibur owns a loop the Cell contract has no method for, so the harness's
// draw calls RECORD a plan and nothing else: `beginFrame` opens a fresh
// record, each draw method appends to it, `endFrame` publishes it, and the one
// place that paints is a Scene's `onPostDraw`, which the engine calls inside
// its own draw lifecycle (drawing outside that lifecycle is unsupported and
// the engine warns about it). So the cell is immediate-mode - no Actors, no
// entities, nothing in the engine's update touches the picture - while still
// letting the engine own its clock.
//
// Draw ORDER is a z band per harness call, not the order the calls arrive in:
// `ExcaliburGraphicsContext.flush` sorts every queued draw by z and then
// GROUPS BY RENDERER, so with one z the arena rectangles and the HUD
// rectangles batch together and the sprites land on the wrong side of both.
// Within a band the sort is stable, so the plan's own order survives.
//
// One draw scale, 0.2, for the reason the canvas arm states: the arena file
// says scale {num:1, den:5} and the sheets are drawn at that art scale. A
// constant, so a cell cannot quietly disagree with the arena it draws into.

import { Color, DisplayMode, EX_VERSION, Engine, ImageFiltering, ImageSource, Scene, Sprite, vec } from "excalibur";
import type { ExcaliburGraphicsContext } from "excalibur";
import type { Atlas, Manifest, Point } from "../../../../adapters/manifest";
import { NO_INPUT } from "../../core/types";
import type { InputFrame } from "../../core/types";
import type { BoxOp, HudModel, ShadowOp, SpriteOp } from "../../core/view";
import type { ArenaDrawOp, Cell, CellStats, FxOp, SpriteSetRef } from "../contract";

// The demo brawler's 5x7 bitmap font, the same table the canvas arm carries.
// Duplicated rather than imported for the reason the pixi arm logged: a shared
// module moves a number the tournament reads - importing ../canvas/font pulls
// the bar's own glyph bytes OUT of the bar's entry chunk and into a shared one,
// changing the `authored` column of an arm this one is measured against.
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
const ADVANCE = 6;
const ROWS = 7;

/** width in view pixels of `str` at `size` (the trailing inter-glyph gap is not counted) */
function textWidth(str: string, size = 1): number {
  return Math.max(0, str.length * ADVANCE - 1) * size;
}

/** the glyph rows painted onto a 2D context, which is then uploaded once as a texture */
function paintText(g: CanvasRenderingContext2D, str: string, size: number, color: string): void {
  g.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const glyph = GLYPHS[str[i]] ?? GLYPHS[str[i].toUpperCase()] ?? GLYPHS[" "];
    for (let r = 0; r < ROWS; r++) {
      const bits = parseInt(glyph.substr(r * 2, 2), 16);
      for (let b = 0; b < 5; b++) {
        if (bits & (16 >> b)) g.fillRect((i * ADVANCE + b) * size, r * size, size, size);
      }
    }
  }
}

const DRAW_SCALE = 1 / 5;
const INK = "#1a1230";
const CREAM = "#fff4dc";
const PANEL = "#f7e2b8";
const SHADOW = new Color(40, 20, 10, 0.28);
const TICK = new Color(26, 18, 48, 0.25);
const CLEAR = new Color(0, 0, 0, 0);
const BAR = [
  { fill: "#ff4d8d", light: "#ff9dc0" },   // side 0, the player
  { fill: "#4a8cff", light: "#9dc0ff" },   // side 1, the CPU
];
const BOX_COLOR: Record<BoxOp["kind"], string> = { bdy: "#2ec08a", itr: "#ff3b30", push: "#4a8cff" };

// One band per harness call. Sprites and fx step inside their band so the
// plan's own ordering survives a sort that only promises stability per z.
const Z_ARENA = 0, Z_SHADOW = 1, Z_SPRITE = 10, Z_FX = 100, Z_HUD = 2000, Z_TEXT = 2001, Z_BOX = 3000;

const colors = new Map<string, Color>();

/** `#rrggbb` (plus an alpha) as an ex.Color, cached - a frame asks for ~250 of these */
function colorOf(hex: string, alpha = 1): Color {
  const key = alpha === 1 ? hex : `${hex}|${alpha}`;
  let c = colors.get(key);
  if (!c) {
    const base = Color.fromHex(hex);
    c = alpha === 1 ? base : new Color(base.r, base.g, base.b, alpha);
    colors.set(key, c);
  }
  return c;
}

/** a flat rect: no stroke, so the rectangle shader fills the whole quad */
function fill(ctx: ExcaliburGraphicsContext, x: number, y: number, w: number, h: number, color: Color): void {
  ctx.drawRectangle(vec(x, y), w, h, color);
}

/** the plan the harness recorded, complete, ready to paint */
interface Recorded {
  ox: number; oy: number;
  arena: readonly ArenaDrawOp[];
  shadows: ShadowOp[];
  sprites: SpriteOp[];
  fx: readonly FxOp[];
  hud: HudModel | null;
  boxes: readonly BoxOp[];
}

function emptyFrame(ox: number, oy: number): Recorded {
  return { ox, oy, arena: [], shadows: [], sprites: [], fx: [], hud: null, boxes: [] };
}

interface Sheet { sprites: Map<string, Sprite>; pivot: Point }

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`excalibur cell: ${r.status} fetching ${url}`);
  return (await r.json()) as T;
}

/** the one thing in the engine that draws: it paints the last published plan */
class FightScene extends Scene {
  constructor(private readonly paint: (ctx: ExcaliburGraphicsContext) => void) {
    super();
  }
  onPostDraw(ctx: ExcaliburGraphicsContext): void {
    this.paint(ctx);
  }
}

export class ExcaliburCell implements Cell {
  readonly id = "excalibur";
  private engine: Engine | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private sheets = new Map<string, Sheet>();
  private view = { w: 640, h: 360 };
  private drawn = 0;
  private pending: Recorded = emptyFrame(0, 0);
  private latest: Recorded | null = null;
  private texts = new Map<string, HTMLCanvasElement>();

  async load(sets: readonly SpriteSetRef[]): Promise<void> {
    // the engine FIRST, and not for tidiness: TextureLoader._MAX_TEXTURE_SIZE
    // is a static that starts at 4096 and is only replaced with the device's
    // real MAX_TEXTURE_SIZE when a GL context is registered. Load a sheet
    // before that and every sheet wider than 4096 is reported too large - on
    // hardware where it is not - as a console.error, which the admission gate
    // counts as a disqualification.
    await this.boot();
    await Promise.all(sets.map(async (set) => {
      const [atlas, manifest] = await Promise.all([json<Atlas>(set.atlas), json<Manifest>(set.manifest)]);
      const image = new ImageSource(set.png, { filtering: ImageFiltering.Pixel });
      await image.load();
      const sprites = new Map<string, Sprite>();
      for (const [name, f] of Object.entries(atlas.frames)) {
        sprites.set(name, new Sprite({
          image,
          sourceView: { x: f.frame.x, y: f.frame.y, width: f.frame.w, height: f.frame.h },
          destSize: { width: f.frame.w * DRAW_SCALE, height: f.frame.h * DRAW_SCALE },
        }));
      }
      // the manifest's pivot, in source pixels, is what the bar's draw-frame
      // uses; the atlas frames carry a 0-1 copy of the same fact and a second
      // source of truth for the feet is how a drift goes silent
      this.sheets.set(set.name, { sprites, pivot: manifest.pivot });
    }));
  }

  /** the engine, started here so nothing floats a promise into mount() */
  private async boot(): Promise<void> {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;image-rendering:pixelated;touch-action:none;margin:0 auto";
    const engine = new Engine({
      width: this.view.w,
      height: this.view.h,
      canvasElement: canvas,
      // `pixelArt: true` turns on the sub-pixel pixel-art SAMPLER (the Inigo
      // Quilez uv filter). Measured both ways on this tree - one variable, the
      // same four ticks - it moves NOTHING: 214 / 262 / 241 / 96 differing
      // pixels vs the bar at ticks 30 / 120 / 300 / 599, byte-identical with
      // the sampler on and off, because `antialiasing: false` already pins
      // filtering to NEAREST and nothing is drawn at a fractional texel.
      pixelArt: true,
      pixelRatio: 1,
      displayMode: DisplayMode.Fixed,
      antialiasing: false,
      physics: false,
      garbageCollection: false,
      suppressPlayButton: true,
      suppressConsoleBootMessage: true,
      backgroundColor: colorOf(CREAM),
    });
    engine.addScene("fight", new FightScene((ctx) => this.paint(ctx)));
    this.canvas = canvas;
    this.engine = engine;
    await engine.start("fight");
  }

  mount(host: HTMLElement, view: { w: number; h: number }): void {
    const engine = this.engine;
    const canvas = this.canvas;
    if (!engine || !canvas) throw new Error("excalibur cell: mount before load()");
    this.view = view;
    if (engine.screen.resolution.width !== view.w || engine.screen.resolution.height !== view.h) {
      engine.screen.resolution = { width: view.w, height: view.h };
    }
    host.appendChild(canvas);
    const fit = (): void => {
      const k = Math.max(1, Math.floor(Math.min(window.innerWidth / view.w, window.innerHeight / view.h)));
      // the screen owns canvas.style.width/height, so the integer upscale the
      // other arms do by hand goes through its viewport rather than beside it
      engine.screen.viewport = { width: view.w * k, height: view.h * k };
      engine.screen.applyResolutionAndViewport();
    };
    fit();
    window.addEventListener("resize", fit);
  }

  /** the harness reads the keyboard through shared/input; a cell may add its own later */
  readInput(_side: number): InputFrame {
    return NO_INPUT;
  }

  beginFrame(camX: number, shakeX: number, shakeY: number): void {
    this.pending = emptyFrame(Math.round(shakeX - camX), Math.round(shakeY));
  }

  drawArena(ops: readonly ArenaDrawOp[]): void {
    this.pending.arena = ops;
  }

  drawShadow(op: ShadowOp): void {
    this.pending.shadows.push(op);
  }

  drawSprite(op: SpriteOp): void {
    if (!this.sheets.has(op.set)) throw new Error(`excalibur cell: no sprite set "${op.set}"`);
    this.pending.sprites.push(op);
    this.drawn += 1;
  }

  drawFx(ops: readonly FxOp[]): void {
    this.pending.fx = ops;
  }

  drawHud(model: HudModel): void {
    this.pending.hud = model;
  }

  drawBoxes(boxes: readonly BoxOp[]): void {
    this.pending.boxes = boxes;
  }

  /** publish, never paint: the engine's own draw lifecycle is the only painter */
  endFrame(): void {
    this.latest = this.pending;
  }

  /** called from the Scene's onPostDraw, once per ENGINE frame */
  private paint(ctx: ExcaliburGraphicsContext): void {
    const f = this.latest;
    if (!f) return;
    ctx.save();
    ctx.translate(f.ox, f.oy);
    this.paintArena(ctx, f.arena);
    this.paintShadows(ctx, f.shadows);
    this.paintSprites(ctx, f.sprites);
    this.paintFx(ctx, f.fx);
    ctx.restore();
    if (f.hud) {
      ctx.save();
      this.paintHud(ctx, f.hud);   // the HUD never shakes
      ctx.restore();
    }
    ctx.save();
    ctx.translate(f.ox, f.oy);     // the boxes do
    this.paintBoxes(ctx, f.boxes);
    ctx.restore();
  }

  private paintArena(ctx: ExcaliburGraphicsContext, ops: readonly ArenaDrawOp[]): void {
    ctx.z = Z_ARENA;
    for (const op of ops) fill(ctx, op.x, op.y, op.w, op.h, colorOf(op.color));
  }

  /** a pixel ellipse: rows of rect, so it lands on the same grid as the sprites */
  private paintShadows(ctx: ExcaliburGraphicsContext, ops: readonly ShadowOp[]): void {
    ctx.z = Z_SHADOW;
    for (const op of ops) {
      const rx = Math.max(1, Math.round(op.w / 2));
      const ry = Math.max(1, Math.round(op.h / 2));
      const cx = Math.round(op.x);
      const cy = Math.round(op.y);
      for (let dy = -ry; dy <= ry; dy++) {
        const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
        if (hw > 0) fill(ctx, cx - hw, cy + dy, hw * 2, 1, SHADOW);
      }
    }
  }

  private paintSprites(ctx: ExcaliburGraphicsContext, ops: readonly SpriteOp[]): void {
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const sheet = this.sheets.get(op.set);
      const sprite = sheet?.sprites.get(op.frame);
      if (!sheet || !sprite) throw new Error(`excalibur cell: atlas has no frame "${op.frame}"`);
      const px = sheet.pivot.x * DRAW_SCALE;
      // flip mirrors about the PIVOT column, so the box moves by the pivot's
      // distance from the other edge - not by half the frame
      const dx = op.x - (op.flip ? sprite.width - px : px);
      sprite.flipHorizontal = op.flip;
      ctx.z = Z_SPRITE + i;
      sprite.draw(ctx, dx, op.y - sheet.pivot.y * DRAW_SCALE);
    }
  }

  private paintFx(ctx: ExcaliburGraphicsContext, ops: readonly FxOp[]): void {
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const a = Math.max(0, Math.min(1, op.alpha));
      ctx.z = Z_FX + i;
      if (op.kind === "dot") ctx.drawCircle(vec(op.x, op.y), Math.max(0.5, op.r), colorOf(op.color, a));
      else if (op.kind === "star") this.fxStar(ctx, op, a);
      else ctx.drawCircle(vec(op.x, op.y), Math.max(0.5, op.r), CLEAR, colorOf(op.color, a), 1);
    }
  }

  private fxStar(ctx: ExcaliburGraphicsContext, op: FxOp, alpha: number): void {
    const c = colorOf(op.color, alpha);
    const r = Math.max(1, Math.round(op.r));
    const x = Math.round(op.x);
    const y = Math.round(op.y);
    const d = Math.max(1, Math.round(r / 2));
    fill(ctx, x - r, y, r * 2 + 1, 1, c);
    fill(ctx, x, y - r, 1, r * 2 + 1, c);
    for (const [ox, oy] of [[-d, -d], [d, -d], [-d, d], [d, d]]) fill(ctx, x + ox, y + oy, 1, 1, c);
  }

  /** a chunky panelled bar per side, the demo brawler's look, in the bitmap font */
  private hpBar(ctx: ExcaliburGraphicsContext, x: number, y: number, frac: number, side: number, rtl: boolean): void {
    const w = 180, h = 12;
    const c = BAR[side % BAR.length];
    fill(ctx, x - 2, y - 2, w + 4, h + 4, colorOf(INK));
    fill(ctx, x, y, w, h, colorOf(PANEL));
    const n = Math.round(w * Math.max(0, Math.min(1, frac)));
    if (n > 0) {
      const sx = rtl ? x + w - n : x;
      fill(ctx, sx, y, n, h, colorOf(c.fill));
      fill(ctx, sx, y, n, 2, colorOf(c.light));
    }
    for (let i = 1; i < 10; i++) fill(ctx, x + Math.round((w * i) / 10), y + 2, 1, h - 2, TICK);
  }

  private paintHud(ctx: ExcaliburGraphicsContext, model: HudModel): void {
    ctx.z = Z_HUD;
    model.hp.forEach((hp, side) => {
      const rtl = side > 0;
      const x = rtl ? this.view.w - 12 - 180 : 12;
      this.hpBar(ctx, x, 14, hp / Math.max(1, model.maxHp[side]), side, rtl);
      const name = (model.names[side] ?? "").toUpperCase();
      this.textAt(ctx, name, rtl ? x + 180 - textWidth(name, 1) : x, 30, 1, INK);
    });
    if (model.phase >= 2) this.paintKo(ctx, model);
  }

  private paintKo(ctx: ExcaliburGraphicsContext, model: HudModel): void {
    const name = model.winner >= 0 ? (model.names[model.winner] ?? "").toUpperCase() : "";
    const line = name ? `KO  ${name} WINS` : "KO  DRAW";
    const scale = 2;
    const x = Math.round((this.view.w - textWidth(line, scale)) / 2);
    const y = Math.round(this.view.h / 2 - 7 * scale);
    ctx.z = Z_HUD;
    fill(ctx, x - 6, y - 5, textWidth(line, scale) + 12, ROWS * scale + 10, colorOf(INK));
    fill(ctx, x - 4, y - 3, textWidth(line, scale) + 8, ROWS * scale + 6, colorOf(CREAM));
    this.textAt(ctx, line, x, y, scale, INK);
  }

  private paintBoxes(ctx: ExcaliburGraphicsContext, boxes: readonly BoxOp[]): void {
    ctx.z = Z_BOX;
    for (const b of boxes) {
      // the bar strokes a 1px path at +0.5; four 1px fills cover exactly the
      // same pixels and cannot pick up the rectangle shader's stroke rounding
      const x = Math.round(b.x), y = Math.round(b.y);
      const w = Math.max(1, Math.round(b.w) - 1), h = Math.max(1, Math.round(b.h) - 1);
      const c = colorOf(BOX_COLOR[b.kind]);
      fill(ctx, x, y, w + 1, 1, c);
      fill(ctx, x, y + h, w + 1, 1, c);
      fill(ctx, x, y, 1, h + 1, c);
      fill(ctx, x + w, y, 1, h + 1, c);
    }
  }

  /**
   * The HUD's text is the demo brawler's 5x7 bitmap font baked once per
   * (string, size, colour) into a canvas the engine uploads as a texture.
   * NOT ex.Text/ex.Font: a real typeface is the only thing on screen not
   * snapped to the arena's pixel grid, and the tournament compares arms on
   * the same HUD.
   */
  private textAt(ctx: ExcaliburGraphicsContext, str: string, x: number, y: number, size: number, color: string): void {
    ctx.z = Z_TEXT;
    ctx.drawImage(this.textImage(str, size, color), Math.round(x), Math.round(y));
  }

  private textImage(str: string, size: number, color: string): HTMLCanvasElement {
    const key = `${str}|${size}|${color}`;
    const hit = this.texts.get(key);
    if (hit) return hit;
    const c = document.createElement("canvas");
    c.width = Math.max(1, textWidth(str, size));
    c.height = ROWS * size;
    const g = c.getContext("2d");
    if (!g) throw new Error("excalibur cell: no 2d context for the text cache");
    paintText(g, str, size, color);
    if (this.texts.size > 400) this.texts.clear();
    this.texts.set(key, c);
    return c;
  }

  stats(): CellStats {
    const c = this.canvas;
    const gl = c ? c.getContext("webgl2") ?? c.getContext("webgl") : null;
    return {
      engine: "excalibur",
      version: EX_VERSION,
      drawn: this.drawn,
      backbuffer: [c ? c.width : 0, c ? c.height : 0],
      dpr: window.devicePixelRatio,
      samples: gl ? (gl.getParameter(gl.SAMPLES) as number) : null,
    };
  }
}
