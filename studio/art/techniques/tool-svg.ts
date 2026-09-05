// SVG authored in a tool: Inkscape, Figma, anything that saves flat shapes.
// A tiny parser turns the subset we accept (rect, circle, ellipse, polygon,
// with fill and an optional data-bg marker) into ops. No DOM: it is a regex
// over attributes, so it runs in node and in the tests.

import { C, E, P, R, bounds, place, type Op } from "../scene-ops";
import type { Technique } from "./types";

const ATTR = /([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g;

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(ATTR)) out[m[1]] = m[2];
  return out;
}

/** Parse the flat-shape subset of SVG into ops. Unknown elements are ignored; a shape with no fill throws. */
export function svgToOps(svg: string): Op[] {
  const out: Op[] = [];
  const num = (v: string | undefined, d = 0) => (v === undefined ? d : Number(v));
  for (const m of svg.matchAll(/<(rect|circle|ellipse|polygon)\b([^>]*)\/?>/g)) {
    const a = attrs(m[2]);
    if (!a.fill) throw new Error(`svgToOps: <${m[1]}> has no fill`);
    const fg = a["data-bg"] !== "true";
    switch (m[1]) {
      case "rect": out.push(R(num(a.x), num(a.y), num(a.width), num(a.height), a.fill, fg, num(a.rx))); break;
      case "circle": out.push(C(num(a.cx), num(a.cy), num(a.r), a.fill, fg)); break;
      case "ellipse": out.push(E(num(a.cx), num(a.cy), num(a.rx), num(a.ry), a.fill, fg)); break;
      case "polygon": {
        const pts = a.points.trim().split(/[\s,]+/).map(Number);
        const pairs: [number, number][] = [];
        for (let i = 0; i + 1 < pts.length; i += 2) pairs.push([pts[i], pts[i + 1]]);
        out.push(P(pairs, a.fill, fg));
      }
    }
  }
  return out;
}

// The robot as a designer would save it: head-down y, feet at y=64.
export const ROBOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -10 64 76">
  <rect x="-2" y="22" width="26" height="24" rx="3" fill="#d8342e"/>
  <rect x="6" y="28" width="10" height="10" rx="1" fill="#2b5cff"/>
  <rect x="-12" y="26" width="12" height="8" rx="2" fill="#9aa3b2"/>
  <rect x="22" y="26" width="12" height="8" rx="2" fill="#9aa3b2"/>
  <rect x="0" y="0" width="24" height="20" rx="4" fill="#d8342e"/>
  <rect x="3" y="6" width="18" height="7" rx="1" fill="#ffd23f"/>
  <rect x="6" y="8" width="3" height="3" fill="#1a1a2e"/>
  <rect x="15" y="8" width="3" height="3" fill="#1a1a2e"/>
  <rect x="9" y="-6" width="6" height="7" fill="#9aa3b2"/>
  <circle cx="12" cy="-8" r="3" fill="#ffd23f"/>
  <rect x="1" y="46" width="8" height="14" rx="1" fill="#8f1c18"/>
  <rect x="13" y="46" width="8" height="14" rx="1" fill="#8f1c18"/>
  <rect x="-2" y="58" width="12" height="6" rx="2" fill="#1a1a2e"/>
  <rect x="12" y="58" width="12" height="6" rx="2" fill="#1a1a2e"/>
</svg>`;

export const toolSvg: Technique = {
  id: "tool-svg",
  name: "SVG authored in a tool",
  input: "flat-shape SVG files (rect, circle, ellipse, polygon)",
  costPerAnimation: "one SVG per frame, saved from the tool",
  summary: "Draw in Inkscape or Figma, save flat shapes, and a forty-line parser turns them into ops. The artist never sees code and the result renders in every style. Gradients, strokes and paths are refused on purpose: a shape the parser cannot express would silently vanish, so it throws instead.",
  sample: () => {
    const ops = svgToOps(ROBOT_SVG);
    const [x, y, w, h] = bounds(ops)!;
    return place(ops, -(x + w / 2), -(y + h));
  },
};
