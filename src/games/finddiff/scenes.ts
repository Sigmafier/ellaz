import type { Diff } from "./logic";
import type { Locale } from "@i18n/index";

// A scene: a shared base picture plus a set of differences. Each difference
// renders one way on the LEFT picture and another on the RIGHT, and carries a
// tap center/radius (matched to the logic Diff) so taps near it count.
export interface SceneDiff extends Diff {
  left: string; // SVG fragment for the left picture
  right: string; // SVG fragment for the right picture
}
export interface Scene {
  id: string;
  name: Record<Locale, string>;
  viewBox: string;
  base: string; // static SVG fragment shared by both pictures
  diffs: SceneDiff[];
}

// Hand-authored scenes — each has exactly 5 differences, original simple shapes
// only (no external art). Kid-obvious diffs: color swaps, present-vs-absent,
// and shape changes, spread across distinct spots so every panel is scannable.
export const SCENES: Scene[] = [
  {
    id: "garden",
    name: { he: "גן", en: "Garden" },
    viewBox: "0 0 100 100",
    base: `
      <rect x="0" y="0" width="100" height="64" fill="#afe3ff"/>
      <rect x="0" y="64" width="100" height="36" fill="#8ed67a"/>
      <rect x="40" y="40" width="30" height="26" fill="#f7c873"/>
      <polygon points="38,40 55,26 72,40" fill="#e07a5f"/>
      <rect x="50" y="52" width="10" height="14" fill="#6d4c41"/>
    `,
    diffs: [
      {
        id: "sun",
        cx: 15,
        cy: 15,
        r: 12,
        left: `<circle cx="15" cy="15" r="9" fill="#ffd93b"/>`,
        right: `<circle cx="15" cy="15" r="9" fill="#ff914d"/>`,
      },
      {
        id: "cloud",
        cx: 80,
        cy: 16,
        r: 12,
        left: `<ellipse cx="80" cy="16" rx="12" ry="6" fill="#ffffff"/>`,
        right: ``, // cloud missing on the right
      },
      {
        id: "window",
        cx: 46,
        cy: 48,
        r: 8,
        left: `<rect x="43" y="45" width="6" height="6" fill="#ffffff"/>`,
        right: `<rect x="43" y="45" width="6" height="6" fill="#4d7cff"/>`,
      },
      {
        id: "flower",
        cx: 20,
        cy: 80,
        r: 10,
        left: `<circle cx="20" cy="80" r="4" fill="#ff5d8f"/><rect x="19" y="80" width="2" height="10" fill="#2e7d32"/>`,
        right: ``, // flower missing on the right
      },
      {
        id: "bird",
        cx: 84,
        cy: 44,
        r: 10,
        left: ``, // bird only on the right
        right: `<path d="M78 44 q3 -4 6 0 q3 -4 6 0" stroke="#333" stroke-width="1.6" fill="none"/>`,
      },
    ],
  },
  {
    id: "underwater",
    name: { he: "מתחת למים", en: "Underwater" },
    viewBox: "0 0 100 100",
    base: `
      <rect x="0" y="0" width="100" height="82" fill="#4fc3f7"/>
      <rect x="0" y="82" width="100" height="18" fill="#f6e4b0"/>
      <ellipse cx="30" cy="84" rx="12" ry="6" fill="#9e9e9e"/>
      <path d="M70 82 q4 -10 0 -20 q-4 -6 0 -14" stroke="#2e7d32" stroke-width="3" fill="none"/>
    `,
    diffs: [
      {
        id: "bigfish",
        cx: 50,
        cy: 40,
        r: 12,
        left: `<ellipse cx="50" cy="40" rx="12" ry="7" fill="#ff9800"/><polygon points="62,40 70,34 70,46" fill="#ff9800"/>`,
        right: `<ellipse cx="50" cy="40" rx="12" ry="7" fill="#3f51b5"/><polygon points="62,40 70,34 70,46" fill="#3f51b5"/>`,
      },
      {
        id: "bubble",
        cx: 20,
        cy: 20,
        r: 8,
        left: `<circle cx="20" cy="20" r="4" fill="#ffffff" opacity="0.8"/>`,
        right: ``, // bubble missing on the right
      },
      {
        id: "smallfish",
        cx: 82,
        cy: 30,
        r: 10,
        left: `<ellipse cx="82" cy="30" rx="7" ry="4" fill="#ffeb3b"/><polygon points="75,30 70,27 70,33" fill="#ffeb3b"/>`,
        right: `<ellipse cx="82" cy="30" rx="7" ry="4" fill="#ff4081"/><polygon points="75,30 70,27 70,33" fill="#ff4081"/>`,
      },
      {
        id: "coral",
        cx: 20,
        cy: 60,
        r: 10,
        left: `<path d="M20 70 q-6 -10 -2 -16 M20 70 q6 -10 2 -16 M20 70 v-14" stroke="#e91e63" stroke-width="3" fill="none"/>`,
        right: `<path d="M20 70 q-6 -10 -2 -16 M20 70 q6 -10 2 -16 M20 70 v-14" stroke="#9c27b0" stroke-width="3" fill="none"/>`,
      },
      {
        id: "starfish",
        cx: 80,
        cy: 86,
        r: 10,
        left: ``, // starfish only on the right
        right: `<polygon points="80,80 82,86 88,86 83,90 85,96 80,92 75,96 77,90 72,86 78,86" fill="#ff7043"/>`,
      },
    ],
  },
  {
    id: "space",
    name: { he: "חלל", en: "Space" },
    viewBox: "0 0 100 100",
    base: `
      <rect x="0" y="0" width="100" height="88" fill="#1a1a3d"/>
      <rect x="0" y="88" width="100" height="12" fill="#5d4037"/>
      <circle cx="12" cy="12" r="1.2" fill="#ffffff"/>
      <circle cx="40" cy="10" r="1.2" fill="#ffffff"/>
      <circle cx="66" cy="14" r="1.2" fill="#ffffff"/>
      <rect x="45" y="45" width="12" height="26" rx="4" fill="#e0e0e0"/>
      <polygon points="45,45 51,32 57,45" fill="#f44336"/>
      <polygon points="45,66 40,74 45,71" fill="#f44336"/>
      <polygon points="57,66 62,74 57,71" fill="#f44336"/>
    `,
    diffs: [
      {
        id: "window",
        cx: 51,
        cy: 52,
        r: 8,
        left: `<circle cx="51" cy="52" r="3" fill="#4fc3f7"/>`,
        right: `<circle cx="51" cy="52" r="3" fill="#ffeb3b"/>`,
      },
      {
        id: "flame",
        cx: 51,
        cy: 77,
        r: 10,
        left: `<polygon points="46,71 56,71 51,82" fill="#ff9800"/>`,
        right: ``, // rocket flame missing on the right
      },
      {
        id: "bigstar",
        cx: 20,
        cy: 26,
        r: 10,
        left: `<polygon points="20,18 22,24 28,24 23,28 25,34 20,30 15,34 17,28 12,24 18,24" fill="#ffeb3b"/>`,
        right: `<polygon points="20,18 22,24 28,24 23,28 25,34 20,30 15,34 17,28 12,24 18,24" fill="#ff5252"/>`,
      },
      {
        id: "planet",
        cx: 80,
        cy: 22,
        r: 12,
        left: `<circle cx="80" cy="22" r="9" fill="#ffb300"/>`,
        right: `<circle cx="80" cy="22" r="9" fill="#ffb300"/><ellipse cx="80" cy="22" rx="14" ry="4" fill="none" stroke="#ffffff" stroke-width="1.5"/>`,
      },
      {
        id: "alien",
        cx: 82,
        cy: 60,
        r: 10,
        left: ``, // little alien saucer only on the right
        right: `<ellipse cx="82" cy="60" rx="9" ry="3" fill="#8bc34a"/><ellipse cx="82" cy="57" rx="5" ry="4" fill="#c5e1a5"/>`,
      },
    ],
  },
  {
    id: "park",
    name: { he: "פארק", en: "Park" },
    viewBox: "0 0 100 100",
    base: `
      <rect x="0" y="0" width="100" height="62" fill="#bbdefb"/>
      <rect x="0" y="62" width="100" height="38" fill="#81c784"/>
      <rect x="16" y="46" width="6" height="18" fill="#6d4c41"/>
      <circle cx="19" cy="42" r="12" fill="#43a047"/>
    `,
    diffs: [
      {
        id: "cloud",
        cx: 82,
        cy: 16,
        r: 12,
        left: `<ellipse cx="82" cy="16" rx="12" ry="6" fill="#ffffff"/>`,
        right: ``, // cloud missing on the right
      },
      {
        id: "balloon",
        cx: 50,
        cy: 30,
        r: 10,
        left: `<ellipse cx="50" cy="28" rx="6" ry="8" fill="#e53935"/><rect x="49" y="36" width="1.5" height="10" fill="#555555"/>`,
        right: `<ellipse cx="50" cy="28" rx="6" ry="8" fill="#43a047"/><rect x="49" y="36" width="1.5" height="10" fill="#555555"/>`,
      },
      {
        id: "kite",
        cx: 30,
        cy: 18,
        r: 10,
        left: ``, // kite only on the right
        right: `<polygon points="30,12 36,20 30,24 24,20" fill="#ab47bc"/><path d="M30 24 q2 4 -1 8" stroke="#555555" stroke-width="1" fill="none"/>`,
      },
      {
        id: "flower",
        cx: 70,
        cy: 78,
        r: 10,
        left: `<circle cx="70" cy="76" r="4" fill="#ffeb3b"/><rect x="69" y="76" width="2" height="10" fill="#2e7d32"/>`,
        right: `<circle cx="70" cy="76" r="4" fill="#ff4081"/><rect x="69" y="76" width="2" height="10" fill="#2e7d32"/>`,
      },
      {
        id: "ball",
        cx: 35,
        cy: 82,
        r: 10,
        left: ``, // ball only on the right
        right: `<circle cx="35" cy="82" r="6" fill="#ff5722"/>`,
      },
    ],
  },
];

export function diffsOf(scene: Scene): Diff[] {
  return scene.diffs.map(({ id, cx, cy, r }) => ({ id, cx, cy, r }));
}
