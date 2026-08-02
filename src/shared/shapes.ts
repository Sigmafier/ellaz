// Parametric SVG shape paths for shape-matching and pattern games.
//
// PURE STRING MATH — no DOM, no React, no `document`. A game renders the result
// as `<path d={shapePath("star")} />` inside its own `<svg viewBox="0 0 100 100">`,
// so the same eight shapes can be a 44px chip, a 200px target, or a printed card
// without a second asset.
//
// Every path is CENTRED in a `size x size` box and stays inside it, with a small
// margin so a stroke does not clip at the edge. Nothing here is a raster image:
// original geometry only, which also keeps us clear of the legal rule on traced
// third-party art.
import type { Locale } from "@i18n/index";

/**
 * The shape ids, in a stable order a game can iterate for a palette.
 * `ShapeId` is DERIVED from this, so adding an id without adding its name to
 * `SHAPE_NAMES` is a tsc error rather than a blank label at runtime.
 */
export const SHAPE_IDS = [
  "circle",
  "square",
  "triangle",
  "star",
  "heart",
  "hexagon",
  "diamond",
  "moon",
] as const;

export type ShapeId = (typeof SHAPE_IDS)[number];

/** Hebrew is the primary name; these are the words a 5-year-old already knows. */
export const SHAPE_NAMES: Record<ShapeId, Record<Locale, string>> = {
  circle: { he: "עיגול", en: "circle" },
  square: { he: "ריבוע", en: "square" },
  triangle: { he: "משולש", en: "triangle" },
  star: { he: "כוכב", en: "star" },
  heart: { he: "לב", en: "heart" },
  hexagon: { he: "משושה", en: "hexagon" },
  diamond: { he: "מעוין", en: "diamond" },
  moon: { he: "ירח", en: "moon" },
};

const DEFAULT_SIZE = 100;

/** Trim float noise so paths are short and byte-stable across runs. */
function n(v: number): string {
  return String(Math.round(v * 1000) / 1000);
}

type Point = readonly [number, number];

/** A closed polygon through `points`, absolute commands only. */
function polygon(points: readonly Point[]): string {
  const [head, ...rest] = points;
  const lines = rest.map((p) => `L ${n(p[0])} ${n(p[1])}`).join(" ");
  return `M ${n(head[0])} ${n(head[1])} ${lines} Z`;
}

/**
 * `count` points evenly spaced around (cx, cy), starting at the TOP (-90deg) so
 * stars and hexagons read point-up. `radii` cycles, which is what turns a
 * 10-point ring into a 5-pointed star.
 */
function ring(cx: number, cy: number, count: number, radii: readonly number[]): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < count; i++) {
    const a = ((-90 + (360 / count) * i) * Math.PI) / 180;
    const r = radii[i % radii.length];
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

/**
 * The SVG `d` for a shape, centred in a `size x size` box (default 100).
 *
 * Throws on an unknown id — the type prevents it, but a shape id can arrive
 * from a save file, and an honest error beats an invisible empty path.
 */
export function shapePath(id: ShapeId, size: number = DEFAULT_SIZE): string {
  const c = size / 2;
  // Fractions of `size`, so every shape scales with one multiply.
  const f = (v: number) => v * size;

  switch (id) {
    case "circle": {
      const r = f(0.46);
      // FOUR quarter-arcs, not two halves. One arc command cannot close a
      // circle, and quarters put an endpoint at each extreme (left, top, right,
      // bottom) so the path's own endpoints describe its true bounding box —
      // which is what makes the containment test in shapes.test.ts meaningful
      // rather than blind to the bulge between two endpoints.
      const arc = (x: number, y: number) => `A ${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y)} `;
      return (
        `M ${n(c - r)} ${n(c)} ` +
        arc(c, c - r) +
        arc(c + r, c) +
        arc(c, c + r) +
        arc(c - r, c) +
        "Z"
      );
    }
    case "square": {
      const lo = f(0.1);
      const hi = f(0.9);
      return polygon([
        [lo, lo],
        [hi, lo],
        [hi, hi],
        [lo, hi],
      ]);
    }
    case "triangle": {
      const lo = f(0.06);
      const hi = f(0.94);
      return polygon([
        [c, lo],
        [hi, hi],
        [lo, hi],
      ]);
    }
    case "star":
      return polygon(ring(c, c, 10, [f(0.46), f(0.19)]));
    case "heart": {
      // Bottom tip, up the left lobe, into the cleft, down the right lobe.
      return (
        `M ${n(c)} ${n(f(0.92))} ` +
        `C ${n(f(0.06))} ${n(f(0.6))} ${n(f(0.1))} ${n(f(0.16))} ${n(f(0.3))} ${n(f(0.16))} ` +
        `C ${n(f(0.42))} ${n(f(0.16))} ${n(c)} ${n(f(0.27))} ${n(c)} ${n(f(0.35))} ` +
        `C ${n(c)} ${n(f(0.27))} ${n(f(0.58))} ${n(f(0.16))} ${n(f(0.7))} ${n(f(0.16))} ` +
        `C ${n(f(0.9))} ${n(f(0.16))} ${n(f(0.94))} ${n(f(0.6))} ${n(c)} ${n(f(0.92))} Z`
      );
    }
    case "hexagon":
      return polygon(ring(c, c, 6, [f(0.46)]));
    case "diamond": {
      const lo = f(0.05);
      const hi = f(0.95);
      return polygon([
        [c, lo],
        [hi, c],
        [c, hi],
        [lo, c],
      ]);
    }
    case "moon": {
      // A crescent opening to the RIGHT: an outer half-circle bulging left, then
      // a shallower arc back that bites the inside out.
      //
      // Two deliberate choices. (1) The outer circle's centre sits RIGHT of the
      // box centre by half its radius, because a crescent's rightmost point is
      // its horns, not its rim — without the shift the shape hangs off the left
      // of the box. (2) Each arc is split at its extreme, for the same reason
      // the circle uses quarters: an endpoint at the far left is what lets a
      // bounding-box check see the bulge.
      const outer = f(0.46);
      const cx = c + outer / 2;
      // The return arc's radius must EXCEED half the chord it spans, or SVG
      // silently inflates it and the crescent thickness stops being ours.
      const inner = f(0.56);
      const bite = inner - Math.sqrt(inner * inner - outer * outer);
      return (
        `M ${n(cx)} ${n(c - outer)} ` +
        `A ${n(outer)} ${n(outer)} 0 0 0 ${n(cx - outer)} ${n(c)} ` +
        `A ${n(outer)} ${n(outer)} 0 0 0 ${n(cx)} ${n(c + outer)} ` +
        `A ${n(inner)} ${n(inner)} 0 0 1 ${n(cx - bite)} ${n(c)} ` +
        `A ${n(inner)} ${n(inner)} 0 0 1 ${n(cx)} ${n(c - outer)} Z`
      );
    }
    default:
      throw new Error(`[ellaz] unknown shape id: ${String(id)}`);
  }
}
