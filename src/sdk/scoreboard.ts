// The stateful half of the score contract — where a personal best is kept.
//
// Split from score.ts on purpose, the same way wallet.ts is split from
// economy.ts: score.ts is the pure ranking policy and stays testable with no
// storage at all, and this module is the thin layer that remembers.
//
// The SaveStore is injected rather than constructed here so the port is
// testable in the node vitest env (no localStorage) — the same convention as
// the injectable `rng` in every games/<id>/logic.ts.
import { bestOf, directionFor, isBetter, isRankable } from "./score";
import type { SaveStore, ScorePort, ScoreReport, ScoreResult } from "./types";

export type { ScorePort, ScoreReport, ScoreResult };

/**
 * Namespace for persisted bests.
 *
 * Deliberately NOT the bare `best` key: six games (bees, echo, math, n2048,
 * reaction, snake) already store their own ad-hoc `best`, and silently reading
 * or overwriting those would either import a number ranked by different rules
 * or destroy a child's record. Those games migrate deliberately, one at a time.
 */
export const SCORE_KEY_PREFIX = "score:";

const keyFor = (board: string) => `${SCORE_KEY_PREFIX}${board}`;

/** The board a pre-Wave-B `best` belongs to. It only ever held one number. */
const DEFAULT_BOARD = "default";

export interface ScorePortOptions {
  /**
   * A key this game wrote its record under BEFORE the score port existed.
   *
   * Six games (bees, echo, math, n2048, reaction, snake) each kept their own
   * `best`. Pointing them at `ctx.score.best()` without this would show every
   * existing player a record of zero — a silent, unrecoverable-looking loss on
   * a platform whose saves live only on the device.
   *
   * The adoption is READ-THROUGH and one-directional: the old key is never
   * written, never deleted, and never consulted once a namespaced best exists.
   * Nothing to roll back, and no window where the two disagree.
   */
  legacyKey?: string;
  /**
   * Called when a report turns out to be a new personal best.
   *
   * A CALLBACK rather than a direct publish, so this module keeps knowing
   * nothing about the network — score.ts is the ranking policy, this is the
   * thin layer that remembers, and neither should learn what a board is. The
   * host wires it to the cloud; a test wires it to a spy; a game that is not
   * on a board wires nothing.
   *
   * It must never throw into a win, so it is called inside a try/catch here
   * rather than trusting every future caller to be careful.
   */
  onPersonalBest?: (report: { board: string; value: number; unit: string }) => void;
}

export function createScorePort(store: SaveStore, opts: ScorePortOptions = {}): ScorePort {
  /**
   * Read a stored best, treating anything unrankable as ABSENT rather than as a
   * record. A corrupt or hand-edited save must not permanently block every
   * future personal best — and `store.get` itself can throw (incognito, quota,
   * disabled storage), which must never reach a win path.
   */
  function readBest(board: string): number | undefined {
    try {
      const raw = store.get<unknown>(keyFor(board), undefined);
      if (isRankable(raw as number)) return raw as number;
      return board === DEFAULT_BOARD ? readLegacy() : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * The pre-Wave-B record, or undefined if there is not a real one.
   *
   * A stored 0 is NOT a record — all six games initialised their best to 0
   * meaning "none yet". Adopting it literally would be harmless noise in a
   * points game and a disaster in a timed one: reaction ranks LOW, so a best of
   * 0 ms could never be beaten again. reaction/logic.ts already reads
   * `!(prevBestMs > 0)` as no record; this matches it.
   */
  function readLegacy(): number | undefined {
    if (!opts.legacyKey) return undefined;
    try {
      const raw = store.get<unknown>(opts.legacyKey, undefined);
      return isRankable(raw as number) && (raw as number) > 0 ? (raw as number) : undefined;
    } catch {
      return undefined;
    }
  }

  return {
    best(board = DEFAULT_BOARD) {
      return readBest(board);
    },

    report({ value, unit, board = DEFAULT_BOARD }) {
      const prev = readBest(board);

      // Junk never becomes a record, and never destroys one either.
      if (!isRankable(value)) {
        return { value, best: prev, isPersonalBest: false, rejected: true };
      }

      const direction = directionFor(unit);
      const better = isBetter(value, prev, direction);

      if (better) {
        try {
          store.set(keyFor(board), value);
        } catch {
          // Storage refused. The run still counts as a best for THIS session —
          // telling a child they did not beat their record because the disk is
          // full would be a lie about what they just did.
        }
      }

      if (better && opts.onPersonalBest) {
        try {
          opts.onPersonalBest({ board, value, unit });
        } catch {
          // A board is decoration on a fact that is already saved. Nothing it
          // does may cost a child the record they just set.
        }
      }

      return {
        value,
        best: prev === undefined ? value : bestOf(value, prev, direction),
        isPersonalBest: better,
        rejected: false,
      };
    },
  };
}
