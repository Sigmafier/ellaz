import type { ReactElement } from "react";
import type { ArtId } from "./items";

// Every piece of the room, drawn by hand as plain SVG primitives — the same
// convention as `games/coloring/pictures.ts`. Original simple shapes only: no
// third-party art, no trademarked characters, and (like the rest of Ellaz) no
// binary assets at all. The whole room is geometry.
//
// Pieces are authored directly in the Scene's 300x300 coordinate space rather
// than each in its own little box, so a piece knows where it lives: a rug sits
// on the floor, a poster hangs on the wall, the pet stands beside the child.
// Shop thumbnails render the *whole scene* with one slot swapped, so what a
// player taps is exactly what they will get.
//
// Layout bands: wall y 0-210 · floor y 210-300 · character x 110-190.
//
// `star`, `nothing`, `wallBase`, `pot`, `posterFrame` and `outfitShape` are
// EXPORTED because `artRest.tsx` - the lazy half of the same room - draws with
// them. Sharing them is what keeps a poster on the second shelf the same size
// and in the same place as a poster on the first, which a second copy of the
// frame would lose the first time one of them was nudged.

export const WALL_Y = 210;

/** A five-pointed star as a polygon — used on the wall, the crown, and posters. */
export function star(cx: number, cy: number, r: number, fill: string, key?: string): ReactElement {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return <polygon key={key} points={points.join(" ")} fill={fill} />;
}

/** The empty slot — "no rug", "no hat". A real choice, so it draws nothing. */
export const nothing = (): ReactElement => <g />;

// ── walls ─────────────────────────────────────────────────────────────────

export const wallBase = (fill: string) => <rect x="0" y="0" width="300" height={WALL_Y} fill={fill} />;

const wall_plain = (): ReactElement => <g>{wallBase("#454a80")}</g>;

const wall_stripes = (): ReactElement => (
  <g>
    {wallBase("#454a80")}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <rect key={i} x={i * 50 + 14} y="0" width="22" height={WALL_Y} fill="#5a62ab" />
    ))}
  </g>
);

const wall_stars = (): ReactElement => (
  <g>
    {wallBase("#2c3160")}
    {[
      [38, 44, 11],
      [96, 26, 7],
      [150, 58, 9],
      [212, 32, 12],
      [268, 70, 8],
      [64, 108, 8],
      [128, 130, 6],
      [196, 116, 10],
      [258, 150, 7],
      [30, 168, 6],
    ].map(([cx, cy, r]) => star(cx, cy, r, "#fdcb6e", `s${cx}-${cy}`))}
  </g>
);

// ── floors ────────────────────────────────────────────────────────────────

const floor_wood = (): ReactElement => (
  <g>
    <rect x="0" y={WALL_Y} width="300" height="90" fill="#8a6142" />
    {[0, 1, 2].map((i) => (
      <rect key={i} x="0" y={WALL_Y + 22 + i * 24} width="300" height="3" fill="#6d4a32" />
    ))}
    <rect x="0" y={WALL_Y} width="300" height="5" fill="#5d3f2b" />
  </g>
);

const floor_tiles = (): ReactElement => (
  <g>
    <rect x="0" y={WALL_Y} width="300" height="90" fill="#c3cbef" />
    {[0, 1, 2].map((row) =>
      [0, 1, 2, 3, 4, 5].map((col) =>
        (row + col) % 2 === 0 ? (
          <rect
            key={`${row}-${col}`}
            x={col * 50}
            y={WALL_Y + row * 30}
            width="50"
            height="30"
            fill="#8f9ad4"
          />
        ) : null,
      ),
    )}
    <rect x="0" y={WALL_Y} width="300" height="5" fill="#6f79b5" />
  </g>
);

// ── rugs ──────────────────────────────────────────────────────────────────

const rug_round = (): ReactElement => (
  <g>
    <ellipse cx="150" cy="254" rx="94" ry="30" fill="#ff7675" />
    <ellipse cx="150" cy="254" rx="62" ry="19" fill="#ffeaa7" />
    <ellipse cx="150" cy="254" rx="30" ry="9" fill="#ff7675" />
  </g>
);

const rug_rainbow = (): ReactElement => (
  <g>
    {[
      [96, 31, "#ff7675"],
      [78, 25, "#ffa94d"],
      [60, 19, "#fdcb6e"],
      [42, 13, "#55efc4"],
      [24, 7, "#74b9ff"],
    ].map(([rx, ry, fill]) => (
      <ellipse key={String(rx)} cx="150" cy="254" rx={rx} ry={ry} fill={fill as string} />
    ))}
  </g>
);

// ── plants (right of the character, standing on the floor) ────────────────

export const pot = (fill = "#c97b4a") => <path d={`M240 266 H280 L275 292 H245 Z`} fill={fill} />;

const plant_cactus = (): ReactElement => (
  <g>
    <rect x="252" y="196" width="16" height="74" rx="8" fill="#4fae5f" />
    <path
      d="M252 232 h-13 a7 7 0 0 0 -7 7 v12"
      stroke="#4fae5f"
      strokeWidth="11"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M268 220 h11 a7 7 0 0 1 7 7 v16"
      stroke="#4fae5f"
      strokeWidth="11"
      strokeLinecap="round"
      fill="none"
    />
    {star(260, 190, 7, "#fd79a8", "bloom")}
    {pot()}
  </g>
);

const plant_palm = (): ReactElement => (
  <g>
    <path d="M256 268 C252 232 254 210 262 190" stroke="#8a6142" strokeWidth="9" fill="none" strokeLinecap="round" />
    {[
      "M262 190 C240 178 226 184 220 196 C234 194 248 194 262 190 Z",
      "M262 190 C284 178 296 186 300 198 C286 194 274 192 262 190 Z",
      "M262 190 C246 168 250 154 262 148 C266 162 266 178 262 190 Z",
      "M262 190 C282 172 296 174 300 182 C286 182 272 186 262 190 Z",
      "M262 190 C242 190 230 200 228 210 C242 202 254 196 262 190 Z",
    ].map((d, i) => (
      <path key={i} d={d} fill="#3fae72" />
    ))}
    {pot("#b56a3d")}
  </g>
);

// ── posters (on the wall, left of the character) ──────────────────────────

export const posterFrame = (fill: string) => (
  <>
    <rect x="28" y="36" width="72" height="88" rx="6" fill="#fdcb6e" />
    <rect x="34" y="42" width="60" height="76" rx="3" fill={fill} />
  </>
);

const poster_rocket = (): ReactElement => (
  <g>
    {posterFrame("#1b1f3d")}
    <path d="M64 52 L74 74 V96 H54 V74 Z" fill="#f5f6ff" />
    <path d="M54 88 L44 104 L54 100 Z" fill="#ff7675" />
    <path d="M74 88 L84 104 L74 100 Z" fill="#ff7675" />
    <circle cx="64" cy="76" r="7" fill="#00cec9" />
    <path d="M57 96 H71 L64 114 Z" fill="#ffa94d" />
    {star(43, 54, 4, "#fdcb6e", "p1")}
    {star(85, 62, 3.5, "#fdcb6e", "p2")}
  </g>
);

const poster_cat = (): ReactElement => (
  <g>
    {posterFrame("#2b2f57")}
    <path d="M46 66 L50 48 L60 60 Z" fill="#fdcb6e" />
    <path d="M82 66 L78 48 L68 60 Z" fill="#fdcb6e" />
    <circle cx="64" cy="80" r="22" fill="#fdcb6e" />
    <circle cx="56" cy="76" r="3.4" fill="#2d3436" />
    <circle cx="72" cy="76" r="3.4" fill="#2d3436" />
    <path d="M60 88 L68 88 L64 93 Z" fill="#e17055" />
    <path d="M58 90 L42 86 M58 94 L42 98 M70 90 L86 86 M70 94 L86 98" stroke="#2d3436" strokeWidth="1.6" />
  </g>
);

// ── outfits (the character's torso + arms; the body is drawn by Scene) ────

export const outfitShape = (fill: string) => (
  <>
    <rect x="124" y="176" width="52" height="60" rx="17" fill={fill} />
    <rect x="108" y="182" width="15" height="42" rx="7.5" fill={fill} />
    <rect x="177" y="182" width="15" height="42" rx="7.5" fill={fill} />
  </>
);

const outfit_basic = (): ReactElement => <g>{outfitShape("#6c5ce7")}</g>;

const outfit_stripes = (): ReactElement => (
  <g>
    {outfitShape("#f5f6ff")}
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x="124" y={186 + i * 14} width="52" height="7" fill="#ff7675" />
    ))}
    <rect x="124" y="176" width="52" height="60" rx="17" fill="none" stroke="#e6e8ff" strokeWidth="2" />
  </g>
);

const outfit_space = (): ReactElement => (
  <g>
    {outfitShape("#c6cef0")}
    <circle cx="150" cy="200" r="13" fill="#00cec9" />
    <circle cx="150" cy="200" r="6" fill="#0b8f8c" />
    <rect x="124" y="222" width="52" height="8" fill="#8f9ad4" />
    <rect x="104" y="196" width="8" height="16" rx="4" fill="#ffa94d" />
    <rect x="188" y="196" width="8" height="16" rx="4" fill="#ffa94d" />
  </g>
);

// ── hats (crown the head, which is a circle at 150,152 r=25) ──────────────

const hat_cap = (): ReactElement => (
  <g>
    <path d="M127 133 a23 23 0 0 1 46 0 Z" fill="#e17055" />
    <rect x="123" y="130" width="66" height="8" rx="4" fill="#c0553a" />
    <circle cx="150" cy="111" r="4" fill="#ffeaa7" />
  </g>
);

const hat_crown = (): ReactElement => (
  <g>
    <polygon points="126,138 126,114 137,126 150,108 163,126 174,114 174,138" fill="#fdcb6e" />
    <rect x="124" y="136" width="52" height="8" rx="4" fill="#e8ad4d" />
    <circle cx="150" cy="118" r="3.6" fill="#ff7675" />
    <circle cx="131" cy="124" r="3" fill="#74b9ff" />
    <circle cx="169" cy="124" r="3" fill="#55efc4" />
  </g>
);

// ── pets (standing on the floor, left of the character) ───────────────────

const pet_cat = (): ReactElement => (
  <g>
    <path d="M90 250 q16 -4 12 -24" stroke="#fdcb6e" strokeWidth="8" fill="none" strokeLinecap="round" />
    <ellipse cx="70" cy="252" rx="27" ry="17" fill="#fdcb6e" />
    <path d="M40 228 L44 214 L54 224 Z" fill="#fdcb6e" />
    <path d="M62 228 L58 214 L48 224 Z" fill="#fdcb6e" />
    <circle cx="51" cy="236" r="16" fill="#fdcb6e" />
    <circle cx="46" cy="234" r="2.6" fill="#2d3436" />
    <circle cx="56" cy="234" r="2.6" fill="#2d3436" />
    <path d="M49 241 L53 241 L51 244 Z" fill="#e17055" />
  </g>
);

const pet_dog = (): ReactElement => (
  <g>
    <path d="M92 250 q12 -8 6 -20" stroke="#b0764a" strokeWidth="8" fill="none" strokeLinecap="round" />
    <ellipse cx="70" cy="252" rx="28" ry="18" fill="#b0764a" />
    <circle cx="49" cy="234" r="17" fill="#c98a5a" />
    <ellipse cx="35" cy="234" rx="7" ry="13" fill="#8f5c37" />
    <ellipse cx="63" cy="234" rx="7" ry="13" fill="#8f5c37" />
    <circle cx="44" cy="231" r="2.6" fill="#2d3436" />
    <circle cx="55" cy="231" r="2.6" fill="#2d3436" />
    <ellipse cx="49" cy="241" rx="5" ry="3.6" fill="#2d3436" />
  </g>
);

const pet_dragon = (): ReactElement => (
  <g>
    <path d="M94 246 q18 -2 14 -26" stroke="#55b56a" strokeWidth="8" fill="none" strokeLinecap="round" />
    <ellipse cx="70" cy="250" rx="28" ry="19" fill="#55b56a" />
    <path d="M66 232 L86 206 L92 236 Z" fill="#3f9152" />
    <circle cx="48" cy="230" r="18" fill="#63c97a" />
    <path d="M40 214 L44 200 L50 213 Z" fill="#fdcb6e" />
    <path d="M56 213 L60 200 L64 214 Z" fill="#fdcb6e" />
    <circle cx="43" cy="228" r="2.8" fill="#2d3436" />
    <circle cx="55" cy="228" r="2.8" fill="#2d3436" />
    <path d="M32 236 q-10 2 -14 -4" stroke="#ffa94d" strokeWidth="4" fill="none" strokeLinecap="round" />
  </g>
);

/**
 * Every drawable piece, keyed by the art id its catalogue row declares.
 *
 * `ArtId` is derived from ITEMS, so a missing entry or a typo'd key here is a
 * `tsc --noEmit` build failure — that is the completeness check, and it is why
 * no test guards this map.
 */
export const ART: Record<ArtId, () => ReactElement> = {
  wall_plain,
  wall_stripes,
  wall_stars,
  floor_wood,
  floor_tiles,
  rug_none: nothing,
  rug_round,
  rug_rainbow,
  plant_none: nothing,
  plant_cactus,
  plant_palm,
  poster_none: nothing,
  poster_rocket,
  poster_cat,
  outfit_basic,
  outfit_stripes,
  outfit_space,
  hat_none: nothing,
  hat_cap,
  hat_crown,
  window_none: nothing,
  light_none: nothing,
  toy_none: nothing,
  pet_none: nothing,
  pet_cat,
  pet_dog,
  pet_dragon,
};
