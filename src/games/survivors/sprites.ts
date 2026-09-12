// The cast this game draws, and the one place that says which character plays
// which part. Beside the scene rather than in `@shared`, so every byte of it
// rides the lazy `game-survivors-*` chunk and a child who never opens this game
// downloads none of it.
//
// WHY A URL AT ALL. Phaser's `load.atlas(key, textureURL, atlasURL)` wants two
// URLs, and Vite content-hashes every emitted asset - so the sheet and its atlas
// have unrelated names at build time and cannot be derived from one base path.
// That is exactly why `loadStudioAtlas` in the copied adapter is unusable here
// and the scene calls `load.atlas` itself. The manifest comes in as a parsed
// object instead, because the scene reads its clips and pivot directly.
//
// WHY THE SHEETS USE `new URL(...)` AND THE ATLASES USE `?url` - TWO FORMS ON
// PURPOSE, and the asymmetry is measured rather than stylistic.
//
// `import png from "./sprites/robot.png?url"` does not build. Not in the app: in
// `vite.config.ts`. Vite pre-bundles its own config with esbuild, esbuild has no
// `.png` loader, and the config's import graph reaches this file:
//
//   vite.config.ts -> src/build/pages.ts -> src/portal/games.ts
//     -> src/portal/gamesRest.ts   <- 28 dynamic import() loaders sit beside
//                                     the metas, and esbuild follows them
//       -> games/survivors/index.ts -> SurvivorsGame.tsx
//         -> import("./SurvivorsScene") -> this file -> the .png
//
// The error names THIS file while no static import path to it exists, which is
// what makes it hard to read: `games.ts` is imported for metadata and drags the
// whole loader module in behind it. `new URL("./x.png", import.meta.url).href`
// is not an import statement, so esbuild leaves it alone and never needs a
// loader, while Vite still rewrites it to the hashed URL for the app build.
// Bisected 2026-09-12: swapping ONLY the five sheets and leaving all five
// `.atlas.json?url` imports in place built clean, so `?url` on JSON is fine and
// raster was the whole fault. Both forms emit identical hashed assets.
//
// `assetsInlineLimit` is Vite's default 4096 B and the smallest sheet is 7.9 KB,
// so all five emit as real files rather than base64 inside the chunk - measured
// on the built artifact: 7.9 / 11.0 / 12.2 / 16.8 / 26.1 KB under `dist/assets/`.
// The workbox `globPatterns` sweeps html/css/js/svg/woff2 and NOT raster, so no
// sheet can reach the precache and no `globIgnores` entry is owed - unlike a new
// JS chunk, which would need all three changes
// (.claude/rules/precache-glob-sweeps-new-chunks.md).

import type { Manifest } from "@shared/sprites/manifest";
import type { EnemyKind } from "./logic";

const robotPng = new URL("./sprites/robot.png", import.meta.url).href;
import robotAtlas from "./sprites/robot.atlas.json?url";
import robotManifest from "./sprites/robot.manifest.json";

const batPng = new URL("./sprites/bat.png", import.meta.url).href;
import batAtlas from "./sprites/bat.atlas.json?url";
import batManifest from "./sprites/bat.manifest.json";

const slimePng = new URL("./sprites/slime.png", import.meta.url).href;
import slimeAtlas from "./sprites/slime.atlas.json?url";
import slimeManifest from "./sprites/slime.manifest.json";

const crabPng = new URL("./sprites/crab.png", import.meta.url).href;
import crabAtlas from "./sprites/crab.atlas.json?url";
import crabManifest from "./sprites/crab.manifest.json";

const golemPng = new URL("./sprites/golem.png", import.meta.url).href;
import golemAtlas from "./sprites/golem.atlas.json?url";
import golemManifest from "./sprites/golem.manifest.json";

export type CastKey = "robot" | "bat" | "slime" | "crab" | "golem";

export interface CastEntry {
  /** The hashed URL of the sheet. */
  png: string;
  /** The hashed URL of the atlas JSON. */
  atlas: string;
  manifest: Manifest;
}

/**
 * The five clip ids every studio character carries. Written out rather than read
 * from a manifest at runtime because `assert-tier.mjs` greps this game's SOURCE
 * for all five as quoted strings - a showcase game that only ever names two of
 * them has not wired the other three, and the gate is right to say so.
 */
export const CLIPS = ["idle", "walk", "attack", "hurt", "ko"] as const;
export type Clip = (typeof CLIPS)[number];

/**
 * Body units per authored pixel, from the studio's own rig. DERIVED rather than
 * typed in: at `unit = 5` and an export `scale` of 1, one authored pixel is a
 * 5x5 block on the sheet, so drawing at 1/(5 * scale) puts exactly one authored
 * pixel on one arena unit and the pixel grid survives. Re-exporting at scale 2
 * changes the manifest and this follows it; a hardcoded 0.2 would silently
 * halve the cast.
 *
 * Measured 2026-09-12 against all five manifests - the hierarchy falls out of
 * the ART rather than out of per-character constants, which is why one rule
 * serves the whole cast:
 *
 *     robot 48   crab 30   bat 27   slime 23   golem 61   (arena units tall)
 *
 * The arena is 420x560 and its canvas FITs to at most 420 CSS px, so an arena
 * unit is at most one CSS pixel and the art is never upscaled past 1:1.
 */
const UNIT = 5;
export const scaleFor = (m: Manifest): number => 1 / (UNIT * m.scale);

/**
 * `meta.image` inside each atlas names the studio's own export filename
 * (`robot--snes16.png`), which is NOT what ships here. Phaser fetches the
 * `textureURL` it is handed and reads only the frame table out of the atlas, so
 * the mismatch is inert - noted because it looks like a bug on every first read.
 */
export const CAST: Record<CastKey, CastEntry> = {
  robot: { png: robotPng, atlas: robotAtlas, manifest: robotManifest as unknown as Manifest },
  bat: { png: batPng, atlas: batAtlas, manifest: batManifest as unknown as Manifest },
  slime: { png: slimePng, atlas: slimeAtlas, manifest: slimeManifest as unknown as Manifest },
  crab: { png: crabPng, atlas: crabAtlas, manifest: crabManifest as unknown as Manifest },
  golem: { png: golemPng, atlas: golemAtlas, manifest: golemManifest as unknown as Manifest },
};

export const CAST_KEYS = Object.keys(CAST) as CastKey[];

/** The ship. A hero at 48 units, the tallest thing in the arena until the boss. */
export const PLAYER: CastKey = "robot";

/**
 * Which character plays each shape, and the sizes are why.
 *
 * `runner` is the small fast one (r 9) -> the BAT at 27 units.
 * `orb` drifts and takes two hits (r 12) -> the SLIME at 23.
 * `brute` is the slow tough one (r 17) -> the CRAB at 30.
 *
 * The golem is deliberately absent: it is 61 units and it is the BOSS of task 7,
 * not a shape that wanders in at 55 seconds. It is loaded anyway so the boss
 * costs no second download later, and because a cast member nothing references
 * would be dropped from the chunk entirely.
 *
 * ONE MISMATCH WORTH WATCHING, measured rather than discovered in play: `brute`
 * collides at r 17, a 34-unit circle, against a crab drawn 30 units tall - so it
 * hits very slightly wider than it looks. Art larger than its hitbox is the
 * forgiving direction and the other two have it; this one is the other way by
 * four units. Eyeball it before deciding whether the crab wants a nudge.
 */
export const FOR_ENEMY: Record<EnemyKind, CastKey> = {
  runner: "bat",
  orb: "slime",
  brute: "crab",
};
