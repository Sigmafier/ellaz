// The demo brawler's 5x7 bitmap font, ported. Each glyph is 7 rows of hex,
// one byte per row, bit 4 (0x10) the leftmost of five columns. Drawing it as
// rects keeps the HUD in the same pixel grid as the sprites - a real webfont
// would be the only thing on screen not snapped to the arena's pixels, and
// it would also be a network request a cell is not allowed to make.
//
// Rendered text is cached as an offscreen canvas per (string, size, colour):
// the HUD redraws every frame and the hp numbers change rarely, so the cache
// hits on almost every draw.

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
const cache = new Map<string, HTMLCanvasElement>();

/** width in view pixels of `str` at `size` (the trailing inter-glyph gap is not counted) */
export function textWidth(str: string, size = 1): number {
  return Math.max(0, str.length * ADVANCE - 1) * size;
}

function paint(g: CanvasRenderingContext2D, str: string, size: number, color: string): void {
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

function textImage(str: string, size: number, color: string): HTMLCanvasElement {
  const key = `${str}|${size}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = Math.max(1, textWidth(str, size));
  c.height = ROWS * size;
  const g = c.getContext("2d");
  if (!g) throw new Error("font: no 2d context for the text cache");
  paint(g, str, size, color);
  if (cache.size > 400) cache.clear();
  cache.set(key, c);
  return c;
}

/** draw `str` with its top-left at (x, y); returns the width drawn */
export function drawText(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, scale = 1, color = "#1a1230"): number {
  const img = textImage(str, scale, color);
  ctx.drawImage(img, Math.round(x), Math.round(y));
  return img.width;
}
