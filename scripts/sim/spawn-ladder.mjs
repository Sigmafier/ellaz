#!/usr/bin/env node
/**
 * How much time each tap game actually gives a child, and what the bee mix
 * really comes out at.
 *
 *   node scripts/sim/spawn-ladder.mjs [--rounds 4000] [--json]
 *
 * Four games (balloons, bubbles, bees, frog) share one spawn model, so the
 * numbers a parent would want are shared too and belong in one script.
 *
 * TWO things here are worth a page, and neither is visible by reading the
 * constants:
 *
 *   1. SECONDS TO ACT. `lifeMs` is how long a prop exists, and it is the whole
 *      answer to "is this too fast for my four-year-old". Even the hard rung
 *      leaves well over two seconds to see a thing, decide, and land a finger.
 *      Reported beside the steady-state count, because six props at once and
 *      one prop at a time are different games at the same speed.
 *
 *   2. THE BEE MIX IS NOT THE BEE RATIO. `bees/logic.ts` declares 0.65 / 0.60 /
 *      0.50, and then caps runs at MAX_RUN so a child never sees four bees in a
 *      row. That cap pulls the realised mix toward even, and the gap is not
 *      small. The declared number is what the code asks for; this is what a
 *      child sees. Measured by running the real `nextCreature` over whole
 *      rounds, and cross-checked against the closed form the game itself
 *      exports, so the two disagreeing is a loud failure rather than a quiet
 *      one.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { SPAWN_PRESETS, steadyStateAlive, isSustainable } = await import(
  join(ROOT, "src/shared/spawn.pure.ts")
);
const bees = await import(join(ROOT, "src/games/bees/logic.ts"));

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const ROUNDS = arg("rounds", 4000);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------- the shared ladder */

const ladder = {};
for (const [name, spec] of Object.entries(SPAWN_PRESETS)) {
  ladder[name] = {
    secondsToAct: Number((spec.lifeMs / 1000).toFixed(1)),
    newPropEvery: Number((spec.everyMs / 1000).toFixed(1)),
    propsPerMinute: Math.round(60000 / spec.everyMs),
    settlesAt: steadyStateAlive(spec),
    cap: spec.maxAlive,
    // A spec that spawns faster than props expire pins the board at its cap and
    // stops being the game it was tuned to be. Reported, not assumed.
    sustainable: isSustainable(spec),
  };
}

/* ------------------------------------------------------------- the bee mix */

const mix = {};
for (const [name, level] of Object.entries(bees.LEVELS)) {
  // How many creatures cross the sky in one round, at this rung's spawn rate.
  const perRound = Math.floor(bees.ROUND_MS / level.spec.everyMs);

  let beeCount = 0;
  let total = 0;
  let longestRun = 0;

  for (let r = 0; r < ROUNDS; r++) {
    const rng = mulberry32(r * 2654435761 + name.length * 7919);
    const recent = [];
    let run = 0;
    let lastKind = null;

    for (let i = 0; i < perRound; i++) {
      const kind = bees.nextCreature(recent, level.beeRatio, rng);
      recent.push(kind);
      if (recent.length > 8) recent.shift();
      if (kind === "bee") beeCount++;
      total++;
      run = kind === lastKind ? run + 1 : 1;
      lastKind = kind;
      if (run > longestRun) longestRun = run;
    }
  }

  const observed = beeCount / total;
  const closedForm = bees.realisedBeeShare(level.beeRatio);

  mix[name] = {
    declaredBeeRatio: level.beeRatio,
    realisedBeeShare: Number(observed.toFixed(3)),
    closedFormShare: Number(closedForm.toFixed(3)),
    creaturesPerRound: perRound,
    beesPerRound: Math.round(observed * perRound),
    longestRunSeen: longestRun,
  };

  // The game exports its own prediction of this number. If simulating the real
  // draw disagrees with it, one of the two is wrong and the page must not quote
  // either until that is settled.
  if (Math.abs(observed - closedForm) > 0.02) {
    throw new Error(
      `${name}: simulated bee share ${observed.toFixed(3)} disagrees with the game's own ` +
        `realisedBeeShare() ${closedForm.toFixed(3)} - do not publish either number.`,
    );
  }
  if (longestRun > bees.MAX_RUN) {
    throw new Error(`${name}: saw a run of ${longestRun}, above MAX_RUN ${bees.MAX_RUN}`);
  }
}

/* ------------------------------------------------------------ the frog curve */

// Frog does NOT use the shared preset's lifeMs - it has its own dwell curve that
// shrinks with every hop down to a floor. The question worth answering is
// whether a round is long enough to ever REACH that floor, because that decides
// whether the level's stated difficulty is something a child actually meets.
const frog = await import(join(ROOT, "src/games/frog/logic.ts"));

const frogCurve = {};
for (const d of frog.DIFFICULTIES) {
  const goal = frog.ROUND_GOAL[d];
  const floor = Math.max(frog.ABSOLUTE_FLOOR_MS, frog.DWELL_FLOOR[d]);
  let hopsToFloor = 0;
  while (frog.dwellMs(d, hopsToFloor) > floor && hopsToFloor < 1000) hopsToFloor++;

  frogCurve[d] = {
    pads: frog.PAD_COUNT[d],
    catchesToFinish: goal,
    firstAimMs: frog.sitMs(d, 0),
    lastAimMs: frog.sitMs(d, goal - 1),
    floorAimMs: floor - frog.HOP_MS,
    hopsToReachFloor: hopsToFloor,
    // The honest question: does the round last long enough to meet the fastest
    // frog this level can produce?
    reachesFloorInOneRound: hopsToFloor < goal,
  };
}

const out = {
  rounds: ROUNDS,
  roundSeconds: bees.ROUND_MS / 1000,
  ladder,
  beeMix: mix,
  frog: frogCurve,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log("the shared tap ladder (balloons, bubbles, bees, frog)\n");
  console.log("level     seconds to act   new one every   per minute   usually on screen   cap");
  for (const [name, r] of Object.entries(ladder)) {
    console.log(
      `${name.padEnd(9)} ${String(r.secondsToAct + "s").padStart(14)}   ` +
        `${String(r.newPropEvery + "s").padStart(13)}   ${String(r.propsPerMinute).padStart(10)}   ` +
        `${String(r.settlesAt).padStart(17)}   ${String(r.cap).padStart(3)}`,
    );
  }

  console.log(`\nbees: the mix a child actually sees, over ${ROUNDS} rounds of ${out.roundSeconds}s\n`);
  console.log("level     asked for   actually   bees per round   longest run");
  for (const [name, r] of Object.entries(mix)) {
    console.log(
      `${name.padEnd(9)} ${String(Math.round(r.declaredBeeRatio * 100) + "%").padStart(9)}   ` +
        `${String(Math.round(r.realisedBeeShare * 100) + "%").padStart(8)}   ` +
        `${String(r.beesPerRound + " of " + r.creaturesPerRound).padStart(14)}   ` +
        `${String(r.longestRunSeen).padStart(11)}`,
    );
  }
  console.log(
    "\nThe run cap is why 'asked for' and 'actually' differ: no child ever sees\n" +
      `more than ${bees.MAX_RUN} of the same creature in a row, and refusing a fourth pulls the\n` +
      "mix toward even every time it fires.",
  );

  console.log("\nfrog: the dwell curve, and whether a round is long enough to meet it\n");
  console.log("level     pads   catches   first aim   last aim   fastest   hops to fastest");
  for (const [name, r] of Object.entries(frogCurve)) {
    console.log(
      `${name.padEnd(9)} ${String(r.pads).padStart(4)}   ${String(r.catchesToFinish).padStart(7)}   ` +
        `${String(r.firstAimMs + "ms").padStart(9)}   ${String(r.lastAimMs + "ms").padStart(8)}   ` +
        `${String(r.floorAimMs + "ms").padStart(7)}   ` +
        `${String(r.hopsToReachFloor + (r.reachesFloorInOneRound ? "" : " (never in a round)")).padStart(15)}`,
    );
  }
}
