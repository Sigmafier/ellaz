#!/usr/bin/env node
/**
 * When snake stops getting faster, and how long the board is.
 *
 *   node scripts/sim/snake-speed.mjs [--json]
 *
 * The scene ramps difficulty by shaving milliseconds off the tick every few
 * apples, down to a floor. Nothing in the code says WHEN each starting speed
 * reaches that floor, and it is the most useful thing a player could know:
 * after that point the snake never speeds up again and the only thing making
 * the game harder is your own body in the way.
 *
 * Every constant is parsed out of `src/games/snake/SnakeScene.ts`, so a retuned
 * ramp either shows up here or fails loudly. Arithmetic, not simulation - there
 * is nothing random about it, and pretending otherwise would be theatre.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCENE = join(ROOT, "src", "games", "snake", "SnakeScene.ts");

function constants() {
  const src = readFileSync(SCENE, "utf8");
  const num = (name) => {
    const m = src.match(new RegExp(`const ${name}\\s*=\\s*(\\d+)`));
    if (!m) throw new Error(`${name} not found in ${SCENE}. The snake tuning moved.`);
    return Number(m[1]);
  };
  const speeds = src.match(/SPEEDS[^=]*=\s*\{([^}]*)\}/);
  if (!speeds) throw new Error(`SPEEDS not found in ${SCENE}. The snake tuning moved.`);
  const entries = [...speeds[1].matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]);
  if (!entries.length) throw new Error("SPEEDS table is empty - parser is out of date.");

  return {
    cols: num("COLS"),
    rows: num("ROWS"),
    foodPerLevel: num("FOOD_PER_LEVEL"),
    decay: num("STEP_DECAY_MS"),
    floor: num("STEP_FLOOR"),
    speeds: entries,
  };
}

const c = constants();

// level = 1 + floor(score / FOOD_PER_LEVEL); step = max(FLOOR, base - (level-1)*DECAY)
const rows = c.speeds.map(([name, base]) => {
  const levelsToFloor = Math.ceil((base - c.floor) / c.decay);
  const applesToTopSpeed = levelsToFloor * c.foodPerLevel;
  return {
    speed: name,
    startMs: base,
    applesToTopSpeed,
    startCrossMs: c.cols * base,
    topCrossMs: c.cols * c.floor,
  };
});

// The snake starts three segments long and the board cannot hold more than it has cells.
const START_LENGTH = 3;
const maxScore = c.cols * c.rows - START_LENGTH;

const out = {
  board: `${c.cols}x${c.rows}`,
  cells: c.cols * c.rows,
  maxScore,
  topSpeedMs: c.floor,
  applesPerLevel: c.foodPerLevel,
  msPerLevel: c.decay,
  rows,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`snake: ${out.board} board, ${out.cells} cells\n`);
  console.log("speed    start tick   apples to top speed   board crossing (start -> top)");
  for (const r of rows) {
    console.log(
      `${r.speed.padEnd(8)} ${String(r.startMs + " ms").padStart(10)} ` +
        `${String(r.applesToTopSpeed).padStart(21)}   ` +
        `${(r.startCrossMs / 1000).toFixed(1)}s -> ${(r.topCrossMs / 1000).toFixed(1)}s`,
    );
  }
  console.log(
    `\nTop speed is ${out.topSpeedMs} ms per step, reached ${out.msPerLevel} ms at a time, ` +
      `one step every ${out.applesPerLevel} apples.` +
      `\nThe longest possible snake fills the board: ${out.maxScore} apples.`,
  );
}
