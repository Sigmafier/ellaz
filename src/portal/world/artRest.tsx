import type { ReactElement } from "react";
import { WALL_Y, outfitShape, posterFrame, pot, star, wallBase } from "./art";
import type { ExtraArtId } from "./itemsRest";

// The SECOND SHELF's drawings — the lazy half of the room.
//
// This file is the whole reason `roomArt.ts` exists. It is carved into its own
// `world-art` chunk (a NAMED branch in vite.config's `manualChunks`, plus a
// matching `world-art-*.js` entry in `globIgnores`), because `art.tsx` ships in
// the SHELL and the first visit had 718 B gz of headroom on the day this
// landed. Fifty-two more scenes in `art.tsx` would have blown the ceiling by
// several kilobytes for every child, most of whom never open the shop.
//
// The World screen imports it STATICALLY, so its shop grid never draws a
// fallback; Home fetches it on browser idle from `Scene`, so a child who has
// bought something here still sees it in their world card a moment later.
//
// EVERY CONVENTION FROM `art.tsx` HOLDS. Original geometry only, plain SVG
// primitives, no binary assets, no third-party art and no trademarked
// characters — the whole room is still just shapes. Pieces are authored
// directly in the Scene's 300x300 space so a piece knows where it lives.
//
// Layout bands, now eleven slots deep:
//   wall    y   0-210, full width      floor  y 210-300
//   rug     ellipse cx150 cy254        poster x  28-100, y  36-124
//   window  x 196-284, y  28-116       light  cx150,     y   0- 58
//   plant   x 220-300, y 148-292       toy    x 180-238, y 248-290
//   character x 110-190 (head circle 150,152 r25; torso 124-176, y176-236)
//   pet     x  22-100, y 200-275
//
// The three new bands were chosen to MISS the old ones, and two of them are
// tight: the window stops at y116 and the plant starts at y148; the toy stops
// at x238 and the plant's pot starts at x240. Anything wider than those in a
// later item overlaps a slot the player chose separately, which reads as a
// drawing bug rather than as a busy room.

// ── walls ─────────────────────────────────────────────────────────────────

const wall_dots = (): ReactElement => (
  <g>
    {wallBase("#3f4a86")}
    {[0, 1, 2, 3, 4, 5].map((row) =>
      [0, 1, 2, 3, 4, 5, 6].map((col) => (
        <circle
          key={`${row}-${col}`}
          cx={col * 44 + (row % 2 ? 32 : 10)}
          cy={row * 38 + 22}
          r="6"
          fill="#7d88d4"
        />
      )),
    )}
  </g>
);

const wall_brick = (): ReactElement => (
  <g>
    {wallBase("#8d5b4c")}
    {[0, 1, 2, 3, 4, 5, 6].map((row) =>
      [0, 1, 2, 3, 4, 5].map((col) => (
        <rect
          key={`${row}-${col}`}
          x={col * 54 + (row % 2 ? -27 : 0) + 3}
          y={row * 30 + 3}
          width="48"
          height="24"
          rx="3"
          fill="#a86f5c"
        />
      )),
    )}
  </g>
);

const wall_forest = (): ReactElement => (
  <g>
    {wallBase("#2f5d54")}
    {[24, 72, 120, 168, 216, 264].map((x, i) => (
      <g key={x}>
        <rect x={x - 4} y={110 + (i % 2) * 14} width="8" height="100" fill="#3d4a3f" />
        <path
          d={`M${x} ${58 + (i % 2) * 14} L${x + 30} ${132 + (i % 2) * 14} H${x - 30} Z`}
          fill={i % 2 ? "#4f9c6b" : "#3f8558"}
        />
        <path
          d={`M${x} ${34 + (i % 2) * 14} L${x + 23} ${96 + (i % 2) * 14} H${x - 23} Z`}
          fill={i % 2 ? "#5fb27b" : "#4f9c6b"}
        />
      </g>
    ))}
  </g>
);

const wall_sunset = (): ReactElement => (
  <g>
    {[
      ["#3b2a63", 0],
      ["#7a3f78", 42],
      ["#c25f79", 84],
      ["#f08d63", 126],
      ["#ffc073", 168],
    ].map(([fill, y]) => (
      <rect key={String(y)} x="0" y={y as number} width="300" height="42" fill={fill as string} />
    ))}
    <circle cx="212" cy="150" r="34" fill="#fff0c4" opacity="0.9" />
    {["M18 176 q22 -12 44 0 q22 -12 44 0", "M242 62 q18 -10 36 0"].map((d) => (
      <path key={d} d={d} stroke="#ffe6b0" strokeWidth="4" fill="none" opacity="0.55" />
    ))}
  </g>
);

const wall_candy = (): ReactElement => (
  <g>
    {wallBase("#f7c8dd")}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <path
        key={i}
        d={`M${i * 40 - 30} ${WALL_Y} L${i * 40 + 30} 0 L${i * 40 + 48} 0 L${i * 40 - 12} ${WALL_Y} Z`}
        fill={i % 2 ? "#ffffff" : "#f79ac0"}
        opacity="0.75"
      />
    ))}
    {[
      [46, 40],
      [148, 78],
      [244, 36],
      [96, 150],
      [212, 160],
    ].map(([cx, cy]) => (
      <g key={`${cx}-${cy}`}>
        <circle cx={cx} cy={cy} r="11" fill="#ffffff" />
        <circle cx={cx} cy={cy} r="6.5" fill="#e8557f" />
      </g>
    ))}
  </g>
);

const wall_galaxy = (): ReactElement => (
  <g>
    {wallBase("#150f2e")}
    <ellipse cx="150" cy="96" rx="140" ry="58" fill="#3b2470" opacity="0.75" />
    <ellipse cx="150" cy="96" rx="96" ry="38" fill="#6a3fb0" opacity="0.6" />
    <ellipse cx="150" cy="96" rx="52" ry="20" fill="#b76bd8" opacity="0.55" />
    <circle cx="150" cy="96" r="13" fill="#ffeaa7" />
    {[
      [34, 30, 8],
      [96, 172, 6],
      [214, 42, 7],
      [268, 128, 9],
      [122, 26, 5],
      [186, 186, 6],
      [58, 118, 5],
      [252, 190, 5],
    ].map(([cx, cy, r]) => star(cx, cy, r, "#fdf0c0", `g${cx}-${cy}`))}
    {[
      [70, 60],
      [200, 148],
      [280, 74],
      [26, 190],
    ].map(([cx, cy]) => (
      <circle key={`d${cx}`} cx={cx} cy={cy} r="2.4" fill="#ffffff" />
    ))}
  </g>
);

// ── floors ────────────────────────────────────────────────────────────────

const floorBase = (fill: string) => <rect x="0" y={WALL_Y} width="300" height="90" fill={fill} />;

const floor_grass = (): ReactElement => (
  <g>
    {floorBase("#4f9c50")}
    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
      <path
        key={i}
        d={`M${i * 26 + 8} ${WALL_Y + 88} q4 -18 ${i % 2 ? 10 : -10} -26`}
        stroke="#68bd66"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    ))}
    <rect x="0" y={WALL_Y} width="300" height="5" fill="#3c7a3e" />
    {[46, 168, 262].map((cx) => (
      <circle key={cx} cx={cx} cy={WALL_Y + 30} r="4" fill="#ffeaa7" />
    ))}
  </g>
);

const floor_checker = (): ReactElement => (
  <g>
    {floorBase("#f0f2fb")}
    {[0, 1, 2].map((row) =>
      [0, 1, 2, 3, 4, 5, 6, 7].map((col) =>
        (row + col) % 2 === 0 ? (
          <rect
            key={`${row}-${col}`}
            x={col * 37.5}
            y={WALL_Y + row * 30}
            width="37.5"
            height="30"
            fill="#31364f"
          />
        ) : null,
      ),
    )}
    <rect x="0" y={WALL_Y} width="300" height="5" fill="#5a6080" />
  </g>
);

const floor_water = (): ReactElement => (
  <g>
    {floorBase("#2c86bd")}
    {[0, 1, 2, 3].map((i) => (
      <path
        key={i}
        d={`M0 ${WALL_Y + 16 + i * 22} q26 -9 52 0 t52 0 t52 0 t52 0 t52 0 t52 0`}
        stroke="#5cb6e0"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    ))}
    <rect x="0" y={WALL_Y} width="300" height="5" fill="#1e6690" />
    <ellipse cx="212" cy={WALL_Y + 46} rx="24" ry="7" fill="#bfe6f7" opacity="0.55" />
  </g>
);

const floor_clouds = (): ReactElement => (
  <g>
    {floorBase("#cfe0ff")}
    {[
      [46, 26, 26],
      [138, 44, 32],
      [236, 22, 28],
      [92, 68, 22],
      [206, 72, 24],
    ].map(([cx, dy, r]) => (
      <g key={`${cx}-${dy}`}>
        <ellipse cx={cx} cy={WALL_Y + dy} rx={r} ry={r * 0.55} fill="#ffffff" />
        <ellipse cx={cx - r * 0.6} cy={WALL_Y + dy + 4} rx={r * 0.6} ry={r * 0.4} fill="#ffffff" />
        <ellipse cx={cx + r * 0.6} cy={WALL_Y + dy + 4} rx={r * 0.6} ry={r * 0.4} fill="#f2f6ff" />
      </g>
    ))}
    <rect x="0" y={WALL_Y} width="300" height="5" fill="#a9c2ea" />
  </g>
);

const floor_lava = (): ReactElement => (
  <g>
    {floorBase("#2b1a1a")}
    {[
      "M0 232 q40 -12 78 2 t76 -2 t74 4 t72 -4 V300 H0 Z",
      "M0 262 q52 10 96 -4 t92 6 t112 -6 V300 H0 Z",
    ].map((d, i) => (
      <path key={i} d={d} fill={i ? "#ff8b3d" : "#e2452a"} opacity={i ? 0.95 : 1} />
    ))}
    {[
      [56, 246],
      [154, 240],
      [248, 250],
    ].map(([cx, cy]) => (
      <ellipse key={cx} cx={cx} cy={cy} rx="16" ry="5" fill="#ffd166" opacity="0.8" />
    ))}
    <rect x="0" y={WALL_Y} width="300" height="5" fill="#160c0c" />
  </g>
);

// ── rugs ──────────────────────────────────────────────────────────────────

const rug_paw = (): ReactElement => (
  <g>
    <ellipse cx="150" cy="254" rx="92" ry="29" fill="#8f7bd8" />
    <ellipse cx="150" cy="254" rx="74" ry="21" fill="#b6a8ec" />
    {[100, 150, 200].map((cx) => (
      <g key={cx}>
        <ellipse cx={cx} cy="258" rx="11" ry="8" fill="#5a4aa0" />
        {[-11, -4, 4, 11].map((dx, i) => (
          <ellipse
            key={dx}
            cx={cx + dx}
            cy={247 + (i === 1 || i === 2 ? -2 : 1)}
            rx="3.4"
            ry="2.8"
            fill="#5a4aa0"
          />
        ))}
      </g>
    ))}
  </g>
);

const rug_star = (): ReactElement => (
  <g>
    <ellipse cx="150" cy="254" rx="90" ry="29" fill="#22364f" />
    <ellipse cx="150" cy="254" rx="74" ry="22" fill="#2f4a6b" />
    {star(150, 254, 22, "#fdcb6e", "mid")}
    {[
      [98, 250, 6],
      [202, 250, 6],
      [124, 264, 4],
      [176, 264, 4],
    ].map(([x, y, r]) => star(x, y, r, "#ffeaa7", `s${x}`))}
  </g>
);

const rug_zigzag = (): ReactElement => (
  <g>
    <ellipse cx="150" cy="254" rx="92" ry="30" fill="#0f8f83" />
    {[0, 1, 2].map((row) => (
      <path
        key={row}
        d={`M64 ${244 + row * 9} l14 -6 l14 6 l14 -6 l14 6 l14 -6 l14 6 l14 -6 l14 6 l14 -6 l14 6`}
        stroke={row % 2 ? "#ffeaa7" : "#ff9f6e"}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    ))}
  </g>
);

const rug_galaxy = (): ReactElement => (
  <g>
    <ellipse cx="150" cy="254" rx="94" ry="31" fill="#1b1236" />
    <ellipse cx="150" cy="254" rx="70" ry="21" fill="#4a2c8c" />
    <ellipse cx="150" cy="254" rx="40" ry="12" fill="#8b53c9" />
    <circle cx="150" cy="254" r="7" fill="#ffeaa7" />
    {[
      [96, 250, 5],
      [204, 258, 5],
      [128, 264, 3.5],
      [176, 244, 3.5],
      [66, 256, 3],
      [234, 250, 3],
    ].map(([x, y, r]) => star(x, y, r, "#f6e7ff", `rg${x}`))}
  </g>
);

// ── windows (upper right of the wall, x 196-284, y 28-116) ────────────────

/** The frame every window shares — a sill, a border and a cross bar. */
const windowFrame = (view: ReactElement): ReactElement => (
  <g>
    <rect x="196" y="28" width="88" height="88" rx="7" fill="#e8ded0" />
    <rect x="203" y="35" width="74" height="74" rx="4" fill="#8fa8c8" />
    <g clipPath="url(#ellaz-win)">{view}</g>
    <rect x="236.5" y="35" width="5" height="74" fill="#e8ded0" />
    <rect x="203" y="69.5" width="74" height="5" fill="#e8ded0" />
    <rect x="192" y="112" width="96" height="8" rx="3" fill="#cdbfa9" />
    <defs>
      <clipPath id="ellaz-win">
        <rect x="203" y="35" width="74" height="74" rx="4" />
      </clipPath>
    </defs>
  </g>
);

const window_day = (): ReactElement =>
  windowFrame(
    <g>
      <rect x="203" y="35" width="74" height="74" fill="#7ec4f0" />
      <rect x="203" y="88" width="74" height="21" fill="#5fae67" />
      <circle cx="262" cy="50" r="10" fill="#ffe07a" />
      <ellipse cx="222" cy="54" rx="15" ry="8" fill="#ffffff" opacity="0.9" />
      <ellipse cx="250" cy="70" rx="12" ry="6" fill="#ffffff" opacity="0.75" />
      <path d="M216 88 l8 -16 l8 16 Z" fill="#3f8558" />
    </g>,
  );

const window_night = (): ReactElement =>
  windowFrame(
    <g>
      <rect x="203" y="35" width="74" height="74" fill="#1d2454" />
      <circle cx="222" cy="52" r="11" fill="#f7f2d8" />
      <circle cx="217" cy="49" r="11" fill="#1d2454" />
      {[
        [250, 46, 4],
        [265, 62, 3],
        [238, 70, 3.4],
        [258, 88, 3],
        [212, 82, 2.6],
      ].map(([x, y, r]) => star(x, y, r, "#ffeaa7", `n${x}`))}
      <path d="M203 100 l16 -12 l14 10 l16 -14 l14 12 l14 -8 v21 H203 Z" fill="#111634" />
    </g>,
  );

const window_rain = (): ReactElement =>
  windowFrame(
    <g>
      <rect x="203" y="35" width="74" height="74" fill="#6b7f96" />
      <ellipse cx="228" cy="52" rx="20" ry="9" fill="#4d5d70" />
      <ellipse cx="256" cy="60" rx="16" ry="7" fill="#59697d" />
      {[210, 224, 238, 252, 266].map((x, i) => (
        <path
          key={x}
          d={`M${x} ${72 + (i % 2) * 8} l-4 14`}
          stroke="#cfe3f2"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ))}
      {[216, 244, 262].map((x, i) => (
        <path
          key={`b${x}`}
          d={`M${x} ${92 + (i % 2) * 6} l-3 10`}
          stroke="#cfe3f2"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ))}
    </g>,
  );

const window_space = (): ReactElement =>
  windowFrame(
    <g>
      <rect x="203" y="35" width="74" height="74" fill="#0d0a20" />
      <circle cx="248" cy="60" r="17" fill="#4f8fd0" />
      <path d="M231 58 q17 8 34 -4 q-4 14 -17 18 q-14 -2 -17 -14 Z" fill="#57b07a" />
      <ellipse
        cx="248"
        cy="60"
        rx="26"
        ry="7"
        fill="none"
        stroke="#e6c07a"
        strokeWidth="3"
        transform="rotate(-18 248 60)"
      />
      {[
        [214, 44, 4],
        [222, 92, 3.4],
        [264, 96, 3],
        [208, 70, 2.6],
      ].map(([x, y, r]) => star(x, y, r, "#ffffff", `sp${x}`))}
    </g>,
  );

// ── lights (hanging from the ceiling, cx 150, y 0-58) ─────────────────────

const cord = (toY: number) => <rect x="148.5" y="0" width="3" height={toY} fill="#2a2f52" />;

const light_lamp = (): ReactElement => (
  <g>
    {cord(20)}
    <path d="M122 46 L150 20 L178 46 Z" fill="#ffd166" />
    <rect x="120" y="46" width="60" height="5" rx="2.5" fill="#e0ae4a" />
    <ellipse cx="150" cy="56" rx="20" ry="6" fill="#fff3c8" opacity="0.65" />
  </g>
);

const light_lantern = (): ReactElement => (
  <g>
    {cord(14)}
    <ellipse cx="150" cy="34" rx="26" ry="20" fill="#ff8f6b" />
    <ellipse cx="150" cy="34" rx="12" ry="20" fill="#ffb094" opacity="0.8" />
    <rect x="140" y="12" width="20" height="4" rx="2" fill="#d96a4a" />
    <rect x="140" y="52" width="20" height="4" rx="2" fill="#d96a4a" />
  </g>
);

const light_fairy = (): ReactElement => (
  <g>
    <path d="M6 10 q72 44 144 4 q72 -40 144 6" stroke="#3a4066" strokeWidth="2.4" fill="none" />
    {[
      [26, 22],
      [58, 32],
      [92, 34],
      [126, 28],
      [158, 16],
      [190, 18],
      [222, 26],
      [254, 30],
      [284, 22],
    ].map(([cx, cy], i) => (
      <g key={cx}>
        <circle
          cx={cx}
          cy={cy}
          r="7"
          fill={["#ffeaa7", "#a8e6cf", "#ffb3c6"][i % 3]}
          opacity="0.4"
        />
        <circle cx={cx} cy={cy} r="3.4" fill={["#ffd166", "#6fe0b0", "#ff8fb0"][i % 3]} />
      </g>
    ))}
  </g>
);

const light_disco = (): ReactElement => (
  <g>
    {cord(16)}
    <circle cx="150" cy="38" r="22" fill="#9aa6c9" />
    {[0, 1, 2, 3].map((row) =>
      [0, 1, 2, 3, 4].map((col) => (
        <rect
          key={`${row}-${col}`}
          x={132 + col * 8}
          y={22 + row * 8}
          width="6.4"
          height="6.4"
          fill={(row + col) % 3 === 0 ? "#e6ecff" : (row + col) % 3 === 1 ? "#7f8cb8" : "#c3ccea"}
          opacity={(row + col) % 2 ? 0.9 : 0.65}
        />
      )),
    )}
    <circle cx="150" cy="38" r="22" fill="none" stroke="#6f7aa6" strokeWidth="1.6" />
    {["M128 52 L96 96", "M172 52 L206 94", "M150 60 L150 100"].map((d) => (
      <path key={d} d={d} stroke="#fff0b8" strokeWidth="5" opacity="0.35" strokeLinecap="round" />
    ))}
  </g>
);

// ── plants ────────────────────────────────────────────────────────────────

const plant_flower = (): ReactElement => (
  <g>
    <path d="M260 266 V214" stroke="#4fae5f" strokeWidth="7" strokeLinecap="round" />
    <path d="M260 240 q-18 -6 -22 -20 q18 2 22 20 Z" fill="#4fae5f" />
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const a = (Math.PI / 3) * i;
      return (
        <ellipse
          key={i}
          cx={260 + Math.cos(a) * 15}
          cy={200 + Math.sin(a) * 15}
          rx="10"
          ry="8"
          fill="#ff8fb0"
        />
      );
    })}
    <circle cx="260" cy="200" r="9" fill="#ffd166" />
    {pot("#b56a3d")}
  </g>
);

const plant_mushroom = (): ReactElement => (
  <g>
    <rect x="252" y="230" width="16" height="42" rx="8" fill="#f3e2cf" />
    <path d="M226 232 q34 -46 68 0 Z" fill="#e35d5b" />
    {[
      [242, 220, 5],
      [262, 210, 6],
      [280, 224, 4.4],
      [252, 228, 3.4],
    ].map(([cx, cy, r]) => (
      <circle key={cx} cx={cx} cy={cy} r={r} fill="#fff4e6" />
    ))}
    <rect x="236" y="266" width="48" height="8" rx="4" fill="#7a5a3f" />
    <path d="M296 258 q-8 -22 -22 -26 q4 20 22 26 Z" fill="#4fae5f" />
  </g>
);

const plant_bonsai = (): ReactElement => (
  <g>
    <path
      d="M258 264 q-4 -30 6 -44 q8 -12 -2 -24"
      stroke="#7a5236"
      strokeWidth="9"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M264 214 q16 -6 28 4"
      stroke="#7a5236"
      strokeWidth="6"
      fill="none"
      strokeLinecap="round"
    />
    <ellipse cx="256" cy="188" rx="28" ry="15" fill="#3f8558" />
    <ellipse cx="252" cy="180" rx="18" ry="10" fill="#57a870" />
    <ellipse cx="292" cy="210" rx="16" ry="9" fill="#3f8558" />
    <ellipse cx="292" cy="206" rx="10" ry="6" fill="#57a870" />
    <rect x="232" y="264" width="56" height="18" rx="4" fill="#4a5470" />
    <rect x="238" y="282" width="14" height="6" rx="2" fill="#39415a" />
    <rect x="268" y="282" width="14" height="6" rx="2" fill="#39415a" />
  </g>
);

const plant_carnivore = (): ReactElement => (
  <g>
    <path
      d="M254 266 q-6 -28 4 -44"
      stroke="#3f8558"
      strokeWidth="8"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M272 268 q10 -24 20 -34"
      stroke="#3f8558"
      strokeWidth="7"
      fill="none"
      strokeLinecap="round"
    />
    <path d="M240 208 q18 -30 40 -8 q-14 16 -40 8 Z" fill="#8fd15c" />
    <path d="M240 208 q22 18 40 -8 q-16 -8 -40 8 Z" fill="#6fb544" />
    <path
      d="M244 206 l6 6 M254 202 l5 8 M264 200 l4 8 M274 202 l3 7"
      stroke="#f5f7ff"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path d="M286 178 q14 -18 8 -30 q-14 10 -8 30 Z" fill="#8fd15c" />
    {pot("#5a4aa0")}
  </g>
);

// ── posters ───────────────────────────────────────────────────────────────

const poster_music = (): ReactElement => (
  <g>
    {posterFrame("#2b1f4a")}
    <circle cx="64" cy="80" r="24" fill="#4a3a7a" />
    <circle cx="64" cy="80" r="8" fill="#ffeaa7" />
    <circle cx="64" cy="80" r="2.6" fill="#2b1f4a" />
    <path d="M52 62 v-8 M76 66 v-8" stroke="#00cec9" strokeWidth="3" strokeLinecap="round" />
    <path
      d="M46 108 q10 -6 20 0 q10 6 20 0"
      stroke="#ff8fb0"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  </g>
);

const poster_dino = (): ReactElement => (
  <g>
    {posterFrame("#1c3a2e")}
    <path
      d="M44 106 q2 -22 18 -28 q6 -18 22 -14 q10 4 8 16 q10 6 4 16 q-6 8 -18 6 l-6 10 Z"
      fill="#6fd44e"
    />
    <path d="M50 92 l-8 8 l10 2 Z" fill="#4fae3a" />
    <path d="M58 84 l-9 6 l10 3 Z" fill="#4fae3a" />
    <circle cx="80" cy="72" r="2.8" fill="#1c3a2e" />
    <path d="M52 106 v8 M66 106 v8" stroke="#4fae3a" strokeWidth="4" strokeLinecap="round" />
    {star(48, 54, 4, "#ffeaa7", "d1")}
  </g>
);

const poster_map = (): ReactElement => (
  <g>
    {posterFrame("#e6d3a8")}
    <path d="M40 66 q14 -8 26 0 q14 8 28 -2 v44 q-14 10 -28 2 q-12 -8 -26 0 Z" fill="#d9c08a" />
    <path
      d="M44 100 q12 -20 26 -12 q12 8 22 -10"
      stroke="#a8462f"
      strokeWidth="2.4"
      fill="none"
      strokeDasharray="5 4"
    />
    <path d="M86 72 l8 8 M94 72 l-8 8" stroke="#a8462f" strokeWidth="3.4" strokeLinecap="round" />
    <path d="M46 56 l4 -8 l4 8 l-4 -3 Z" fill="#7a5236" />
  </g>
);

const poster_medal = (): ReactElement => (
  <g>
    {posterFrame("#221a3b")}
    <path d="M54 48 l10 24 l-16 0 Z" fill="#e35d5b" />
    <path d="M76 48 l-10 24 l16 0 Z" fill="#4f8fd0" />
    <circle cx="64" cy="92" r="20" fill="#fdcb6e" />
    <circle cx="64" cy="92" r="14" fill="#e8ad4d" />
    {star(64, 92, 9, "#fff4d0", "m")}
    {[44, 84].map((cx) => star(cx, 62, 3.4, "#ffeaa7", `mm${cx}`))}
  </g>
);

// ── toys (floor, x 180-238, y 248-290) ────────────────────────────────────

const toy_ball = (): ReactElement => (
  <g>
    <ellipse cx="208" cy="286" rx="20" ry="5" fill="#00000022" />
    <circle cx="208" cy="268" r="19" fill="#f5f6ff" />
    <path d="M208 249 a19 19 0 0 1 17 10 l-17 9 Z" fill="#e35d5b" />
    <path d="M208 287 a19 19 0 0 1 -17 -10 l17 -9 Z" fill="#4f8fd0" />
    <circle cx="208" cy="268" r="19" fill="none" stroke="#c8cde8" strokeWidth="1.6" />
  </g>
);

const toy_blocks = (): ReactElement => (
  <g>
    <rect x="182" y="266" width="24" height="24" rx="4" fill="#e35d5b" />
    <rect x="208" y="266" width="24" height="24" rx="4" fill="#4f8fd0" />
    <rect x="195" y="242" width="24" height="24" rx="4" fill="#ffd166" />
    <text x="194" y="284" fontSize="15" fontWeight="700" fill="#ffffff">
      A
    </text>
    <text x="219" y="284" fontSize="15" fontWeight="700" fill="#ffffff">
      B
    </text>
    <text x="203" y="260" fontSize="15" fontWeight="700" fill="#7a5236">
      C
    </text>
  </g>
);

const toy_teddy = (): ReactElement => (
  <g>
    <circle cx="192" cy="252" r="7" fill="#a97b52" />
    <circle cx="224" cy="252" r="7" fill="#a97b52" />
    <circle cx="208" cy="258" r="17" fill="#c2915f" />
    <circle cx="202" cy="255" r="2.6" fill="#3a2a1c" />
    <circle cx="214" cy="255" r="2.6" fill="#3a2a1c" />
    <ellipse cx="208" cy="263" rx="5" ry="4" fill="#f0dcc4" />
    <ellipse cx="208" cy="262.5" rx="2.4" ry="1.8" fill="#3a2a1c" />
    <ellipse cx="208" cy="280" rx="16" ry="13" fill="#c2915f" />
    <ellipse cx="208" cy="282" rx="9" ry="7" fill="#f0dcc4" />
    <ellipse cx="188" cy="278" rx="6" ry="5" fill="#a97b52" />
    <ellipse cx="228" cy="278" rx="6" ry="5" fill="#a97b52" />
  </g>
);

const toy_robot = (): ReactElement => (
  <g>
    <path d="M208 240 v8" stroke="#8f9ad4" strokeWidth="2.4" />
    <circle cx="208" cy="238" r="3.4" fill="#ff8fb0" />
    <rect x="192" y="248" width="32" height="24" rx="6" fill="#b8c2e6" />
    <rect x="198" y="255" width="8" height="8" rx="2" fill="#00cec9" />
    <rect x="210" y="255" width="8" height="8" rx="2" fill="#00cec9" />
    <rect x="199" y="266" width="18" height="3" rx="1.5" fill="#6b76a8" />
    <rect x="196" y="273" width="24" height="17" rx="4" fill="#8f9ad4" />
    <circle cx="208" cy="281" r="4" fill="#ffd166" />
    <rect x="186" y="275" width="8" height="4" rx="2" fill="#6b76a8" />
    <rect x="222" y="275" width="8" height="4" rx="2" fill="#6b76a8" />
  </g>
);

const toy_castle = (): ReactElement => (
  <g>
    <rect x="180" y="256" width="14" height="34" fill="#d9c9a8" />
    <rect x="222" y="256" width="14" height="34" fill="#d9c9a8" />
    <rect x="194" y="266" width="28" height="24" fill="#e8dcc2" />
    <path d="M180 256 h14 v-6 h-4 v-4 h-6 v4 h-4 Z" fill="#c8b78f" />
    <path d="M222 256 h14 v-6 h-4 v-4 h-6 v4 h-4 Z" fill="#c8b78f" />
    <path d="M187 246 l0 -14 l10 6 Z" fill="#e35d5b" />
    <path d="M229 246 l0 -14 l10 6 Z" fill="#4f8fd0" />
    <path d="M202 290 v-12 a6 6 0 0 1 12 0 v12 Z" fill="#7a5236" />
    <rect x="184" y="264" width="6" height="8" rx="2" fill="#5a6080" />
    <rect x="226" y="264" width="6" height="8" rx="2" fill="#5a6080" />
  </g>
);

// ── outfits ───────────────────────────────────────────────────────────────

const outfit_hoodie = (): ReactElement => (
  <g>
    {outfitShape("#3aa88f")}
    <path d="M132 176 q18 16 36 0 q-6 16 -18 16 q-12 0 -18 -16 Z" fill="#2d8a74" />
    <path d="M150 190 v22" stroke="#1f6b58" strokeWidth="2.4" />
    <rect x="132" y="212" width="36" height="12" rx="6" fill="#2d8a74" />
    <circle cx="145" cy="192" r="2.4" fill="#ffeaa7" />
    <circle cx="155" cy="192" r="2.4" fill="#ffeaa7" />
  </g>
);

const outfit_dino = (): ReactElement => (
  <g>
    {outfitShape("#6fd44e")}
    <path d="M124 200 q26 10 52 0 v22 q-26 10 -52 0 Z" fill="#a8ea8a" />
    <path d="M150 172 l-7 12 h14 Z" fill="#4fae3a" />
    <path d="M134 178 l-6 10 h12 Z" fill="#4fae3a" />
    <path d="M166 178 l-6 10 h12 Z" fill="#4fae3a" />
    {[136, 150, 164].map((cx) => (
      <circle key={cx} cx={cx} cy="212" r="3.2" fill="#4fae3a" />
    ))}
  </g>
);

const outfit_knight = (): ReactElement => (
  <g>
    {outfitShape("#aeb7cf")}
    <rect x="124" y="192" width="52" height="6" fill="#8b95b2" />
    <rect x="124" y="212" width="52" height="6" fill="#8b95b2" />
    <path d="M150 182 l16 8 v14 q0 12 -16 18 q-16 -6 -16 -18 v-14 Z" fill="#d9dff0" />
    <path d="M150 190 l7 4 v8 q0 6 -7 9 q-7 -3 -7 -9 v-8 Z" fill="#e35d5b" />
    <rect x="104" y="192" width="10" height="18" rx="4" fill="#8b95b2" />
    <rect x="186" y="192" width="10" height="18" rx="4" fill="#8b95b2" />
  </g>
);

const outfit_wizard = (): ReactElement => (
  <g>
    <path d="M124 193 q26 -22 52 0 v43 h-52 Z" fill="#4a3a8e" />
    <rect x="108" y="182" width="15" height="42" rx="7.5" fill="#4a3a8e" />
    <rect x="177" y="182" width="15" height="42" rx="7.5" fill="#4a3a8e" />
    <path d="M132 180 q18 14 36 0 q-4 18 -18 18 q-14 0 -18 -18 Z" fill="#6a58bd" />
    {[
      [138, 208, 5],
      [162, 202, 4],
      [150, 224, 4.6],
      [130, 226, 3.2],
      [170, 224, 3.2],
    ].map(([x, y, r]) => star(x, y, r, "#ffeaa7", `w${x}`))}
    <rect x="124" y="230" width="52" height="6" fill="#ffd166" />
  </g>
);

const outfit_rainbow = (): ReactElement => (
  <g>
    {outfitShape("#f5f6ff")}
    {[
      ["#e35d5b", 176],
      ["#ffa94d", 186],
      ["#ffd166", 196],
      ["#6fd44e", 206],
      ["#4f8fd0", 216],
      ["#9b6bd8", 226],
    ].map(([fill, y]) => (
      <rect key={String(y)} x="124" y={y as number} width="52" height="10" fill={fill as string} />
    ))}
    <rect
      x="124"
      y="176"
      width="52"
      height="60"
      rx="17"
      fill="none"
      stroke="#ffffff"
      strokeWidth="3"
    />
    <rect x="108" y="182" width="15" height="42" rx="7.5" fill="#ffd166" />
    <rect x="177" y="182" width="15" height="42" rx="7.5" fill="#9b6bd8" />
    {star(150, 206, 8, "#ffffff", "rb")}
  </g>
);

// ── hats (the head is a circle at 150,152 r=25) ───────────────────────────

const hat_beanie = (): ReactElement => (
  <g>
    <path d="M126 136 a24 24 0 0 1 48 0 Z" fill="#4f8fd0" />
    <rect x="122" y="132" width="56" height="10" rx="5" fill="#e8f0fb" />
    <circle cx="150" cy="108" r="7" fill="#e8f0fb" />
    <path d="M134 122 q16 -8 32 0" stroke="#3d74ab" strokeWidth="2.6" fill="none" />
  </g>
);

const hat_party = (): ReactElement => (
  <g>
    <path d="M150 100 L170 140 H130 Z" fill="#ff8fb0" />
    <path d="M150 100 L160 120 L140 128 Z" fill="#ffd166" />
    <path d="M135 132 h30" stroke="#4f8fd0" strokeWidth="3.4" />
    <circle cx="150" cy="98" r="6" fill="#6fd44e" />
    <circle cx="140" cy="136" r="2.6" fill="#ffffff" />
    <circle cx="160" cy="136" r="2.6" fill="#ffffff" />
  </g>
);

const hat_pirate = (): ReactElement => (
  <g>
    <path d="M118 138 q32 -30 64 0 q-32 10 -64 0 Z" fill="#2c3050" />
    <path d="M120 134 q30 -34 60 0 q-30 -14 -60 0 Z" fill="#3a3f66" />
    <circle cx="150" cy="122" r="6" fill="#f0f2fb" />
    <path
      d="M143 130 l14 -10 M143 120 l14 10"
      stroke="#f0f2fb"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <path d="M118 138 q32 12 64 0" stroke="#ffd166" strokeWidth="3" fill="none" />
  </g>
);

const hat_wizard = (): ReactElement => (
  <g>
    <path d="M150 92 q14 26 26 46 q-26 10 -52 0 q12 -20 26 -46 Z" fill="#4a3a8e" />
    <path d="M124 138 q26 12 52 0 q4 8 0 10 q-26 12 -52 0 q-4 -2 0 -10 Z" fill="#6a58bd" />
    {star(150, 118, 6, "#ffeaa7", "hw1")}
    {star(139, 134, 4, "#ffeaa7", "hw2")}
    {star(162, 132, 4, "#ffeaa7", "hw3")}
  </g>
);

const hat_halo = (): ReactElement => (
  <g>
    <ellipse cx="150" cy="112" rx="27" ry="8" fill="none" stroke="#ffe07a" strokeWidth="6" />
    <ellipse cx="150" cy="112" rx="27" ry="8" fill="none" stroke="#fff6d0" strokeWidth="2" />
    <ellipse
      cx="150"
      cy="112"
      rx="34"
      ry="12"
      fill="none"
      stroke="#ffe07a"
      strokeWidth="2"
      opacity="0.4"
    />
    {[
      [122, 100],
      [178, 100],
      [150, 94],
    ].map(([x, y]) => star(x, y, 3.4, "#fff6d0", `h${x}`))}
  </g>
);

// ── pets (floor, left of the character) ───────────────────────────────────

const pet_bunny = (): ReactElement => (
  <g>
    <circle cx="88" cy="256" r="9" fill="#f2e6f7" />
    <ellipse cx="66" cy="254" rx="25" ry="18" fill="#f7eefb" />
    <ellipse cx="44" cy="235" rx="8" ry="19" fill="#f7eefb" />
    <ellipse cx="60" cy="232" rx="8" ry="21" fill="#f7eefb" />
    <ellipse cx="44" cy="235" rx="4" ry="12" fill="#ffb3c6" />
    <ellipse cx="60" cy="232" rx="4" ry="13" fill="#ffb3c6" />
    <circle cx="52" cy="252" r="15" fill="#ffffff" />
    <circle cx="46" cy="249" r="2.6" fill="#3a3550" />
    <circle cx="57" cy="249" r="2.6" fill="#3a3550" />
    <path d="M51 256 h4 l-2 3 Z" fill="#ff8fb0" />
  </g>
);

const pet_turtle = (): ReactElement => (
  <g>
    <path
      d="M92 258 q10 2 12 8"
      stroke="#5fa86a"
      strokeWidth="6"
      fill="none"
      strokeLinecap="round"
    />
    <ellipse cx="66" cy="256" rx="30" ry="19" fill="#7fc98a" />
    <path d="M36 258 q30 -30 60 0 Z" fill="#3f8558" />
    {[
      [56, 244],
      [76, 244],
      [66, 232],
      [46, 252],
      [86, 252],
    ].map(([cx, cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" fill="#5fa86a" />
    ))}
    <circle cx="30" cy="252" r="11" fill="#8fd49a" />
    <circle cx="26" cy="250" r="2.4" fill="#2d3436" />
    <path d="M50 270 v6 M82 270 v6" stroke="#5fa86a" strokeWidth="5" strokeLinecap="round" />
  </g>
);

const pet_penguin = (): ReactElement => (
  <g>
    <ellipse cx="62" cy="252" rx="24" ry="27" fill="#2f3550" />
    <ellipse cx="62" cy="258" rx="15" ry="19" fill="#f5f6ff" />
    <circle cx="62" cy="228" r="16" fill="#2f3550" />
    <ellipse cx="62" cy="234" rx="10" ry="9" fill="#f5f6ff" />
    <circle cx="56" cy="228" r="2.6" fill="#f5f6ff" />
    <circle cx="68" cy="228" r="2.6" fill="#f5f6ff" />
    <path d="M56 234 h12 l-6 7 Z" fill="#ffa94d" />
    <ellipse cx="38" cy="252" rx="6" ry="15" fill="#232840" />
    <ellipse cx="86" cy="252" rx="6" ry="15" fill="#232840" />
    <path d="M50 276 h14 l-4 6 h-14 Z" fill="#ffa94d" />
    <path d="M62 276 h14 l4 6 h-14 Z" fill="#ffa94d" />
  </g>
);

const pet_fox = (): ReactElement => (
  <g>
    <path d="M90 252 q22 -6 18 -26 q-14 2 -18 26 Z" fill="#f0a05a" />
    <path d="M96 246 q12 -4 11 -16 q-8 2 -11 16 Z" fill="#fff0e0" />
    <ellipse cx="66" cy="256" rx="26" ry="17" fill="#f0a05a" />
    <path d="M40 232 L44 214 L56 226 Z" fill="#f0a05a" />
    <path d="M64 230 L60 212 L48 224 Z" fill="#f0a05a" />
    <path d="M44 228 L46 219 L52 225 Z" fill="#3a2a26" />
    <path d="M60 227 L58 218 L52 224 Z" fill="#3a2a26" />
    <circle cx="52" cy="238" r="16" fill="#f5b473" />
    <path d="M52 238 q-14 4 -12 12 q12 6 24 0 q2 -8 -12 -12 Z" fill="#fff0e0" />
    <circle cx="46" cy="236" r="2.6" fill="#3a2a26" />
    <circle cx="58" cy="236" r="2.6" fill="#3a2a26" />
    <ellipse cx="52" cy="247" rx="3.4" ry="2.6" fill="#3a2a26" />
  </g>
);

const pet_robot = (): ReactElement => (
  <g>
    <rect x="42" y="244" width="48" height="30" rx="8" fill="#8f9ad4" />
    <rect x="52" y="252" width="28" height="14" rx="4" fill="#2f3550" />
    <circle cx="60" cy="259" r="3.4" fill="#00cec9" />
    <circle cx="72" cy="259" r="3.4" fill="#00cec9" />
    <rect x="48" y="220" width="36" height="24" rx="7" fill="#b8c2e6" />
    <circle cx="58" cy="232" r="4.4" fill="#2f3550" />
    <circle cx="74" cy="232" r="4.4" fill="#2f3550" />
    <circle cx="59" cy="231" r="1.6" fill="#f5f6ff" />
    <circle cx="75" cy="231" r="1.6" fill="#f5f6ff" />
    <path d="M66 220 v-8" stroke="#6b76a8" strokeWidth="2.6" />
    <circle cx="66" cy="209" r="4" fill="#ffd166" />
    <rect x="32" y="250" width="10" height="6" rx="3" fill="#6b76a8" />
    <rect x="90" y="250" width="10" height="6" rx="3" fill="#6b76a8" />
    <rect x="50" y="274" width="10" height="6" rx="2" fill="#6b76a8" />
    <rect x="72" y="274" width="10" height="6" rx="2" fill="#6b76a8" />
  </g>
);

const pet_unicorn = (): ReactElement => (
  <g>
    {[
      ["#e35d5b", 0],
      ["#ffa94d", 5],
      ["#ffd166", 10],
      ["#6fd44e", 15],
      ["#4f8fd0", 20],
    ].map(([fill, d]) => (
      <path
        key={String(d)}
        d={`M92 ${242 + (d as number)} q22 4 24 22`}
        stroke={fill as string}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    ))}
    <ellipse cx="64" cy="250" rx="28" ry="20" fill="#fdf4ff" />
    <path
      d="M46 268 v8 M62 270 v8 M78 266 v8"
      stroke="#f0e2f7"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <circle cx="40" cy="228" r="17" fill="#ffffff" />
    <path d="M40 211 l4 -22 l7 21 Z" fill="#ffd166" />
    <path d="M40 211 l4 -22" stroke="#ffb347" strokeWidth="2" />
    {[
      ["#e35d5b", -6],
      ["#ffa94d", 0],
      ["#9b6bd8", 6],
    ].map(([fill, dy]) => (
      <path
        key={String(dy)}
        d={`M52 ${216 + (dy as number)} q18 6 20 22`}
        stroke={fill as string}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    ))}
    <circle cx="34" cy="226" r="2.8" fill="#3a3550" />
    <ellipse cx="26" cy="234" rx="4" ry="3" fill="#ffd6e8" />
    {star(84, 216, 5, "#ffeaa7", "u1")}
    {star(100, 232, 3.4, "#ffeaa7", "u2")}
  </g>
);

/**
 * The second shelf's drawings, keyed by the art id its catalogue row declares.
 *
 * `ExtraArtId` is derived from `EXTRA_ITEMS`, so a missing entry or a typo'd
 * key here is a `tsc --noEmit` build failure — the same completeness check
 * `ART` carries, and the reason no test guards this map either.
 */
export const REST_ART: Record<ExtraArtId, () => ReactElement> = {
  wall_dots,
  wall_brick,
  wall_forest,
  wall_sunset,
  wall_candy,
  wall_galaxy,
  floor_grass,
  floor_checker,
  floor_water,
  floor_clouds,
  floor_lava,
  rug_paw,
  rug_star,
  rug_zigzag,
  rug_galaxy,
  window_day,
  window_night,
  window_rain,
  window_space,
  light_lamp,
  light_lantern,
  light_fairy,
  light_disco,
  plant_flower,
  plant_mushroom,
  plant_bonsai,
  plant_carnivore,
  poster_music,
  poster_dino,
  poster_map,
  poster_medal,
  toy_ball,
  toy_blocks,
  toy_teddy,
  toy_robot,
  toy_castle,
  outfit_hoodie,
  outfit_dino,
  outfit_knight,
  outfit_wizard,
  outfit_rainbow,
  hat_beanie,
  hat_party,
  hat_pirate,
  hat_wizard,
  hat_halo,
  pet_bunny,
  pet_turtle,
  pet_penguin,
  pet_fox,
  pet_robot,
  pet_unicorn,
};
