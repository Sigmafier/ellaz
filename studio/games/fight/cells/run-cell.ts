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
//   __fightStage    the stage block { wave, wphase, waveT, camX, coins, xp, level } of a stage mode, else null
//   __fightError    a message when load or a frame threw (also printed on the page)
//
// The mode: `opts.mode`, unless a tape is given - a tape names its own mode, and
// replaying a stage tape against the Versus data would be a different sim.

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
import { attachKeyboard, attachTouch } from "./shared/input";
import type { InputSource } from "./shared/input";
import type { Tape } from "../core/tape";

interface Live { data: FightData; prev: FightState; next: FightState; tape: Tape | null; ticks: string[]; events: FightEvent[]; done: boolean }

const w = window as unknown as Record<string, unknown>;

function publish(live: Live): void {
  w.__fightTicks = live.next.tick;
  w.__fightHash = hashState(live.next);
  w.__fightChain = chainOf(live.ticks);
  w.__fightEventHash = hashEvents(live.events);
  w.__fightDone = live.done;
  w.__fightStage = live.next.stage;
}

function fail(err: unknown): void {
  const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  w.__fightError = msg;
  const pre = document.createElement("pre");
  pre.style.cssText = "color:#c2185b;background:#fff6d8;padding:8px;white-space:pre-wrap";
  pre.textContent = `fight cell error: ${msg}`;
  document.body.prepend(pre);
}

/** two sources of one frame: a held axis beats a resting one, a swing on either is a swing */
function mergeInput(a: InputFrame, b: InputFrame): InputFrame {
  return { mx: b.mx !== 0 ? b.mx : a.mx, mz: b.mz !== 0 ? b.mz : a.mz, attack: a.attack || b.attack };
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
    const tape = opts.tape ? readTape(await (await fetch(`${opts.root}/tournament/tapes/${opts.tape}.json`)).json()) : null;
    const loaded = await loadFightHttp(opts.root, tape ? tape.mode : opts.mode);
    const data = compileFight(loaded);
    const refs = spriteRefs(opts.root, Object.keys(loaded.sets));
    await cell.load(refs);
    const host = document.getElementById("stage") ?? document.body;
    cell.mount(host, loaded.arena.view);
    const live: Live = { data, prev: createState(data), next: createState(data), tape, ticks: [], events: [], done: false };
    // the painter spans the whole room, not one screen: a stage's camera scrolls through it
    const arena = arenaOps(loaded.arena.art, { w: loaded.arena.world?.w ?? loaded.arena.view.w, h: loaded.arena.view.h });
    const fx = createFx();
    // a live run reads the keyboard AND the touch surface; whichever is moving wins the axis, and
    // either can swing. A tape run reads neither - the hash measures the sim, not the hands
    const sources: InputSource[] = tape ? [] : [attachKeyboard(window), attachTouch(host)];
    const read = (side: number): InputFrame => sources.reduce((frame, s) => mergeInput(frame, s.read(side)), NO_INPUT);
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
        cell.beginFrame(plan.camX, shake[0], shake[1]);
        cell.drawArena(arena);
        for (const s of plan.shadows) cell.drawShadow(s);
        cell.drawProps(plan.props);
        for (const s of plan.sprites) { cell.drawSprite(s); drawn += 1; }
        cell.drawFx(fx.frame(now));
        cell.drawHud(plan.hud);
        if (plan.boxes.length) cell.drawBoxes(plan.boxes);
        cell.endFrame();
        // distinct draws counts what reached the DEVICE pixels: the plan carries fractional px, the
        // cell rounds to 1/k where k is its backbuffer over the view, so the key rounds the same way
        const k = Math.max(1, Math.round(cell.stats().backbuffer[0] / loaded.arena.view.w));
        const key = plan.sprites.map((s) => `${s.frame}@${Math.round(s.x * k)},${Math.round(s.y * k)}`).join("|");
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
