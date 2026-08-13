// Generates src/games/coloring/pictures.ts with detailed, correct-geometry art.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const R = (n) => Math.round(n * 100) / 100;
const rad = (d) => (d * Math.PI) / 180;

// ---- path helpers ----
function circle(cx, cy, r) {
  return `M${R(cx)} ${R(cy)} m${R(-r)} 0 a${R(r)} ${R(r)} 0 1 0 ${R(2 * r)} 0 a${R(r)} ${R(r)} 0 1 0 ${R(-2 * r)} 0`;
}
function ellipse(cx, cy, rx, ry) {
  return `M${R(cx)} ${R(cy)} m${R(-rx)} 0 a${R(rx)} ${R(ry)} 0 1 0 ${R(2 * rx)} 0 a${R(rx)} ${R(ry)} 0 1 0 ${R(-2 * rx)} 0`;
}
function poly(pts) {
  return "M" + pts.map(([x, y]) => `${R(x)} ${R(y)}`).join(" L") + " Z";
}
function rot(px, py, cx, cy, deg) {
  const a = rad(deg), dx = px - cx, dy = py - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}
// A rounded petal/leaf pointing along `deg` from (cx,cy), length L, half-width W.
function petal(cx, cy, deg, L, W) {
  // local axis +x, base at 0, tip at L
  const p = (x, y) => rot(cx + x, cy + y, cx, cy, deg);
  const b = p(0, 0), t = p(L, 0);
  const c1 = p(L * 0.3, W), c2 = p(L * 0.72, W);
  const c3 = p(L * 0.72, -W), c4 = p(L * 0.3, -W);
  return `M${R(b[0])} ${R(b[1])} C${R(c1[0])} ${R(c1[1])} ${R(c2[0])} ${R(c2[1])} ${R(t[0])} ${R(t[1])} C${R(c3[0])} ${R(c3[1])} ${R(c4[0])} ${R(c4[1])} ${R(b[0])} ${R(b[1])} Z`;
}
// n-point star.
function star(cx, cy, ro, ri, n, rotDeg = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = rad(rotDeg + (i * 180) / n);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return poly(pts);
}
// Sunburst: n triangular rays as ONE region (multiple subpaths).
function sunburst(cx, cy, ri, ro, n, halfDeg = 11) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i * 360) / n;
    const tip = [cx + ro * Math.cos(rad(a)), cy + ro * Math.sin(rad(a))];
    const b1 = [cx + ri * Math.cos(rad(a - halfDeg)), cy + ri * Math.sin(rad(a - halfDeg))];
    const b2 = [cx + ri * Math.cos(rad(a + halfDeg)), cy + ri * Math.sin(rad(a + halfDeg))];
    d += `M${R(b1[0])} ${R(b1[1])} L${R(tip[0])} ${R(tip[1])} L${R(b2[0])} ${R(b2[1])} Z`;
  }
  return d;
}
const full = "M0 0 H200 V200 H0 Z";

// ---- pictures ----
const P = [];
function pic(id, he, en, es, regions, outlines) {
  P.push({ id, name: { he, en, es }, viewBox: "0 0 200 200", regions, outlines });
}

// 0. BLANK CANVAS — one full-page region so a colour can flood the background,
// and the brush does the rest. First in the list = most discoverable.
pic("blank", "דף חלק", "Blank page", "Página en blanco", [{ id: "page", d: full }], []);

// 1. SUN
pic("sun", "שמש", "Sun", "Sol",
  [
    { id: "sky", d: full },
    { id: "rays", d: sunburst(100, 100, 54, 82, 12) },
    { id: "face", d: circle(100, 100, 52) },
    { id: "cheekL", d: circle(76, 108, 9) },
    { id: "cheekR", d: circle(124, 108, 9) },
    { id: "eyeL", d: circle(84, 90, 6) },
    { id: "eyeR", d: circle(116, 90, 6) },
  ],
  ["M82 112 Q100 130 118 112"],
);

// 2. FLOWER
{
  const cx = 100, cy = 78, petals = [];
  for (let i = 0; i < 8; i++) petals.push({ id: `petal${i + 1}`, d: petal(cx, cy, (i * 360) / 8, 44, 15) });
  pic("flower", "פרח", "Flower", "Flor",
    [
      { id: "sky", d: full },
      { id: "grass", d: "M0 168 H200 V200 H0 Z" },
      ...petals,
      { id: "center", d: circle(cx, cy, 19) },
      { id: "stem", d: "M96 96 H104 V176 H96 Z" },
      { id: "leafL", d: petal(96, 138, 205, 34, 13) },
      { id: "leafR", d: petal(104, 150, -25, 34, 13) },
      { id: "pot", d: "M78 176 H122 L114 200 H86 Z" },
    ],
    [],
  );
}

// 3. BALLOONS
{
  const b = [
    { cx: 100, cy: 66, r: 40 },
    { cx: 46, cy: 92, r: 27 },
    { cx: 156, cy: 84, r: 30 },
  ];
  const regions = [{ id: "sky", d: full }];
  const outlines = [];
  b.forEach((o, i) => {
    regions.push({ id: `balloon${i + 1}`, d: circle(o.cx, o.cy, o.r) });
    regions.push({ id: `knot${i + 1}`, d: poly([[o.cx - 5, o.cy + o.r], [o.cx + 5, o.cy + o.r], [o.cx, o.cy + o.r + 9]]) });
    outlines.push(`M${o.cx} ${R(o.cy + o.r + 9)} q ${i % 2 ? -14 : 14} 30 0 ${R(200 - o.cy - o.r - 9)}`);
  });
  pic("balloons", "בלונים", "Balloons", "Globos", regions, outlines);
}

// 4. FISH
pic("fish", "דג", "Fish", "Pez",
  [
    { id: "water", d: full },
    { id: "tail", d: poly([[142, 100], [184, 68], [178, 100], [184, 132]]) },
    { id: "body", d: "M40 100 C40 62 118 62 146 100 C118 138 40 138 40 100 Z" },
    { id: "finTop", d: "M78 68 C92 44 112 46 108 72 Z" },
    { id: "finBot", d: "M78 132 C92 156 112 154 108 128 Z" },
    { id: "scale1", d: "M70 100 A18 18 0 0 1 106 100 A18 18 0 0 1 70 100 Z" },
    { id: "scale2", d: "M100 100 A18 18 0 0 1 136 100 A18 18 0 0 1 100 100 Z" },
    { id: "cheek", d: circle(62, 100, 20) },
    { id: "eye", d: circle(58, 92, 7) },
    { id: "bub1", d: circle(24, 60, 8) },
    { id: "bub2", d: circle(38, 40, 5) },
    { id: "bub3", d: circle(20, 34, 4) },
  ],
  ["M58 92 m-3 -1 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"],
);

// 5. BUTTERFLY
pic("butterfly", "פרפר", "Butterfly", "Mariposa",
  [
    { id: "sky", d: full },
    { id: "wingUL", d: "M98 92 C58 40 30 66 40 96 C46 116 78 112 98 100 Z" },
    { id: "wingLL", d: "M98 104 C64 118 44 140 64 164 C82 182 96 150 98 122 Z" },
    { id: "wingUR", d: "M102 92 C142 40 170 66 160 96 C154 116 122 112 102 100 Z" },
    { id: "wingLR", d: "M102 104 C136 118 156 140 136 164 C118 182 104 150 102 122 Z" },
    { id: "spotUL", d: circle(62, 78, 9) },
    { id: "spotUR", d: circle(138, 78, 9) },
    { id: "spotLL", d: circle(74, 146, 7) },
    { id: "spotLR", d: circle(126, 146, 7) },
    { id: "body", d: ellipse(100, 108, 7, 34) },
    { id: "head", d: circle(100, 68, 9) },
  ],
  ["M96 60 C90 46 84 42 78 40", "M104 60 C110 46 116 42 122 40",
   "M78 40 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", "M122 40 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"],
);

// 6. HOUSE
pic("house", "בית", "House", "Casa",
  [
    { id: "sky", d: "M0 0 H200 V128 H0 Z" },
    { id: "grass", d: "M0 128 H200 V200 H0 Z" },
    { id: "sun", d: circle(168, 34, 18) },
    { id: "cloud", d: "M34 44 a13 13 0 0 1 3 -24 a17 17 0 0 1 30 -2 a12 12 0 0 1 8 20 Z" },
    { id: "wall", d: "M54 96 H146 V162 H54 Z" },
    { id: "roof", d: poly([[46, 96], [100, 52], [154, 96]]) },
    { id: "chimney", d: "M124 60 H138 V80 H124 Z" },
    { id: "door", d: "M88 120 H112 V162 H88 Z" },
    { id: "winL", d: "M64 108 H82 V126 H64 Z" },
    { id: "winR", d: "M118 108 H136 V126 H118 Z" },
    { id: "path", d: poly([[92, 162], [108, 162], [118, 200], [82, 200]]) },
    { id: "trunk", d: "M20 150 H30 V178 H20 Z" },
    { id: "leaves", d: circle(25, 138, 22) },
  ],
  ["M100 120 V162", "M88 141 H112", "M73 108 V126", "M127 108 V126",
   "M96 120 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"],
);

// 7. TREE (apple)
{
  const regions = [
    { id: "sky", d: "M0 0 H200 V134 H0 Z" },
    { id: "grass", d: "M0 134 H200 V200 H0 Z" },
    { id: "trunk", d: "M90 116 C88 140 88 150 86 176 H114 C112 150 112 140 110 116 Z" },
    { id: "leafTop", d: circle(100, 58, 36) },
    { id: "leafL", d: circle(70, 92, 30) },
    { id: "leafR", d: circle(130, 92, 30) },
    { id: "leafC", d: circle(100, 96, 30) },
  ];
  const apples = [[86, 66], [118, 62], [74, 100], [128, 104], [100, 84]];
  apples.forEach((a, i) => regions.push({ id: `apple${i + 1}`, d: circle(a[0], a[1], 8) }));
  pic("tree", "עץ", "Tree", "Árbol", regions,
    apples.map((a) => `M${a[0]} ${a[1] - 8} q3 -5 6 -6`));
}

// 8. CAR
pic("car", "מכונית", "Car", "Coche",
  [
    { id: "sky", d: "M0 0 H200 V150 H0 Z" },
    { id: "road", d: "M0 150 H200 V200 H0 Z" },
    { id: "body", d: "M18 118 Q18 138 30 140 H170 Q182 138 182 118 L166 116 H34 Z" },
    { id: "cabin", d: "M58 116 L74 88 H126 L142 116 Z" },
    { id: "winL", d: poly([[70, 112], [82, 92], [97, 92], [97, 112]]) },
    { id: "winR", d: poly([[103, 112], [103, 92], [118, 92], [130, 112]]) },
    { id: "wheelL", d: circle(62, 148, 17) },
    { id: "wheelR", d: circle(138, 148, 17) },
    { id: "hubL", d: circle(62, 148, 7) },
    { id: "hubR", d: circle(138, 148, 7) },
    { id: "headlight", d: circle(174, 124, 5) },
    { id: "door", d: "M100 116 V140 H98 V116 Z" },
  ],
  ["M18 150 H182"],
);

// 9. ROCKET
{
  const regions = [
    { id: "space", d: full },
    { id: "planet", d: circle(46, 48, 20) },
    { id: "flame", d: "M85 148 Q100 210 115 148 Z" },
    { id: "flameIn", d: "M92 148 Q100 186 108 148 Z" },
    { id: "finL", d: poly([[80, 118], [56, 156], [80, 144]]) },
    { id: "finR", d: poly([[120, 118], [144, 156], [120, 144]]) },
    { id: "body", d: "M80 66 Q80 60 84 60 H116 Q120 60 120 66 V148 H80 Z" },
    { id: "nose", d: "M100 22 Q120 46 116 66 H84 Q80 46 100 22 Z" },
    { id: "window", d: circle(100, 92, 15) },
  ];
  const stars = [[150, 40], [166, 90], [40, 120], [160, 150], [30, 168]];
  stars.forEach((s, i) => regions.push({ id: `star${i + 1}`, d: star(s[0], s[1], 8, 3.4, 5) }));
  pic("rocket", "חללית", "Rocket", "Cohete", regions,
    ["M100 92 m-15 0 a15 15 0 0 1 8 -13"]);
}

// 10. SAILBOAT
pic("sailboat", "סירת מפרש", "Sailboat", "Velero",
  [
    { id: "sky", d: "M0 0 H200 V116 H0 Z" },
    { id: "sun", d: circle(164, 36, 17) },
    { id: "cloud", d: "M30 40 a12 12 0 0 1 3 -22 a16 16 0 0 1 28 -2 a11 11 0 0 1 7 18 Z" },
    { id: "sea", d: "M0 116 H200 V200 H0 Z" },
    { id: "hull", d: "M44 148 H156 L138 178 H62 Z" },
    { id: "sailBig", d: "M104 44 V140 H158 Z" },
    { id: "sailSmall", d: "M96 62 V140 H52 Z" },
    { id: "flag", d: poly([[104, 40], [128, 48], [104, 56]]) },
  ],
  ["M100 40 V140", "M0 132 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0"],
);

// 11. RAINBOW
{
  const bands = ["#f00", "#f90", "#ff0", "#0c0", "#09f", "#63c"];
  const regions = [{ id: "sky", d: full }];
  const outerBase = 92;
  bands.forEach((_, i) => {
    const ro = outerBase - i * 12, ri = ro - 12;
    regions.push({
      id: `band${i + 1}`,
      d: `M${100 - ro} 176 A${ro} ${ro} 0 0 1 ${100 + ro} 176 L${100 + ri} 176 A${ri} ${ri} 0 0 0 ${100 - ri} 176 Z`,
    });
  });
  regions.push({ id: "cloudL", d: "M8 190 a15 15 0 0 1 3 -28 a20 20 0 0 1 36 -3 a13 13 0 0 1 9 18 Z" });
  regions.push({ id: "cloudR", d: "M136 190 a15 15 0 0 1 3 -28 a20 20 0 0 1 36 -3 a13 13 0 0 1 9 18 Z" });
  regions.push({ id: "sun", d: circle(100, 168, 16) });
  pic("rainbow", "קשת בענן", "Rainbow", "Arcoíris", regions, []);
}

// 12. CAT
pic("cat", "חתול", "Cat", "Gato",
  [
    { id: "bg", d: full },
    { id: "tail", d: "M150 176 C192 168 190 116 158 122 C176 132 168 156 146 158 Z" },
    { id: "body", d: "M58 182 C50 132 72 116 100 116 C128 116 150 132 142 182 Z" },
    { id: "belly", d: "M82 182 C78 150 88 138 100 138 C112 138 122 150 118 182 Z" },
    { id: "earL", d: poly([[58, 46], [86, 74], [50, 78]]) },
    { id: "earR", d: poly([[142, 46], [150, 78], [114, 74]]) },
    { id: "earLin", d: poly([[62, 56], [78, 72], [58, 74]]) },
    { id: "earRin", d: poly([[138, 56], [142, 74], [122, 72]]) },
    { id: "head", d: circle(100, 84, 42) },
    { id: "eyeL", d: ellipse(84, 80, 9, 12) },
    { id: "eyeR", d: ellipse(116, 80, 9, 12) },
    { id: "muzzle", d: ellipse(100, 104, 20, 12) },
    { id: "nose", d: poly([[93, 98], [107, 98], [100, 106]]) },
  ],
  ["M84 82 m-4 -2 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0", "M116 82 m-4 -2 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0",
   "M100 106 V114", "M100 114 q-8 6 -16 2", "M100 114 q8 6 16 2",
   "M78 100 L48 92", "M78 106 L48 110", "M122 100 L152 92", "M122 106 L152 110"],
);

// 13. DOG
pic("dog", "כלב", "Dog", "Perro",
  [
    { id: "bg", d: full },
    { id: "tail", d: "M150 168 C180 150 178 120 156 130 C170 140 160 154 146 156 Z" },
    { id: "body", d: "M60 184 C52 138 74 124 100 124 C126 124 148 138 140 184 Z" },
    { id: "legL", d: "M78 168 H92 V190 H78 Z" },
    { id: "legR", d: "M108 168 H122 V190 H108 Z" },
    { id: "earL", d: "M56 66 C34 78 34 118 58 118 C70 118 70 92 70 78 Z" },
    { id: "earR", d: "M144 66 C166 78 166 118 142 118 C130 118 130 92 130 78 Z" },
    { id: "head", d: circle(100, 86, 40) },
    { id: "spot", d: "M100 66 C82 66 78 92 92 96 C104 99 118 84 112 72 Z" },
    { id: "snout", d: ellipse(100, 108, 24, 16) },
    { id: "nose", d: ellipse(100, 100, 9, 7) },
    { id: "eyeL", d: circle(84, 80, 7) },
    { id: "eyeR", d: circle(116, 80, 7) },
    { id: "tongue", d: "M94 116 H106 V128 Q100 134 94 128 Z" },
  ],
  ["M100 107 V116"],
);

// 14. ICE CREAM
{
  const regions = [
    { id: "bg", d: full },
    { id: "cone", d: poly([[74, 118], [126, 118], [100, 190]]) },
    { id: "scoop1", d: circle(100, 108, 30) },
    { id: "scoop2", d: circle(78, 82, 24) },
    { id: "scoop3", d: circle(122, 82, 24) },
    { id: "scoopTop", d: circle(100, 62, 24) },
    { id: "cherry", d: circle(100, 34, 11) },
  ];
  const spr = [[86, 70], [112, 66], [100, 92], [74, 96], [124, 94]];
  pic("icecream", "גלידה", "Ice cream", "Helado", regions,
    ["M100 24 Q108 12 118 12", // cherry stem
     "M84 118 L100 150", "M100 118 L100 150", "M116 118 L100 150", // waffle
     "M80 132 L120 132", "M86 150 L114 150",
     ...spr.map((s) => `M${s[0]} ${s[1]} l6 4`)]);
}

// 15. CUPCAKE
pic("cupcake", "קאפקייק", "Cupcake", "Magdalena",
  [
    { id: "bg", d: full },
    { id: "plate", d: "M36 188 Q100 204 164 188 Q150 176 100 176 Q50 176 36 188 Z" },
    { id: "wrapper", d: "M60 124 H140 L130 176 H70 Z" },
    // Soft-serve swirl: three rounded mounds, each bulging over the one below.
    { id: "frostBot", d: "M54 128 C54 102 78 92 100 92 C122 92 146 102 146 128 C118 136 82 136 54 128 Z" },
    { id: "frostMid", d: "M66 106 C66 82 86 72 100 72 C114 72 134 82 134 106 C110 114 90 114 66 106 Z" },
    { id: "frostTop", d: "M80 86 C80 64 92 54 100 54 C108 54 120 64 120 86 C106 92 94 92 80 86 Z" },
    { id: "cherry", d: circle(100, 44, 11) },
  ],
  ["M100 34 Q112 22 122 24",
   "M76 124 V176", "M92 124 L88 176", "M108 124 L112 176", "M124 124 V176",
   "M84 112 l5 5", "M118 108 l-5 5", "M96 96 l4 5", "M104 118 l4 4"],
);

// ---- serialize ----
const PALETTE = [
  "#ff5b5b", "#ff8a5b", "#ffab3d", "#ffd23d", "#ffe95b", "#c6e64f",
  "#6ecb57", "#2fb59a", "#37c6d0", "#4aa3ff", "#5c6ce0", "#a061e0",
  "#e857a6", "#ff9ec4", "#a9744f", "#e0b585", "#ffd9bf", "#9aa7b0",
  "#3a4a54", "#ffffff",
];

let out = `import type { Locale } from "@i18n/index";
// Coloring pages as sets of SVG regions. Each region is a path the child taps to
// fill with the selected color, or draws over with the brush. Original art
// (no third-party drawings), generated with correct geometry by
// scripts/gen/coloring-pictures.mjs — circles, stars and symmetric
// petals/wings are computed, not eyeballed. Add a picture there and run
// \`node scripts/gen/coloring-pictures.mjs\` to regenerate this file.
export interface Region {
  id: string;
  d: string; // SVG path data
}
export interface Picture {
  id: string;
  name: Record<Locale, string>;
  viewBox: string;
  regions: Region[];
  // decorative outlines drawn on top (not fillable — whiskers, waffle lines…)
  outlines?: string[];
}

// Ordered roughly simple -> detailed so stepping through them ramps up.
export const PICTURES: Picture[] = ${JSON.stringify(P, null, 2)
  .replace(/"([a-zA-Z0-9_]+)":/g, "$1:")};

export const PALETTE = ${JSON.stringify(PALETTE, null, 2).replace(/\n\s+/g, "\n  ").replace(/\[\n {2}/, "[\n  ").replace(/\n\]/, ",\n]")};
`;

writeFileSync(join(ROOT, "src/games/coloring/pictures.ts"), out);

// preview HTML (light tint per region so shapes are visible; outlines on top)
const tints = ["#ffe0e0","#ffe9d6","#fff3d6","#fffbd6","#eefad6","#dff5e6","#d6f3ef","#d9ecff","#e3e0fb","#f3d9ee","#ece0d6","#eef2f5"];
const cards = P.map((p) => {
  const regs = p.regions.map((r, i) => `<path d="${r.d}" fill="${tints[i % tints.length]}" stroke="#2d3436" stroke-width="2" stroke-linejoin="round"/>`).join("");
  const outs = (p.outlines || []).map((d) => `<path d="${d}" fill="none" stroke="#2d3436" stroke-width="2" stroke-linecap="round"/>`).join("");
  return `<div class="card"><svg viewBox="${p.viewBox}" width="200" height="200">${regs}${outs}</svg><div>${p.name.en} · ${p.regions.length}</div></div>`;
}).join("");
const html = `<!doctype html><meta charset=utf8><style>body{background:#dfe6ec;margin:0;font-family:sans-serif}.grid{display:grid;grid-template-columns:repeat(5,220px);gap:12px;padding:16px}.card{background:#fff;border-radius:12px;padding:6px;text-align:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.15)}svg{display:block;background:#fff}</style><div class="grid">${cards}</div>`;
if (process.env.COLORING_PREVIEW) writeFileSync(process.env.COLORING_PREVIEW, html);
console.log("pictures:", P.length, "regions total:", P.reduce((a, p) => a + p.regions.length, 0));
