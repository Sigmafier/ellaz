// Hidden-object ("find the character in the crowd") — pure logic. A crowd of
// placed characters (original emoji cast, no trademarked characters); the player
// must find the few on the target list. Deterministic given a RNG. No DOM.
import { shuffle } from "@shared/rng";

export interface Placed {
  id: string;
  icon: string;
  x: number; // 0..100 scene coords
  y: number;
}

export interface HiddenState {
  placed: Placed[];
  targets: string[]; // ids to find
  found: string[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Lay `icons` out as a JITTERED GRID, then choose `numTargets` of them to find.
//
// A grid rather than a pure scatter, because a Where's-Wally crowd is dense and
// every face must stay findable: random placement at a big crowd size buries
// characters under one another (later ones paint on top), so a target could be
// impossible to tap. A grid packs them tightly and evenly; the per-cell jitter
// (up to ~35% of a cell) keeps it from reading as a spreadsheet. Coordinates
// stay inside the same 6..94 / 12..92 window the scatter used, so nothing at
// the render layer changes.
export function newGame(
  icons: string[],
  numTargets: number,
  rng: () => number = Math.random,
): HiddenState {
  const n = icons.length;
  const cols = Math.max(1, Math.round(Math.sqrt(n * 1.05))); // slightly wider than tall
  const rows = Math.ceil(n / cols);
  const cellW = 84 / cols;
  const cellH = 76 / rows;
  const shuffled = shuffle(icons, rng);
  const placed: Placed[] = shuffled.map((icon, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const jx = (rng() - 0.5) * cellW * 0.7;
    const jy = (rng() - 0.5) * cellH * 0.7;
    return {
      id: `o${i}`,
      icon,
      x: clamp(8 + cellW * (c + 0.5) + jx, 6, 94),
      y: clamp(14 + cellH * (r + 0.5) + jy, 12, 92),
    };
  });
  const targets = shuffle(placed, rng)
    .slice(0, Math.min(numTargets, placed.length))
    .map((p) => p.id);
  return { placed, targets, found: [] };
}

export type FindResult = { kind: "found"; id: string } | { kind: "not-target" } | { kind: "already" };

export function tapObject(state: HiddenState, id: string): { state: HiddenState; result: FindResult } {
  if (!state.targets.includes(id)) return { state, result: { kind: "not-target" } };
  if (state.found.includes(id)) return { state, result: { kind: "already" } };
  return { state: { ...state, found: [...state.found, id] }, result: { kind: "found", id } };
}

export function isWon(state: HiddenState): boolean {
  return state.found.length === state.targets.length;
}

export function targetIcons(state: HiddenState): Array<{ id: string; icon: string; found: boolean }> {
  return state.targets.map((id) => {
    const p = state.placed.find((o) => o.id === id)!;
    return { id, icon: p.icon, found: state.found.includes(id) };
  });
}
