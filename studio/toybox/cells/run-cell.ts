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
//   __fightDone     true once a tape run reached its length, or `until` held
//   __fightStats    { stepsPerFrame, distinctDraws, drawn, backbuffer, dpr, samples, ttffMs, refresh }
//   __fightError    a message when load or a frame threw (also printed on the page)
//   + whatever the kind publishes (the fight: __fightStage, a stage mode's wave block, else null)
//
// The mode: `opts.mode`, unless a tape is given - a tape names its own mode, and
// replaying a stage tape against the Versus data would be a different sim.
//
// How a run ENDS (2026-09-13, the campaign layer): a tape run reaches its length
// and keeps drawing its last state (the harness reads __fightDone); a live run
// with `opts.until` ends on the first state it holds for - the handle's `done`
// resolves with that state and no further frame is scheduled - and the caller's
// `stop()` cancels any pending frame, detaches the input and unmounts the cell.
// A live run without `until` never ends, as before.

import { chainOf } from "../sim/hash";
import { readTape } from "../sim/tape";
import type { Tape } from "../sim/tape";
import type { ArenaDrawOp, Cell, CellOptions, InputPoll, RunHandle, SimKind } from "./contract";
import { dungeonKind } from "./kinds/dungeon";
import { fightKind } from "./kinds/fight";
import { turnKind } from "./kinds/turn";
import { createClock, detectRefresh } from "./retime";
import type { Clock } from "./retime";
import { arenaOps } from "./shared/arena";
import { spriteRefs } from "./shared/assets";
import { createFx } from "./shared/fx";
import type { Fx } from "./shared/fx";

interface Live<D, S, I, E> { data: D; prev: S; next: S; tape: Tape<I> | null; ticks: string[]; events: E[]; done: boolean; untilHeld: boolean }

/** the frame-side counters the stats getter reads; mutable, one per run */
interface Counters { drawn: number; distinct: number; draws: number; lastKey: string; ttff: number; fxFed: number; refreshHz: number | null }

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

/** step whole ticks; a tape run feeds the tape and stops at its length, a live run polls every side and stops when `until` holds */
function advance<L, D, S, I, E extends { kind: string }>(kind: Kind<L, D, S, I, E>, live: Live<D, S, I, E>, n: number, poll: InputPoll<I> | null, until: ((s: S) => boolean) | undefined): void {
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
    else if (!live.tape && until && until(live.next)) { live.done = true; live.untilHeld = true; }
  }
}

/**
 * The kind a mode file names: none is the fight's (its files predate the second
 * kind), "turn" the turn's, "dungeon" the dungeon's. So a page that passes no
 * kind plays whatever its game's mode says, and the engine's canvas cell can be
 * pointed at any game.
 */
async function kindOfMode<L, D, S, I, E extends { kind: string }>(root: string, mode: string): Promise<Kind<L, D, S, I, E>> {
  const r = await fetch(`${root}/data/modes/${mode}.json`);
  if (!r.ok) throw new Error(`run-cell: ${r.status} fetching the mode file for "${mode}"`);
  const kind = ((await r.json()) as { kind?: unknown }).kind;
  if (kind === undefined) return fightKind as unknown as Kind<L, D, S, I, E>;
  if (kind === "turn") return turnKind as unknown as Kind<L, D, S, I, E>;
  if (kind === "dungeon") return dungeonKind as unknown as Kind<L, D, S, I, E>;
  throw new Error(`run-cell: mode "${mode}" names an unknown kind ${JSON.stringify(kind)}`);
}

/** everything a frame needs, built once per run */
interface Run<L, D, S, I, E extends { kind: string }> {
  kind: Kind<L, D, S, I, E>; live: Live<D, S, I, E>; cell: Cell; arena: readonly ArenaDrawOp[]; fx: Fx; poll: InputPoll<I> | null;
  clock: Clock; fast: boolean; boxes: boolean; viewW: number; until: ((s: S) => boolean) | undefined; c: Counters; t0: number;
}

/** one frame: whole ticks, then the draw plan handed to the cell in the contract's order, then the equal-work counters */
function drawFrame<L, D, S, I, E extends { kind: string }>(r: Run<L, D, S, I, E>, now: number): void {
  const { kind, live, cell, c } = r;
  const n = r.fast && !live.done ? 60 : r.clock.advance(now);
  const before = kind.tick(live.next);
  advance(kind, live, n, r.poll, r.until);
  if (kind.tick(live.next) !== before) publish(kind, live);
  const plan = kind.view(live.prev, live.next, r.fast ? 255 : r.clock.alpha256(), live.data, r.boxes);
  const toScreen = (x: number, z: number, h: number) => ({ x: Math.floor(x / 256), y: Math.floor(z / 256) - Math.floor(h / 256) });
  // feed fx exactly the events appended since the last frame: once per event, whatever the
  // display rate (a 120 Hz panel used to spawn every burst twice, fast mode dropped 59 of 60)
  for (; c.fxFed < live.events.length; c.fxFed++) r.fx.onEvent(live.events[c.fxFed], toScreen);
  const tick = kind.tick(live.next);
  const shake = plan.shake > 0 ? [((tick * 7) % 5) - 2, ((tick * 3) % 3) - 1] : [0, 0];
  cell.beginFrame(plan.camX, shake[0], shake[1]);
  cell.drawArena(r.arena);
  for (const s of plan.shadows) cell.drawShadow(s);
  cell.drawProps(plan.props);
  for (const s of plan.sprites) { cell.drawSprite(s); c.drawn += 1; }
  cell.drawFx(r.fx.frame(now));
  cell.drawHud(plan.hud);
  if (plan.boxes.length) cell.drawBoxes(plan.boxes);
  cell.endFrame();
  // distinct draws counts what reached the DEVICE pixels: the plan carries fractional px, the
  // cell rounds to 1/k where k is its backbuffer over the view, so the key rounds the same way
  const k = Math.max(1, Math.round(cell.stats().backbuffer[0] / r.viewW));
  const key = plan.sprites.map((s) => `${s.frame}@${Math.round(s.x * k)},${Math.round(s.y * k)}`).join("|");
  if (c.draws > 0 && n > 0) { if (key !== c.lastKey) c.distinct += 1; }
  if (n > 0) c.draws += 1;
  c.lastKey = key;
  if (c.ttff < 0) { c.ttff = performance.now() - r.t0; w.__ready = true; }
}

function exposeStats<L, D, S, I, E extends { kind: string }>(r: Run<L, D, S, I, E>): void {
  Object.defineProperty(w, "__fightStats", {
    get: () => ({
      stepsPerFrame: r.clock.frames > 1 ? r.clock.steps / (r.clock.frames - 1) : 0,
      distinctDraws: r.c.draws > 1 ? r.c.distinct / (r.c.draws - 1) : 1,
      ...r.cell.stats(),
      // the HARNESS's count wins: it is the equal-work number, and a cell that under-reports
      // its own `drawn` must not be able to win on it
      drawn: r.c.drawn,
      cellDrawn: r.cell.stats().drawn,
      ttffMs: r.c.ttff,
      refresh: r.c.refreshHz,
    }),
    configurable: true,
  });
}

/** the tape, the kind, the data, the sheets, the mount, the fresh state and the input: everything before the first frame */
async function prepare<L, D, S, I, E extends { kind: string }>(cell: Cell, opts: CellOptions<L, D, S, I, E>): Promise<Run<L, D, S, I, E>> {
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
  // a tape's own carry wins: replaying it against another purse would be a different sim
  const carry = tape ? tape.carry : opts.carry;
  const live: Live<D, S, I, E> = { data, prev: kind.create(data, carry), next: kind.create(data, carry), tape, ticks: [], events: [], done: false, untilHeld: false };
  // the painter spans the whole room, not one screen: a stage's camera scrolls through it; a kind
  // whose picture is a painted frame (the dungeon) hands over its own ops and the painter is not asked
  const arena = room.ops ?? arenaOps(room.art, { w: room.world?.w ?? room.view.w, h: room.view.h });
  // a tape run reads no hands - the hash measures the sim, not the player
  const poll = tape ? null : kind.attachInput(host, data);
  const fast = new URLSearchParams(location.search).get("fast") === "1";
  const c: Counters = { drawn: 0, distinct: 0, draws: 0, lastKey: "", ttff: -1, fxFed: 0, refreshHz: null };
  void detectRefresh().then((hz) => { c.refreshHz = hz; });
  return { kind, live, cell, arena, fx: createFx(), poll, clock: createClock(), fast, boxes: !!opts.boxes, viewW: room.view.w, until: opts.until, c, t0: performance.now() };
}

export async function runCell<L, D, S, I, E extends { kind: string }>(cell: Cell, opts: CellOptions<L, D, S, I, E>): Promise<RunHandle<S>> {
  let resolveDone!: (s: S) => void, rejectDone!: (e: unknown) => void;
  const done = new Promise<S>((res, rej) => { resolveDone = res; rejectDone = rej; });
  // a page that ignores the handle must not see an unhandled rejection; an awaiting caller still does
  done.catch(() => {});
  let raf = 0, stopped = false;
  let r: Run<L, D, S, I, E> | null = null;
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    r?.poll?.detach();
    cell.unmount();
  };
  try {
    r = await prepare(cell, opts);
    const run = r;
    const frame = (now: number): void => {
      if (stopped) return;
      try {
        drawFrame(run, now);
        if (run.live.untilHeld) { resolveDone(run.live.next); return; }
        if (!(run.live.done && run.fast)) raf = requestAnimationFrame(frame);
      } catch (err) { fail(err); rejectDone(err); }
    };
    exposeStats(run);
    publish(run.kind, run.live);
    // the compare page starts every arm on one postMessage("go") so they run in lockstep;
    // a page opened directly starts at once
    if (new URLSearchParams(location.search).get("wait") === "1") {
      window.addEventListener("message", (e) => { if (e.data === "go") raf = requestAnimationFrame(frame); }, { once: true });
    } else {
      raf = requestAnimationFrame(frame);
    }
  } catch (err) { fail(err); rejectDone(err); }
  return { stop, done };
}
