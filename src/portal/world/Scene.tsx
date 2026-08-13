import type { ReactElement } from "react";
import { ART } from "./art";
import { artFor, type AnyArtId, type ItemCategory, type StreakArtId } from "./items";

// The room. One SVG, one composite of whatever the player has equipped.
//
// Shop cards render this same component with a single slot overridden, so the
// thumbnail a child taps is literally the room they are about to get.

/**
 * The child. Drawn here rather than in `art.tsx` because it is not shoppable —
 * outfits and hats decorate this body, they do not replace it. Legs go down
 * first so the torso covers their tops; the head is a plain circle with two
 * dots, deliberately simple and deliberately original.
 */
function CharacterBase(): ReactElement {
  return (
    <g>
      <rect x="134" y="226" width="13" height="28" rx="6" fill="#3d4270" />
      <rect x="153" y="226" width="13" height="28" rx="6" fill="#3d4270" />
      <ellipse cx="139" cy="256" rx="12" ry="6" fill="#262b52" />
      <ellipse cx="161" cy="256" rx="12" ry="6" fill="#262b52" />
      <circle cx="150" cy="152" r="25" fill="#f2c9a0" />
      <circle cx="142" cy="149" r="3.2" fill="#2d2d3f" />
      <circle cx="158" cy="149" r="3.2" fill="#2d2d3f" />
      <path
        d="M142 161 q8 7 16 0"
        stroke="#2d2d3f"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

// ── the streak shelf ───────────────────────────────────────────────────────
//
// The three things only a run of days unlocks, drawn here rather than in
// `art.tsx` for the same practical reason `CharacterBase` is: this is the file
// that owns what the room looks like, and `art.tsx` was owned by a parallel
// lane while this shipped — widening the `ArtId` it is keyed by would have
// red-built their file underneath them.
//
// The fold-in is mechanical and should happen when the lanes meet: move these
// three functions and `STREAK_ART`'s rows into `art.tsx`, move `STREAK_ITEMS`
// into `ITEMS`, and delete `StreakArtId` / `AnyArtId`. No persisted id moves,
// and nothing else changes. Until then this is one extra map in the file that
// already merges them, rather than a second registry somewhere else.
//
// Same conventions as `art.tsx` in every way that matters: original geometry
// only, no binary assets, authored directly in this 300x300 space so a piece
// knows where it lives. Layout bands: wall y 0-210 · floor y 210-300 ·
// character x 110-190.

/**
 * A flame rooted at (x, y) and growing upward. `scale` 1 is 40 units tall.
 *
 * One shape at three sizes — the poster, the chest emblem and the bird's crest
 * are the same drawing, which is what makes the shelf read as one set rather
 * than three unrelated things that happen to be locked together. It is also the
 * flame on the streak chip, so a child who has seen the number knows what the
 * shop is asking for without reading a word.
 */
function flame(
  x: number,
  y: number,
  scale: number,
  outer: string,
  inner: string,
  key?: string,
): ReactElement {
  return (
    <g key={key} transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M0 0 C-14 -9 -13 -26 0 -40 C4 -30 12 -28 12 -18 C18 -22 20 -10 14 -4 C10 -1 5 1 0 0 Z"
        fill={outer}
      />
      <path d="M0 -4 C-7 -10 -6 -18 0 -26 C2 -20 7 -19 7 -13 C7 -8 4 -4 0 -4 Z" fill={inner} />
    </g>
  );
}

/** Day 3 — on the wall, where every poster hangs. */
const poster_flame = (): ReactElement => (
  <g>
    <rect x="28" y="36" width="72" height="88" rx="6" fill="#e17055" />
    <rect x="34" y="42" width="60" height="76" rx="3" fill="#241a35" />
    {flame(64, 110, 1.4, "#ffa94d", "#ffeaa7", "big")}
    <circle cx="44" cy="52" r="2.6" fill="#fdcb6e" />
    <circle cx="86" cy="58" r="2.2" fill="#fdcb6e" />
    <circle cx="82" cy="48" r="1.6" fill="#fdcb6e" />
  </g>
);

/** Day 7 — the torso and arms; the body underneath is `CharacterBase`. */
const outfit_flame = (): ReactElement => (
  <g>
    <rect x="124" y="176" width="52" height="60" rx="17" fill="#2f2a48" />
    <rect x="108" y="182" width="15" height="42" rx="7.5" fill="#2f2a48" />
    <rect x="177" y="182" width="15" height="42" rx="7.5" fill="#2f2a48" />
    <rect x="124" y="226" width="52" height="7" fill="#e17055" />
    {flame(150, 222, 0.85, "#ffa94d", "#ffeaa7", "chest")}
  </g>
);

/** Day 14 — standing on the floor, left of the character, like every pet. */
const pet_firebird = (): ReactElement => (
  <g>
    <path
      d="M92 250 C112 246 120 232 118 214"
      stroke="#e17055"
      strokeWidth="9"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M92 254 C114 256 124 248 128 236"
      stroke="#ffa94d"
      strokeWidth="7"
      fill="none"
      strokeLinecap="round"
    />
    <ellipse cx="70" cy="250" rx="27" ry="18" fill="#e17055" />
    <path d="M62 244 C74 232 88 232 94 240 C84 248 70 250 62 244 Z" fill="#ffa94d" />
    <circle cx="50" cy="230" r="16" fill="#ff9f43" />
    <path d="M36 231 L22 235 L36 239 Z" fill="#fdcb6e" />
    <circle cx="46" cy="227" r="2.8" fill="#2d3436" />
    {flame(52, 216, 0.4, "#ffeaa7", "#fff6d5", "crest")}
    <path d="M62 264 v8 M78 264 v8" stroke="#c0553a" strokeWidth="4" strokeLinecap="round" />
  </g>
);

const STREAK_ART: Record<StreakArtId, () => ReactElement> = {
  poster_flame,
  outfit_flame,
  pet_firebird,
};

/**
 * Everything the room can draw, from both maps.
 *
 * The merge is exhaustive by TYPE rather than by convention: `AnyArtId` is the
 * union of both key sets, so an art id with no drawing behind it is a
 * `tsc --noEmit` failure here, exactly as it was when there was only one map.
 */
const ALL_ART: Record<AnyArtId, () => ReactElement> = { ...ART, ...STREAK_ART };

export function Scene({
  equipped,
  /** Any CSS length. Cards pass "100%"; the World screen uses the default. */
  size = "min(90vw, 60vh, 420px)",
}: {
  equipped: Record<string, string>;
  size?: string;
}) {
  const draw = (category: ItemCategory) => ALL_ART[artFor(category, equipped[category])]();

  return (
    // dir="ltr" is load-bearing: the app is Hebrew RTL by default and a
    // mirrored room would flip the child, the pet and the poster to the wrong
    // walls. See .claude/rules/rtl-spatial-grid-dir-ltr.md.
    <div dir="ltr" style={{ width: size, maxWidth: "100%", margin: "0 auto" }}>
      <svg
        viewBox="0 0 300 300"
        role="img"
        aria-label="my room"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          borderRadius: "var(--radius-3)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        {/* z-order: back of the room to front of the room. */}
        {draw("wall")}
        {draw("floor")}
        {draw("rug")}
        {draw("poster")}
        {draw("plant")}
        <CharacterBase />
        {draw("outfit")}
        {draw("hat")}
        {draw("pet")}
      </svg>
    </div>
  );
}
