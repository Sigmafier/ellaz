import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import type { GameContext } from "@sdk/index";
import { type DifficultyOption } from "@ui/index";
import { GameChrome } from "@ui/GameChrome";
import { burst, haptic } from "@juice/index";
import {
  PLAY_SURFACE_STYLE,
  Prompt,
  useRememberedLevel,
  useSpawner,
  winMoment,
  type Prop,
  type SpawnMotion,
} from "@shared/index";
import {
  HOP_MS,
  PAD_COUNT,
  PAD_SPOTS,
  ROUND_GOAL,
  type Difficulty,
  type Hop,
  hopOffsetForLevel,
  isRoundComplete,
  nextHop,
  padsFor,
  specFor,
} from "./logic";

// THE FROG AND THE PADS ARE INLINE SVG, NOT EMOJI. 🐸 is drawn by whichever
// emoji font the device ships, so its size and silhouette vary per platform —
// and this game asks a four-year-old to spot ONE small thing on a busy pond in
// about a second. Drawing it means the target looks the same everywhere, and it
// can squash and stretch, which is what makes a hop read as a hop.
//
// THERE IS NO GAME LOOP IN THIS FILE AND THERE MUST NEVER BE ONE. The hop is
// DECLARED to the Web Animations API as keyframes and interpolated by the
// compositor at the display's real refresh rate; a hand-rolled `1000/60`
// accumulator driven by requestAnimationFrame freezes every second frame on a
// 120 Hz screen and reads as input lag. See `@shared/spawn.ts` and
// `.claude/rules/fixed-timestep-must-match-display.md`.

/**
 * The pond. Bounded at BOTH ends, and the floor is the load-bearing half: it
 * keeps the whole pond inside a small phone's viewport alongside the prompt and
 * the stat row, because a game where the frog can hop to a pad you have to
 * SCROLL to see is a game of missed frogs. The cap stops it becoming an
 * unreachable field on a desktop.
 */
const POND_W = "min(94vw, 520px)";
const POND_H = "max(300px, min(58vh, 420px))";

/**
 * The frog IS the touch target, so it is sized off the 64px kids minimum rather
 * than off the pad. The pad is then sized off the frog, not the other way round.
 */
const FROG = "max(66px, min(19vw, 13vh, 104px))";
const PAD = `calc(${FROG} * 1.5)`;

/** How high the hop arcs, as a fraction of the pond's height. */
const ARC = 0.15;

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy" } },
  { id: "medium", label: { he: "בינוני", en: "Med" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
];

/**
 * One lily pad. `turn` only rotates the notch so six pads don't look stamped.
 *
 * THE PAD IS DELIBERATELY A DARK, BLUE-LEANING GREEN, and the frog a bright
 * yellow-green with a dark outline. A green frog on a green pad is the obvious
 * palette and the wrong one: at the first pass these two sat ~11 points apart in
 * luminance out of 255 — a frog that vanishes into the thing it sits on, and it
 * would have looked fine to anyone who already knew where the frog was.
 * Separating by LIGHTNESS rather than hue also survives greyscale, so the gap
 * holds for a colour-blind child too.
 */
function LilyPad({ turn }: { turn: number }): ReactElement {
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <g transform={`rotate(${turn} 50 50)`}>
        {/* A disc with a wedge cut out of it — the long way round, hence the
            large-arc flag. The darker copy underneath is the rim. */}
        <path d="M50 50 L92.3 34.6 A45 45 0 1 0 92.3 65.4 Z" fill="#174d2c" />
        <path d="M50 50 L88.5 36.0 A41 41 0 1 0 88.5 64.0 Z" fill="#2b7c47" />
        <g stroke="#174d2c" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.55">
          <path d="M50 50 L70.5 85.5" />
          <path d="M50 50 L29.5 85.5" />
          <path d="M50 50 L9 50" />
          <path d="M50 50 L29.5 14.5" />
          <path d="M50 50 L70.5 14.5" />
        </g>
      </g>
    </svg>
  );
}

/**
 * The frog. Big eyes, a smile, and nothing that reads as angry or scared.
 *
 * The dark outline on the body and head is not styling — it is the third
 * separation channel, after the lightness gap against the pad and the eye
 * silhouette. It guarantees an edge wherever the frog happens to be, including
 * mid-hop over open water, where it has no pad behind it at all.
 */
function Frog(): ReactElement {
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      {/* Back legs, tucked behind the body. */}
      <ellipse cx="20" cy="72" rx="15" ry="10" fill="#3f9c22" transform="rotate(-18 20 72)" />
      <ellipse cx="80" cy="72" rx="15" ry="10" fill="#3f9c22" transform="rotate(18 80 72)" />
      {/* Front feet. */}
      <ellipse cx="33" cy="85" rx="10" ry="5" fill="#3f9c22" />
      <ellipse cx="67" cy="85" rx="10" ry="5" fill="#3f9c22" />
      <g stroke="#2f7a19" strokeWidth="1.8" strokeLinecap="round">
        <path d="M29 85 h8 M33 81 v8" />
        <path d="M63 85 h8 M67 81 v8" />
      </g>
      {/* Body and belly. */}
      <ellipse cx="50" cy="63" rx="33" ry="25" fill="#78e04a" stroke="#20470f" strokeWidth="2.6" />
      <ellipse cx="50" cy="70" rx="21" ry="15" fill="#e2fbab" />
      {/* Head. */}
      <ellipse cx="50" cy="42" rx="30" ry="21" fill="#78e04a" stroke="#20470f" strokeWidth="2.6" />
      {/* Eye bulges — the silhouette cue that says "frog" at a glance. */}
      <circle cx="33" cy="28" r="14" fill="#78e04a" stroke="#20470f" strokeWidth="2.6" />
      <circle cx="67" cy="28" r="14" fill="#78e04a" stroke="#20470f" strokeWidth="2.6" />
      <circle cx="33" cy="27" r="9.5" fill="#ffffff" />
      <circle cx="67" cy="27" r="9.5" fill="#ffffff" />
      <circle cx="34" cy="28" r="5" fill="#17240f" />
      <circle cx="68" cy="28" r="5" fill="#17240f" />
      <circle cx="36" cy="25.5" r="1.9" fill="#ffffff" />
      <circle cx="70" cy="25.5" r="1.9" fill="#ffffff" />
      {/* Nostrils and a smile. */}
      <circle cx="45" cy="39" r="1.7" fill="#2f7a19" />
      <circle cx="55" cy="39" r="1.7" fill="#2f7a19" />
      <path
        d="M36 47 q 14 11 28 0"
        fill="none"
        stroke="#2f7a19"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FrogGame({ ctx }: { ctx: GameContext }): ReactElement {
  const [difficulty, setDifficulty] = useRememberedLevel(
    ctx,
    DIFF_OPTIONS.map((o) => o.id),
    "easy",
  );
  const [level, setLevel] = useState(1);
  const [caught, setCaught] = useState(0);
  const [hops, setHops] = useState(0);
  // "cheer" freezes the pond (no spawning, no expiry) while the win plays out.
  const [phase, setPhase] = useState<"play" | "cheer">("play");
  // Furthest level reached, per DIFFICULTY — the level counter resets to 1 on a
  // difficulty change, so a shared record would let an easy streak stand as the
  // record on hard, where the frog hops sooner and the round asks for more.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(difficulty));

  const he = ctx.locale === "he";
  const pads = useMemo(() => padsFor(difficulty), [difficulty]);

  // Read at CALL time, not render time: the spawner's housekeeping tick and the
  // pointer handler both run outside React's render, where state is stale.
  const padRef = useRef<number | null>(null);
  const hopsRef = useRef(0);
  const caughtRef = useRef(0);
  const lockRef = useRef(false);
  const startedAt = useRef(Date.now());
  const cheerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  /**
   * Which pad the next frog lands on, and which one it left.
   *
   * The pad is carried in the prop's KIND rather than in its `lane`, and that is
   * deliberate. `pickLane` chooses uniformly among the FREE lanes — and with one
   * frog on the pond every lane is free the instant the old one dies, including
   * the pad it was just sitting on. The lane picker has no way to express "not
   * that one", so the no-repeat rule lives in `nextHop` and the lane goes
   * unused. Carrying `from` here too means the hop's arc is a property of the
   * prop, not of a ref that could be one hop out of date by the time the
   * renderer reads it.
   */
  const kindFor = useCallback((): Hop => {
    const hop = nextHop(padRef.current, PAD_COUNT[difficulty]);
    padRef.current = hop.pad;
    hopsRef.current += 1;
    setHops(hopsRef.current);
    return hop;
  }, [difficulty]);

  /**
   * The hop, DECLARED to the Web Animations API — never stepped.
   *
   * TRANSFORM ONLY, never `top`/`left`. `transform`, `opacity` and `filter` are
   * the only properties a browser can animate on the compositor; animating
   * `left` forces layout and paint on the MAIN THREAD every frame, which is
   * precisely the jank the spawner exists to avoid. The tempting reason to reach
   * for `left` is real — a percentage inside `translate()` resolves against the
   * FROG's own box, not the pond — but the way out is to say the distance in the
   * POND's units, and `POND_W`/`POND_H` are plain CSS lengths `calc()` can scale.
   *
   * `u` runs 1 → 0: 1 is the pad being left, 0 is the pad being landed on. The
   * hop is a fixed HOP_MS rather than the frog's whole lifetime, because a frog
   * that spends its entire dwell in mid-air is a frog nobody can aim at.
   *
   * Under `prefers-reduced-motion` the spawner IGNORES this entirely and fades
   * the frog in where it stands — on its own pad, fully tappable, which is the
   * only property this game actually needs. That fallback is also why the frog
   * is CENTRED WITH NEGATIVE MARGINS rather than with a `translate(-50%, -50%)`
   * in its own style: a running animation replaces the element's transform
   * OUTRIGHT, and the reduced-motion keyframes are `scale()` only, so a frog
   * centred by transform would sit half its own width down and right of its pad
   * for every child who has reduced motion switched on. Margins are layout, not
   * transform, so nothing here can override them — and the keyframes below are
   * then free to be pure travel, with no centring term to repeat.
   */
  const motion = useCallback((p: Prop<Hop>): SpawnMotion => {
    const to = PAD_SPOTS[p.kind.pad] ?? PAD_SPOTS[0];
    const from = PAD_SPOTS[p.kind.from] ?? to;
    const dx = (from.x - to.x) / 100;
    const dy = (from.y - to.y) / 100;

    const at = (u: number, lift: number, sx: number, sy: number): string =>
      `translate(calc(${POND_W} * ${(dx * u).toFixed(4)}), calc(${POND_H} * ${(dy * u - lift).toFixed(4)})) scale(${sx}, ${sy})`;

    return {
      keyframes: [
        { offset: 0, transform: at(1, 0, 1.16, 0.8) }, // crouched, about to push off
        { offset: 0.22, transform: at(0.62, ARC * 0.92, 0.86, 1.2) }, // stretched, rising
        { offset: 0.5, transform: at(0.3, ARC, 0.92, 1.12) }, // top of the arc
        { offset: 0.82, transform: at(0, 0, 1.22, 0.76) }, // landing squash
        { offset: 1, transform: at(0, 0, 1, 1) }, // sitting
      ],
      options: { duration: HOP_MS, easing: "cubic-bezier(0.2, 0.65, 0.3, 1)" },
    };
  }, []);

  const spawner = useSpawner<Hop>({
    ctx,
    spec: specFor(difficulty, hopOffsetForLevel(level) + hops),
    running: phase === "play",
    kindFor,
    // Unused by design (see `kindFor`), but the spawner refuses to spawn when
    // every lane is taken — so it still has to be at least `maxAlive`.
    lanes: PAD_COUNT[difficulty],
    motion,
    // NO `onExpire`. A frog that hops away untapped costs NOTHING: no miss
    // counter, no sound, no penalty anywhere — it is simply the next hop, which
    // is the whole promise of this game.
  });

  const { reset } = spawner;

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    ctx.lifecycle.gameplayStart();
    ctx.analytics.levelStart("frog");
  }, [ctx]);

  // Never leave a timer pointing at an unmounted tree.
  useEffect(
    () => () => {
      if (cheerTimer.current) clearTimeout(cheerTimer.current);
    },
    [],
  );

  /**
   * A clean run: an empty pond, the dwell curve back at the top of the tier, and
   * the per-run reward latch open again.
   *
   * Takes no difficulty argument on purpose. Everything that reads the tier
   * (`kindFor`, the spec, the goal) reads it from state on the NEXT render, so
   * passing the new tier in here would only add a second, staler copy of it.
   */
  const startRound = useCallback(() => {
    if (cheerTimer.current) clearTimeout(cheerTimer.current);
    padRef.current = null;
    hopsRef.current = 0;
    caughtRef.current = 0;
    lockRef.current = false;
    startedAt.current = Date.now();
    reset();
    setHops(0);
    setCaught(0);
    setPhase("play");
    ctx.analytics.levelStart("frog");
  }, [ctx, reset]);

  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      if (d === difficulty) return;
      setDifficulty(d);
      setLevel(1);
      setBest(ctx.score?.best(d));
      startRound();
    },
    [ctx, difficulty, startRound],
  );

  const onTap = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (phase !== "play" || lockRef.current) return;
      // Inside the gesture, so iOS opens both gates.
      ctx.audio.unlock();
      ctx.speech.unlock();

      // `hitTest`, not `tap`. `tap` judges a prop against a TARGET KIND, and
      // there is only one kind of thing on this pond — every live frog is the
      // right frog. The only question is whether the finger landed on it.
      const frog = spawner.hitTest(e.clientX, e.clientY);

      // Water, or an empty pad. NOTHING happens — no sound, no shake, no
      // counter. A tap that hit nothing is not a mistake, and answering it would
      // teach a child to stop trying.
      if (!frog) return;

      spawner.remove(frog.id);
      ctx.audio.play("pop");
      haptic.success();
      burst(e.clientX, e.clientY, {
        count: 12,
        spread: 70,
        colors: ["#78e04a", "#e2fbab", "#ffffff"],
      });

      const next = caughtRef.current + 1;
      caughtRef.current = next;
      setCaught(next);
      if (!isRoundComplete(next, difficulty)) return;

      // Round done. Fired from the HANDLER, never from inside a setState
      // updater: React may run an updater twice, and that would double-grant a
      // real coin. `lockRef` closes the same door against two taps in one tick.
      lockRef.current = true;
      setPhase("cheer");
      // `level` is the level being COMPLETED — the bump to the next one happens
      // inside the cheer timer below, so this is the furthest the player has got.
      const won = winMoment(ctx, {
        reason: "level_complete",
        tier: difficulty,
        level: `${difficulty}-${level}`,
        at: { x: e.clientX, y: e.clientY },
        ms: Date.now() - startedAt.current,
        score: { value: level, unit: "points", board: difficulty },
      });
      if (won.score) setBest(won.score.best);
      cheerTimer.current = setTimeout(() => {
        setLevel((n) => n + 1);
        startRound();
      }, 1300);
    },
    [ctx, difficulty, level, phase, spawner, startRound],
  );

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "layers", label: he ? "שלב" : "Level", value: level },
        { icon: "check", label: he ? "תפסתם" : "Caught", value: `${caught}/${ROUND_GOAL[difficulty]}`, ltr: true },
        { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
      ]}
      levels={DIFF_OPTIONS}
      level={difficulty}
      onLevel={changeDifficulty}
      onRestart={() => startRound()}
      footer={
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            padding: "13px 12px",
            minHeight: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <b style={{ fontSize: 17, fontFamily: "Fredoka, inherit" }}>
            {phase === "cheer"
              ? he
                ? `🎉 יופי! ממשיכים לשלב ${level + 1}…`
                : `🎉 Nice! On to level ${level + 1}…`
              : he
                ? "היא קפצה? פשוט תפסו אותה בעלה הבא 🐸"
                : "Hopped away? Just catch her on the next pad 🐸"}
          </b>
        </div>
      }
    >
      <Prompt
        ctx={ctx}
        glyph="🐸"
        text={he ? "תפסו את הצפרדע!" : "Catch the frog!"}
        speak={
          he
            ? "תפסו את הצפרדע. אם היא קפצה, פשוט תפסו אותה בעלה הבא"
            : "Catch the frog. If she hops away, just catch her on the next pad"
        }
      />

      {/* `dir="ltr"`: the pads are SPATIAL, and the app is Hebrew-RTL by default,
          which would mirror them away from the positions the hop's pixel maths
          was computed against. */}
      <div
        dir="ltr"
        role="application"
        aria-label={he ? "בריכה עם עלי נופר" : "pond with lily pads"}
        onPointerDown={onTap}
        style={{
          ...PLAY_SURFACE_STYLE,
          width: POND_W,
          height: POND_H,
          borderRadius: 26,
          background: "linear-gradient(180deg, #1d5f74 0%, #2a7f92 55%, #36a0a6 100%)",
          boxShadow: "var(--shadow-2)",
        }}
      >
        {/* Ripples. Decorative only — the surface owns every pointer event. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.16,
            background:
              "radial-gradient(60% 34% at 30% 22%, #ffffff 0 2%, transparent 3%), radial-gradient(48% 26% at 72% 62%, #ffffff 0 2%, transparent 3%)",
          }}
        />

        {/* Pads and frog are centred with NEGATIVE MARGINS, not with
            `transform: translate(-50%, -50%)`. For the frog that is load-bearing
            (see `motion`): its transform belongs to the hop animation, which
            replaces it outright. Margins are layout, so nothing overrides them. */}
        {pads.map((spot, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: PAD,
              height: PAD,
              marginLeft: `calc(${PAD} / -2)`,
              marginTop: `calc(${PAD} / -2)`,
              pointerEvents: "none",
            }}
          >
            <LilyPad turn={i * 61} />
          </div>
        ))}

        {spawner.props.map((p) => {
          const spot = PAD_SPOTS[p.kind.pad] ?? PAD_SPOTS[0];
          return (
            <div
              key={p.id}
              ref={(el) => spawner.attach(p, el)}
              style={{
                position: "absolute",
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                width: FROG,
                height: FROG,
                marginLeft: `calc(${FROG} / -2)`,
                // Half the frog to centre it, plus a sixth to sit it slightly
                // HIGH on the pad — so it reads as ON the pad rather than
                // swimming behind it.
                marginTop: `calc(${FROG} / -2 - ${FROG} * 0.16)`,
                willChange: "transform",
                // The pond owns the pointer: `hitTest` works off bounding rects,
                // so anything intercepting the event only loses taps.
                pointerEvents: "none",
              }}
            >
              <Frog />
            </div>
          );
        })}
      </div>
    </GameChrome>
  );
}
