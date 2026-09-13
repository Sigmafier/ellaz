// The one harness every cell runs. It owns the data, the sim, the clock and
// the hash; the cell owns the pixels. A cell that wants its own loop has
// nowhere to put it: runCell steps the core, then hands the cell a draw plan.
//
// Which core: `opts.kind`, a SimKind (cells/contract.ts) - the fight's when
// absent. The loop never names a sim function; every call below goes through
// the kind, and the tick order (poll or tape -> step -> hash -> events) is the
// same for every kind, which is what makes one tape gate admit them all.
//
// Exposed on window for the headless runner and the compare page:
//   __ready         true after the first frame reached endFrame
//   __fightTicks    ticks stepped so far
//   __fightHash / __fightChain / __fightEventHash   the golden triple, live
//   __fightDone     true once a tape run reached its length
//   __fightStats    { stepsPerFrame, distinctDraws, drawn, backbuffer, dpr, samples, ttffMs, refresh }
//   __fightError    a message when load or a frame threw (also printed on the page)
//   + whatever the kind publishes (the fight: __fightStage, a stage mode's wave block, else null)
//
// The mode: `opts.mode`, unless a tape is given - a tape names its own mode, and
// replaying a stage tape against the Versus data would be a different sim.

import { chainOf } from "../sim/hash";
import { readTape } from "../sim/tape";
import type { Tape } from "../sim/tape";
import type { Cell, CellOptions, InputPoll, SimKind } from "./contract";
import { fightKind } from "./kinds/fight";
import { turnKind } from "./kinds/turn";
import { createClock, detectRefresh } from "./retime";
import { arenaOps } from "./shared/arena";
import { spriteRefs } from "./shared/assets";
import { createFx } from "./shared/fx";

interface Live<D, S, I, E> { data: D; prev: S; next: S; tape: Tape<I> | null; ticks: string[]; events: E[]; done: boolean }

type Kind<L, D, S, I, E extends { kind: string }> = SimKind<L, D, S, I, E>;

const w = window as unknown as Record<string, unknown>;

function publish<L, D, S, I, E extends { kind: string }>(kind: Kind<L, D, S, I, E>, live: Live<D, S, I, E>): void {
  w.__fightTicks = kind.tick(live.next);
  w.__fightHash = kind.hashState(live.next);
  w.__fightChain = chainOf(live.ticks);
  w.__fightEventHash = kind.hashEvents(live.events);
  w.__fightDone = live.done;
  Object.assign(w, kind.publish(live.next));
}

function fail(err: unknown): void {
  const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  w.__fightError = msg;
  const pre = document.createElement("pre");
  pre.style.cssText = "color:#c2185b;background:#fff6d8;padding:8px;white-space:pre-wrap";
  pre.textContent = `fight cell error: ${msg}`;
  document.body.prepend(pre);
}

/** step whole ticks; a tape run feeds the tape and stops at its length, a live run polls every side */
function advance<L, D, S, I, E extends { kind: string }>(kind: Kind<L, D, S, I, E>, live: Live<D, S, I, E>, n: number, poll: InputPoll<I> | null): void {
  for (let i = 0; i < n && !live.done; i++) {
    const t = kind.tick(live.next);
    const players = kind.players(live.next);
    let inputs: I[];
    if (live.tape) inputs = kind.inputsAt(live.tape, t, players);
    else if (poll) inputs = Array.from({ length: players }, (_, s) => poll.read(s));
    else throw new Error("run-cell: a live run with no input source");
    live.prev = live.next;
    live.next = kind.step(live.next, inputs, live.data);
    live.ticks.push(kind.hashState(live.next));
    live.events.push(...kind.events(live.next));
    if (live.tape && kind.tick(live.next) >= live.tape.ticks) live.done = true;
  }
}

/**
 * The kind a mode file names: none is the fight's (its files predate the second
 * kind), "turn" the turn's. So a page that passes no kind plays whatever its
 * game's mode says, and the engine's canvas cell can be pointed at any game.
 */
async function kindOfMode<L, D, S, I, E extends { kind: string }>(root: string, mode: string): Promise<Kind<L, D, S, I, E>> {
  const r = await fetch(`${root}/data/modes/${mode}.json`);
  if (!r.ok) throw new Error(`run-cell: ${r.status} fetching the mode file for "${mode}"`);
  const kind = ((await r.json()) as { kind?: unknown }).kind;
  if (kind === undefined) return fightKind as unknown as Kind<L, D, S, I, E>;
  if (kind === "turn") return turnKind as unknown as Kind<L, D, S, I, E>;
  throw new Error(`run-cell: mode "${mode}" names an unknown kind ${JSON.stringify(kind)}`);
}

export async function runCell<L, D, S, I, E extends { kind: string }>(cell: Cell, opts: CellOptions<L, D, S, I, E>): Promise<void> {
  try {
    const tape = opts.tape ? readTape<I>(await (await fetch(`${opts.root}/tapes/${opts.tape}.json`)).json()) : null;
    const mode = tape ? tape.mode : opts.mode;
    const kind = opts.kind ?? await kindOfMode<L, D, S, I, E>(opts.root, mode);
    const loaded = await kind.load(opts.root, mode);
    const data = kind.compile(loaded);
    const refs = spriteRefs(opts.root, kind.sets(loaded));
    await cell.load(refs);
    const host = document.getElementById("stage") ?? document.body;
    const room = kind.arena(loaded);
    cell.mount(host, room.view);
    const live: Live<D, S, I, E> = { data, prev: kind.create(data), next: kind.create(data), tape, ticks: [], events: [], done: false };
    // the painter spans the whole room, not one screen: a stage's camera scrolls through it
    const arena = arenaOps(room.art, { w: room.world?.w ?? room.view.w, h: room.view.h });
    const fx = createFx();
    // a tape run reads no hands - the hash measures the sim, not the player
    const poll = tape ? null : kind.attachInput(host, data);
    const clock = createClock();
    const fast = new URLSearchParams(location.search).get("fast") === "1";
    let drawn = 0, distinct = 0, draws = 0, lastKey = "", ttff = -1, fxFed = 0;
    let refreshHz: number | null = null;
    void detectRefresh().then((hz) => { refreshHz = hz; });
    const t0 = performance.now();
    const frame = (now: number): void => {
      try {
        const n = fast && !live.done ? 60 : clock.advance(now);
        const before = kind.tick(live.next);
        advance(kind, live, n, poll);
        if (kind.tick(live.next) !== before) publish(kind, live);
        const plan = kind.view(live.prev, live.next, fast ? 255 : clock.alpha256(), data, !!opts.boxes);
        const toScreen = (x: number, z: number, h: number) => ({ x: Math.floor(x / 256), y: Math.floor(z / 256) - Math.floor(h / 256) });
        // feed fx exactly the events appended since the last frame: once per event, whatever the
        // display rate (a 120 Hz panel used to spawn every burst twice, fast mode dropped 59 of 60)
        for (; fxFed < live.events.length; fxFed++) fx.onEvent(live.events[fxFed], toScreen);
        const tick = kind.tick(live.next);
        const shake = plan.shake > 0 ? [((tick * 7) % 5) - 2, ((tick * 3) % 3) - 1] : [0, 0];
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
        const k = Math.max(1, Math.round(cell.stats().backbuffer[0] / room.view.w));
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
    publish(kind, live);
    // the compare page starts every arm on one postMessage("go") so they run in lockstep;
    // a page opened directly starts at once
    if (new URLSearchParams(location.search).get("wait") === "1") {
      window.addEventListener("message", (e) => { if (e.data === "go") requestAnimationFrame(frame); }, { once: true });
    } else {
      requestAnimationFrame(frame);
    }
  } catch (err) { fail(err); }
}
