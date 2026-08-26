import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A game's restart must clear whatever its input handlers are gated on.
 *
 * Seventeen games refuse a tap while the run is over - `if (won) return`,
 * `if (solved) return`, `if (dead) return`. Sixteen of them hold that flag
 * either in state derived from the board (so a fresh board clears it) or in a
 * `useState` their restart resets. `onestroke` held it in a `useState` and its
 * restart rubbed the drawn line out WITHOUT resetting it, so after a win the
 * board came back looking fresh, answered nothing, and showed the winning
 * clock. Nothing threw, the restart button was visible and clickable, and the
 * markup changed - so every cheaper check passed
 * (scripts/repro/repro-onestroke-restart-after-win.mjs is the browser evidence).
 *
 * This is the CLASS, not the instance: it reads every game's own source and
 * asks the one question that separates the two shapes.
 *
 * A flag DERIVED from the board (`const solved = isSolved(state)`) needs no
 * setter - dealing a new board is what clears it - so those are exempt by
 * construction rather than by name.
 */

const GAMES = join(__dirname);
const ids = readdirSync(GAMES, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((id) => {
    try { readFileSync(join(GAMES, id, "meta.ts"), "utf8"); return true; } catch { return false; }
  });

/** Every `.tsx` a game ships, joined - a game may split its renderer up. */
function sourceOf(id: string): string {
  return readdirSync(join(GAMES, id))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => readFileSync(join(GAMES, id, f), "utf8"))
    .join("\n");
}

/**
 * `if (won) return` / `if (lockRef.current) return`, as {name, isRef}.
 *
 * REFS COUNT. `shadows` refuses a tap on `lockRef.current` and `sequence` on
 * `solvedRef.current` - a restart that dealt a new board without clearing those
 * would hand back exactly the same inert screen as the state version, and a
 * check that only read `useState` would call it clean.
 */
function gatesIn(src: string): { name: string; isRef: boolean }[] {
  const out = new Map<string, boolean>();
  for (const m of src.matchAll(/if \(([A-Za-z][A-Za-z0-9_]*)(\.current)?\) return/g)) {
    out.set(m[1], Boolean(m[2]));
  }
  return [...out].map(([name, isRef]) => ({ name, isRef }));
}

/** Is this flag a `useState`, rather than derived from the board or a ref? */
const isUseState = (src: string, flag: string) =>
  new RegExp(`const \\[${flag}, set[A-Z][A-Za-z0-9_]*\\] = useState`).test(src);

/** The setter a `useState` flag was declared with. */
function setterOf(src: string, flag: string): string | null {
  const m = src.match(new RegExp(`const \\[${flag}, (set[A-Za-z0-9_]*)\\] = useState`));
  return m ? m[1] : null;
}

/** What `onRestart` is wired to, as bare identifiers we can look for. */
function restartTargets(src: string): string[] {
  const m = src.match(/onRestart=\{([^}]*)\}/);
  if (!m) return [];
  return [...m[1].matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)].map((x) => x[0]);
}

/**
 * The body of `const <name> = useCallback(...)`, by BALANCING the parentheses.
 *
 * A regex was tried first and is why this comment exists: `[\s\S]*?\n  \);`
 * ran straight past a callback that ends `}, []);` and swallowed the next few
 * hundred lines - including the very `reset` it was meant to prove absent - so
 * the gate reported PASS over the planted defect. Watched failing before this
 * was trusted.
 */
function bodyOf(src: string, name: string): string | null {
  const head = src.indexOf(`const ${name} = useCallback(`);
  if (head === -1) return null;
  let i = src.indexOf("(", head + `const ${name} = useCallback`.length);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "(") depth++;
    else if (src[j] === ")") {
      depth--;
      if (depth === 0) return src.slice(i, j + 1);
    }
  }
  return null;
}

describe("a game's restart clears whatever its input is gated on", () => {
  it("finds the games to check at all", () => {
    // The positive control. Every assertion below passes vacuously over an
    // empty list, and an empty list is exactly what a broken reader produces.
    expect(ids.length).toBeGreaterThan(30);
    const gated = ids.filter((id) => gatesIn(sourceOf(id)).length > 0);
    expect(gated.length).toBeGreaterThan(10);
    // And both SHAPES must be in the population, or half the check is dead
    // code that nobody would notice: `onestroke` gated on state, `shadows` on
    // a ref.
    expect(gatesIn(sourceOf("onestroke")).some((g) => !g.isRef)).toBe(true);
    expect(gatesIn(sourceOf("shadows")).some((g) => g.isRef)).toBe(true);
  });

  for (const id of ids) {
    const src = sourceOf(id);
    // A flag DERIVED from the board (`const solved = isSolved(state)`) needs no
    // clearing - dealing a new board is what clears it - so only `useState`
    // flags and refs are in scope.
    const gates = gatesIn(src).filter((g) => {
      if (!g.isRef) return isUseState(src, g.name);
      // A ref read as `if (x.current) return` is one of TWO opposite things,
      // and the name cannot tell them apart: an INPUT GATE the run sets and
      // clears (`lockRef`, `solvedRef`), or a RUN-ONCE LATCH that must survive
      // a restart (`mounted`, `started`, `firedRef`). The discriminator is the
      // game's own code: a gate is something it sets back to false somewhere;
      // a latch never is. Guessing from the name flagged ten correct games.
      //
      // KNOWN LIMIT, and it bit while proving this: the population is derived
      // from the same file the assertion reads, so DELETING a game's only
      // `x.current = false` drops it out of scope rather than failing it. The
      // mutation that proves this arm therefore MOVES the clear off the restart
      // path instead of removing it. A game that stops clearing a gate anywhere
      // at all is a different change, and its own `logic.test.ts` covers it.
      return src.includes(`${g.name}.current = false`);
    });
    if (gates.length === 0) continue;

    it(`${id}: restart clears ${gates.map((g) => g.name).join(", ")}`, () => {
      const targets = restartTargets(src);
      expect(targets.length).toBeGreaterThan(0);

      for (const gate of gates) {
        const { name: flag, isRef } = gate;
        const setter = isRef ? null : setterOf(src, flag);
        if (!isRef) expect(setter).not.toBeNull();
        // What "cleared" looks like for each shape.
        const needle = isRef ? `${flag}.current = false` : `${setter}(false)`;

        // The handler either resets the flag itself, or calls a function whose
        // body does. One hop is enough: every restart here is `reset()`,
        // `restart`, or a one-line arrow onto one of those.
        const inline = src.slice(src.indexOf("onRestart={"), src.indexOf("onRestart={") + 200).includes(needle);
        const viaCallee = targets.some((name) => {
          const fn = bodyOf(src, name);
          if (!fn) return false;
          if (fn.includes(needle)) return true;
          // one more hop: `restart = useCallback(() => start(level))`
          return [...fn.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\(/g)].some((c) => {
            const inner = bodyOf(src, c[1]);
            return Boolean(inner && inner.includes(needle));
          });
        });

        expect(
          inline || viaCallee,
          `${id}: input is gated on \`${flag}\` but restart never does \`${needle}\` — ` +
            `after a win the board comes back looking fresh and answering nothing`,
        ).toBe(true);
      }
    });
  }
});
