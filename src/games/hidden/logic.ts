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

// Scatter `icons` across the scene, then choose `numTargets` of them to find.
export function newGame(
  icons: string[],
  numTargets: number,
  rng: () => number = Math.random,
): HiddenState {
  const placed: Placed[] = icons.map((icon, i) => ({
    id: `o${i}`,
    icon,
    x: 6 + rng() * 88,
    y: 12 + rng() * 80,
  }));
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
