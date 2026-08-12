import { textFor, type Locale } from "@i18n/index";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import type { GameContext } from "@sdk/index";
import { type DifficultyOption } from "@ui/index";
import { GameChrome } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import {
  PLAY_SURFACE_STYLE,
  Prompt,
  judgeTap,
  useRememberedLevel,
  useSpawner,
  winMoment,
  type Prop,
  type TapVerdict,
} from "@shared/index";
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
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

/**
 * Hebrew SINGULAR colour names, for the per-balloon accessible name.
 *
 * `logic.ts` carries the PLURAL adjectives the prompt is written around
 * ("פוצצו בלונים אדומים"), and one balloon has to say "בלון אדום" — a plural
 * there names a group rather than the single thing under the finger. English
 * needs no table: `color.en` is already the singular adjective.
 */
const HE_SINGULAR: Record<ColorId, string> = {
  red: "אדום",
  blue: "כחול",
  yellow: "צהוב",
  green: "ירוק",
  purple: "סגול",
};

/**
 * And the same table for Spanish, for the same reason: `globo rojo` beside
 * `globos rojos`. English needs none - "red" is "red" either way, which is
 * exactly why a two-language app never had to notice this.
 */
const ES_SINGULAR: Record<ColorId, string> = {
  red: "rojo",
  blue: "azul",
  yellow: "amarillo",
  green: "verde",
  purple: "morado",
};

/**
 * What a screen reader says for ONE balloon.
 *
 * The COLOUR leads, because the colour is the entire question this game asks —
 * a label of "balloon" would leave a child who cannot see the screen with five
 * identical controls and nothing to choose between. The lane follows for the
 * same reason `sortsize` exposes "3 of 4": two red balloons are only tellable
 * apart by where they are.
 */
function balloonLabel(color: BalloonColor, lane: number, locale: Locale): string {
  // Hebrew needs the SINGULAR adjective here while the prompt above needs the
  // plural, which is why the colour record cannot serve both and this table
  // exists. Spanish inflects for number the same way and will need its own.
  return textFor(
    {
      he: () => `בלון ${HE_SINGULAR[color.id]}, מסלול ${lane + 1} מתוך ${LANES}`,
      en: () => `${color.en} balloon, lane ${lane + 1} of ${LANES}`,
      es: () => `globo ${ES_SINGULAR[color.id]}, carril ${lane + 1} de ${LANES}`,
    },
    locale,
  )();
}

/** Is the keyboard currently sitting on the button for this prop? */
function focusIsOn(propId: number): boolean {
  const active = typeof document === "undefined" ? null : document.activeElement;
  return active instanceof HTMLElement && active.dataset.propId === String(propId);
}

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
  const [difficulty, setDifficulty] = useRememberedLevel(
    ctx,
    DIFF_OPTIONS.map((o) => o.id),
    "easy",
  );
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(() => newRound(difficulty));
  const [popped, setPopped] = useState(0);
  // "cheer" freezes the board (no spawning, no expiry) while the win plays out.
  const [phase, setPhase] = useState<"play" | "cheer">("play");
  // Furthest level reached, per DIFFICULTY — the level counter resets to 1 on a
  // difficulty change, so a shared record would let an easy streak stand as the
  // record on hard, where the goal is bigger and the balloons rise faster.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(difficulty));

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
  // The sky itself. Focusable only programmatically (`tabIndex={-1}`): it is
  // where the keyboard is parked when the balloon it was on disappears.
  const surfaceRef = useRef<HTMLDivElement>(null);

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
   *
   * These keyframes carry NO centring term, deliberately. A running animation
   * replaces the element's transform outright, so centring had to live in every
   * keyframe while it was a transform — and that is precisely what broke under
   * `prefers-reduced-motion`, where the spawner discards these keyframes for its
   * own scale-only fade and the centring went with them. Centring is a negative
   * margin on the element now (see the style below), which is layout and which
   * no animation can overwrite, so both paths land in the same place.
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
        { transform: `${rise(0.62)} rotate(0deg)` },
        {
          transform: `${rise(0.08)} translateX(${sway}px) rotate(${sway / 3}deg)`,
          offset: 0.5,
        },
        { transform: `${rise(-0.87)} rotate(0deg)` },
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
      // A balloon that drifts off the top while the KEYBOARD is on it gets
      // unmounted, and a browser answers that by dropping focus to <body> —
      // which throws a keyboard player back to the top of the page mid-round.
      // Parking focus on the sky keeps the next Tab where the child already was.
      if (focusIsOn(p.id)) surfaceRef.current?.focus({ preventScroll: true });
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
      setBest(ctx.score?.best(d));
      startRound(d, null);
    },
    [ctx, difficulty, startRound],
  );

  /**
   * Judge ONE balloon and play the consequences. `at` is where the juice fires
   * from — a real touch point on the pointer path, the balloon's own centre on
   * the keyboard path.
   *
   * Both paths land here so a keyboard press can never be judged by different
   * rules than a tap, and — just as important — only ONE of the two ever runs
   * per input. The pointer path stays on the SURFACE handler and the balloons
   * carry no `onClick`, because a click fires after a pointer tap as well: the
   * two together would judge the same tap twice and double-grant the coin on
   * the last balloon of a round.
   */
  const resolve = useCallback(
    (prop: Prop<ColorId>, verdict: TapVerdict, at: { x: number; y: number }) => {
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
      burst(at.x, at.y, { count: 14, colors: [colorOf(prop.kind).hex] });

      const next = poppedRef.current + 1;
      poppedRef.current = next;
      setPopped(next);
      if (!isRoundComplete(next, difficulty)) return;

      // Round done. Fired from the HANDLER, never from inside a setState
      // updater: React may run an updater twice, and that would double-grant a
      // real coin. `lockRef` closes the same door against two taps in one tick.
      lockRef.current = true;
      setPhase("cheer");
      // `level` here is the level being COMPLETED — it is bumped inside the
      // cheer timer below, so this is the furthest the player has actually got.
      const won = winMoment(ctx, {
        reason: "level_complete",
        tier: difficulty,
        level: `${difficulty}-${level}`,
        at,
        ms: Date.now() - startedAt.current,
        score: { value: level, unit: "points", board: difficulty },
      });
      if (won.score) setBest(won.score.best);
      cheerTimer.current = setTimeout(() => {
        setLevel((n) => n + 1);
        startRound(difficulty, targetRef.current);
      }, 1200);
    },
    [ctx, difficulty, level, spawner, startRound],
  );

  /** The pointer path: one handler on the SURFACE, hit-testing real rectangles. */
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

      resolve(prop, verdict, { x: e.clientX, y: e.clientY });
    },
    [ctx, phase, resolve, spawner],
  );

  /**
   * The keyboard path: Enter or Space on the balloon that has focus.
   *
   * `preventDefault` is doing two jobs. Space would scroll the page, and BOTH
   * keys make a native <button> synthesise a `click` — stopping the default is
   * what keeps this to exactly one judgement per press. `e.repeat` closes the
   * other door: holding Enter down repeats keydown forever.
   */
  const onKey = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>, prop: Prop<ColorId>) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      e.preventDefault();
      if (e.repeat) return;
      if (phase !== "play" || lockRef.current) return;
      ctx.audio.unlock();
      ctx.speech.unlock();

      const r = e.currentTarget.getBoundingClientRect();
      const at = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const verdict = judgeTap(prop, targetRef.current);
      // A popped balloon unmounts under the keyboard, so hand focus to the sky
      // BEFORE it goes. A wrong one stays put, and so does the focus.
      if (verdict === "hit") surfaceRef.current?.focus({ preventScroll: true });
      resolve(prop, verdict, at);
    },
    [ctx, phase, resolve],
  );

  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: {
        popped: "פוצצתם",
        ask: (c: string) => `פוצצו בלונים ${c}`,
        cheer: (n: number) => `🎉 כל הכבוד! ממשיכים לשלב ${n}…`,
        miss: "טעות? הבלון רק יתנדנד 🎈",
      },
      en: {
        popped: "Popped",
        ask: (c: string) => `Pop the ${c} balloons`,
        cheer: (n: number) => `🎉 Great! On to level ${n}…`,
        miss: "Wrong one? It just wobbles 🎈",
      },
      es: {
        popped: "Reventados",
        ask: (c: string) => `Revienta los globos ${c}`,
        cheer: (n: number) => `🎉 ¡Muy bien! Vamos al nivel ${n}…`,
        miss: "¿Era otro? Solo se mueve un poco 🎈",
      },
    },
    ctx.locale,
  );
  const ask = T.ask(textFor(target, ctx.locale));

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "layers", label: ctx.t("stage"), value: level },
        { icon: "check", label: T.popped, value: `${popped}/${round.goal}`, ltr: true },
        { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
      ]}
      levels={DIFF_OPTIONS}
      level={difficulty}
      onLevel={changeDifficulty}
      onRestart={() => startRound(difficulty, targetRef.current)}
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
            {phase === "cheer" ? T.cheer(level + 1) : T.miss}
          </b>
        </div>
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* The target, drawn full-size beside the words: the colour-blind and
            the pre-reading paths to the same question. */}
        <div style={{ width: 44, height: 64, flexShrink: 0 }}>
          <BalloonArt color={target} />
        </div>
        <Prompt ctx={ctx} text={ask} />
      </div>

      {/* `dir="ltr"`: the lanes are SPATIAL, and the app is Hebrew-RTL by
          default, which would mirror them away from the order they were dealt. */}
      <div
        ref={surfaceRef}
        dir="ltr"
        // Reachable by script, never by Tab: this is only ever the place focus
        // lands when the balloon it was on pops or drifts away.
        tabIndex={-1}
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
          /*
            A REAL <button>, and it has to be THIS element rather than a wrapper
            around it: `attach` starts the WAAPI float on the node it is given
            and `hitTest` reads that same node's `getBoundingClientRect()`, so
            the animated node, the hit box and the accessible control are one
            thing by construction. Everything a UA draws on a button is reset,
            so it looks exactly as it did as a <div>.
          */
          <button
            key={p.id}
            type="button"
            ref={(el) => spawner.attach(p, el)}
            data-prop-id={p.id}
            aria-label={balloonLabel(colorOf(p.kind), p.lane, ctx.locale)}
            onKeyDown={(e) => onKey(e, p)}
            style={{
              position: "absolute",
              left: `${((p.lane + 0.5) / LANES) * 100}%`,
              top: RESTING_TOP,
              width: BALLOON_W,
              height: BALLOON_H,
              // CENTRED WITH A NEGATIVE MARGIN, NOT `translate(-50%, 0)`.
              //
              // Under `prefers-reduced-motion` the spawner ignores this game's
              // keyframes and substitutes its own scale-only fade — and those
              // keyframes run with `fill: forwards`, so `transform: scale(1)`
              // REPLACES the element's transform outright. A balloon centred by
              // transform would then sit half its own width to the side of its
              // lane, for reduced-motion children only, which is exactly the
              // kind of bug nobody finds by looking. A margin is layout, so
              // nothing an animation does can overwrite it.
              marginLeft: `calc(-0.5 * ${BALLOON_W})`,
              // The whole balloon is the hit box, string included — generous on
              // purpose for a five-year-old's aim on a moving target.
              willChange: "transform",
              border: "none",
              padding: 0,
              background: "transparent",
              font: "inherit",
              color: "inherit",
              touchAction: "none",
              // Taps are hit-tested against real rectangles by the SURFACE's own
              // handler. Letting a balloon receive the pointer event itself buys
              // nothing and is the one way a tap could ever be judged twice.
              pointerEvents: "none",
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
          </button>
        ))}
      </div>
    </GameChrome>
  );
}
