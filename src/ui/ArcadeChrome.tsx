import { useEffect, useRef, useState, type ReactNode } from "react";
import type { GameContext } from "@sdk/index";
import { DifficultySelector, type DifficultyOption } from "./DifficultySelector";
import { pageOwnsRestart, setPause, setRestart } from "./gameTools";

/**
 * The arcade HUD: the chrome a SHOWCASE game wears instead of the shared bar.
 *
 * "A - bars and pips", picked by the operator on 2026-09-13 off a drawn mock
 * rendered at their own 1536x695: hearts as a bar, a big score, the weapon
 * rotation as pips you can count without looking away, and the golem's health
 * across the bottom. The alternatives it beat were minimal corner numbers and a
 * framed cabinet.
 *
 * WHY IT IS NOT A SECOND `GameChrome`. The shared bar is three cards above a
 * board: correct for 42 games, and for a game you stare at for three minutes it
 * puts every number you need OUTSIDE the thing you are looking at. This draws
 * the same numbers ON the arena, which is the whole of the operator's second
 * ask - "more like a real game and not the default boring controls".
 *
 * IT IS SELECTED BY BAND, NEVER BY ID. A game wears this because its `meta.tier`
 * is `"showcase"`; there is no `id === "survivors"` anywhere in this file or at
 * its call site, and `arcade-chrome-is-tier-not-id.test.ts` is the gate that
 * keeps it that way. The moment a HUD keys on an id it stops being a standard
 * and becomes one game's decoration.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * - It does not import a game. The pips arrive as DATA (`hud.weapons`), so this
 *   file knows nothing about weapons, golems or upgrades - `src/ui` may not
 *   import from `src/games`, and a HUD that needed to would be a HUD for one
 *   game wearing a general name.
 * - It does not draw the difficulty itself. `DifficultySelector` is the house
 *   component for a level row and hand-rolling another one is what the
 *   convention forbids.
 * - It does not own restart or pause. Those are registered into the page's
 *   utility row exactly as `GameChrome` registers them, by the same two
 *   functions, so a showcase game keeps the controls every other game has and
 *   the platform chrome stays in one place.
 */

/** Everything the HUD draws, already localised and already formatted. */
export type ArcadeHud = {
  /** Lives now and at full, drawn as a bar rather than as a fraction. */
  hearts: { now: number; max: number };
  score: number;
  /**
   * The personal best, drawn small under the score. Absent when a game has no
   * record to show.
   *
   * It is here because the shared bar HAD it and the drawn mock did not, and a
   * mock is a picture rather than a specification: swapping chrome is not a
   * licence to drop a number the player could already see. Under the score
   * rather than beside it, for the reason `GameChrome` gives about its own
   * record slot - a value and its record are one fact, so they are one block.
   */
  best?: number;
  /** Already formatted - "2:41". This component does no time arithmetic. */
  clock: string;
  /**
   * The weapon rotation, one entry per weapon, `on` for the one that fires
   * next. A LIST rather than a count, so a game with four weapons needs no
   * change here and this file never learns what a weapon is.
   */
  weapons: { id: string; on: boolean }[];
  /** The boss bar, or null while there is no boss on the board. */
  boss: { now: number; max: number; label: string } | null;
  /** Localised by the game, because this component does no translation. */
  labels: { hearts: string; score: string };
};

/**
 * The entrance screen: what a showcase game shows INSTEAD of a row of buttons
 * under its arena.
 *
 * The operator, 2026-09-13: *"maybe the buttons instead of being down should be
 * on some kind of load screen or entrance to the game"* - then picked this shape
 * off four rendered over the live game. It is not decoration. The three rows it
 * replaces were RESERVING HEIGHT, and a board on a desktop is sized from the
 * height its chrome leaves it, so deleting them measured **234px -> 326px of
 * arena, +39%**, on their own 1536x639 window.
 *
 * WHY THE HUD GOES AWAY WHILE THIS IS UP. The arcade HUD already owns all four
 * corners - hearts, score, pips, clock - so an entrance card has nowhere to put
 * a control without landing on a number; that collision is what sank the
 * alternative in its first render. And every one of those numbers is
 * meaningless before a run starts: zero score, full hearts, a clock at its
 * start. Hiding them is what makes this read as a title screen rather than as a
 * pause cover.
 *
 * IT ACCEPTS POINTERS, WHICH IS THE OPPOSITE OF THE HUD. The HUD refuses them
 * because the arena underneath is steered by touch. This is the one surface
 * here a player must actually press, and it only exists while nothing is being
 * steered - so the two never contend.
 */
export type ArcadeEntrance = {
  /** The game's name, already localised. Drawn large. */
  title: string;
  /** One quiet line under the title. */
  tagline?: string;
  /**
   * The button's word - "Play" on a first visit, "Play again" once a run has
   * ended. The GAME chooses it, because only the game knows which it is, and a
   * component that guessed would be a component that has to know what a run is.
   */
  action: string;
  /** What just happened, drawn above the button. Absent before the first run. */
  result?: string;
  onAction: () => void;
  /**
   * The game's own extra control, drawn small under the button - survivors puts
   * its stick choice here. A `ReactNode` rather than a shape, so this file
   * never learns what a stick is.
   */
  extra?: ReactNode;
};

/**
 * The HUD's ink.
 *
 * The stage is dark under BOTH themes - `--doc-stage` is the same colour in
 * each, which `src/build/layout.ts` says in its own words - so this ink is
 * light in both and `--text` is never used here: `--text` is near-black on the
 * light theme and would paint the score onto a dark arena invisibly. That is
 * the exact failure `always-measure-contrast-against-the-real-surface.md`
 * collects, and it is why the dim labels are the bright ink at an opacity
 * rather than a second colour token chosen for a light surface.
 */
const INK = "var(--on-brand)";
const DIM = 0.72;

export function ArcadeChrome<T extends string>({
  ctx,
  hud,
  entrance,
  levels,
  level,
  onLevel,
  onRestart,
  paused,
  onPaused,
  footer,
  children,
}: {
  ctx: GameContext;
  hud: ArcadeHud;
  /**
   * The entrance screen, or null while the game is actually running. When it is
   * present the difficulty moves ONTO it, so the panel below the arena is
   * empty and the board gets that height back.
   */
  entrance?: ArcadeEntrance | null;
  levels?: readonly DifficultyOption<T>[];
  level?: T;
  onLevel?: (next: T) => void;
  onRestart: () => void;
  /** Both or neither, exactly as `GameChrome` requires and for the same reason. */
  paused?: boolean;
  onPaused?: (next: boolean) => void;
  /** The game's own secondary area, under the arena. */
  footer?: ReactNode;
  /** The arena. */
  children: ReactNode;
}) {
  // Registered into the page's utility row, identically to GameChrome - refs so
  // the slot is filled once per mount while the handler stays current.
  const restartRef = useRef(onRestart);
  restartRef.current = onRestart;
  useEffect(() => {
    setRestart(() => restartRef.current());
    return () => setRestart(null);
  }, []);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onPausedRef = useRef(onPaused);
  onPausedRef.current = onPaused;
  const hasPause = onPaused !== undefined;
  useEffect(() => {
    setPause(
      hasPause
        ? { paused: Boolean(paused), toggle: () => onPausedRef.current?.(!pausedRef.current) }
        : null,
    );
    return () => setPause(null);
  }, [hasPause, paused]);

  // Read once at mount, like GameChrome: a standalone bundle has no emitted
  // utility row, so nobody would draw restart at all unless this does.
  const [ownRestart] = useState(() => !pageOwnsRestart());

  const hp = hud.hearts.max > 0 ? Math.max(0, Math.min(1, hud.hearts.now / hud.hearts.max)) : 0;
  const bossLeft = hud.boss && hud.boss.max > 0
    ? Math.max(0, Math.min(1, hud.boss.now / hud.boss.max))
    : 0;

  const label = (text: string) => (
    <div
      style={{
        // MEASURED, not copied. The mock's coefficients were tuned against a
        // fake window far wider than a real arena, so at 565cqw they resolved
        // to 5.9px and every label bottomed out on its clamp FLOOR - 8px at
        // both 1536x639 and 1920x1080, which is not a size anybody reads. The
        // arena is 234px wide at 639 and 565px at 1920, so the coefficients
        // below are chosen against those two widths rather than against a
        // drawing.
        fontSize: "clamp(9px, 2cqw, 14px)",
        letterSpacing: "0.12em",
        opacity: DIM,
        marginBottom: "0.35em",
      }}
    >
      {text}
    </div>
  );

  const bar = (fraction: number, fill: string, height: string) => (
    <div
      style={{
        height,
        borderRadius: "var(--radius-pill)",
        background: "var(--line)",
        overflow: "hidden",
      }}
    >
      <div style={{ width: `${fraction * 100}%`, height: "100%", background: fill }} />
    </div>
  );

  return (
    <div
      /* One panel class for every game since 2026-09-14: the 700px reading
         width moved onto GameChrome's row, so the panel itself is 1680px for
         everyone and the showcase-only `ellaz-panel-wide` is gone. See the
         rule in `global.css`. */
      className="ellaz-game-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 0",
        // No ground of its own - the same ruling as GameChrome's panel.
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      {/* The arena, and the HUD drawn ON it. `position: relative` is what makes
          every absolutely-placed reading below belong to the ARENA rather than
          to the page. */}
      <div style={{ position: "relative", display: "flex", minHeight: 0 }}>
        {children}

        {/* pointerEvents: none, and it is load-bearing rather than tidy. This
            game is STEERED by touching the arena - a stick is born where the
            thumb lands - so a HUD that accepted a pointer would swallow the
            first touch of every drag that began under a number. The overlay is
            a picture, never a control. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            // Out of the way while the entrance is up. Not tidiness: this HUD
            // owns all four corners, so a card drawn over it collides with a
            // number wherever it puts a control - and every number here is
            // meaningless before a run starts anyway.
            display: entrance ? "none" : undefined,
            color: INK,
            fontWeight: 800,
            containerType: "inline-size",
          }}
        >
          {/* HEARTS on the leading side, SCORE on the trailing side. Logical
              insets, so the Hebrew app mirrors them rather than stranding the
              score under the hearts. */}
          <div
            style={{
              position: "absolute",
              insetInlineStart: "3.5%",
              insetInlineEnd: "3.5%",
              top: "3.5%",
              display: "flex",
              alignItems: "flex-start",
              gap: "4%",
            }}
          >
            <div style={{ width: "38%" }}>
              {label(hud.labels.hearts)}
              {bar(hp, "var(--red)", "clamp(5px, 1.5cqw, 12px)")}
            </div>
            <div style={{ marginInlineStart: "auto", textAlign: "end" }}>
              {label(hud.labels.score)}
              <div
                dir="ltr"
                style={{ fontSize: "clamp(18px, 6cqw, 40px)", lineHeight: 1, color: "var(--yellow)" }}
              >
                {hud.score}
              </div>
              {hud.best !== undefined && (
                <div
                  dir="ltr"
                  style={{ fontSize: "clamp(9px, 2cqw, 14px)", opacity: DIM, marginTop: "0.3em" }}
                >
                  {ctx.t("best")} {hud.best}
                </div>
              )}
            </div>
          </div>

          {/* THE PIPS: one per weapon, the next one lit. Countable at a glance,
              which is the whole reason this HUD was picked over four corner
              numbers. */}
          <div
            style={{
              position: "absolute",
              insetInlineStart: "3.5%",
              bottom: "3.5%",
              display: "flex",
              gap: "0.5em",
            }}
          >
            {hud.weapons.map((w) => (
              <div
                key={w.id}
                style={{
                  width: "clamp(12px, 2.6cqw, 28px)",
                  height: "clamp(12px, 2.6cqw, 28px)",
                  borderRadius: "var(--radius-1)",
                  background: w.on ? "var(--brand)" : "var(--line)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <div
                  style={{
                    width: "40%",
                    height: "40%",
                    borderRadius: "50%",
                    background: w.on ? "var(--yellow)" : INK,
                    opacity: w.on ? 1 : 0.35,
                  }}
                />
              </div>
            ))}
          </div>

          <div
            dir="ltr"
            style={{
              position: "absolute",
              insetInlineEnd: "3.5%",
              bottom: "3.5%",
              fontSize: "clamp(13px, 4.2cqw, 28px)",
            }}
          >
            {hud.clock}
          </div>

          {/* The boss bar spans the middle and is absent, not empty, until there
              is a boss - an empty bar reads as a boss at zero health. */}
          {hud.boss && (
            <div style={{ position: "absolute", insetInline: "16%", bottom: "3.8%" }}>
              <div style={{ textAlign: "center" }}>{label(hud.boss.label)}</div>
              {bar(bossLeft, "var(--brand-2)", "clamp(4px, 1.1cqw, 9px)")}
            </div>
          )}
        </div>

        {/* THE ENTRANCE. It ACCEPTS pointers, unlike the HUD above it - this is
            the one surface here a player presses, and it exists only while
            nothing is being steered, so the two never contend for a touch.

            The difficulty is drawn INSIDE it rather than under the arena, which
            is the whole of the change: a row under the arena reserves height on
            every frame of the run, and this costs height on no frame at all. */}
        {entrance && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              borderRadius: 14,
              background: "var(--stage-cover)",
              color: INK,
              textAlign: "center",
              containerType: "inline-size",
            }}
          >
            <div style={{ fontSize: "clamp(18px, 5.2cqw, 34px)", fontWeight: 800, lineHeight: 1.1 }}>
              {entrance.title}
            </div>
            {entrance.tagline && (
              <div style={{ fontSize: "clamp(11px, 2.4cqw, 15px)", opacity: DIM, lineHeight: 1.3 }}>
                {entrance.tagline}
              </div>
            )}
            {/* What just happened, in the one colour the HUD already uses for a
                number that matters. Absent, not empty, before the first run. */}
            {entrance.result && (
              <div style={{ fontSize: "clamp(12px, 2.8cqw, 18px)", color: "var(--yellow)" }}>
                {entrance.result}
              </div>
            )}

            {/* The HOUSE component, not a second row of pills drawn here.
                game-difficulty-and-juice-convention.md is explicit that a level
                row is `DifficultySelector` and never a hand-rolled one, and the
                fact that it has moved onto a dark cover does not make this the
                place to fork it. Its contrast ON that cover is measured rather
                than assumed - see the probe. */}
            {levels && level && onLevel && (
              <DifficultySelector
                options={levels}
                value={level}
                onChange={onLevel}
                locale={ctx.locale}
              />
            )}

            <button
              type="button"
              onClick={entrance.onAction}
              style={{
                border: "none",
                borderRadius: "var(--radius-pill)",
                // --brand-strong, never --brand-fill. The repo settled this on
                // 2026-09-02 by measuring rendered pixels: --on-brand reads
                // 3.14:1 on the bright pink and 5.87:1 on the raspberry, and
                // night's --brand-fill is a GRADIENT no ink clears at all.
                // Darken the fill, never the ink.
                background: "var(--brand-strong)",
                color: "var(--on-brand)",
                font: "inherit",
                fontWeight: 800,
                fontSize: "clamp(15px, 3.4cqw, 21px)",
                minHeight: 52,
                padding: "0 var(--space-5)",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              {entrance.action}
            </button>

            {entrance.extra}
          </div>
        )}
      </div>

      {/* The difficulty is a GAME control and stays with the game - but when
          the game USES an entrance it lives ON it, and never here.

          `entrance === undefined`, NOT `!entrance`, and the difference is a bug
          I shipped for twenty minutes. `!entrance` is true while a run is LIVE
          (the game passes null then), so the row came back under the arena the
          moment you pressed Play - the exact row this change removed, at the
          exact moment the board is sized as though nothing were there. The
          board gate could not see it because it never presses Play; the probe
          caught it by counting the panel's children mid-run.

          So the two states mean different things and are read differently:
            undefined -> this game has no entrance at all; draw the row here.
            null      -> this game HAS one and is mid-run; draw nothing. */}
      {entrance === undefined && levels && level && onLevel && (
        <DifficultySelector options={levels} value={level} onChange={onLevel} locale={ctx.locale} />
      )}

      {footer}

      {/* Restart, only when nobody else drew one. A standalone bundle has no
          emitted utility row, and a published artifact quietly missing its
          restart button is a defect no byte-level gate in this repo can see. */}
      {/* ...and never for a game that has an entrance at all, for the same
          height reason as the row above: anything drawn here mid-run breaks the
          `chrome` the board was sized from. The entrance's own button is the
          restart on the one screen a player wants it, so this is not a control
          lost - except in one case, stated rather than hidden: a SHOWCASE game
          shipped as a standalone bundle would have no mid-run restart, because
          a standalone has no utility row either. No showcase game ships
          standalone today (survivors is not in the roster), so nothing is
          broken now; the day one does, it needs its own answer rather than this
          button quietly re-stealing the arena's height. */}
      {ownRestart && entrance === undefined && (
        <button
          type="button"
          onClick={onRestart}
          style={{
            border: "none",
            borderRadius: "var(--radius-2)",
            background: "var(--surface)",
            boxShadow: "var(--shadow-1)",
            color: "var(--text)",
            font: "inherit",
            fontWeight: 800,
            minHeight: 44,
            padding: "0 var(--space-4)",
            cursor: "pointer",
          }}
        >
          {ctx.t("restart")}
        </button>
      )}
    </div>
  );
}
