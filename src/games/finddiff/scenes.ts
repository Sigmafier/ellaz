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
    name: { he: "גן", en: "Garden", es: "Jardín" },
    viewBox: "0 0 100 100",
    base: `
      <rect x="0" y="0" width="100" height="64" fill="#afe3ff"/>
      <rect x="0" y="64" width="100" height="36" fill="#8ed67a"/>
      <rect x="40" y="40" width="30" height="26" fill="#f7c873"/>
      <polygon points="38,40 55,26 72,40" fill="#e07a5f"/>
      <rect x="50" y="52" width="10" height="14" fill="#6d4c41"/>
      <circle cx="55" cy="59" r="0.9" fill="#3e2723"/>
      <rect x="58" y="42" width="6" height="6" fill="#cfefff"/>
      <rect x="46" y="42" width="6" height="6" fill="#cfefff"/>
      <ellipse cx="50" cy="16" rx="9" ry="4.5" fill="#ffffff"/>
      <rect x="6" y="46" width="4" height="18" fill="#6d4c41"/>
      <circle cx="8" cy="42" r="10" fill="#43a047"/>
      <circle cx="8" cy="40" r="2" fill="#e53935"/>
      <circle cx="12" cy="45" r="2" fill="#e53935"/>
      <g stroke="#a1887f" stroke-width="1.4">
        <line x1="74" y1="58" x2="74" y2="66"/><line x1="79" y1="58" x2="79" y2="66"/>
        <line x1="84" y1="58" x2="84" y2="66"/><line x1="89" y1="58" x2="89" y2="66"/>
        <line x1="94" y1="58" x2="94" y2="66"/><line x1="72" y1="60" x2="96" y2="60"/>
      </g>
      <g>
        <circle cx="34" cy="90" r="3" fill="#ffca28"/><rect x="33.2" y="90" width="1.6" height="8" fill="#2e7d32"/>
        <circle cx="50" cy="92" r="3" fill="#ba68c8"/><rect x="49.2" y="92" width="1.6" height="7" fill="#2e7d32"/>
        <circle cx="66" cy="90" r="3" fill="#4fc3f7"/><rect x="65.2" y="90" width="1.6" height="8" fill="#2e7d32"/>
        <circle cx="88" cy="92" r="3" fill="#ff8a65"/><rect x="87.2" y="92" width="1.6" height="7" fill="#2e7d32"/>
      </g>
      <ellipse cx="60" cy="80" rx="9" ry="5" fill="#66bb6a"/>
      <ellipse cx="94" cy="82" rx="8" ry="5" fill="#66bb6a"/>
      <path d="M40 12 q3 -4 6 0 q3 -4 6 0" stroke="#5d6d7e" stroke-width="1" fill="none"/>
      <path d="M64 10 q2.5 -3 5 0 q2.5 -3 5 0" stroke="#5d6d7e" stroke-width="1" fill="none"/>
      <g fill="#2e7d32"><path d="M2 64 l2 -5 l2 5 Z"/><path d="M12 64 l2 -6 l2 6 Z"/><path d="M96 64 l2 -5 l2 5 Z"/></g>
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
    name: { he: "מתחת למים", en: "Underwater", es: "Bajo el agua" },
    viewBox: "0 0 100 100",
    base: `
      <rect x="0" y="0" width="100" height="82" fill="#4fc3f7"/>
      <rect x="0" y="0" width="100" height="30" fill="#81d4fa" opacity="0.5"/>
      <rect x="0" y="82" width="100" height="18" fill="#f6e4b0"/>
      <ellipse cx="30" cy="84" rx="12" ry="6" fill="#9e9e9e"/>
      <ellipse cx="66" cy="86" rx="8" ry="4" fill="#bcaaa4"/>
      <path d="M70 82 q4 -10 0 -20 q-4 -6 0 -14" stroke="#2e7d32" stroke-width="3" fill="none"/>
      <path d="M10 82 q-4 -12 0 -22 q4 -6 0 -12" stroke="#388e3c" stroke-width="3" fill="none"/>
      <path d="M92 82 q4 -10 0 -18" stroke="#2e7d32" stroke-width="2.4" fill="none"/>
      <g fill="#ffb74d">
        <ellipse cx="36" cy="24" rx="6" ry="3.5"/><polygon points="42,24 47,21 47,27"/>
      </g>
      <g fill="#4db6ac">
        <ellipse cx="66" cy="68" rx="5" ry="3"/><polygon points="71,68 75,66 75,70"/>
      </g>
      <g fill="#ffffff" opacity="0.8">
        <circle cx="46" cy="14" r="2"/><circle cx="60" cy="50" r="1.6"/>
        <circle cx="30" cy="46" r="1.4"/><circle cx="74" cy="56" r="2.2"/><circle cx="14" cy="34" r="1.6"/>
      </g>
      <path d="M40 88 a4 4 0 0 1 8 0 Z" fill="#f48fb1"/>
      <path d="M52 90 a3 3 0 0 1 6 0 Z" fill="#ce93d8"/>
      <g stroke="#e1f5fe" stroke-width="1" opacity="0.6">
        <line x1="20" y1="0" x2="26" y2="14"/><line x1="55" y1="0" x2="60" y2="16"/><line x1="85" y1="0" x2="90" y2="14"/>
      </g>
      <circle cx="86" cy="70" r="2.5" fill="#a1887f"/><circle cx="12" cy="76" r="3" fill="#8d6e63"/>
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
    name: { he: "חלל", en: "Space", es: "El espacio" },
    viewBox: "0 0 100 100",
    base: `
      <rect x="0" y="0" width="100" height="88" fill="#1a1a3d"/>
      <rect x="0" y="88" width="100" height="12" fill="#5d4037"/>
      <g fill="#ffffff">
        <circle cx="12" cy="12" r="1.2"/><circle cx="40" cy="10" r="1.2"/><circle cx="66" cy="14" r="1.2"/>
        <circle cx="8" cy="34" r="0.9"/><circle cx="30" cy="40" r="0.9"/><circle cx="62" cy="34" r="0.9"/>
        <circle cx="90" cy="40" r="0.9"/><circle cx="46" cy="18" r="0.8"/><circle cx="74" cy="46" r="0.9"/>
        <circle cx="18" cy="60" r="0.8"/><circle cx="94" cy="62" r="0.8"/><circle cx="34" cy="66" r="0.8"/>
        <circle cx="6" cy="72" r="0.8"/><circle cx="58" cy="72" r="0.9"/><circle cx="70" cy="78" r="0.8"/>
      </g>
      <circle cx="14" cy="72" r="8" fill="#eeeeee"/>
      <circle cx="16" cy="70" r="1.4" fill="#bdbdbd"/><circle cx="11" cy="74" r="1" fill="#bdbdbd"/>
      <rect x="45" y="45" width="12" height="26" rx="4" fill="#e0e0e0"/>
      <polygon points="45,45 51,32 57,45" fill="#f44336"/>
      <polygon points="45,66 40,74 45,71" fill="#f44336"/>
      <polygon points="57,66 62,74 57,71" fill="#f44336"/>
      <circle cx="51" cy="86" r="1.6" fill="#4e342e"/><circle cx="30" cy="90" r="2" fill="#4e342e"/>
      <circle cx="74" cy="90" r="1.6" fill="#4e342e"/>
      <g stroke="#90a4ae" stroke-width="0.8"><line x1="8" y1="20" x2="9" y2="24"/></g>
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
    name: { he: "פארק", en: "Park", es: "Parque" },
    viewBox: "0 0 100 100",
    base: `
      <rect x="0" y="0" width="100" height="62" fill="#bbdefb"/>
      <rect x="0" y="62" width="100" height="38" fill="#81c784"/>
      <rect x="16" y="46" width="6" height="18" fill="#6d4c41"/>
      <circle cx="19" cy="42" r="12" fill="#43a047"/>
      <circle cx="12" cy="14" r="7" fill="#ffe082"/>
      <ellipse cx="55" cy="12" rx="9" ry="4.5" fill="#ffffff"/>
      <rect x="84" y="48" width="5" height="14" fill="#6d4c41"/>
      <circle cx="86.5" cy="44" r="10" fill="#66bb6a"/>
      <path d="M0 78 q30 -6 60 0 q25 4 40 -2 v24 H0 Z" fill="#a5d6a7" opacity="0.5"/>
      <rect x="54" y="70" width="14" height="3" fill="#8d6e63"/>
      <rect x="55" y="73" width="2" height="5" fill="#6d4c41"/><rect x="65" y="73" width="2" height="5" fill="#6d4c41"/>
      <ellipse cx="16" cy="88" rx="12" ry="5" fill="#4fc3f7" opacity="0.7"/>
      <g fill="#2e7d32"><path d="M6 62 l2 -5 l2 5 Z"/><path d="M44 62 l2 -6 l2 6 Z"/><path d="M76 62 l2 -5 l2 5 Z"/></g>
      <ellipse cx="40" cy="80" rx="8" ry="5" fill="#66bb6a"/>
      <ellipse cx="92" cy="82" rx="8" ry="5" fill="#66bb6a"/>
      <circle cx="88" cy="90" r="4" fill="#ffb74d"/>
      <path d="M22 10 q2.5 -3 5 0 q2.5 -3 5 0" stroke="#5d6d7e" stroke-width="1" fill="none"/>
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
  {
    id: "farm",
    name: { he: "חווה", en: "Farm", es: "Granja" },
    viewBox: "0 0 100 100",
    base: `
      <rect x="0" y="0" width="100" height="58" fill="#bfe6ff"/>
      <rect x="0" y="58" width="100" height="42" fill="#9ccc65"/>
      <ellipse cx="52" cy="14" rx="9" ry="4.5" fill="#ffffff"/>
      <ellipse cx="80" cy="10" rx="7" ry="3.5" fill="#ffffff"/>
      <rect x="60" y="38" width="28" height="24" fill="#d84343"/>
      <rect x="70" y="48" width="8" height="14" fill="#7b3f2f"/>
      <line x1="74" y1="48" x2="74" y2="62" stroke="#5d2e22" stroke-width="0.8"/>
      <rect x="4" y="46" width="4" height="16" fill="#6d4c41"/>
      <circle cx="6" cy="42" r="9" fill="#43a047"/>
      <g stroke="#a1887f" stroke-width="1.4">
        <line x1="14" y1="58" x2="14" y2="66"/><line x1="19" y1="58" x2="19" y2="66"/>
        <line x1="24" y1="58" x2="24" y2="66"/><line x1="29" y1="58" x2="29" y2="66"/>
        <line x1="12" y1="60" x2="31" y2="60"/>
      </g>
      <ellipse cx="16" cy="82" rx="7" ry="4" fill="#e6c66e"/>
      <ellipse cx="30" cy="86" rx="6" ry="3.5" fill="#e6c66e"/>
      <g fill="#2e7d32"><path d="M46 58 l2 -5 l2 5 Z"/><path d="M92 58 l2 -5 l2 5 Z"/></g>
    `,
    diffs: [
      {
        id: "roof",
        cx: 74,
        cy: 33,
        r: 12,
        left: `<polygon points="58,38 74,26 90,38" fill="#7b3f2f"/>`,
        right: `<polygon points="58,38 74,26 90,38" fill="#455a64"/>`,
      },
      {
        id: "sun",
        cx: 14,
        cy: 14,
        r: 11,
        left: `<circle cx="14" cy="14" r="8" fill="#ffd93b"/>`,
        right: `<circle cx="14" cy="14" r="8" fill="#ff914d"/>`,
      },
      {
        id: "chicken",
        cx: 44,
        cy: 74,
        r: 10,
        left: `<ellipse cx="44" cy="74" rx="5" ry="4" fill="#ffffff"/><circle cx="48" cy="70" r="2.4" fill="#ffffff"/><polygon points="50,70 53,69 50,72" fill="#ff9800"/><circle cx="49" cy="69" r="0.6" fill="#333"/>`,
        right: ``, // chicken only on the left
      },
      {
        id: "window",
        cx: 66,
        cy: 44,
        r: 7,
        left: `<rect x="63" y="41" width="6" height="6" fill="#ffe082"/>`,
        right: `<rect x="63" y="41" width="6" height="6" fill="#4fc3f7"/>`,
      },
      {
        id: "apple",
        cx: 6,
        cy: 40,
        r: 8,
        left: ``, // apple only on the right
        right: `<circle cx="6" cy="40" r="2.4" fill="#e53935"/>`,
      },
    ],
  },
  {
    id: "beach",
    name: { he: "חוף", en: "Beach", es: "Playa" },
    viewBox: "0 0 100 100",
    base: `
      <rect x="0" y="0" width="100" height="55" fill="#bfe6ff"/>
      <rect x="0" y="55" width="100" height="17" fill="#4fc3f7"/>
      <rect x="0" y="72" width="100" height="28" fill="#f6e4b0"/>
      <ellipse cx="78" cy="14" rx="8" ry="4" fill="#ffffff"/>
      <path d="M0 60 q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.7"/>
      <rect x="84" y="40" width="3" height="20" fill="#8d6e63"/>
      <path d="M85 40 q-10 -4 -14 2 M85 40 q10 -4 14 2 M85 40 q-6 -8 -2 -12 M85 40 q6 -8 2 -12" stroke="#2e7d32" stroke-width="2" fill="none"/>
      <polygon points="55,66 68,66 61,60" fill="#ffffff"/>
      <rect x="60" y="60" width="1" height="6" fill="#795548"/>
      <path d="M40 88 a4 4 0 0 1 8 0 Z" fill="#f48fb1"/>
      <path d="M52 90 a3 3 0 0 1 6 0 Z" fill="#ce93d8"/>
      <g fill="#e6c66e"><ellipse cx="14" cy="90" rx="6" ry="2.5"/></g>
    `,
    diffs: [
      {
        id: "sun",
        cx: 16,
        cy: 16,
        r: 12,
        left: `<circle cx="16" cy="16" r="9" fill="#ffd93b"/>`,
        right: `<circle cx="16" cy="16" r="9" fill="#ff914d"/>`,
      },
      {
        id: "umbrella",
        cx: 30,
        cy: 62,
        r: 12,
        left: `<path d="M18 66 a12 8 0 0 1 24 0 Z" fill="#e53935"/><rect x="29.4" y="66" width="1.2" height="14" fill="#5d4037"/>`,
        right: `<path d="M18 66 a12 8 0 0 1 24 0 Z" fill="#3f51b5"/><rect x="29.4" y="66" width="1.2" height="14" fill="#5d4037"/>`,
      },
      {
        id: "ball",
        cx: 62,
        cy: 86,
        r: 9,
        left: ``, // beach ball only on the right
        right: `<circle cx="62" cy="86" r="6" fill="#ffffff"/><path d="M62 80 a6 6 0 0 1 0 12" fill="#ef5350"/><path d="M56 86 h12" stroke="#42a5f5" stroke-width="1.2"/>`,
      },
      {
        id: "bird",
        cx: 48,
        cy: 16,
        r: 9,
        left: `<path d="M42 16 q3 -4 6 0 q3 -4 6 0" stroke="#455a64" stroke-width="1.4" fill="none"/>`,
        right: ``, // bird only on the left
      },
      {
        id: "crab",
        cx: 82,
        cy: 88,
        r: 9,
        left: ``, // crab only on the right
        right: `<ellipse cx="82" cy="88" rx="5" ry="3.5" fill="#ef5350"/><line x1="78" y1="88" x2="75" y2="86" stroke="#c62828" stroke-width="1"/><line x1="86" y1="88" x2="89" y2="86" stroke="#c62828" stroke-width="1"/>`,
      },
    ],
  },
];

export function diffsOf(scene: Scene): Diff[] {
  return scene.diffs.map(({ id, cx, cy, r }) => ({ id, cx, cy, r }));
}
