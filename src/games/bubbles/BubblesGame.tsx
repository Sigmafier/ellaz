import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GameContext } from "@sdk/index";
import { type DifficultyOption } from "@ui/index";
import { GameChrome } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import {
  PLAY_SURFACE_STYLE,
  Prompt,
  judgeTap,
  useSpawner,
  winMoment,
  type Prop,
  type SpawnMotion,
  type TapVerdict,
} from "@shared/index";
import {
  LANES,
  catchTarget,
  drawKind,
  isRoundComplete,
  newRound,
  specFor,
  type Difficulty,
  type Round,
} from "./logic";

// NO GAME LOOP LIVES HERE, AND NONE MAY BE ADDED. A bubble's rise is DECLARED
// to the Web Animations API once, at spawn, and interpolated by the compositor
// at the display's real refresh rate. A hand-rolled `1000/60` accumulator driven
// by requestAnimationFrame crosses its threshold on only every SECOND frame of a
// 120 Hz screen, so half the frames redraw the bubble exactly where the last one
// did — structural, not occasional, and it reads as input lag.
// See `.claude/rules/fixed-timestep-must-match-display.md`.

const SURFACE_W = "min(94vw, 520px)";
const SURFACE_H = "min(56vh, 440px)";
/** The `max(64px, …)` floor holds every bubble above the age-5 target on a small
 *  phone; the `min()` lets it grow on a tablet without four lanes colliding. */
const BUBBLE = "max(64px, min(19vw, 11vh, 96px))";

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy" } },
  { id: "medium", label: { he: "בינוני", en: "Med" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
];

/**
 * What a screen reader says for ONE bubble.
 *
 * The character leads, because the character IS the question — a label of
 * "bubble" would leave a child who cannot see the screen with four identical
 * controls and no way to pick. The lane follows for the same reason `sortsize`
 * exposes "3 of 4": two bubbles carrying different characters are still only
 * tellable apart by where they are while they rise.
 */
function bubbleLabel(char: string, lane: number, he: boolean): string {
  return he
    ? `בועה עם ${char}, מסלול ${lane + 1} מתוך ${LANES}`
    : `bubble with ${char}, lane ${lane + 1} of ${LANES}`;
}

/** Is the keyboard currently sitting on the button for this prop? */
function focusIsOn(propId: number): boolean {
  const active = typeof document === "undefined" ? null : document.activeElement;
  return active instanceof HTMLElement && active.dataset.propId === String(propId);
}

/** One shared gradient, defined once — a per-bubble `<defs>` would repeat its id. */
function BubbleDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        <radialGradient id="ellazBubbleFill" cx="34%" cy="28%" r="74%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="46%" stopColor="#bde9ff" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#5ab6e8" stopOpacity="0.72" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** Original art: a translucent sphere, a rim, a lit highlight, and the character. */
function Bubble({ char }: { char: string }) {
  return (
    <>
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="url(#ellazBubbleFill)"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="2.5"
        />
        <ellipse
          cx="34"
          cy="27"
          rx="15"
          ry="10"
          fill="#ffffff"
          opacity="0.75"
          transform="rotate(-28 34 27)"
        />
        <circle cx="70" cy="72" r="5.5" fill="#ffffff" opacity="0.35" />
      </svg>
      {/* HTML text, not <text>: this carries the app's Hebrew-first font stack
          and needs no baseline arithmetic. Dark navy on a lit bubble. */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontSize: `calc(0.44 * ${BUBBLE})`,
          fontWeight: 800,
          lineHeight: 1,
          color: "#0b2f4d",
          textShadow: "0 1px 0 rgba(255,255,255,0.75)",
        }}
      >
        {char}
      </span>
    </>
  );
}

export function BubblesGame({ ctx }: { ctx: GameContext }) {
  const he = ctx.locale === "he";
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [round, setRound] = useState<Round>(() => newRound("easy", ctx.locale));
  const [level, setLevel] = useState(1);
  // Furthest level reached, per DIFFICULTY — the level counter resets to 1 on a
  // difficulty change, so a shared record would let an easy streak stand as the
  // record on hard, where a round asks for more.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best("easy"));

  // The handler's source of truth. State is stale inside a handler that fires
  // twice in one tick; a ref is read at call time, so two fast taps cannot bank
  // the same round twice.
  const roundRef = useRef(round);
  const levelRef = useRef(1);
  const sinceTargetRef = useRef(0);
  const startedAt = useRef(Date.now());
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const skinsRef = useRef(new Map<number, HTMLElement>());
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    ctx.lifecycle.gameplayStart();
    ctx.analytics.levelStart("bubbles");
  }, [ctx]);

  /** Rise from below the water line to above it, wobbling. */
  function motion(): SpawnMotion {
    // Measured, not calculated in CSS: an exact pixel travel interpolates
    // cleanly and picks up a resize on the next spawn.
    const h = surfaceRef.current?.clientHeight ?? 420;
    return {
      keyframes: [
        { transform: "translate(0px, 100%) scale(0.82)", opacity: 0 },
        { opacity: 1, offset: 0.14 },
        { transform: `translate(9px, ${-Math.round(h * 0.55)}px) scale(1)`, offset: 0.5 },
        { transform: `translate(-7px, ${-h}px) scale(1)`, opacity: 1 },
      ],
    };
  }

  const spawner = useSpawner<string>({
    ctx,
    spec: specFor(difficulty),
    running: true,
    lanes: LANES,
    motion,
    kindFor: () => {
      const next = drawKind(roundRef.current, sinceTargetRef.current);
      sinceTargetRef.current = next.sinceTarget;
      return next.kind;
    },
    // Nothing is scored here — a bubble reaching the top costs nothing, as it
    // always did. This exists only so a bubble that floats away while the
    // KEYBOARD is on it does not drop focus to <body>, which would throw a
    // keyboard player back to the top of the page mid-round.
    onExpire: (p) => {
      skinsRef.current.delete(p.id);
      if (focusIsOn(p.id)) surfaceRef.current?.focus({ preventScroll: true });
    },
  });

  function startRound(d: Difficulty, avoid: string | null) {
    const next = newRound(d, ctx.locale, avoid);
    roundRef.current = next;
    setRound(next);
    sinceTargetRef.current = 0;
    skinsRef.current.clear();
    // Clear the water too: bubbles drawn from the OLD pool would otherwise keep
    // rising past a prompt that no longer asks for them.
    spawner.reset();
    startedAt.current = Date.now();
    ctx.analytics.levelStart("bubbles");
  }

  function changeDifficulty(d: Difficulty) {
    if (d === difficulty) return;
    setDifficulty(d);
    levelRef.current = 1;
    setLevel(1);
    setBest(ctx.score?.best(d));
    startRound(d, null);
  }

  /** A wrong tap: the bubble jiggles and floats on. Nothing is lost, ever. */
  function nudge(prop: Prop<string>) {
    ctx.audio.play("tap");
    haptic.tap();
    // The INNER skin, never the outer wrapper: the wrapper carries the spawner's
    // running WAAPI float, and a running animation overrides inline style — a
    // shake there would silently do nothing.
    const skin = skinsRef.current.get(prop.id);
    if (skin) shake(skin, 5, 260);
  }

  function popBubble(prop: Prop<string>, x: number, y: number) {
    spawner.remove(prop.id);
    skinsRef.current.delete(prop.id);
    ctx.audio.play("pop");
    haptic.success();
    burst(x, y, { count: 10, spread: 60 });

    const next = catchTarget(roundRef.current);
    roundRef.current = next; // synchronous, so a second tap this tick sees it
    setRound(next);
    if (!isRoundComplete(next)) return;

    // From the HANDLER, never inside a setState updater: React may run an
    // updater twice, and that would grant a real coin twice.
    // `levelRef.current` — not the `level` state — is the level being COMPLETED
    // here, and it is still the pre-increment value at this point in the handler.
    const won = winMoment(ctx, {
      reason: "level_complete",
      tier: difficulty,
      level: `${difficulty}-${levelRef.current}`,
      at: { x, y },
      ms: Date.now() - startedAt.current,
      score: { value: levelRef.current, unit: "points", board: difficulty },
    });
    if (won.score) setBest(won.score.best);
    levelRef.current += 1;
    setLevel(levelRef.current);
    startRound(difficulty, next.target);
  }

  /**
   * Judge ONE bubble. The pointer path and the keyboard path both land here, so
   * a key press can never be judged by different rules than a tap — and only
   * ONE of the two ever runs per input. The pointer path stays on the SURFACE
   * handler and the bubbles carry no `onClick`, because a click fires after a
   * pointer tap as well and the two together would judge the same tap twice.
   */
  function resolve(prop: Prop<string>, verdict: TapVerdict, x: number, y: number) {
    if (verdict === "wrong") return nudge(prop);
    popBubble(prop, x, y);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Inside the gesture, so iOS opens both the audio and the speech gate.
    ctx.audio.unlock();
    ctx.speech.unlock();
    const { prop, verdict } = spawner.tap(e.clientX, e.clientY, roundRef.current.target);
    // Empty water is not a mistake — a tap that hit nothing says nothing.
    if (!prop || verdict === "miss") return;
    resolve(prop, verdict, e.clientX, e.clientY);
  }

  /**
   * The keyboard path: Enter or Space on the bubble that has focus.
   *
   * `preventDefault` does two jobs. Space would scroll the page, and BOTH keys
   * make a native <button> synthesise a `click` — stopping the default is what
   * keeps this to exactly one judgement per press. `e.repeat` closes the other
   * door: holding Enter down repeats keydown forever.
   */
  function onKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>, prop: Prop<string>) {
    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
    e.preventDefault();
    if (e.repeat) return;
    ctx.audio.unlock();
    ctx.speech.unlock();
    const r = e.currentTarget.getBoundingClientRect();
    const verdict = judgeTap(prop, roundRef.current.target);
    // A caught bubble unmounts under the keyboard, so hand focus to the water
    // BEFORE it goes. A wrong one just wobbles, and keeps its focus.
    if (verdict === "hit") surfaceRef.current?.focus({ preventScroll: true });
    resolve(prop, verdict, r.left + r.width / 2, r.top + r.height / 2);
  }

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "layers", label: he ? "שלב" : "Level", value: level },
        { icon: "check", label: he ? "נתפסו" : "Caught", value: `${round.caught}/${round.needed}`, ltr: true },
        { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
      ]}
      levels={DIFF_OPTIONS}
      level={difficulty}
      onLevel={changeDifficulty}
      onRestart={() => startRound(difficulty, round.target)}
      // The target letter used to be a fourth stat cell, at 30px, squeezed
      // between three others. It is not a statistic - it is THE QUESTION, and a
      // four-cell row on a 320px phone gives each cell 68px to hold an icon, a
      // label and a value. In the footer it gets the whole width and can be as
      // large as a child needs it to be.
      footer={
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            padding: "10px 14px",
            minHeight: 76,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-dim)" }}>
            {he ? "תפסו" : "Catch"}
          </span>
          <span style={{ fontSize: 46, lineHeight: 1, fontFamily: "Fredoka, inherit", fontWeight: 700 }}>
            {round.target}
          </span>
        </div>
      }
    >
      <BubbleDefs />

      {/* The target is ALWAYS on screen, here and in the big chip below. The
          speaker only ever repeats what is already visible — speech is
          supplementary, never the question (see src/sdk/speech.ts). Prompt hides
          the speaker itself when no voice exists, and it SUBSCRIBES to voice
          availability rather than reading it once. */}
      <Prompt
        ctx={ctx}
        glyph="🫧"
        text={he ? `תפסו את ${round.target}` : `Catch the ${round.target}`}
        speak={round.target}
      />

      {/* dir="ltr" because this surface is SPATIAL: lanes are placed by `left`,
          and the app is Hebrew-RTL by default. Pinning it keeps lane 0 on the
          same side in both languages. */}
      <div
        ref={surfaceRef}
        dir="ltr"
        // Reachable by script, never by Tab: this is only ever where focus lands
        // when the bubble it was on is caught or floats away.
        tabIndex={-1}
        onPointerDown={onPointerDown}
        style={{
          ...PLAY_SURFACE_STYLE,
          width: SURFACE_W,
          height: SURFACE_H,
          borderRadius: 24,
          background: "linear-gradient(180deg, #0a2a4d 0%, #0d4f7a 58%, #14709a 100%)",
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
            so it looks exactly as it did as a <div>. `pointerEvents: none`
            stays: it keeps the pointer path on the surface handler, where it
            already was, so a tap can never be judged twice.
          */
          <button
            key={p.id}
            type="button"
            ref={(el) => spawner.attach(p, el)}
            data-prop-id={p.id}
            aria-label={bubbleLabel(p.kind, p.lane, he)}
            onKeyDown={(e) => onKeyDown(e, p)}
            style={{
              position: "absolute",
              bottom: 0,
              left: `${((p.lane + 0.5) / LANES) * 100}%`,
              // Centred by MARGIN, not by a transform: the float animation owns
              // `transform` outright, and under prefers-reduced-motion it is
              // replaced by a scale-only fade that would drop the centring.
              marginLeft: `calc(-0.5 * ${BUBBLE})`,
              width: BUBBLE,
              height: BUBBLE,
              // Taps are hit-tested against real rects by the surface's own
              // handler, so a bubble never needs to receive an event itself.
              pointerEvents: "none",
              willChange: "transform, opacity",
              border: "none",
              padding: 0,
              background: "transparent",
              font: "inherit",
              color: "inherit",
              touchAction: "none",
            }}
          >
            <div
              ref={(el) => {
                if (el) skinsRef.current.set(p.id, el);
              }}
              style={{ position: "absolute", inset: 0 }}
            >
              <Bubble char={p.kind} />
            </div>
          </button>
        ))}
      </div>
    </GameChrome>
  );
}
