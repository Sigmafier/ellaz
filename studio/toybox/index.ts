// The engine's door for NODE callers - a test, a gate, a harness. Everything a
// game's own test needs is exported from here: the loader, the compiler, the
// step, the hashes, the view. A browser page does not import this file (the
// loader reads the disk); it imports the cell modules under cells/ directly,
// the way games/fight/page/main.ts does.
//
// What stays behind this door is the rule the boundary test holds: toybox/
// imports only toybox/* and ../adapters/*, and nothing under games/. The
// engine knows where games LIVE (`gameDir`) and nothing about any one of them.

export * from "./sim/index";
export { GAMES, gameDir, loadMode } from "./data/load";
export type { LoadedFight, SpriteSet } from "./data/load";
