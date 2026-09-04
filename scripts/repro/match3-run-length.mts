// How long does a Match Three run actually last?
//
//   node_modules/.bin/vite-node scripts/repro/match3-run-length.mts
//
// The move budget in `LEVELS` is the only thing that ends this game. Four
// numbers decide it - `moves`, `movesPerRound`, `goal`, `goalStep` - and no
// amount of reading them tells you whether a run is over in ninety seconds or
// never ends at all. So this plays real runs through the real module and
// reports the distribution.
//
// THE PLAYER MODEL IS THE WEAK PART, and it is stated rather than hidden: it
// picks a legal swap UNIFORMLY AT RANDOM. A child plays better than that -
// they look for the big line - so a real run lasts at least this long. Treat
// every number here as a FLOOR, not an estimate, and never quote it as what a
// player experiences.
//
// Re-run this before changing any of those four numbers.
import { LEVELS, isOver, newGame, swapAt, type Difficulty, type Match3State } from "../../src/games/match3/logic";

/** Deterministic, so a run is reproducible from its seed alone. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every adjacent pair on the board, as [a, b] index pairs. */
function pairs(size: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const i = r * size + c;
      if (c + 1 < size) out.push([i, i + 1]);
      if (r + 1 < size) out.push([i, i + size]);
    }
  }
  return out;
}

interface RunResult {
  rounds: number;
  moves: number;
  score: number;
  /** The highest the budget ever climbed. The session validator's ceiling. */
  peakMovesLeft: number;
}

function playOne(level: Difficulty, seed: number): RunResult {
  const rng = mulberry32(seed);
  let state: Match3State = newGame(level, rng);
  const all = pairs(state.size);
  let peakMovesLeft = state.movesLeft;
  // A hard ceiling, so a bug that stops the budget draining is a LOUD failure
  // here rather than a hung script somebody kills and forgets.
  for (let guard = 0; guard < 100_000; guard++) {
    if (isOver(state)) return { rounds: state.round, moves: state.moves, score: state.score, peakMovesLeft };
    // Shuffle the candidate order rather than scanning left-to-right, which
    // would bias every run toward the top-left corner of the board.
    const order = all.map((p, i) => [p, rng() + i * 0] as const).sort(() => rng() - 0.5);
    let played = false;
    for (const [[a, b]] of order) {
      const next = swapAt(state, a, b, rng);
      if (next.outcome.kind === "matched") {
        state = next.state;
        if (state.movesLeft > peakMovesLeft) peakMovesLeft = state.movesLeft;
        played = true;
        break;
      }
    }
    if (!played) throw new Error(`no legal move on a board hasMove() says is playable (seed ${seed})`);
  }
  throw new Error(`run did not end in 100,000 swaps (seed ${seed}) - the budget is not draining`);
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const pct = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * p)];

const RUNS = 400;
console.log(`${RUNS} runs per level, a uniformly random legal swap each time.`);
console.log("A real player does better, so these are FLOORS.\n");
console.log("level   config                          rounds (p10/med/p90)   moves (med)   peak budget");

for (const level of ["easy", "medium", "hard"] as const) {
  const cfg = LEVELS[level];
  const runs = Array.from({ length: RUNS }, (_, i) => playOne(level, 1000 + i));
  const rounds = runs.map((r) => r.rounds);
  const moves = runs.map((r) => r.moves);
  const conf = `goal ${cfg.goal}+${cfg.goalStep}/rd, ${cfg.moves} moves +${cfg.movesPerRound}`;
  console.log(
    `${level.padEnd(7)} ${conf.padEnd(31)} ${String(pct(rounds, 0.1)).padStart(3)}/${String(median(rounds)).padStart(3)}/${String(pct(rounds, 0.9)).padStart(3)}${" ".repeat(12)}${String(median(moves)).padStart(4)}         ${String(Math.max(...runs.map((r) => r.peakMovesLeft))).padStart(3)}`,
  );
}
