#!/usr/bin/env node
/**
 * Derives the numbers the Escape the Jam page quotes.
 *
 *   node scripts/sim/parking-jams.mjs [--boards 400] [--json]
 *
 * 400 boards is about five minutes. `deal` now grades layouts with a bounded
 * search of its own until one clears its tier's floor (up to 250 of them, and
 * the deepest graded if none does), and this script then searches each dealt
 * board all the way to its TRUE minimum, which is deeper than it used to be.
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the parking
 * page says with a digit in it comes from here or from the game's own source.
 *
 * IT DRIVES THE SHIPPED RULES. `deal`, `canMoveTo`, `slide`, `blockers` and
 * `isSolved` are imported from `src/games/parking/logic.ts` rather than
 * restated, so these numbers describe the car park a child actually opens. A
 * re-implementation would measure my reading of the code, agree with itself,
 * and be confidently wrong about a game we do not ship. The search below is the
 * one in `logic.test.ts`, extended to keep parent pointers so a shortest
 * solution can be read back rather than merely counted.
 *
 * Four questions, and the second is the one worth a page:
 *
 *   1. WHAT IS THE SHORTEST SOLUTION? Breadth-first over the real state space,
 *      per board, so the answer is the true minimum and not an estimate. That
 *      is the number a player's record is competing against.
 *
 *      A MOVE IS A WHOLE SLIDE here. Tapping a cell sends a car all the way to
 *      it, so crossing four cells costs one move; classic Rush Hour counts one
 *      per cell, which is why its boards quote solutions three times longer.
 *      The two numbers are different units and comparing them is the first way
 *      a reader misreads this table.
 *
 *      This script is also what found the defect that made `deal` grade its
 *      candidates at all: it used to accept a board the moment any car stood in
 *      the way, and the true minimum came back at 2.1 moves per tier with ~90%
 *      of boards opening in exactly two. `at floor` below is the column that
 *      would show a repeat of it.
 *
 *   2. HOW MUCH WORSE IS THE WALK THE BOARD WAS BUILT BY? `deal` records the
 *      inverse of every step it took away from the solved board and hands it
 *      back as `plan`. Reversing it always wins, so it is a solution - but it
 *      wanders, because it was never trying to be short. The gap between "a
 *      solution" and "the solution" is the whole reason this is a puzzle.
 *
 *   3. HOW MANY CARS MUST MOVE AT ALL? The distinct cars appearing in a
 *      shortest solution, against the cars on the board. Twelve cars where five
 *      matter is a different picture from twelve where eleven do.
 *
 *   4. CAN A PLAYER GET STUCK, AND WHAT DOES TAPPING ABOUT COST? Every slide is
 *      reversible, so a position reached by a move always has at least that
 *      move's inverse available - which says gridlock should be unreachable.
 *      That is an argument, not a measurement, so a bot slides at random until
 *      it drives out, and the run reports the dead ends it found, the fewest
 *      slides any position on the way offered, and how many moves the wandering
 *      cost. The last one is the number a player's first board looks like.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per
 * board, so two runs of the same command produce the same table.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const parking = await import(join(ROOT, "src/games/parking/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const { LEVELS, LEVEL_IDS, axisPos, blockers, canMoveTo, deal, isSolved, slide } = parking;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const BOARDS = arg("boards", 400);
/** Nodes one search may open. It THROWS at the ceiling rather than reporting a
 *  miss: "ran out of budget" and "this board cannot be finished" are different
 *  findings, and a search that reports the second when it means the first is
 *  the exact failure the game's own test file is about. */
const BUDGET = arg("budget", 400_000);
/** How many slides the wandering bot may make before it is called off. */
const WALK = arg("walk", 400);

/** Two boards with every car in the same place are one position. */
const fingerprint = (s) => s.cars.map((c) => `${c.row},${c.col}`).join("|");

/** Every legal slide right now, asked of the shipped `canMoveTo`. */
function legalMoves(s) {
  const out = [];
  for (let car = 0; car < s.cars.length; car++) {
    const from = axisPos(s.cars[car]);
    for (const step of [1, -1]) {
      for (let d = 1; d < s.size; d++) {
        const offset = step * d;
        // Stop at the first blocked cell: a far cell is never reachable
        // through a near one that is occupied.
        if (!canMoveTo(s, car, offset)) break;
        out.push({ car, from, to: from + offset, offset });
      }
    }
  }
  return out;
}

/**
 * Breadth-first search for a SHORTEST solution, over the shipped rules.
 *
 * Parent pointers are kept so the winning line can be walked back and its cars
 * counted. Counting the cars any other way - the ones that ended up somewhere
 * new, say - answers a different question, because a car can be moved out and
 * back inside one optimal line.
 */
function shortest(start) {
  if (isSolved(start)) return { moves: 0, cars: 0, states: 0 };

  const parent = new Map();
  const seen = new Set([fingerprint(start)]);
  let frontier = [start];
  let nodes = 0;
  let depth = 0;

  while (frontier.length) {
    depth++;
    const next = [];
    for (const s of frontier) {
      if (++nodes > BUDGET) throw new Error(`search budget exhausted after ${nodes} states`);
      const here = fingerprint(s);
      for (const m of legalMoves(s)) {
        const child = slide(s, m.car, m.offset);
        const fp = fingerprint(child);
        if (seen.has(fp)) continue;
        seen.add(fp);
        parent.set(fp, { from: here, car: m.car });
        if (isSolved(child)) {
          const cars = new Set();
          let cursor = fp;
          while (parent.has(cursor)) {
            const step = parent.get(cursor);
            cars.add(step.car);
            cursor = step.from;
          }
          return { moves: depth, cars: cars.size, states: nodes };
        }
        next.push(child);
      }
    }
    frontier = next;
  }

  // Unreachable by construction: `deal` walks backwards from the solved board,
  // so the reverse of that walk is a solution. Loud rather than silent, because
  // it would mean the construction argument had broken.
  throw new Error("no solution found on a board built backwards from a solved one");
}

/**
 * Slide at random until the car is out, and watch for a position with nothing
 * to do on the way.
 *
 * Uniform over the legal slides, including the one that undoes the last - a
 * player is not forbidden from taking a car back, so a probe that forbids it is
 * measuring a different game. It is a floor on what paying attention is worth
 * here, not a picture of how anybody plays.
 */
function wander(start, rng) {
  let s = start;
  let tightest = Infinity;
  let moves = null;
  let positions = 0;
  for (let i = 0; i < WALK; i++) {
    // The FIRST time out is what a player's first board costs. The walk carries
    // on past it, because the dead-end census wants every position it can get
    // and a solved board is an ordinary position with the car parked in the
    // gap - the game ends there, the rules do not.
    if (moves === null && isSolved(s)) moves = i;
    positions++;
    const options = legalMoves(s);
    tightest = Math.min(tightest, options.length);
    if (options.length === 0) return { tightest, deadEnds: 1, moves, positions };
    const m = options[Math.floor(rng() * options.length)];
    s = slide(s, m.car, m.offset);
  }
  return { tightest, deadEnds: 0, moves, positions };
}

const rows = LEVEL_IDS.map((level) => {
  const spec = LEVELS[level];
  let shortestTotal = 0;
  let shortestMin = Infinity;
  let shortestMax = 0;
  let planTotal = 0;
  let planMax = 0;
  let carsTotal = 0;
  let blockersTotal = 0;
  let statesTotal = 0;
  let tightest = Infinity;
  let deadEnds = 0;
  let atFloor = 0;
  let randomMoves = 0;
  let randomOut = 0;
  let positions = 0;

  for (let b = 0; b < BOARDS; b++) {
    const rng = mulberry32(b * 2654435761 + level.length * 7919);
    const { state, plan } = deal(level, rng);

    // A board handed back already solved, or with a clear run to the exit,
    // would flatter every column below. `deal` refuses both - but a silent zero
    // is exactly the shape that makes a table lie, so it is asserted here too.
    if (isSolved(state)) throw new Error(`${level}: deal returned an already-solved board`);
    if (blockers(state) === 0) throw new Error(`${level}: deal returned a clear run to the exit`);

    const best = shortest(state);
    shortestTotal += best.moves;
    shortestMin = Math.min(shortestMin, best.moves);
    shortestMax = Math.max(shortestMax, best.moves);
    // The generator refuses anything under its tier's floor, so this is the
    // share it only just cleared - and it is the shape the old two-tap defect
    // would come back wearing.
    if (best.moves === spec.floor) atFloor++;
    carsTotal += best.cars;
    statesTotal += best.states;

    planTotal += plan.length;
    planMax = Math.max(planMax, plan.length);
    blockersTotal += blockers(state);

    const walk = wander(state, mulberry32(b + 1));
    tightest = Math.min(tightest, walk.tightest);
    deadEnds += walk.deadEnds;
    positions += walk.positions;
    if (walk.moves !== null) {
      randomOut++;
      randomMoves += walk.moves;
    }
  }

  const meanShortest = shortestTotal / BOARDS;
  const meanPlan = planTotal / BOARDS;

  return {
    level,
    cars: spec.cars,
    scramble: spec.scramble,
    shortest: Number(meanShortest.toFixed(1)),
    shortestMin,
    shortestMax,
    plan: Number(meanPlan.toFixed(1)),
    planMax,
    detour: Number((meanPlan / meanShortest).toFixed(1)),
    floor: spec.floor,
    atFloorPct: Number(((atFloor / BOARDS) * 100).toFixed(1)),
    carsMoved: Number((carsTotal / BOARDS).toFixed(1)),
    carsOnBoard: spec.cars,
    blockers: Number((blockersTotal / BOARDS).toFixed(1)),
    statesPerSearch: Math.round(statesTotal / BOARDS),
    randomMoves: randomOut ? Number((randomMoves / randomOut).toFixed(1)) : null,
    randomOutPct: Number(((randomOut / BOARDS) * 100).toFixed(1)),
    positions,
    tightest,
    deadEnds,
  };
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ boards: BOARDS, walk: WALK, rows }, null, 2));
} else {
  console.log(`escape the jam: ${BOARDS.toLocaleString("en-US")} dealt boards per level\n`);
  console.log(
    "level    cars  floor  shortest  worst  at floor  built by  detour  cars used  random  dead ends  tightest",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(8)} ${String(r.cars).padStart(4)} ${String(r.floor).padStart(6)} ` +
        `${String(r.shortest).padStart(9)} ${String(r.shortestMax).padStart(6)} ` +
        `${String(r.atFloorPct + "%").padStart(9)} ` +
        `${String(r.plan).padStart(9)} ${String(r.detour + "x").padStart(7)} ` +
        `${String(r.carsMoved + "/" + r.carsOnBoard).padStart(10)} ` +
        `${String(r.randomMoves).padStart(7)} ${String(r.deadEnds).padStart(10)} ` +
        `${String(r.tightest).padStart(9)}`,
    );
  }
  console.log(
    "\n'shortest' is a breadth-first minimum over the real position space, not an estimate,\n" +
      "and a move is a WHOLE SLIDE - crossing four cells is one move, where classic Rush Hour\n" +
      "counts one per cell. 'floor' is what `deal` refuses to go below; 'at floor' is the share\n" +
      "of boards that only just cleared it.\n" +
      "'built by' is the walk `deal` took away from the solved board, handed back as a plan:\n" +
      "a solution, and a wandering one. 'random' is what a bot sliding uniformly at random\n" +
      "spends to get out. 'dead ends' counts positions with no legal slide at all, out of the\n" +
      `${rows.reduce((n, r) => n + r.positions, 0).toLocaleString("en-US")} positions walked; 'tightest' is the fewest any of them offered. Every\n` +
      "slide is reversible, so a position reached by a move always has that move's inverse\n" +
      "available - which is why nothing here can wedge, and why undo is the only way back.",
  );
}
