import { describe, it, expect } from "vitest";
import { newGame, tapObject, isWon, targetIcons } from "./logic";

const ICONS = ["🐶", "🐱", "🦊", "🐰", "🐻", "🐼", "🐨", "🐵"];

function seq(vals: number[]) {
  let i = 0;
  return () => vals[i++ % vals.length];
}

// Build N distinct emoji for crowd-size tests.
function makeIcons(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String.fromCodePoint(0x1f400 + i));
}

// Difficulty crowd/target pairs mirroring Hidden.tsx (easy/medium/hard).
const CONFIGS = [
  { name: "easy", crowd: 24, targets: 3 },
  { name: "medium", crowd: 40, targets: 4 },
  { name: "hard", crowd: 56, targets: 5 },
];

describe("hidden-object logic", () => {
  it("places every icon and picks the requested number of targets", () => {
    const s = newGame(ICONS, 3, seq([0.5]));
    expect(s.placed.length).toBe(ICONS.length);
    expect(s.targets.length).toBe(3);
    // positions within bounds
    for (const p of s.placed) {
      expect(p.x).toBeGreaterThanOrEqual(6);
      expect(p.x).toBeLessThanOrEqual(94);
      expect(p.y).toBeGreaterThanOrEqual(12);
      expect(p.y).toBeLessThanOrEqual(92);
    }
  });

  it("marks a target found, ignores non-targets and repeats", () => {
    const s = newGame(ICONS, 2, seq([0.3, 0.7]));
    const targetId = s.targets[0];
    const nonTarget = s.placed.find((p) => !s.targets.includes(p.id))!.id;

    expect(tapObject(s, nonTarget).result.kind).toBe("not-target");

    const r1 = tapObject(s, targetId);
    expect(r1.result).toEqual({ kind: "found", id: targetId });
    expect(r1.state.found).toContain(targetId);

    expect(tapObject(r1.state, targetId).result.kind).toBe("already");
  });

  it("wins when all targets are found", () => {
    let s = newGame(ICONS, 3, seq([0.2, 0.8, 0.4, 0.6]));
    for (const id of [...s.targets]) s = tapObject(s, id).state;
    expect(isWon(s)).toBe(true);
    expect(targetIcons(s).every((t) => t.found)).toBe(true);
  });

  // Difficulty progression: each difficulty is just a (crowd, targets) pair fed
  // to newGame. Verify the invariants hold across all three sizes.
  describe.each(CONFIGS)("difficulty $name ($crowd crowd, $targets targets)", ({ crowd, targets }) => {
    const icons = makeIcons(crowd);

    it("places the whole crowd", () => {
      const s = newGame(icons, targets, seq([0.5, 0.25, 0.75]));
      expect(s.placed.length).toBe(crowd);
    });

    it("picks exactly numTargets, all a subset of placed", () => {
      const s = newGame(icons, targets, seq([0.1, 0.4, 0.6, 0.9, 0.3]));
      expect(s.targets.length).toBe(targets);
      const placedIds = new Set(s.placed.map((p) => p.id));
      // targets ⊆ placed, and no duplicate target ids
      expect(new Set(s.targets).size).toBe(targets);
      for (const id of s.targets) expect(placedIds.has(id)).toBe(true);
    });

    it("wins only after ALL targets are found", () => {
      let s = newGame(icons, targets, seq([0.2, 0.55, 0.8, 0.35, 0.65, 0.15]));
      const ids = [...s.targets];
      // Not won until the last target is tapped.
      for (let k = 0; k < ids.length - 1; k++) {
        s = tapObject(s, ids[k]).state;
        expect(isWon(s)).toBe(false);
      }
      s = tapObject(s, ids[ids.length - 1]).state;
      expect(isWon(s)).toBe(true);
      expect(targetIcons(s).every((t) => t.found)).toBe(true);
    });
  });
});
