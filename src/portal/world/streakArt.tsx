import type { ReactElement } from "react";
import type { StreakArtId } from "./items";

// ── the streak shelf ───────────────────────────────────────────────────────
//
// The three things only a run of days unlocks, drawn here rather than in
// `art.tsx` because it is keyed by its own art-id union, `StreakArtId`. That
// separation used to be an accident of two parallel lanes; it now earns its
// place, because `roomArt.ts` merges three maps rather than two and each one
// is exhaustive over its OWN half of the catalogue. Folding them together
// would buy nothing and would cost the per-half `tsc` check.
//
// SHELL, not lazy: a returning player can already have these equipped, so
// they have to be on screen at first paint with no fetch. `artRest.tsx` is
// the half that may arrive late — see `roomArt.ts`.
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

export const STREAK_ART: Record<StreakArtId, () => ReactElement> = {
  poster_flame,
  outfit_flame,
  pet_firebird,
};
