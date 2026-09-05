// Colour snapping. Pure functions over [r, g, b] in 0..255 - tested in node.

export type Rgb = [number, number, number];
export type Quantizer = (r: number, g: number, b: number) => Rgb;

export function hexToRgb(hex: string): Rgb {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) throw new Error(`hexToRgb: not #rrggbb: ${hex}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

export const rgbToHex = ([r, g, b]: Rgb): string =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/** Perceived luminance, 0..1. */
export const luma = (r: number, g: number, b: number): number => (r * 0.3 + g * 0.59 + b * 0.11) / 255;

/** Snap to the nearest member of a fixed palette (euclidean in RGB). */
export function nearest(palette: Rgb[]): Quantizer {
  if (palette.length === 0) throw new Error("nearest: empty palette");
  return (r, g, b) => {
    let best = palette[0];
    let bd = Infinity;
    for (const p of palette) {
      const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };
}

// The 24 NES colours the prototype settled on (of the 54 the PPU can show).
export const NES_HEX = [
  "#000000", "#fcfcfc", "#f8f8f8", "#bcbcbc", "#7c7c7c", "#a40000", "#f83800", "#f87858",
  "#ac7c00", "#f8b800", "#f8d878", "#00a800", "#58d854", "#b8f818", "#0058f8", "#3cbcfc",
  "#6844fc", "#f878f8", "#d82800", "#503000", "#e45c10", "#fca044", "#006800", "#005800",
];
export const NES: Rgb[] = NES_HEX.map(hexToRgb);

// Game Boy DMG: darkest to lightest.
export const GB: Rgb[] = [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]];

/** Four-shade Game Boy quantizer by luminance. */
export const gbShade: Quantizer = (r, g, b) => GB[Math.min(3, Math.floor(luma(r, g, b) * 4))];

function hslToRgb(h: number, s: number, l: number): Rgb {
  const f = (p: number, q: number, t: number) => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map((v) => Math.round(v * 255)) as Rgb;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

/**
 * The NES look that survived eyeballing: snap hue to 8 steps, lightness to 4
 * bands, saturation to on/off. It reads as "NES" without the muddy nearest-
 * colour mush a straight palette snap produced on skin tones.
 */
export const nesSnap: Quantizer = (r, g, b) => {
  const [h, s, l] = rgbToHsl(r, g, b);
  const L = l < 0.18 ? 0.12 : l < 0.42 ? 0.38 : l < 0.7 ? 0.58 : 0.85;
  const S = s < 0.25 ? 0 : 0.85;
  const H = Math.round(h * 8) / 8;
  return hslToRgb(H, S, L);
};

/** Quantize every opaque pixel of an ImageData in place. */
export function quantizeImage(d: Uint8ClampedArray, q: Quantizer): void {
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const [r, g, b] = q(d[i], d[i + 1], d[i + 2]);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
}
