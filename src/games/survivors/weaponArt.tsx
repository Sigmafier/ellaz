import type { ReactElement } from "react";
import type { WeaponId } from "./logic";

// The five weapons' drawings, for the entrance pick, the level-up cards and the
// HUD slots. Original line art in the same hand as `upgradeArt.tsx`, and for the
// same reasons: inline SVG rather than emoji, and never the only channel - every
// place these appear also carries the weapon's name in the player's language.
//
// EACH ONE IS DRAWN IN ITS OWN INK, the same ink the scene uses for that weapon
// in the arena (`WEAPON_INK` / `BLADE_INK` in `SurvivorsScene.ts`), so the
// picture on the card and the thing flying across the screen read as one weapon.
// Those inks are colour; the SILHOUETTES are what tell the five apart - a streak,
// a curve, a ring of dots, three crescents, a saucer - so a player who cannot use
// hue loses nothing.
//
// A `Record<WeaponId, ...>`, so a sixth weapon without a drawing fails the build
// by name. No test mirrors the list; the type already holds it.

/** The same inks as the arena, as CSS. Every one is light against the dark card and HUD. */
export const WEAPON_INK_CSS: Record<WeaponId, string> = {
  bolt: "#d8fbff",
  arc: "#ffd166",
  burst: "#ff5ce1",
  blades: "#ff8fc0",
  drone: "#7df9a6",
};

const svg = (size: number, children: ReactElement | ReactElement[]) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const WEAPON_ART: Record<WeaponId, (size?: number) => ReactElement> = {
  // The bolt: one straight streak with a bright head.
  bolt: (size = 28) =>
    svg(size, [
      <path key="a" d="M4 20L18 6" />,
      <circle key="b" cx="18.5" cy="5.5" r="2.5" fill="currentColor" />,
    ]),
  // The arc: a shot bending round a corner.
  arc: (size = 28) =>
    svg(size, [
      <path key="a" d="M4 20C4 10 9 5 18 5" />,
      <circle key="b" cx="18.5" cy="5" r="2.5" fill="currentColor" />,
    ]),
  // The burst: a ring of seven dots around a centre.
  burst: (size = 28) =>
    svg(
      size,
      [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
        return (
          <circle
            key={i}
            cx={12 + 8 * Math.cos(a)}
            cy={12 + 8 * Math.sin(a)}
            r="1.8"
            fill="currentColor"
            stroke="none"
          />
        );
      }),
    ),
  // The blades: three crescents turning around a small hub.
  blades: (size = 28) =>
    svg(size, [
      <circle key="hub" cx="12" cy="12" r="2" fill="currentColor" />,
      ...[0, 120, 240].map((d) => (
        <path key={d} transform={`rotate(${d} 12 12)`} d="M7 6.5Q12 1 17 6.5Q12 4 7 6.5Z" fill="currentColor" />
      )),
    ]),
  // The drone: a saucer with a dome, and a dotted line under it where it hovers.
  drone: (size = 28) =>
    svg(size, [
      <path key="dome" d="M8 12a4 4 0 018 0" />,
      <ellipse key="body" cx="12" cy="13.5" rx="9" ry="3" fill="currentColor" />,
      <path key="hover" d="M6 19h2M11 19h2M16 19h2" />,
    ]),
};
