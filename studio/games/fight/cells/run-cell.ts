// The one harness every cell runs. It owns the data, the sim, the clock and
// the hash; the cell owns the pixels. A cell that wants its own loop has
// nowhere to put it: runCell steps the core, then hands the cell a draw plan.
//
// Exposed on window for the headless runner and the compare page:
//   __ready         true after the first frame reached endFrame
//   __fightTicks    ticks stepped so far
//   __fightHash / __fightChain / __fightEventHash   the golden triple, live
//   __fightDone     true once a tape run reached its length
//   __fightStats    { stepsPerFrame, distinctDraws, drawn, backbuffer, dpr, samples, ttffMs, refresh }
//   __fightError    a message when load or a frame threw (also printed on the page)

import { compileFight } from "../core/compile";
import { chainOf, hashEvents, hashState } from "../core/hash";
import { createState } from "../core/match";
import { step } from "../core/step";
import { inputsAtTick, readTape } from "../core/tape";
import { NO_INPUT } from "../core/types";
import type { FightData, FightEvent, FightState, InputFrame } from "../core/types";
import { viewOf } from "../core/view";
import type { Cell, CellOptions } from "./contract";
import { createClock, detectRefresh } from "./retime";
import { arenaOps } from "./shared/arena";
import { loadFightHttp, spriteRefs } from "./shared/assets";
import { createFx } from "./shared/fx";
import { attachKeyboard } from "./shared/input";
import type { Tape } from "../core/tape";

interface Live { data: FightData; prev: FightState; next: FightState; tape: Tape | null; ticks: string[]; events: FightEvent[]; done: boolean }

const w = window as unknown as Record<string, unknown>;

function publish(live: Live): void {
  w.__fightTicks = live.next.tick;
  w.__fightHash = hashState(live.next);
  w.__fightChain = chainOf(live.ticks);
  w.__fightEventHash = hashEvents(live.events);
  w.__fightDone = live.done;
}

function fail(err: unknown): void {
  const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  w.__fightError = msg;
  const pre = document.createElement("pre");
  pre.style.cssText = "color:#c2185b;background:#fff6d8;padding:8px;white-space:pre-wrap";
  pre.textContent = `fight cell error: ${msg}`;
  document.body.prepend(pre);
}

/** step whole ticks; a tape run feeds the tape and stops at its length */
function advance(live: Live, n: number, read: (side: number) => InputFrame): void {
  for (let i = 0; i < n && !live.done; i++) {
    const t = live.next.tick;
    const inputs = live.tape ? inputsAtTick(live.tape, t, live.next.fighters.length) : live.next.fighters.map((_, s) => read(s));
    live.prev = live.next;
    live.next = step(live.next, inputs, live.data);
    live.ticks.push(hashState(live.next));
    live.events.push(...live.next.events);
    if (live.tape && live.next.tick >= live.tape.ticks) live.done = true;
  }
}

export async function runCell(cell: Cell, opts: CellOptions): Promise<void> {
  try {
    const loaded = await loadFightHttp(opts.root, opts.mode);
    const data = compileFight(loaded);
    const refs = spriteRefs(opts.root, Object.keys(loaded.sets));
    await cell.load(refs);
    const host = document.getElementById("stage") ?? document.body;
    cell.mount(host, loaded.arena.view);
    const tape = opts.tape ? readTape(await (await fetch(`${opts.root}/tournament/tapes/${opts.tape}.json`)).json()) : null;
    const live: Live = { data, prev: createState(data), next: createState(data), tape, ticks: [], events: [], done: false };
    const arena = arenaOps(loaded.arena.art, loaded.arena.view);
    const fx = createFx();
    const keys = tape ? null : attachKeyboard(window);
    const read = (side: number): InputFrame => (keys ? keys.read(side) : NO_INPUT);
    const clock = createClock();
    const fast = new URLSearchParams(location.search).get("fast") === "1";
    let drawn = 0, distinct = 0, draws = 0, lastKey = "", ttff = -1, fxFed = 0;
    let refreshHz: number | null = null;
    void detectRefresh().then((hz) => { refreshHz = hz; });
    const t0 = performance.now();
    const frame = (now: number): void => {
      try {
        const n = fast && !live.done ? 60 : clock.advance(now);
        const before = live.next.tick;
        advance(live, n, read);
        if (live.next.tick !== before) publish(live);
        const plan = viewOf(live.prev, live.next, fast ? 255 : clock.alpha256(), data, !!opts.boxes);
        const toScreen = (x: number, z: number, h: number) => ({ x: Math.floor(x / 256), y: Math.floor(z / 256) - Math.floor(h / 256) });
        // feed fx exactly the events appended since the last frame: once per event, whatever the
        // display rate (a 120 Hz panel used to spawn every burst twice, fast mode dropped 59 of 60)
        for (; fxFed < live.events.length; fxFed++) fx.onEvent(live.events[fxFed], toScreen);
        const shake = plan.shake > 0 ? [((live.next.tick * 7) % 5) - 2, ((live.next.tick * 3) % 3) - 1] : [0, 0];
        cell.beginFrame(0, shake[0], shake[1]);
        cell.drawArena(arena);
        for (const s of plan.shadows) cell.drawShadow(s);
        for (const s of plan.sprites) { cell.drawSprite(s); drawn += 1; }
        cell.drawFx(fx.frame(now));
        cell.drawHud(plan.hud);
        if (plan.boxes.length) cell.drawBoxes(plan.boxes);
        cell.endFrame();
        const key = plan.sprites.map((s) => `${s.frame}@${s.x},${s.y}`).join("|");
        if (draws > 0 && n > 0) { if (key !== lastKey) distinct += 1; }
        if (n > 0) draws += 1;
        lastKey = key;
        if (ttff < 0) { ttff = performance.now() - t0; w.__ready = true; }
        if (!(live.done && fast)) requestAnimationFrame(frame);
      } catch (err) { fail(err); }
    };
    Object.defineProperty(w, "__fightStats", {
      get: () => ({
        stepsPerFrame: clock.frames > 1 ? clock.steps / (clock.frames - 1) : 0,
        distinctDraws: draws > 1 ? distinct / (draws - 1) : 1,
        ...cell.stats(),
        // the HARNESS's count wins: it is the equal-work number, and a cell that under-reports
        // its own `drawn` must not be able to win on it
        drawn,
        cellDrawn: cell.stats().drawn,
        ttffMs: ttff,
        refresh: refreshHz,
      }),
      configurable: true,
    });
    publish(live);
    // the compare page starts every arm on one postMessage("go") so they run in lockstep;
    // a page opened directly starts at once
    if (new URLSearchParams(location.search).get("wait") === "1") {
      window.addEventListener("message", (e) => { if (e.data === "go") requestAnimationFrame(frame); }, { once: true });
    } else {
      requestAnimationFrame(frame);
    }
  } catch (err) { fail(err); }
}
