import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { Button } from "@ui/components";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, haptic, shake } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import {
  DEATH_Y,
  DIFFICULTIES,
  FIELD_H,
  FIELD_ROWS,
  FIELD_W,
  LAUNCHER,
  LEVELS,
  MAX_ANGLE,
  ROW_H,
  aim,
  at as bubbleAt,
  cellCenter,
  fire,
  newGame,
  rowWidth,
  scoreReport,
  type Difficulty,
  type Point,
  type ShooterState,
} from "./logic";

/**
 * The renderer, and the answer to "which engine".
 *
 * NONE, and that is a measurement rather than a shortcut. This repo ran three
 * engine tournaments (`docs/engine-tournament/`) and the standing verdict is
 * that Phaser stays for what already uses it — snake, the only canvas game —
 * while a new game "almost certainly needs no engine". This one is the case
 * that argues hardest for one and still does not need it:
 *
 *   · what an engine sells is a game loop, a scene graph, input plumbing and a
 *     sprite batcher. The batcher is the one that matters, and it matters at
 *     hundreds of sprites. A full board here is 115 circles, drawn once per
 *     frame by `arc()` — three orders of magnitude under where batching starts
 *     to pay, and Phaser's own 379 KB would be paid by every player of THIS
 *     game to buy it (its chunk is lazy, so it is not shared with anything);
 *   · the loop an engine provides is the fixed-timestep one that
 *     `.claude/rules/fixed-timestep-must-match-display.md` exists about. There
 *     is no simulation stepping here at all — `logic.ts` solves each shot in
 *     one call and this file interpolates along the answer by wall-clock
 *     elapsed time, so a 60, 120 or 144 Hz display draws the same flight at the
 *     same speed and a dropped frame costs nothing;
 *   · Pointer Events are the input layer this platform's rules require anyway.
 *
 * So the whole engine surface reduces to `requestAnimationFrame`, one 2D
 * context, and `performance.now()`. Cost to the player: zero bytes beyond the
 * game's own chunk.
 *
 * WHAT LIVES HERE AND WHAT DOES NOT. Every rule — where a bubble lands, what
 * pops, what falls, what a shot is worth — is in `logic.ts` and is unit-tested
 * in node with no canvas. This file decides only what those answers LOOK and
 * SOUND like.
 */

const LEVEL_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

/**
 * This game's own words, as a locale RECORD rather than a `locale === "he" ?`
 * ternary — promoting a language reds this block by name instead of leaving the
 * game speaking English inside a page that is not.
 */
const WORDS: Record<Locale, {
  hint: string;
  shots: string;
  boards: string;
  aimLeft: string;
  aimRight: string;
  shoot: string;
  field: string;
  next: string;
  helper: string;
}> = {
  he: {
    hint: "מכוונים, יורים, ושלוש בועות באותו צבע מתפוצצות",
    shots: "עד ירידה",
    boards: "לוחות",
    aimLeft: "לכוון שמאלה",
    aimRight: "לכוון ימינה",
    shoot: "לירות",
    field: "לוח הבועות — נגיעה מכוונת, הרפיה יורה",
    next: "הבאה בתור",
    helper: "קו כיוון",
  },
  en: {
    hint: "Aim, shoot, and three of a colour pop",
    shots: "To drop",
    boards: "Boards",
    aimLeft: "Aim left",
    aimRight: "Aim right",
    shoot: "Shoot",
    field: "Bubble field — touch to aim, release to shoot",
    next: "Next up",
    helper: "Aim guide",
  },
  es: {
    hint: "Apunta, dispara, y tres del mismo color revientan",
    shots: "Para bajar",
    boards: "Tableros",
    aimLeft: "Apuntar a la izquierda",
    aimRight: "Apuntar a la derecha",
    shoot: "Disparar",
    field: "Campo de burbujas — toca para apuntar, suelta para disparar",
    next: "Siguiente",
    helper: "Guía",
  },
};

/**
 * The six bubbles.
 *
 * EVERY ONE CARRIES A SHAPE AS WELL AS A COLOUR, and that is the accessibility
 * decision this game turns on. Roughly one boy in twelve cannot separate the
 * red from the green here, and a match-three game played on hue alone is not
 * hard for them, it is unplayable. The mark is drawn inside the bubble at a
 * size that survives a 36px circle on a phone.
 *
 * The ORDER is the difficulty ladder: easy uses the first four, which are the
 * four furthest apart on both axes; purple and orange join later, by which
 * point the marks are doing the work anyway.
 */
type Mark = "dot" | "ring" | "triangle" | "star" | "diamond" | "plus";
const BUBBLES: ReadonlyArray<{ fill: string; rim: string; mark: Mark }> = [
  { fill: "#FF4D6D", rim: "#B81E42", mark: "dot" },
  { fill: "#2BA8F0", rim: "#0B69A6", mark: "ring" },
  { fill: "#57C64B", rim: "#2A7F24", mark: "triangle" },
  { fill: "#FFC02E", rim: "#B57B00", mark: "star" },
  { fill: "#A855C9", rim: "#6B2A8C", mark: "diamond" },
  { fill: "#FF8A3D", rim: "#B94E10", mark: "plus" },
];

/** Bubble units per second in flight. Fast enough to feel fired, slow enough to read. */
const SPEED = 20;
/** How long a popped bubble takes to burst. */
const POP_MS = 200;
/** How long a knocked-loose bubble falls before it is off the board. */
const DROP_MS = 620;
/** How long the whole field takes to slide down one row. */
const DESCEND_MS = 260;
/** Points between one milestone coin and the next. */
const MILESTONE = 1000;
/** Keyboard aim step, in radians. ~2.3°, so a held key sweeps at a usable rate. */
const KEY_STEP = 0.04;

/** Peak deformation while squeezing: 30% narrower across, 30% longer along. */
const SQUASH = 0.3;
/** How far either side of a gap's middle the squash is visible, in bubble units. */
const SQUASH_REACH = 0.75;

/**
 * Whether the aiming guide is drawn, under the game's own `ellaz:<gameId>:`
 * namespace - the same one `useRememberedLevel` writes the chosen level to.
 *
 * DEFAULT ON, and that is not a hedge. The landing ring is described a hundred
 * lines below as "the single thing that makes the game playable with a finger
 * on a 390px screen rather than a guess", which is a claim about a five-year-old
 * on a phone, not about taste. Off is a challenge a player goes looking for; it
 * is never something they are handed by an empty localStorage.
 */
const HELPER_KEY = "aimHelper";

interface Puff {
  x: number;
  y: number;
  color: number;
  start: number;
}
interface Faller extends Puff {
  vx: number;
}
interface Flight {
  path: Point[];
  /** The middle of each gap this shot squeezes through - see SQUEEZE_DIST. */
  squeezes: Point[];
  /** Cumulative distance to the end of each segment. */
  marks: number[];
  total: number;
  color: number;
  start: number;
  result: ReturnType<typeof fire>;
}

interface Session {
  state: ShooterState;
  /** Milestone coins already collected this run — see the session rule. */
  milestone: number;
  /** Whether this run has already had its one personal-best moment. */
  bestFired: boolean;
}

/**
 * A stored position is validated, never trusted: it was written by a previous
 * build, may have been truncated, and can be hand-edited. Everything the
 * renderer indexes blindly is checked here, because the failure is not a throw
 * — it is a plausible board the rules can no longer explain.
 */
const SESSION: SessionSpec<Session> = {
  version: 1,
  validate: (value): value is Session => {
    const s = value as Partial<Session> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.milestone !== "number" || !Number.isFinite(s.milestone) || s.milestone < 0) return false;
    if (typeof s.bestFired !== "boolean") return false;
    const g = s.state as Partial<ShooterState> | undefined;
    if (typeof g !== "object" || g === null) return false;
    if (typeof g.level !== "string" || !(g.level in LEVELS)) return false;
    if (g.shift !== 0 && g.shift !== 1) return false;
    if (typeof g.score !== "number" || !Number.isFinite(g.score) || g.score < 0) return false;
    if (typeof g.boards !== "number" || !Number.isFinite(g.boards)) return false;
    if (typeof g.shotsLeft !== "number" || g.shotsLeft < 1) return false;
    if (typeof g.dead !== "boolean") return false;
    const palette = LEVELS[g.level].colors;
    const colour = (c: unknown) => typeof c === "number" && c >= 0 && c < BUBBLES.length;
    if (!colour(g.current) || !colour(g.next)) return false;
    // The row WIDTHS have to match what this build's geometry says, not what
    // the snapshot claims: every draw and every neighbour walk indexes by
    // `rowWidth`, so a row one short renders a hole that no rule put there.
    if (!Array.isArray(g.rows) || g.rows.length !== FIELD_ROWS) return false;
    for (let r = 0; r < FIELD_ROWS; r++) {
      const row = g.rows[r];
      if (!Array.isArray(row) || row.length !== rowWidth(r, g.shift)) return false;
      if (!row.every((c) => c === null || (colour(c) && (c as number) < Math.max(palette, BUBBLES.length)))) {
        return false;
      }
    }
    return true;
  },
};

/** Distance along a polyline, and the point at a given distance. */
function measure(path: Point[]): { marks: number[]; total: number } {
  const marks: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    marks.push(total);
  }
  return { marks, total };
}

function along(f: Flight, distance: number): Point {
  const d = Math.min(distance, f.total);
  for (let i = 0; i < f.marks.length; i++) {
    if (d <= f.marks[i]) {
      const from = f.path[i];
      const to = f.path[i + 1];
      const segStart = i === 0 ? 0 : f.marks[i - 1];
      const segLen = f.marks[i] - segStart || 1;
      const k = (d - segStart) / segLen;
      return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
    }
  }
  return f.path[f.path.length - 1];
}

export function BubbleShooterGame({ ctx }: { ctx: GameContext }) {
  // The level a child last chose, VALIDATED against this game's own list — an
  // id no longer in the list resolves to -1 in GameChrome's findIndex and the
  // difficulty toggle silently disappears.
  const [level, setLevel] = useRememberedLevel(ctx, DIFFICULTIES, "easy");

  // Read ONCE. A stored position for some other difficulty is discarded rather
  // than rendered under chrome that disagrees with it.
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  const resume = restored && restored.state.level === level && !restored.state.dead ? restored : undefined;

  const [state, setState] = useState<ShooterState>(() => resume?.state ?? newGame(level));
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  const [helper, setHelper] = useState<boolean>(() => ctx.storage.get<boolean>(HELPER_KEY, true));

  const stateRef = useRef(state);
  const angleRef = useRef(0);
  const flightRef = useRef<Flight | null>(null);
  const popsRef = useRef<Puff[]>([]);
  const dropsRef = useRef<Faller[]>([]);
  const descendRef = useRef(0);
  const milestoneRef = useRef(resume?.milestone ?? 0);
  const bestFiredRef = useRef(resume?.bestFired ?? false);
  /** Did the score port call anything in this run a personal best? */
  const sawBestRef = useRef(false);
  /** The draw loop reads the ref; the chrome reads the state. Same split the
   *  board itself uses, and for the same reason: rAF runs outside React. */
  const helperRef = useRef(helper);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  /** Both copies at once: the loop reads the ref, the chrome reads the state. */
  const apply = useCallback((next: ShooterState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const start = useCallback(
    (next: Difficulty) => {
      setLevel(next);
      flightRef.current = null;
      popsRef.current = [];
      dropsRef.current = [];
      descendRef.current = 0;
      angleRef.current = 0;
      // A new run has been paid for nothing yet. Both latches reset HERE and
      // nowhere else — without it, leaving and restarting is a way to collect
      // the same milestone twice.
      milestoneRef.current = 0;
      bestFiredRef.current = false;
      sawBestRef.current = false;
      setBest(ctx.score?.best(next));
      apply(newGame(next));
      ctx.analytics.levelStart(next);
    },
    [apply, ctx, setLevel],
  );

  const restart = useCallback(() => start(stateRef.current.level), [start]);

  /**
   * Flip the guide on or off.
   *
   * The next value is derived from the REF and not from a `setHelper(on => !on)`
   * updater. React may run an updater twice, and the storage write inside one
   * would then be a coin flip - see `game-difficulty-and-juice-convention.md`.
   * Written through immediately rather than in an effect, for the same reason
   * `useRememberedLevel` does: a tap that unmounts the game would lose it.
   */
  const toggleHelper = useCallback(() => {
    const next = !helperRef.current;
    helperRef.current = next;
    setHelper(next);
    ctx.storage.set(HELPER_KEY, next);
  }, [ctx]);

  // A dead run is CLEARED, not frozen: restoring a lost board shows a child a
  // game with nothing left to do and no obvious way to understand why.
  useGameSession(
    ctx,
    SESSION,
    () => ({
      state: stateRef.current,
      milestone: milestoneRef.current,
      bestFired: bestFiredRef.current,
    }),
    { live: !state.dead },
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    ctx.lifecycle.gameplayStart();
    ctx.analytics.levelStart(level);
  }, [ctx, level]);

  /** The middle of the board in SCREEN coordinates, for coins and confetti. */
  const anchor = useCallback((p?: Point) => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const r = el.getBoundingClientRect();
    if (!p) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    return { x: r.left + (p.x / FIELD_W) * r.width, y: r.top + (p.y / FIELD_H) * r.height };
  }, []);

  /**
   * Everything a landed shot produced.
   *
   * Called from the animation callback, which is the handler flow — never from
   * inside a `setState` updater, where React may run it twice and a doubled
   * `winMoment` is a doubled grant of real coins.
   */
  const settle = useCallback(
    (flight: Flight) => {
      const { state: next, outcome } = flight.result;
      if (!outcome.cell) return;
      const before = stateRef.current;
      apply(next);

      const landed = cellCenter(outcome.cell.row, outcome.cell.col, before.shift);
      const where = anchor(landed);

      if (outcome.popped.length > 0) {
        const now = performance.now();
        for (const c of outcome.popped) {
          const p = cellCenter(c.row, c.col, before.shift);
          popsRef.current.push({ x: p.x, y: p.y, color: before.current, start: now });
        }
        for (const c of outcome.dropped) {
          const p = cellCenter(c.row, c.col, before.shift);
          dropsRef.current.push({
            x: p.x,
            y: p.y,
            color: bubbleAt(before, c.row, c.col) ?? 0,
            start: now,
            vx: (c.col % 2 === 0 ? -1 : 1) * (0.4 + (c.row % 3) * 0.25),
          });
        }
        ctx.audio.play(outcome.dropped.length > 0 ? "success" : "pop");
        haptic.tap();
        if (where) burst(where.x, where.y, { count: 8 + outcome.popped.length * 2 });
      } else {
        ctx.audio.play("tap");
      }

      if (outcome.pushed) {
        descendRef.current = performance.now();
        ctx.audio.play("flip");
      }

      if (outcome.gained > 0) {
        // The record climbs WITH the run. This game has no ending a player
        // reaches on purpose, so waiting for one would mean a run somebody
        // walks away from never counted at all.
        const scored = ctx.score?.report(scoreReport(next));
        if (scored?.isPersonalBest) {
          setBest(scored.best);
          // Remembered rather than re-derived at the end of the run. By then
          // the port has already stored this score, so "is my score >= the
          // record" is true for every run that merely EQUALLED the old one -
          // and equalling is not beating. The port's own answer, at the moment
          // it was true, is the only one that can tell them apart.
          sawBestRef.current = true;
        }

        const step = Math.floor(next.score / MILESTONE);
        if (step > milestoneRef.current) {
          milestoneRef.current = step;
          // `confetti: false` — this fires every few good shots, and a
          // full-screen celebration that often stops being one.
          winMoment(ctx, {
            reason: "milestone",
            level: `points-${step * MILESTONE}`,
            at: where,
            confetti: false,
          });
        }
      }

      // A cleared board is the one thing in this game that is genuinely
      // FINISHED, so it is the one thing that pays a completion star.
      if (outcome.cleared) {
        ctx.audio.play("win");
        haptic.success();
        winMoment(ctx, {
          reason: "level_complete",
          tier: next.level,
          level: `board-${next.boards}`,
          at: anchor(),
        });
        ctx.analytics.levelComplete(`board-${next.boards}`, 0);
      }

      if (outcome.dead) {
        ctx.audio.play("fail");
        if (wrapRef.current) shake(wrapRef.current);
        ctx.analytics.levelFail(next.level, "reached-the-line");
        // The one celebration an endless run gets, latched to once. Without the
        // latch a first-time player — whose record is nothing at all — would
        // collect it on every run forever.
        if (sawBestRef.current && !bestFiredRef.current) {
          bestFiredRef.current = true;
          winMoment(ctx, {
            reason: "personal_best",
            tier: next.level,
            level: `best-${next.score}`,
            at: anchor(),
          });
        }
      }
    },
    [anchor, apply, ctx],
  );

  const shoot = useCallback(() => {
    if (flightRef.current || stateRef.current.dead) return;
    ctx.audio.unlock();
    ctx.speech.unlock();
    const s = stateRef.current;
    const result = fire(s, angleRef.current);
    if (!result.outcome.cell) return;
    const { marks, total } = measure(result.shot.path);
    flightRef.current = {
      path: result.shot.path,
      squeezes: result.shot.squeezes,
      marks,
      total,
      color: s.current,
      start: performance.now(),
      result,
    };
    ctx.audio.play("flip");
    haptic.tap();
  }, [ctx]);

  /* ── input ───────────────────────────────────────────────────────────────
     Pointer Events only, `touch-action: none` on the surface, and a keyboard
     path that is not a lesser one: arrows sweep the aim and space fires, so
     the game is completable without any pointer precision at all. */

  const aimAt = useCallback((clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ux = ((clientX - r.left) / r.width) * FIELD_W;
    const uy = ((clientY - r.top) / r.height) * FIELD_H;
    const dx = ux - LAUNCHER.x;
    const dy = uy - LAUNCHER.y;
    // Below the launcher there is no upward angle to compute, so the aim pins
    // to the nearest limit instead of flipping to point at the floor.
    const a = dy < -0.05 ? Math.atan2(dx, -dy) : Math.sign(dx || 1) * MAX_ANGLE;
    angleRef.current = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, a));
  }, []);

  const nudge = useCallback((delta: number) => {
    angleRef.current = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angleRef.current + delta));
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let down = false;
    const onDown = (e: PointerEvent) => {
      if (stateRef.current.dead) return;
      down = true;
      el.setPointerCapture(e.pointerId);
      aimAt(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      // Hover aims too, on a mouse; on a touch screen only a held finger does.
      if (!down && e.pointerType !== "mouse") return;
      if (stateRef.current.dead) return;
      aimAt(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      aimAt(e.clientX, e.clientY);
      shoot();
    };
    const onCancel = () => {
      down = false;
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
    };
  }, [aimAt, shoot]);

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudge(-KEY_STEP);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudge(KEY_STEP);
      } else if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp") {
        e.preventDefault();
        shoot();
      }
    },
    [nudge, shoot],
  );

  /* ── the loop ────────────────────────────────────────────────────────────
     One rAF, everything positioned from WALL-CLOCK elapsed rather than from a
     frame count. Nothing here decides an outcome, so a 144 Hz screen, a 60 Hz
     screen and a tab that just came back all draw the same game. */

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const g = el.getContext("2d");
    if (!g) return;

    let raf = 0;
    let css = { w: 0, h: 0 };

    const resize = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (r.width === css.w && r.height === css.h) return;
      css = { w: r.width, h: r.height };
      el.width = Math.round(r.width * dpr);
      el.height = Math.round(r.height * dpr);
    };

    const frame = (now: number) => {
      resize();
      draw(g, el, now, {
        state: stateRef.current,
        angle: angleRef.current,
        helper: helperRef.current,
        flight: flightRef.current,
        pops: popsRef.current,
        drops: dropsRef.current,
        descend: descendRef.current,
      });

      // Retire finished animations, then land the shot. The order matters only
      // in that the flight is cleared BEFORE `settle` runs, so a settle that
      // triggers a re-render cannot be handed a flight that is already over.
      popsRef.current = popsRef.current.filter((p) => now - p.start < POP_MS);
      dropsRef.current = dropsRef.current.filter((p) => now - p.start < DROP_MS);
      const f = flightRef.current;
      if (f && now - f.start >= (f.total / SPEED) * 1000) {
        flightRef.current = null;
        settle(f);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [settle]);

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "bolt", label: ctx.t("score"), value: state.score, record: best ?? "-" },
        { icon: "layers", label: WORDS[ctx.locale].shots, value: state.shotsLeft, compact: true },
      ]}
      levels={LEVEL_OPTIONS}
      level={state.level}
      onLevel={start}
      onRestart={restart}
      footer={
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 8,
          }}
        >
          {/* The guide's off switch, on its OWN row and at the logical end.
              Not in the row below, and that is the whole placement decision: a
              settings chip wedged beside Shoot is a chip a child taps when they
              meant to fire. `flex-end` is logical, so it sits left in Hebrew. */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={toggleHelper}
              aria-pressed={helper}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minHeight: 38,
                padding: "6px 14px",
                border: "none",
                borderRadius: 999,
                // --brand-strong is FLAT and carries --on-brand at 5.87:1 in
                // market and 4.86:1 in night. The gradient --brand-fill cannot
                // carry a label at all — see a-contrast-floor-is-a-floor.
                background: helper ? "var(--brand-strong)" : "var(--surface-2)",
                color: helper ? "var(--on-brand)" : "var(--text-dim)",
                fontFamily: "inherit",
                fontSize: ".82rem",
                fontWeight: 700,
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              <span aria-hidden="true">{helper ? "◉" : "○"}</span>
              {WORDS[ctx.locale].helper}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // The item count is fixed here and the WIDTH is not — see
              // a-row-that-grows-with-the-catalog-must-wrap.md.
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {/* Aiming without a pointer. Not a fallback: holding a steady angle on
                a phone is exactly what a five-year-old and anyone on assistive
                input cannot do, and these two buttons plus Shoot are a complete
                way to play the game. */}
            <AimButton label={WORDS[ctx.locale].aimLeft} glyph="◀" onPress={() => nudge(-KEY_STEP * 2)} />
            <Button onClick={shoot} aria-label={WORDS[ctx.locale].shoot}>
              {WORDS[ctx.locale].shoot}
            </Button>
            <AimButton label={WORDS[ctx.locale].aimRight} glyph="▶" onPress={() => nudge(KEY_STEP * 2)} />
          </div>
        </div>
      }
    >
      {/* Two boxes, and the inner one is the fix. With `position: relative` on
          the CENTERING row, the game-over sheet below stretched to the panel's
          full width - correct-looking at 390px, where the row and the board are
          the same size, and a dimmed slab hanging off both sides of a 430px
          board at 1440px. The inner box shrink-wraps the canvas, so the sheet
          and the board are the same rectangle at every width. */}
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <div ref={wrapRef} style={{ position: "relative", display: "flex" }}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="application"
          aria-label={`${WORDS[ctx.locale].field}. ${WORDS[ctx.locale].hint}.`}
          onKeyDown={onKey}
          style={{
            // Sized against the VIEWPORT like every board here, and the vh term
            // leads because this board is TALLER than it is wide: capping on
            // width alone puts the launcher under the fold on a short phone in
            // landscape. The 430px cap sits well inside the 700px desktop panel
            // (game-panel-clears-widest-board.test.ts).
            width: `min(94vw, ${(FIELD_W / FIELD_H) * 66}vh, 430px)`,
            aspectRatio: `${FIELD_W} / ${FIELD_H}`,
            display: "block",
            borderRadius: 16,
            background: "var(--surface-2)",
            boxShadow: "var(--shadow-1)",
            touchAction: "none",
            cursor: state.dead ? "default" : "crosshair",
            outlineOffset: 3,
          }}
        />

        {state.dead && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(20, 22, 44, 0.72)",
              borderRadius: 16,
            }}
          >
            <div style={{ textAlign: "center", padding: 12 }}>
              <div style={{ fontSize: 40 }}>🫧</div>
              <h2 style={{ margin: "8px 0", color: "#fff" }}>{ctx.t("gameOver")}</h2>
              <p style={{ margin: "0 0 12px", color: "#fff", opacity: 0.85, fontWeight: 700 }}>
                {ctx.t("score")}: {state.score}
                {state.boards > 0 ? ` · ${WORDS[ctx.locale].boards}: ${state.boards}` : ""}
              </p>
              <Button onClick={restart}>{ctx.t("restart")}</Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </GameChrome>
  );
}

/** A press-and-hold aim nudge. Holding sweeps; a single tap steps once. */
function AimButton({ label, glyph, onPress }: { label: string; glyph: string; onPress: () => void }) {
  const timer = useRef<number | null>(null);
  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
        stop();
        timer.current = window.setInterval(onPress, 60);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") onPress();
      }}
      style={{
        width: 56,
        height: 48,
        flex: "0 0 auto",
        border: "none",
        borderRadius: "var(--radius-2)",
        background: "var(--surface-2)",
        color: "var(--text)",
        fontSize: 20,
        fontFamily: "inherit",
        cursor: "pointer",
        touchAction: "none",
      }}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DRAWING. Pure of game rules: it is handed a state and some clocks, and paints.
   ───────────────────────────────────────────────────────────────────────────*/

interface Frame {
  state: ShooterState;
  angle: number;
  /** Draw the aiming guide? A player's choice - see HELPER_KEY. */
  helper: boolean;
  flight: Flight | null;
  pops: Puff[];
  drops: Faller[];
  descend: number;
}

function draw(g: CanvasRenderingContext2D, el: HTMLCanvasElement, now: number, f: Frame) {
  const w = el.width;
  const h = el.height;
  // One unit = this many device pixels. Every coordinate below is in bubble
  // units, so the same board at 320px and at 700px is the same picture.
  const u = w / FIELD_W;
  const r = 0.5 * u;

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);

  const { state } = f;

  // The line. Dashed rather than solid, because a solid bar reads as a floor
  // the bubbles are resting on rather than as the thing not to reach.
  g.save();
  g.strokeStyle = "rgba(255, 77, 109, 0.55)";
  g.lineWidth = Math.max(1.5, u * 0.05);
  g.setLineDash([u * 0.28, u * 0.22]);
  g.beginPath();
  g.moveTo(0, DEATH_Y * u);
  g.lineTo(w, DEATH_Y * u);
  g.stroke();
  g.restore();

  // The field, offset upward while a new row is sliding in.
  const slide =
    f.descend > 0 && now - f.descend < DESCEND_MS
      ? (1 - easeOut((now - f.descend) / DESCEND_MS)) * ROW_H
      : 0;
  for (let row = 0; row < FIELD_ROWS; row++) {
    for (let col = 0; col < rowWidth(row, state.shift); col++) {
      const color = bubbleAt(state, row, col);
      if (color === null) continue;
      const p = cellCenter(row, col, state.shift);
      bubble(g, p.x * u, (p.y - slide) * u, r, color, 1);
    }
  }

  // Knocked loose: real gravity, a little sideways drift, gone before it lands.
  for (const d of f.drops) {
    const t = (now - d.start) / 1000;
    const y = d.y + 14 * t * t;
    const x = d.x + d.vx * t;
    const life = (now - d.start) / DROP_MS;
    bubble(g, x * u, y * u, r, d.color, Math.max(0, 1 - life * life));
  }

  // Popped: a quick swell and out.
  for (const p of f.pops) {
    const t = (now - p.start) / POP_MS;
    bubble(g, p.x * u, p.y * u, r * (1 + t * 0.7), p.color, Math.max(0, 1 - t));
  }

  const flying = f.flight;

  // The guide. Drawn from the SAME `aim()` call the shot will use, so what a
  // player is shown and where the bubble goes cannot disagree.
  if (!flying && !state.dead && f.helper) {
    const shot = aim(state, f.angle);
    g.save();
    g.strokeStyle = "rgba(255, 255, 255, 0.55)";
    g.lineWidth = Math.max(1.5, u * 0.07);
    g.lineCap = "round";
    g.setLineDash([u * 0.16, u * 0.3]);
    g.beginPath();
    g.moveTo(shot.path[0].x * u, shot.path[0].y * u);
    for (let i = 1; i < shot.path.length; i++) g.lineTo(shot.path[i].x * u, shot.path[i].y * u);
    g.stroke();
    g.restore();

    // A ring where it will end up. This is the single thing that makes the
    // game playable with a finger on a 390px screen rather than a guess.
    if (shot.cell) {
      const p = cellCenter(shot.cell.row, shot.cell.col, state.shift);
      g.save();
      g.strokeStyle = BUBBLES[state.current % BUBBLES.length].fill;
      g.globalAlpha = 0.8;
      g.lineWidth = Math.max(2, u * 0.09);
      g.beginPath();
      g.arc(p.x * u, p.y * u, r * 0.82, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
  }

  // The launcher: a socket, and the loaded bubble tilted toward the aim.
  const lx = LAUNCHER.x * u;
  const ly = LAUNCHER.y * u;
  g.save();
  g.fillStyle = "rgba(36, 28, 59, 0.16)";
  g.beginPath();
  g.arc(lx, ly, r * 1.5, 0, Math.PI * 2);
  g.fill();
  g.restore();

  if (!state.dead) {
    g.save();
    g.translate(lx, ly);
    g.rotate(Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, f.angle)));
    g.fillStyle = "rgba(36, 28, 59, 0.34)";
    roundedBar(g, -r * 0.34, -r * 2.1, r * 0.68, r * 1.7, r * 0.3);
    g.restore();
  }

  // The bubble in the launcher, unless it is currently in the air.
  if (!flying) bubble(g, lx, ly, r, state.current, 1);

  // On deck, small and to one side. Never a word, so it needs no translating.
  bubble(g, lx + r * 2.4, ly + r * 0.5, r * 0.62, state.next, 0.92);

  if (flying) {
    const travelled = ((now - flying.start) / 1000) * SPEED;
    const p = along(flying, travelled);
    const squash = squashAt(flying, p);
    if (squash <= 0) {
      bubble(g, p.x * u, p.y * u, r, flying.color, 1);
    } else {
      // Squeezing through a one-bubble gap. Narrow ACROSS the direction of
      // travel and long ALONG it, which is the shape a thing forced through a
      // hole actually takes - and the reason the player asked for it.
      //
      // `rotate(h) · scale · rotate(-h)` is a directional scale: it squashes
      // along the flight axis and leaves the bubble itself UPRIGHT, so the mark
      // that says which colour this is stays readable. A plain `rotate` would
      // spin the mark with the shot.
      const ahead = along(flying, travelled + 0.01);
      const h = Math.atan2(ahead.y - p.y, ahead.x - p.x);
      g.save();
      g.translate(p.x * u, p.y * u);
      g.rotate(h);
      g.scale(1 + squash * SQUASH, 1 - squash * SQUASH);
      g.rotate(-h);
      bubble(g, 0, 0, r, flying.color, 1);
      g.restore();
    }
  }
}

/**
 * How squashed the bubble is at this point of its flight, 0..1.
 *
 * A raised cosine centred on each squeeze midpoint `aim()` reported, so the
 * bubble narrows on the way in and rounds out on the way out rather than
 * snapping between two shapes. Zero on the overwhelming majority of shots,
 * which never thread anything.
 */
function squashAt(f: Flight, p: Point): number {
  let best = 0;
  for (const q of f.squeezes) {
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d >= SQUASH_REACH) continue;
    const t = 0.5 + 0.5 * Math.cos((d / SQUASH_REACH) * Math.PI);
    if (t > best) best = t;
  }
  return best;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function roundedBar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
  g.fill();
}

/**
 * One bubble: body, rim, specular highlight, and the MARK that says which
 * colour this is without relying on the colour.
 */
function bubble(g: CanvasRenderingContext2D, x: number, y: number, rad: number, color: number, alpha: number) {
  if (alpha <= 0) return;
  const skin = BUBBLES[color % BUBBLES.length];
  g.save();
  g.globalAlpha = alpha;

  g.fillStyle = skin.fill;
  g.beginPath();
  g.arc(x, y, rad * 0.94, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = skin.rim;
  g.lineWidth = Math.max(1, rad * 0.13);
  g.stroke();

  // Highlight: the one thing that makes a flat disc read as a bubble.
  g.fillStyle = "rgba(255, 255, 255, 0.5)";
  g.beginPath();
  g.ellipse(x - rad * 0.3, y - rad * 0.36, rad * 0.3, rad * 0.2, -0.6, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = "rgba(255, 255, 255, 0.85)";
  g.strokeStyle = "rgba(255, 255, 255, 0.85)";
  g.lineWidth = Math.max(1, rad * 0.15);
  const m = rad * 0.34;
  g.beginPath();
  switch (skin.mark) {
    case "dot":
      g.arc(x, y + rad * 0.12, m * 0.62, 0, Math.PI * 2);
      g.fill();
      break;
    case "ring":
      g.arc(x, y + rad * 0.12, m * 0.66, 0, Math.PI * 2);
      g.stroke();
      break;
    case "triangle":
      g.moveTo(x, y - m * 0.5 + rad * 0.12);
      g.lineTo(x + m * 0.82, y + m * 0.72 + rad * 0.12);
      g.lineTo(x - m * 0.82, y + m * 0.72 + rad * 0.12);
      g.closePath();
      g.fill();
      break;
    case "star":
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        g.moveTo(x, y + rad * 0.12);
        g.lineTo(x + Math.sin(a) * m, y + rad * 0.12 - Math.cos(a) * m);
      }
      g.stroke();
      break;
    case "diamond":
      g.moveTo(x, y + rad * 0.12 - m);
      g.lineTo(x + m * 0.8, y + rad * 0.12);
      g.lineTo(x, y + rad * 0.12 + m);
      g.lineTo(x - m * 0.8, y + rad * 0.12);
      g.closePath();
      g.fill();
      break;
    case "plus":
      g.moveTo(x - m * 0.85, y + rad * 0.12);
      g.lineTo(x + m * 0.85, y + rad * 0.12);
      g.moveTo(x, y + rad * 0.12 - m * 0.85);
      g.lineTo(x, y + rad * 0.12 + m * 0.85);
      g.stroke();
      break;
  }
  g.restore();
}
