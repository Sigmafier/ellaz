import type { ReactElement } from "react";
import { ART } from "./art";
import { artFor, type ItemCategory } from "./items";

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

export function Scene({
  equipped,
  /** Any CSS length. Cards pass "100%"; the World screen uses the default. */
  size = "min(90vw, 60vh, 420px)",
}: {
  equipped: Record<string, string>;
  size?: string;
}) {
  const draw = (category: ItemCategory) => ART[artFor(category, equipped[category])]();

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
