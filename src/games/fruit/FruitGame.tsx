import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { textFor, type Locale } from "@i18n/index";
import type { GameContext, RewardTier, SessionSpec } from "@sdk/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import { mulberry32, seedFrom } from "@shared/rng";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import {
  DEATH_LINE,
  DT,
  LEVELS,
  LEVEL_IDS,
  SPAWN_Y,
  STEP_MS,
  TIER_COUNT,
  WORLD_H,
  canDrop,
  clampDropX,
  drop,
  isSettled,
  newWorld,
  radiusOf,
  scoreFor,
  step,
  type Fruit,
  type LevelId,
  type World,
} from "./logic";

/**
 * The level row, built FROM the logic's own list rather than beside it, so
 * adding a tier to `logic.ts` reds this file by name instead of shipping a
 * difficulty the toggle cannot reach.
 */
const LEVEL_LABELS: Record<LevelId, Record<Locale, string>> = {
  easy: { he: "רחב", en: "Wide", es: "Ancha" },
  medium: { he: "בינוני", en: "Med", es: "Media" },
  hard: { he: "צר", en: "Narrow", es: "Estrecha" },
};

const LEVEL_OPTIONS: ChromeLevel<LevelId>[] = LEVEL_IDS.map((id) => ({
  id,
  label: LEVEL_LABELS[id],
}));

/**
 * Two vocabularies that happen to spell the same three words today.
 *
 * A level is a box width; a tier is what the economy pays for it. Written out
 * rather than passed straight through, so the day this game gains a fourth box
 * the compiler asks what that is worth instead of quietly handing `grant()` a
 * tier it has never heard of.
 */
const LEVEL_TIER: Record<LevelId, RewardTier> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

/* ---------------------------------------------------------------- the art */

/**
 * One face per rung of the chain, in the same order `logic.ts` sizes them.
 *
 * Every tier gets a distinct HUE as well as a distinct SIZE, and both channels
 * are load-bearing: the whole game is telling two fruit apart at a glance in a
 * crowded box, and size alone is a fine signal for the ends of the ladder and a
 * poor one in the middle, where neighbouring rungs are only 1.2x apart.
 *
 * The emoji is the one place a game's own art may be one - the fruit ARE the
 * art here, exactly as the balloons are drawings in `balloons`. The circle
 * behind it is what actually carries the colour, so a platform whose emoji font
 * renders a lemon and a lime almost alike still shows two different fruit.
 */
const FRUIT_ART: readonly { emoji: string; skin: string }[] = [
  { emoji: "🫐", skin: "#6c5ce7" },
  { emoji: "🍇", skin: "#9b59b6" },
  { emoji: "🍓", skin: "#e8455a" },
  { emoji: "🍊", skin: "#f0932b" },
  { emoji: "🍋", skin: "#f2ce3a" },
  { emoji: "🥝", skin: "#7f9c2e" },
  { emoji: "🍏", skin: "#2ecc71" },
  { emoji: "🍑", skin: "#ff9aa8" },
  { emoji: "🥥", skin: "#a2795a" },
  { emoji: "🍉", skin: "#d63031" },
];

/**
 * The drawing for a tier, clamped rather than trusted.
 *
 * `logic.ts` owns how long the chain is and this file owns what each rung looks
 * like, which is two lists nothing forces to agree. A missing entry would be an
 * `undefined` dereference inside a render - a blank screen where a fruit should
 * be - so the last face is reused instead. The gate that would catch a real
 * mismatch is the eye: a board full of watermelons is not subtle.
 */
function artOf(tier: number): { emoji: string; skin: string } {
  const t = Math.min(FRUIT_ART.length - 1, Math.max(0, Math.floor(tier)));
  return FRUIT_ART[t];
}

/* -------------------------------------------------------------- the board */

/**
 * The box HEIGHT, against the VIEWPORT and never its container - the house rule
 * for every board here. The height is what the viewport bounds and the WIDTH
 * follows from it, because the world is always 100 units tall and the level
 * only ever changes how wide it is: binding the width instead would make the
 * narrow box TALLER than the wide one, which is the opposite of what a narrower
 * box should feel like.
 *
 * The vw term looks large because it is a height being clamped by a WIDTH: the
 * widest box is 0.74 of its own height, so 124vw of height is 92vw across,
 * which is the number that actually has to fit on a phone.
 *
 * Written as one uninterrupted `min(...)` with a literal px cap on purpose -
 * `game-panel-clears-widest-board.test.ts` reads these as text, and a cap
 * hidden behind an interpolated term is a cap that gate reports green about
 * forever.
 */
const BOX_H = "min(124vw, 52vh, 440px)";

/**
 * The most real time one animation frame is allowed to hand the simulation.
 *
 * A backgrounded tab, a garbage-collection pause or a slow first paint hands
 * back a gap of seconds, and consuming it literally means thousands of
 * sub-steps in one frame - which takes longer than a frame, so the next gap is
 * bigger, which is the spiral. Dropping the excess makes a returning tab resume
 * slightly behind where physics says it should be, and nobody can tell.
 */
const MAX_FRAME_MS = 100;

/** One milestone ping per this many points. A whole run scores a few hundred. */
const MILESTONE_POINTS = 100;

/* -------------------------------------------------------------- the session */

/**
 * A run in progress: the box it belongs to, the whole world, and EVERY LATCH
 * RECORDING A REWARD THIS RUN HAS ALREADY COLLECTED.
 *
 * The latches are the half that is easy to leave out and expensive to leave
 * out. `milestone` is the live one: without it, leaving a run at 400 points and
 * coming back starts the counter at zero, so the very next merge satisfies
 * `step > 0` and pays a coin that was already paid - once per resume, forever.
 * That is the exact defect the session rule was written about.
 *
 * `bestFired` records that the end-of-run personal best has already been
 * settled. Today it can only be true on a world that is `over`, and an over
 * world is refused at the mount and cleared by `live: false` - so it is a belt
 * to that brace rather than a live guard. It is carried anyway, because the
 * alternative is a snapshot that is correct only because of an invariant two
 * files away, and the day a personal best fires the MOMENT the record is beaten
 * (which is the more celebratory design, and the one 2048 uses) the latch has
 * to already be here or leaving and returning pays it twice.
 */
interface FruitSession {
  level: LevelId;
  world: World;
  /** The milestone step already paid, in units of MILESTONE_POINTS. */
  milestone: number;
  bestFired: boolean;
}

/**
 * More fruit than any real run can hold. A snapshot is the only input this game
 * does not generate itself, and the step is O(n squared) in the fruit count, so
 * a hand-edited array of ten thousand circles is a frozen tab rather than a
 * wrong picture.
 */
const MAX_FRUIT = 400;

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function isTier(n: unknown): boolean {
  return Number.isInteger(n) && (n as number) >= 0 && (n as number) < TIER_COUNT;
}

const SESSION: SessionSpec<FruitSession> = {
  version: 1,
  validate: (value): value is FruitSession => {
    const s = value as Partial<FruitSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in LEVELS)) return false;
    if (!finite(s.milestone) || s.milestone < 0) return false;
    if (typeof s.bestFired !== "boolean") return false;

    const w = s.world as Partial<World> | undefined;
    if (typeof w !== "object" || w === null) return false;
    // The renderer sizes itself from the LEVEL and the physics from the WORLD,
    // so a width that disagrees draws a box the fruit are not actually inside.
    if (w.width !== LEVELS[s.level as LevelId].width) return false;
    if (w.height !== WORLD_H) return false;
    if (!isTier(w.pending) || !isTier(w.queued)) return false;
    if (!finite(w.score) || w.score < 0) return false;
    if (!Number.isInteger(w.nextId) || (w.nextId as number) < 1) return false;
    if (!finite(w.cooldown) || !finite(w.calmFor) || !finite(w.overFor)) return false;
    if (typeof w.over !== "boolean" || !finite(w.merges)) return false;
    if (w.lastMerge !== null && w.lastMerge !== undefined) return false;
    if (!Array.isArray(w.fruit) || w.fruit.length > MAX_FRUIT) return false;
    return w.fruit.every(
      (f: unknown) =>
        f !== null &&
        typeof f === "object" &&
        Number.isInteger((f as Fruit).id) &&
        isTier((f as Fruit).tier) &&
        // Every one of these feeds a distance, and a single NaN anywhere in the
        // box poisons every distance in the step - which does not throw, it
        // renders an empty board and a score that never moves again.
        finite((f as Fruit).x) &&
        finite((f as Fruit).y) &&
        finite((f as Fruit).vx) &&
        finite((f as Fruit).vy),
    );
  },
};

/* ----------------------------------------------------------------- the game */

/** A fresh generator per run, so a run's deal is reproducible from its own seed. */
function freshRng(level: LevelId): () => number {
  return mulberry32(seedFrom(`fruit-${level}-${Date.now()}-${Math.random()}`));
}

export function FruitGame({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    "easy",
  );
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Adopted only for the box this mount opened on, and never once the run has
  // ended - handing back a finished board shows a child a game with nothing
  // left to do and no obvious way to understand why.
  const resume =
    restored && restored.level === level && !restored.world.over ? restored : undefined;

  const rngRef = useRef<() => number>(freshRng(level));
  const [world, setWorld] = useState<World>(() => resume?.world ?? newWorld(level, rngRef.current));
  /**
   * The authoritative copy. The animation loop writes through this, so every
   * handler reads the world the simulation is actually on rather than the one
   * closed over by the render that installed it; `setWorld` exists to repaint.
   */
  const worldRef = useRef(world);
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  /** Where the pending fruit is hovering, in world units. */
  const [aim, setAim] = useState<number>(() => LEVELS[level].width / 2);
  const boxRef = useRef<HTMLButtonElement>(null);

  /** Milestone steps already paid. Restored, or a resume pays them all again. */
  const milestoneRef = useRef(resume?.milestone ?? 0);
  /** The end-of-run personal best has been settled. One per run. */
  const bestFiredRef = useRef(resume?.bestFired ?? false);
  /** Leftover real time the sub-step could not consume. See `advance`. */
  const accRef = useRef(0);
  const started = useRef(false);

  useGameSession(
    ctx,
    SESSION,
    () => ({
      level,
      // `lastMerge` is a note about the sub-step that just ran, not a fact about
      // the position, and it would have to be validated on the way back in for
      // no benefit at all. Dropped here, and the validator refuses a snapshot
      // carrying one.
      world: { ...worldRef.current, lastMerge: null },
      milestone: milestoneRef.current,
      bestFired: bestFiredRef.current,
    }),
    { live: !world.over },
  );

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(level);
    }
  }, [ctx, level]);

  /** A point in the box, as a point on the screen - for confetti and coins. */
  const pointAt = useCallback((wx: number, wy: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return undefined;
    return {
      x: r.left + (wx / worldRef.current.width) * r.width,
      y: r.top + (wy / WORLD_H) * r.height,
    };
  }, []);

  const reset = useCallback(
    (lv: LevelId = level) => {
      setLevel(lv);
      rngRef.current = freshRng(lv);
      milestoneRef.current = 0;
      bestFiredRef.current = false;
      accRef.current = 0;
      const fresh = newWorld(lv, rngRef.current);
      worldRef.current = fresh;
      setWorld(fresh);
      setAim(LEVELS[lv].width / 2);
      setBest(ctx.score?.best(lv));
      ctx.analytics.levelStart(lv);
    },
    [ctx, level, setLevel],
  );

  /* --------------------------------------------------------------- the clock */

  /**
   * Consume REAL elapsed time in fixed sub-steps.
   *
   * This is the shape `.claude/rules/fixed-timestep-must-match-display.md`
   * exists to protect. A loop that runs one `1000/60` step per animation frame
   * is a loop that advances the simulation at the DISPLAY's rate: on a 120 Hz
   * screen every second frame draws the pile exactly where the last one did, so
   * a perfectly correct simulation reads as input lag. Here the frame hands over
   * however many milliseconds actually passed, the `while` spends them in
   * `DT`-sized pieces, and the remainder is carried - so 60 Hz, 120 Hz and a
   * throttled tab all simulate at the same rate.
   */
  const advanceRef = useRef<(elapsedMs: number) => void>(() => {});
  advanceRef.current = (elapsedMs: number) => {
    const before = worldRef.current;
    accRef.current += Math.min(elapsedMs, MAX_FRAME_MS);
    let w = before;
    let merged: World["lastMerge"] = null;
    while (accRef.current >= STEP_MS) {
      accRef.current -= STEP_MS;
      w = step(w, DT);
      // Several sub-steps run per frame, so the burst goes on the LAST merge
      // rather than on whichever one happened to be in the world at the end.
      if (w.lastMerge) merged = w.lastMerge;
    }
    if (w === before) return;

    worldRef.current = w;
    setWorld(w);

    // Everything below runs from this frame callback, which is a handler flow
    // and not a `setState` updater - so a doubled updater can never double-grant
    // (see the rewards rule).
    if (merged) {
      const at = pointAt(merged.x, merged.y);
      ctx.audio.play(merged.popped ? "success" : "pop");
      haptic.tap();
      // The top of the chain popping is the best thing that happens in this
      // game. Everything else stays quiet, or the screen is never still.
      if (at && merged.popped) burst(at.x, at.y, { count: 24 });
      else if (at && merged.tier >= 5) burst(at.x, at.y, { count: 8 });
    }

    // Endless game: coins drip on progress, and the star is reserved for the
    // personal best at the end. Confetti off, or it fires every few seconds.
    const reached = Math.floor(w.score / MILESTONE_POINTS);
    if (reached > milestoneRef.current) {
      milestoneRef.current = reached;
      winMoment(ctx, {
        reason: "milestone",
        level: `score-${reached * MILESTONE_POINTS}`,
        at: pointAt(w.width / 2, DEATH_LINE),
        confetti: false,
      });
    }

    if (w.over && !before.over && !bestFiredRef.current) {
      bestFiredRef.current = true;
      ctx.audio.play("fail");
      if (boxRef.current) shake(boxRef.current);
      ctx.analytics.levelFail(level, "filled-up");
      // Reported once, at the end, and scoped to the box: a wide run and a
      // narrow one are not the same achievement, so one must not outrank the
      // other by being easier.
      const record = ctx.score?.report(scoreFor(w, level));
      if (record?.isPersonalBest) {
        setBest(record.best);
        winMoment(ctx, {
          reason: "personal_best",
          tier: LEVEL_TIER[level],
          level: `score-${w.score}`,
          at: pointAt(w.width / 2, WORLD_H / 2),
          // No `ms`. This game keeps no clock, so "not measured" is the honest
          // answer; a fruit count handed to that field would be logged as a
          // duration, which this repo has shipped twice.
          score: scoreFor(w, level),
        });
      }
    }
  };

  /**
   * The loop runs only while there is something to simulate.
   *
   * `isSettled` goes true once the pile has been still for three quarters of a
   * second, and the next drop makes it false again - so a box nobody is
   * touching costs no frames, no renders and no battery. That is also why this
   * game has NO PAUSE CONTROL and must not grow one: nothing moves while a
   * player is away, so there is nothing for a pause to stop. Same reasoning
   * `CLAUDE.md` records for balloons, bubbles and frog.
   */
  const running = !isSettled(world);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const elapsed = now - last;
      last = now;
      advanceRef.current(elapsed);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  /* --------------------------------------------------------------- the input */

  /** Where a screen x lands in the box. Physical, so it needs no direction. */
  const worldXFrom = useCallback((clientX: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    const w = worldRef.current;
    if (!r || r.width === 0) return w.width / 2;
    return ((clientX - r.left) / r.width) * w.width;
  }, []);

  const release = useCallback(
    (at: number) => {
      const w = worldRef.current;
      const target = clampDropX(w, at);
      setAim(target);
      if (!canDrop(w)) return;
      ctx.audio.unlock();
      const next = drop(w, target, rngRef.current);
      // A refusal returns the same object. It is not an error, and the game
      // says nothing about it.
      if (next === w) return;
      worldRef.current = next;
      setWorld(next);
      ctx.audio.play("tap");
      haptic.tap();
    },
    [ctx],
  );

  /* ----------------------------------------------------------------- the view */

  // This game's own words. A locale RECORD, so promoting a language reds this
  // block by name instead of leaving the game speaking English inside a page
  // that is not.
  const T = textFor(
    {
      he: {
        next: "הבא",
        tap: "הקישו על הקופסה כדי להפיל פרי",
        fruit: "פירות בקופסה",
        board: "קופסת הפירות",
        full: "הקופסה מלאה",
      },
      en: {
        next: "Next",
        tap: "Tap the box to drop a fruit",
        fruit: "Fruit in the box",
        board: "The fruit box",
        full: "The box is full",
      },
      es: {
        next: "Siguiente",
        tap: "Toca la caja para soltar una fruta",
        fruit: "Frutas en la caja",
        board: "La caja de frutas",
        full: "La caja está llena",
      },
    },
    ctx.locale,
  );

  const pending = artOf(world.pending);
  const pendingR = radiusOf(world.pending);
  const aimAt = clampDropX(world, aim);

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        {
          icon: "star",
          label: ctx.t("score"),
          value: world.score,
          ltr: true,
          record: best ?? "-",
        },
        // Two stats and no more. The panel row is 350px inside a 390px phone and
        // the difficulty toggle takes one of the cells, so a third one wraps -
        // measured across the catalogue in CLAUDE.md. The fruit count lives in
        // the footer, which has the room.
        { icon: "layers", label: T.next, value: artOf(world.queued).emoji, compact: true },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={(lv) => reset(lv)}
      onRestart={() => reset()}
      // NO `paused`/`onPaused` pair, deliberately - see the loop above.
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              color: "var(--text-dim)",
              fontSize: 13,
              textAlign: "center",
              minHeight: 18,
            }}
          >
            {world.over ? `${ctx.t("gameOver")} - ${T.full}` : T.tap}
          </div>
          <div
            style={{ color: "var(--text-dim)", fontSize: 12, textAlign: "center", minHeight: 16 }}
          >
            {T.fruit}: <span dir="ltr">{world.fruit.length}</span>
          </div>
          {/* flexWrap even at one button: this row is where a second control
              would land, and nine games shipped 439px of unwrapped row onto a
              390px phone by leaving it off the first time. */}
          {world.over ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  // A kids target: >= 2cm on the short side, and the row gives
                  // it the whole width on the long one.
                  minHeight: 64,
                  border: "none",
                  borderRadius: "var(--radius-2)",
                  background: "var(--surface)",
                  boxShadow: "var(--shadow-1)",
                  color: "var(--text)",
                  fontFamily: "inherit",
                  fontSize: 16,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>⟲</span>
                {ctx.t("tryAgain")}
              </button>
            </div>
          ) : null}
        </div>
      }
    >
      {/*
        NO `dir="ltr"` here, and that is a decision rather than an omission.
        The rule pins a grid LTR when its POSITION or its INPUT is directional -
        n2048's grid mirrors and its swipes then invert. Nothing here is
        logical: every fruit is placed with a PHYSICAL `left`, and the pointer
        is read out of `getBoundingClientRect`, which is physical too. The box
        renders identically in Hebrew and English because neither of those two
        properties has ever heard of a writing direction.

        It is a <button> because it IS one - the whole box is a drop target. A
        div with a pointer handler would be unreachable by keyboard, and this
        game must be playable without a pointing device at all.
      */}
      <button
        ref={boxRef}
        type="button"
        className="ellaz-play-surface"
        aria-label={T.board}
        // Pointer Events, with the capture: a tap that begins on the box belongs
        // to the box even if the finger slides past its edge before it lifts.
        // `click` is deliberately NOT listened to - it would fire a second time
        // after this one, and drop two fruit for one tap.
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          release(worldXFrom(e.clientX));
        }}
        // Drag to aim is added ON TOP of the tap and is never required: a
        // five-year-old on a phone cannot reliably hold a sustained gesture, and
        // a game that needs one is a game they cannot finish.
        onPointerMove={(e) => {
          if (e.buttons === 0) return;
          setAim(clampDropX(worldRef.current, worldXFrom(e.clientX)));
        }}
        // ...which leaves the keyboard, since a <button> reaches its own onClick
        // from Enter and Space and we are not listening there. The arrows walk
        // the aim by a small fruit's width, physically, because the box does not
        // mirror.
        onKeyDown={(e) => {
          const w = worldRef.current;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            release(aimAt);
            return;
          }
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const stepBy = radiusOf(0) * 2;
          setAim(clampDropX(w, aimAt + (e.key === "ArrowLeft" ? -stepBy : stepBy)));
        }}
        style={
          {
            // ONE world unit, as a CSS length. Everything in the box is written
            // in world units and multiplied by this, so the simulation never
            // learns a pixel and the whole board scales with one number.
            ["--u" as string]: `calc(${BOX_H} / ${WORLD_H})`,
            position: "relative",
            display: "block",
            padding: 0,
            width: `calc(var(--u) * ${world.width})`,
            height: `calc(var(--u) * ${WORLD_H})`,
            // CONTENT-box, against the app-wide border-box default, and it is
            // load-bearing rather than tidy: an absolutely positioned child is
            // placed from the PADDING box, so the interior has to be exactly
            // `--u` times the world or every fruit is drawn three pixels off
            // the wall the simulation says it is touching.
            boxSizing: "content-box",
            border: "3px solid rgba(255,255,255,0.22)",
            // Square shoulders, round bottom: a box you drop things into, with
            // the open end reading as the end you drop into.
            borderTop: "none",
            borderRadius: "0 0 calc(var(--u) * 6) calc(var(--u) * 6)",
            background: "rgba(255,255,255,0.06)",
            boxShadow: "var(--shadow-1)",
            overflow: "hidden",
            cursor: "pointer",
            touchAction: "none",
          } as CSSProperties
        }
      >
        {/* The line the run ends above. Drawn, because a rule a player cannot
            see is a rule they lose to without learning anything. */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            // Physical, like everything else in this box. A logical inset here
            // would be correct by accident (the span is the full width) and
            // would contradict the note above about nothing here being logical.
            left: 0,
            width: "100%",
            top: `calc(var(--u) * ${DEATH_LINE})`,
            borderTop: "2px dashed rgba(255,255,255,0.28)",
            pointerEvents: "none",
          }}
        />

        {/* Where the pending fruit would land. A guide rather than a decoration:
            it is the only thing connecting the finger to the far end of a box
            that is taller than a phone is wide. */}
        {world.over ? null : (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: `calc(var(--u) * ${SPAWN_Y})`,
              left: `calc(var(--u) * ${aimAt.toFixed(3)})`,
              width: 2,
              height: `calc(var(--u) * ${WORLD_H})`,
              marginLeft: -1,
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.30), rgba(255,255,255,0))",
              pointerEvents: "none",
            }}
          />
        )}

        {world.over ? null : (
          <FruitCircle
            tier={world.pending}
            x={aimAt}
            y={SPAWN_Y}
            radius={pendingR}
            emoji={pending.emoji}
            skin={pending.skin}
            ghost
          />
        )}

        {world.fruit.map((f) => {
          const art = artOf(f.tier);
          return (
            <FruitCircle
              key={f.id}
              tier={f.tier}
              x={f.x}
              y={f.y}
              radius={radiusOf(f.tier)}
              emoji={art.emoji}
              skin={art.skin}
            />
          );
        })}
      </button>
    </GameChrome>
  );
}

/**
 * One circle, positioned in world units.
 *
 * Absolutely positioned `<div>`s rather than one inline `<svg>` of `<circle>`s,
 * and the reason is the face: a div carries the emoji as real text, so it
 * inherits the app's font stack and scales with a plain `font-size`, where an
 * SVG `<text>` would need its own metrics and its own vertical centring at
 * every size. Forty nodes is nothing for the compositor, and every one of them
 * is a pure transform-free `left`/`top`, which is what keeps the two lists -
 * the DOM and the simulation - trivially in step.
 */
function FruitCircle({
  x,
  y,
  radius,
  emoji,
  skin,
  ghost,
}: {
  tier: number;
  x: number;
  y: number;
  radius: number;
  emoji: string;
  skin: string;
  ghost?: boolean;
}) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        left: `calc(var(--u) * ${x.toFixed(3)})`,
        top: `calc(var(--u) * ${y.toFixed(3)})`,
        width: `calc(var(--u) * ${(radius * 2).toFixed(3)})`,
        height: `calc(var(--u) * ${(radius * 2).toFixed(3)})`,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: skin,
        // A lit top edge and a shaded bottom one - what stops a flat circle
        // reading as a sticker instead of a fruit.
        boxShadow: ghost
          ? "none"
          : "inset 0 calc(var(--u) * 0.9) 0 rgba(255,255,255,0.30), " +
            "inset 0 calc(var(--u) * -1.1) 0 rgba(0,0,0,0.20)",
        opacity: ghost ? 0.55 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `calc(var(--u) * ${(radius * 1.15).toFixed(3)})`,
        lineHeight: 1,
        pointerEvents: "none",
      }}
    >
      {emoji}
    </span>
  );
}
