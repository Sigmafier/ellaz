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
import { Button, DifficultySelector, Stat, type DifficultyOption } from "@ui/index";
import { burst, haptic, shake } from "@juice/index";
import { PLAY_SURFACE_STYLE, Prompt, useSpawner, winMoment, type Prop } from "@shared/index";
import {
  colorOf,
  isRoundComplete,
  newRound,
  nextBalloon,
  paletteFor,
  specFor,
  type BalloonColor,
  type ColorId,
  type CueId,
  type Difficulty,
} from "./logic";

// THE BALLOONS ARE INLINE SVG, NOT EMOJI. 🎈 is one fixed red glyph rendered by
// the OS font, so a "blue balloon" is not expressible with it at all — and the
// colour IS the question here. Drawing them means the hue is a fill attribute
// the logic chooses, and it renders identically on every platform.
//
// COLOUR-BLIND PLAY — WHY EVERY BALLOON CARRIES A SHAPE MARK. Roughly 1 boy in
// 12 cannot reliably separate these hues, and this game's entire question is
// "which colour is this", so hue alone would lock him out while looking fine to
// everyone testing it. Each colour therefore carries its OWN mark on the body
// (sparkle / dots / stripes / heart / zigzag), the prompt shows a full-size
// balloon of the target beside the words, and the prompt can be read aloud. Any
// ONE of those three channels is enough to play. The marks were picked to be
// distinguishable by silhouette rather than by fine detail, because they are
// seen at a glance on something that is moving.
//
// There is NO game loop in this file and there must never be one. Motion is
// declared to the Web Animations API and interpolated by the compositor at the
// display's real refresh rate; a hand-rolled `1000/60` accumulator freezes
// every second frame on a 120 Hz screen. See `@shared/spawn.ts` and
// `.claude/rules/fixed-timestep-must-match-display.md`.

/**
 * Four lanes, not five. The balloon floor is 68px (comfortably over the ~2cm
 * kids-target rule) and a 360px phone gives the surface ~338px — five lanes of
 * that width would touch the edges. Four also matches the presets: every
 * difficulty settles at 4 or fewer balloons alive, so the lane count never
 * throttles the spawner.
 */
const LANES = 4;

const SURFACE_W = "min(94vw, 520px)";
const SURFACE_H = "min(58vh, 440px)";
const BALLOON_W = "max(68px, min(19vw, 11vh, 96px))";
const BALLOON_H = `calc(${BALLOON_W} * 1.45)`;

/** Where a balloon rests when motion is off. See `motion` below. */
const RESTING_TOP = "42%";

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy" } },
  { id: "medium", label: { he: "בינוני", en: "Med" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
];

/**
 * Dark mark or light mark, decided from the fill's own brightness rather than
 * from a hand-kept table — so a new colour cannot arrive with an invisible cue.
 */
function inkFor(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.58 ? "rgba(22,18,44,0.62)" : "rgba(255,255,255,0.92)";
}

/** The per-colour shape mark. Drawn inside the 100x145 balloon viewBox. */
function CueMark({ cue, ink }: { cue: CueId; ink: string }): ReactElement {
  switch (cue) {
    case "star":
      return (
        <path
          d="M50 33 C53 47 55 50 68 53 C55 56 53 59 50 73 C47 59 45 56 32 53 C45 50 47 47 50 33 Z"
          fill={ink}
        />
      );
    case "dots":
      return (
        <g fill={ink}>
          <circle cx="50" cy="37" r="7" />
          <circle cx="37" cy="60" r="7" />
          <circle cx="63" cy="60" r="7" />
        </g>
      );
    case "stripes":
      return (
        <g fill={ink}>
          <rect x="28" y="41" width="44" height="9" rx="4.5" />
          <rect x="28" y="58" width="44" height="9" rx="4.5" />
        </g>
      );
    case "heart":
      return (
        <path
          d="M50 72 C30 58 31 42 41 40 C46 39 50 43 50 47 C50 43 54 39 59 40 C69 42 70 58 50 72 Z"
          fill={ink}
        />
      );
    case "zigzag":
      return (
        <path
          d="M31 63 L43 42 L50 55 L57 42 L69 63"
          fill="none"
          stroke={ink}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
  }
}

/** One balloon: body, highlight, knot, string, and the colour's shape mark. */
function BalloonArt({ color }: { color: BalloonColor }): ReactElement {
  const ink = inkFor(color.hex);
  return (
    <svg
      viewBox="0 0 100 145"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <path
        d="M50 104 q 9 12 0 22 q -9 10 1 18"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M43 96 L57 96 L50 110 Z" fill={color.hex} />
      <ellipse cx="50" cy="50" rx="40" ry="49" fill={color.hex} />
      <ellipse
        cx="35"
        cy="31"
        rx="11"
        ry="16"
        fill="rgba(255,255,255,0.4)"
        transform="rotate(-22 35 31)"
      />
      <CueMark cue={color.cue} ink={ink} />
    </svg>
  );
}

export function BalloonsGame({ ctx }: { ctx: GameContext }): ReactElement {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(() => newRound("easy"));
  const [popped, setPopped] = useState(0);
  // "cheer" freezes the board (no spawning, no expiry) while the win plays out.
  const [phase, setPhase] = useState<"play" | "cheer">("play");

  const palette = useMemo(() => paletteFor(difficulty), [difficulty]);
  const target = colorOf(round.target);

  // Read at CALL time, not render time: the spawner's housekeeping tick and the
  // pointer handler both run outside React's render, where state is stale.
  const targetRef = useRef<ColorId>(round.target);
  const sinceRef = useRef(0);
  const poppedRef = useRef(0);
  const lockRef = useRef(false);
  const startedAt = useRef(Date.now());
  const cheerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The inner (wobbling) node per balloon. Kept here rather than asked of the
  // spawner because the OUTER node carries the WAAPI animation: an animation
  // beats an inline style, so a wobble written to the outer transform would be
  // silently swallowed.
  const bodies = useRef(new Map<number, HTMLElement>());
  const mounted = useRef(false);

  targetRef.current = round.target;

  const kindFor = useCallback((): ColorId => {
    const draw = nextBalloon(palette, targetRef.current, sinceRef.current);
    sinceRef.current = draw.sinceTarget;
    return draw.color;
  }, [palette]);

  /**
   * Rise, with a sway. TRANSFORM ONLY — never `top`.
   *
   * `transform`, `opacity` and `filter` are the only properties a browser can
   * animate on the compositor. Animating `top` instead forces layout and paint
   * on the MAIN THREAD every frame, for every balloon alive (six at hard), which
   * is precisely the jank the spawner exists to avoid — see its header, and
   * `.claude/rules/fixed-timestep-must-match-display.md`.
   *
   * The reason `top` is tempting is real: a percentage inside `translateY`
   * resolves against the BALLOON's own height, not the surface, so `translateY(104%)`
   * would move it by one balloon-height rather than one surface-height. The way
   * out is not to abandon transform but to say the distance in the SURFACE's own
   * units — `SURFACE_H` is a plain CSS length, so `calc()` can scale it.
   *
   * `top` stays pinned at RESTING_TOP and the fractions below are measured FROM
   * it: the old 104%/50%/-45% top-values become +62%/+8%/-87% of surface height.
   * The `translate(-50%, 0)` centring is repeated in every keyframe because the
   * animation replaces the element's transform outright while it runs.
   *
   * Under `prefers-reduced-motion` the spawner IGNORES this and fades the prop
   * in place — which is why the element's own style parks it at RESTING_TOP,
   * mid-surface and tappable, instead of at the off-screen start of the rise.
   */
  const motion = useCallback((prop: Prop<ColorId>) => {
    const sway = prop.id % 2 === 0 ? 11 : -11;
    const rise = (fraction: number) => `translateY(calc(${SURFACE_H} * ${fraction}))`;
    return {
      keyframes: [
        { transform: `translate(-50%, 0) ${rise(0.62)} rotate(0deg)` },
        {
          transform: `translate(-50%, 0) ${rise(0.08)} translateX(${sway}px) rotate(${sway / 3}deg)`,
          offset: 0.5,
        },
        { transform: `translate(-50%, 0) ${rise(-0.87)} rotate(0deg)` },
      ],
      options: { easing: "linear" as const },
    };
  }, []);

  const spawner = useSpawner<ColorId>({
    ctx,
    spec: specFor(difficulty),
    running: phase === "play",
    kindFor,
    lanes: LANES,
    motion,
    // A balloon that drifts off the top untapped costs NOTHING — no miss
    // counter, no sound, no penalty anywhere. This exists only so the node map
    // does not accumulate entries for balloons that are gone.
    onExpire: (p) => {
      bodies.current.delete(p.id);
    },
  });

  const { reset } = spawner;

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    ctx.lifecycle.gameplayStart();
    ctx.analytics.levelStart("balloons");
  }, [ctx]);

  // Never leave a timer pointing at an unmounted tree.
  useEffect(
    () => () => {
      if (cheerTimer.current) clearTimeout(cheerTimer.current);
    },
    [],
  );

  /** A clean run at `d`, asking for a colour other than `previous`. */
  const startRound = useCallback(
    (d: Difficulty, previous: ColorId | null) => {
      if (cheerTimer.current) clearTimeout(cheerTimer.current);
      const next = newRound(d, previous);
      targetRef.current = next.target;
      sinceRef.current = 0;
      poppedRef.current = 0;
      lockRef.current = false;
      startedAt.current = Date.now();
      bodies.current.clear();
      reset();
      setRound(next);
      setPopped(0);
      setPhase("play");
      ctx.analytics.levelStart("balloons");
    },
    [ctx, reset],
  );

  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      if (d === difficulty) return;
      setDifficulty(d);
      setLevel(1);
      startRound(d, null);
    },
    [difficulty, startRound],
  );

  const onTap = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (phase !== "play" || lockRef.current) return;
      // Inside the gesture, so iOS opens both gates.
      ctx.audio.unlock();
      ctx.speech.unlock();

      const { prop, verdict } = spawner.tap(e.clientX, e.clientY, targetRef.current);

      // Empty sky. Nothing at all happens — a tap that hit nothing is not a
      // mistake, and answering it would teach a child to stop trying.
      if (verdict === "miss" || !prop) return;

      if (verdict === "wrong") {
        // A wrong colour WOBBLES AND STAYS. No score loss, no sad sound, no
        // state change of any kind: the balloon is simply still there to think
        // about. This platform has no losing.
        ctx.audio.play("tap");
        haptic.tap();
        const body = bodies.current.get(prop.id);
        if (body) shake(body, 6, 260);
        return;
      }

      spawner.remove(prop.id);
      bodies.current.delete(prop.id);
      ctx.audio.play("pop");
      haptic.success();
      burst(e.clientX, e.clientY, { count: 14, colors: [colorOf(prop.kind).hex] });

      const next = poppedRef.current + 1;
      poppedRef.current = next;
      setPopped(next);
      if (!isRoundComplete(next, difficulty)) return;

      // Round done. Fired from the HANDLER, never from inside a setState
      // updater: React may run an updater twice, and that would double-grant a
      // real coin. `lockRef` closes the same door against two taps in one tick.
      lockRef.current = true;
      setPhase("cheer");
      winMoment(ctx, {
        reason: "level_complete",
        tier: difficulty,
        level: `${difficulty}-${level}`,
        at: { x: e.clientX, y: e.clientY },
        ms: Date.now() - startedAt.current,
      });
      cheerTimer.current = setTimeout(() => {
        setLevel((n) => n + 1);
        startRound(difficulty, targetRef.current);
      }, 1200);
    },
    [ctx, difficulty, level, phase, spawner, startRound],
  );

  const he = ctx.locale === "he";
  const ask = he ? `פוצצו בלונים ${target.he}` : `Pop the ${target.en} balloons`;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 12 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* The target, drawn full-size beside the words: the colour-blind and
            the pre-reading paths to the same question. */}
        <div style={{ width: 44, height: 64, flexShrink: 0 }}>
          <BalloonArt color={target} />
        </div>
        <Prompt ctx={ctx} text={ask} />
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Stat label={he ? "שלב" : "Level"} value={level} />
        <Stat label={he ? "פוצצתם" : "Popped"} value={`${popped}/${round.goal}`} />
        <DifficultySelector
          options={DIFF_OPTIONS}
          value={difficulty}
          onChange={changeDifficulty}
          locale={ctx.locale}
          kids
        />
        <Button
          variant="ghost"
          kids
          ariaLabel="new round"
          onClick={() => startRound(difficulty, targetRef.current)}
        >
          🔄
        </Button>
      </div>

      {/* `dir="ltr"`: the lanes are SPATIAL, and the app is Hebrew-RTL by
          default, which would mirror them away from the order they were dealt. */}
      <div
        dir="ltr"
        onPointerDown={onTap}
        style={{
          ...PLAY_SURFACE_STYLE,
          width: SURFACE_W,
          height: SURFACE_H,
          borderRadius: 24,
          // A NEUTRAL indigo-slate, not a sky blue. The obvious choice for a
          // balloon game is a blue sky, and it is the one background the BLUE
          // balloon disappears into — the sky must not compete with any colour
          // in the palette, since telling them apart is the entire game.
          background: "linear-gradient(180deg, #1b2142 0%, #2a3160 100%)",
          boxShadow: "var(--shadow-2)",
        }}
      >
        {spawner.props.map((p) => (
          <div
            key={p.id}
            ref={(el) => spawner.attach(p, el)}
            style={{
              position: "absolute",
              left: `${((p.lane + 0.5) / LANES) * 100}%`,
              top: RESTING_TOP,
              width: BALLOON_W,
              height: BALLOON_H,
              transform: "translate(-50%, 0)",
              // The whole balloon is the hit box, string included — generous on
              // purpose for a five-year-old's aim on a moving target.
              willChange: "top, transform",
            }}
          >
            <div
              ref={(el) => {
                if (el) bodies.current.set(p.id, el);
              }}
              style={{ width: "100%", height: "100%" }}
            >
              <BalloonArt color={colorOf(p.kind)} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center" }}>
        {phase === "cheer"
          ? he
            ? `כל הכבוד! ממשיכים לשלב ${level + 1}…`
            : `Great! On to level ${level + 1}…`
          : he
            ? "טעות? הבלון רק יתנדנד 🎈"
            : "Wrong one? It just wobbles 🎈"}
      </div>
    </div>
  );
}
