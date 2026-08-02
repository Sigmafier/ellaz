import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import type { GameContext } from "@sdk/index";
import { Button, DifficultySelector, Stat, type DifficultyOption } from "@ui/index";
import { burst, haptic } from "@juice/index";
import {
  PLAY_SURFACE_STYLE,
  Prompt,
  useGameTimer,
  useSpawner,
  winMoment,
  type Prop,
  type SpawnMotion,
} from "@shared/index";
import {
  LANES,
  LEVELS,
  MAX_RUN,
  ROUND_MS,
  TARGET,
  countExpire,
  countTap,
  emptyScore,
  isRoundOver,
  nextCreature,
  praiseFor,
  secondsLeft,
  type Creature,
  type Difficulty,
  type RoundScore,
} from "./logic";

// INLINE SVG, NOT EMOJI — and the reason is the whole game.
//
// This round asks a four-year-old to tell two flying things apart in about a
// second, so the difference has to be OURS. 🐝 and 🦋 are drawn by whichever
// emoji font the device ships: on some of them the bee is wings-spread and
// symmetric, which is the butterfly's exact silhouette, and we would never know
// because it looked fine on the machine we tested on.
//
// Each creature therefore carries three cues, none of them hue: SILHOUETTE (one
// wide low blob vs a tall symmetric X with a thin waist), INTERNAL PATTERN (two
// heavy black bars vs two white eye-spots — both survive greyscale, so a
// colour-blind child reads them the same way) and MASS (weight low and forward
// behind a dark head, vs mostly empty wing). Colour is the fourth and least
// load-bearing.

function Bee(): ReactElement {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false">
      {/* Small wings, held high and back — never spread wide like the butterfly's. */}
      <ellipse cx="44" cy="33" rx="17" ry="10" fill="#ffffff" opacity="0.9" transform="rotate(-22 44 33)" />
      <ellipse cx="64" cy="35" rx="14" ry="8" fill="#ffffff" opacity="0.75" transform="rotate(16 64 35)" />
      {/* The body: one wide capsule. This is the shape the child learns. */}
      <rect x="18" y="46" width="66" height="38" rx="19" fill="#f6b93b" />
      {/* Stripes — the greyscale-safe cue. */}
      <rect x="46" y="47" width="10" height="36" fill="#1c1c1c" />
      <rect x="64" y="50" width="10" height="30" fill="#1c1c1c" />
      {/* Head + antennae, at the front. */}
      <circle cx="25" cy="65" r="13" fill="#1c1c1c" />
      <circle cx="21" cy="62" r="3.4" fill="#ffffff" />
      <path
        d="M20 53 L12 42 M29 51 L28 38"
        stroke="#1c1c1c"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="42" r="3.4" fill="#1c1c1c" />
      <circle cx="28" cy="38" r="3.4" fill="#1c1c1c" />
    </svg>
  );
}

function Butterfly(): ReactElement {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false">
      {/* Four big wing panels — tall, symmetric, mostly empty. */}
      <path d="M50 47 C 34 11, 5 14, 9 38 C 12 57, 36 57, 50 47 Z" fill="#c56cf0" />
      <path d="M50 47 C 66 11, 95 14, 91 38 C 88 57, 64 57, 50 47 Z" fill="#c56cf0" />
      <path d="M50 51 C 37 61, 17 67, 23 85 C 28 99, 47 85, 50 63 Z" fill="#e79bf9" />
      <path d="M50 51 C 63 61, 83 67, 77 85 C 72 99, 53 85, 50 63 Z" fill="#e79bf9" />
      {/* Eye-spots — the greyscale-safe cue. */}
      <circle cx="30" cy="33" r="6.5" fill="#ffffff" opacity="0.92" />
      <circle cx="70" cy="33" r="6.5" fill="#ffffff" opacity="0.92" />
      {/* A thin body, and long curling antennae the bee does not have. */}
      <rect x="47" y="29" width="6" height="50" rx="3" fill="#3b2a4a" />
      <path
        d="M48 32 C 42 18, 34 12, 27 9 M52 32 C 58 18, 66 12, 73 9"
        stroke="#3b2a4a"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy" } },
  { id: "medium", label: { he: "בינוני", en: "Med" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
];

/**
 * Creature size in px, and the unit the flight path is measured in.
 *
 * A NUMBER, not a CSS clamp: the WAAPI keyframes travel a real pixel distance
 * measured off the surface, and a size that only exists in CSS cannot enter that
 * sum. 68 is comfortably over the 64px minimum target on the smallest phone,
 * and the ±6° tilt below makes the hit rectangle slightly larger still, which is
 * forgiving in exactly the direction a five-year-old needs.
 */
const SIZE = 68;

/**
 * The sky's height.
 *
 * Bounded at BOTH ends, and the floor is the load-bearing half. A timed tapping
 * game the child has to SCROLL to see all of is a game they will miss bees in,
 * so this stays inside a small phone's viewport alongside the prompt and the
 * stat row; the cap stops it becoming an unreachable field on a desktop.
 */
const SURFACE_H = "max(300px, min(52vh, 400px))";

/**
 * Where a lane sits vertically, as a `calc` rather than a pixel count — the
 * surface height is responsive, so the six lanes have to be too.
 *
 * Lanes are SPREAD across the surface, not sliced into bands: six 68px
 * creatures do not fit in 300px as non-overlapping rows. Neighbours can overlap
 * vertically, but only matter when two are also at the same X, which needs them
 * to be crossing in opposite directions (the spawner emits at most one creature
 * per tick, so they never launch together). `hitTest` resolves any such instant
 * in favour of the newest, so nothing is ever untappable.
 */
function laneTop(lane: number): string {
  return `calc((100% - ${SIZE}px) * ${lane / (LANES - 1)})`;
}

type Phase = "ready" | "playing" | "done";

export function BeesGame({ ctx }: { ctx: GameContext }): ReactElement {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState<RoundScore>(emptyScore);
  const [best, setBest] = useState<number>(() => ctx.storage.get("best", 0));
  const [roundNo, setRoundNo] = useState(1);

  const he = ctx.locale === "he";
  const running = phase === "playing";

  // The score lives in a ref and is mirrored into state for rendering. Taps and
  // expiries both arrive from callbacks that may fire twice in one tick, and a
  // `setScore(prev => ...)` updater is exactly the place a side effect must not
  // read from (see .claude/rules/game-difficulty-and-juice-convention.md).
  const scoreRef = useRef<RoundScore>(score);
  const bestRef = useRef(best);
  // One end-of-round per round. The clock ticks several times past the boundary
  // before `running` flips, and each of those would otherwise grant again.
  const endedRef = useRef(false);
  const recentRef = useRef<Creature[]>([]);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  const bump = useCallback((next: RoundScore) => {
    scoreRef.current = next;
    setScore(next);
  }, []);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    ctx.lifecycle.gameplayStart();
    ctx.analytics.levelStart("bees");
  }, [ctx]);

  /** What the next creature is. The run cap needs the recent tail — see logic. */
  const kindFor = useCallback((): Creature => {
    const next = nextCreature(recentRef.current, LEVELS[difficulty].beeRatio);
    recentRef.current = [...recentRef.current, next].slice(-MAX_RUN);
    return next;
  }, [difficulty]);

  /**
   * The flight path, DECLARED to the Web Animations API — never stepped.
   *
   * The distance is read off the live surface at spawn time, so it is right at
   * any width and a mid-round rotation only affects creatures launched after it
   * (the ones already flying keep the distance they were launched with, which is
   * the correct answer, not a compromise). Travel spans the whole lifetime, so a
   * creature leaves the screen exactly as it expires: "flew away" and "timed
   * out" are the same event, and neither is a failure.
   *
   * Under `prefers-reduced-motion` the spawner ignores this entirely and fades
   * the creature in where it stands — at the left of its lane. Still fully
   * tappable, which is the only property this game actually needs.
   */
  const motion = useCallback((p: Prop<Creature>): SpawnMotion => {
    const w = surfaceRef.current?.clientWidth ?? 320;
    const rightward = p.id % 2 === 0;
    const from = rightward ? -SIZE : w;
    const to = rightward ? w : -SIZE;
    // A gentle wave, alternating up and down so neighbouring lanes do not bob
    // in unison. Small enough that the target never leaves the finger.
    const dip = p.id % 3 === 0 ? -15 : 13;
    const tilt = rightward ? 6 : -6;
    return {
      keyframes: [
        { transform: `translate(${from}px, 0px) rotate(${tilt}deg)` },
        { transform: `translate(${(from + to) / 2}px, ${dip}px) rotate(${-tilt}deg)` },
        { transform: `translate(${to}px, 0px) rotate(${tilt}deg)` },
      ],
      // Constant speed on purpose: a target that accelerates is a target a small
      // child aims behind.
      options: { easing: "linear" },
    };
  }, []);

  const onExpire = useCallback(
    (p: Prop<Creature>) => {
      // A bee that got away and a butterfly left in peace are both just counted.
      // Nothing is played, nothing is deducted, nothing is said.
      bump(countExpire(scoreRef.current, p.kind));
    },
    [bump],
  );

  const spawner = useSpawner<Creature>({
    ctx,
    spec: LEVELS[difficulty].spec,
    running,
    kindFor,
    lanes: LANES,
    motion,
    onExpire,
  });

  const endRound = useCallback(() => {
    const final = scoreRef.current;
    setPhase("done");
    spawner.reset();

    if (final.caught > bestRef.current) {
      bestRef.current = final.caught;
      ctx.storage.set("best", final.caught);
      setBest(final.caught);
    }

    // ONE grant per round, from the clock's handler flow — never from inside a
    // state updater. The best above is a DISPLAY stat only: a second grant fired
    // in the same instant would double the coin flight and double-count the
    // moment, and a fixed-length round already banks on completion.
    winMoment(ctx, {
      reason: "level_complete",
      tier: difficulty,
      level: `${difficulty}-${roundNo}`,
      ms: ROUND_MS,
    });
  }, [ctx, difficulty, roundNo, spawner]);

  const timer = useGameTimer(ctx, {
    running,
    onTick: (elapsed) => {
      if (endedRef.current || !isRoundOver(elapsed)) return;
      endedRef.current = true;
      endRound();
    },
  });

  /** Wipe the board and the clock. Shared by "start", "again" and level change. */
  const rearm = useCallback(() => {
    scoreRef.current = emptyScore();
    setScore(scoreRef.current);
    recentRef.current = [];
    endedRef.current = false;
    spawner.reset();
    timer.reset();
  }, [spawner, timer]);

  const startRound = useCallback(() => {
    // Inside the gesture, so iOS opens both gates.
    ctx.audio.unlock();
    ctx.speech.unlock();
    rearm();
    setPhase("playing");
    ctx.analytics.levelStart("bees");
  }, [ctx, rearm]);

  const again = useCallback(() => {
    setRoundNo((n) => n + 1);
    startRound();
  }, [startRound]);

  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      if (d === difficulty) return;
      setDifficulty(d);
      setRoundNo(1);
      rearm();
      setPhase("ready");
    },
    [difficulty, rearm],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (phase !== "playing") return;
      const { prop, verdict } = spawner.tap(e.clientX, e.clientY, TARGET);
      // A tap on empty sky is not a mistake and gets no response at all.
      if (!prop || verdict === "miss") return;

      spawner.remove(prop.id);
      bump(countTap(scoreRef.current, prop.kind));

      if (verdict === "hit") {
        ctx.audio.play("pop");
        haptic.tap();
        burst(e.clientX, e.clientY, { count: 10, spread: 60, colors: ["#f6b93b", "#ffeaa7", "#ffffff"] });
        return;
      }
      // A butterfly. It flutters off unharmed — a soft, neutral acknowledgement
      // that the tap registered, and nothing more. No penalty, no sad sound, no
      // "wrong". Not tapping it is the skill; tapping it is not a crime.
      ctx.audio.play("tap");
      haptic.tap();
      burst(e.clientX, e.clientY, { count: 5, spread: 40, colors: ["#e79bf9", "#ffffff"] });
    },
    [phase, spawner, bump, ctx],
  );

  const secs = phase === "ready" ? ROUND_MS / 1000 : secondsLeft(timer.elapsedMs);
  const praise = praiseFor(score.caught);
  const praiseText = {
    start: he ? "התחלה טובה!" : "Good start!",
    good: he ? "כל הכבוד!" : "Well done!",
    great: he ? "וואו! אלופים!" : "Wow! Champion!",
  }[praise];

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 12 }}
    >
      <Prompt
        ctx={ctx}
        glyph="🐝"
        text={he ? "תפסו רק את הדבורים!" : "Tap only the bees!"}
        speak={he ? "תפסו רק את הדבורים. תנו לפרפרים לעוף" : "Tap only the bees. Let the butterflies fly"}
      />

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Stat label={he ? "זמן" : "Time"} value={secs} />
        <Stat label={he ? "דבורים" : "Bees"} value={score.caught} />
        <Stat label={he ? "שיא" : "Best"} value={best} />
        <DifficultySelector
          options={DIFF_OPTIONS}
          value={difficulty}
          onChange={changeDifficulty}
          locale={ctx.locale}
          kids
        />
      </div>

      {/* The sky. `dir="ltr"` because this surface is SPATIAL — the app is
          Hebrew-RTL by default, and a mirrored surface would send every flight
          path the other way from the one the pixel maths computed. */}
      <div
        ref={surfaceRef}
        dir="ltr"
        role="application"
        aria-label={he ? "שמיים עם דבורים ופרפרים" : "sky with bees and butterflies"}
        onPointerDown={onPointerDown}
        style={{
          ...PLAY_SURFACE_STYLE,
          width: "min(96vw, 640px)",
          height: SURFACE_H,
          borderRadius: 26,
          background: "linear-gradient(180deg, #86ccff 0%, #cfeaff 62%, #eaf6d8 100%)",
          boxShadow: "var(--shadow-2)",
        }}
      >
        {spawner.props.map((p) => (
          <div
            key={p.id}
            ref={(el) => spawner.attach(p, el)}
            style={{
              position: "absolute",
              left: 0,
              top: laneTop(p.lane),
              width: SIZE,
              height: SIZE,
              willChange: "transform",
              // The surface owns the pointer: `hitTest` works off bounding
              // rectangles, so a child element intercepting the event would only
              // ever be a way for taps to go missing.
              pointerEvents: "none",
            }}
          >
            {p.kind === "bee" ? <Bee /> : <Butterfly />}
          </div>
        ))}

        {phase !== "playing" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              gap: 10,
              padding: 16,
              textAlign: "center",
              background: "rgba(12, 18, 38, 0.55)",
              borderRadius: 26,
            }}
          >
            <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
              {phase === "done" ? (
                <>
                  <div style={{ fontSize: 44, lineHeight: 1 }}>🍯</div>
                  <div style={{ fontSize: 30, fontWeight: 800 }}>
                    {he ? `תפסתם ${score.caught} דבורים!` : `You caught ${score.caught} bees!`}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{praiseText}</div>
                  <div style={{ fontSize: 15, opacity: 0.9 }}>
                    {he
                      ? `${score.freed} פרפרים המשיכו לעוף 🦋`
                      : `${score.freed} butterflies flew free 🦋`}
                  </div>
                  <Button kids ariaLabel="play again" onClick={again}>
                    {he ? "שוב! 🔄" : "Again! 🔄"}
                  </Button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 44, lineHeight: 1 }}>🐝</div>
                  <div style={{ fontSize: 17, fontWeight: 700, maxWidth: 280 }}>
                    {he ? "תפסו דבורים. את הפרפרים משאירים לעוף." : "Catch bees. Let butterflies fly."}
                  </div>
                  <Button kids ariaLabel="start" onClick={startRound}>
                    {he ? "יאללה! ▶" : "Go! ▶"}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
