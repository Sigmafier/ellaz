import { type ReactNode } from "react";
import type { GameContext } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { Icon, type IconName } from "./icons";

/**
 * The one screen shape every game wears.
 *
 * Chosen by the operator on 2026-08-08 after four rounds of rendered options.
 * Three things about it are decisions, not defaults, and each cost a round:
 *
 * 1. THE CONTROLS ARE ON TOP. Never at the bottom.
 *
 * 2. THE DIFFICULTY IS A TOGGLE THAT NEVER GETS A ROW OF ITS OWN. One card
 *    showing the CURRENT level; each tap advances to the next. It shares the
 *    button row and absorbs that row's leftover width, so the row has no slack
 *    to show. A full-width difficulty band was measured, seen, and rejected.
 *
 * 3. THE BOTTOM REGION IS REAL, NOT PADDING. On a 390px phone a square board is
 *    WIDTH-bound at 366px, so ~350px of vertical space exists that no board can
 *    ever occupy - and shrinking the chrome makes that hole BIGGER, not smaller.
 *    `footer` is where a game's own secondary controls belong: sudoku's number
 *    pad, sequence's choice row. A game with nothing to put there says something
 *    useful instead (whose turn it is). Measured: 176px of dead band before,
 *    122px after.
 *
 * And one measurement worth keeping, because every size check passed while the
 * screen looked wrong: a control's problem was not its SIZE, it was how much of
 * it was INK. A 118x62 slab holding a 22px glyph is 6.7% icon and 93% empty
 * button. The square 56px buttons here sit at ~27%, where a standard 24px icon
 * in a 48px button lands. If you widen a nav button, grow the glyph with it.
 */

export type ChromeStat = {
  icon: IconName;
  /** Already localised - this component does no translation. */
  label: string;
  value: string | number;
  /**
   * Pin the VALUE to left-to-right inside the Hebrew app. Set it for anything
   * that is notation rather than words - a clock ("1:30"), a fraction ("3/8"),
   * a score with a separator. Without it, RTL reorders the parts around the
   * separator and 1:30 reads as 30:1.
   *
   * It is a flag rather than a ReactNode value on purpose: a node would let a
   * game put anything at all in the stat row, and the row looking identical in
   * all 21 games is the point of this component.
   */
  ltr?: boolean;
};

export type ChromeLevel<T extends string> = {
  id: T;
  /**
   * A locale RECORD, matching `DifficultyOption`. Written as `{ he, en }` it
   * compiles under a promoted language and renders the toggle in English over
   * a page that is not - the one failure this whole type exists to prevent.
   */
  label: Record<Locale, string>;
  /** The dot colour for this level. Defaults walk green -> yellow -> pink. */
  color?: string;
};

const DEFAULT_COLORS = ["var(--green)", "var(--yellow)", "var(--brand)"];

const TAP = 56; // >= the 44px WCAG floor, and the size the ink ratio was tuned at
/** Past this many levels the dots become a "3/12" counter. See the toggle. */
const DOT_MAX = 5;
const SURFACE_RADIUS = "var(--radius-3)";

export function GameChrome<T extends string>({
  ctx,
  stats,
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
  /** Up to three. Four wrap and the row stops reading as one line. */
  stats: ChromeStat[];
  levels?: ChromeLevel<T>[];
  level?: T;
  /** Called with the NEXT level. The toggle owns the cycling, not the game. */
  onLevel?: (next: T) => void;
  onRestart: () => void;
  /**
   * Opt into the pause control. Only a game that KEEPS RUNNING while nobody is
   * playing it needs one — a falling piece, a moving snake, a countdown. A
   * turn-based game already pauses itself the moment a hand leaves the screen,
   * and a button there is a control that does nothing.
   *
   * Pass BOTH or neither. `paused` is the game's own state, not this
   * component's: the game is what stops, so the game owns the flag and this
   * only draws it. Omitting `onPaused` while passing `paused` would render a
   * button that cannot be pressed, so the two are one optional pair.
   *
   * Hide it (pass `undefined`) once the run is over. A pause button on a dead
   * board is offering to stop something that already stopped.
   */
  paused?: boolean;
  onPaused?: (next: boolean) => void;
  /** The game's own secondary area, under the board. */
  footer?: ReactNode;
  /** The board. */
  children: ReactNode;
}) {
  // Chrome, not game words: every one of these already had a key in the
  // eleven-language dictionary, so a hand-written he/en pair was strictly
  // less translated than the shared bar it sits in.
  const t = ctx.t;
  const muted = ctx.audio.muted;
  const i = levels && level ? levels.findIndex((l) => l.id === level) : -1;
  const current = i >= 0 && levels ? levels[i] : undefined;

  const navBtn = (name: IconName, ariaLabel: string, onClick: () => void) => (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        width: TAP,
        height: TAP,
        flex: "0 0 auto",
        border: "none",
        borderRadius: "var(--radius-2)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
        color: "var(--text)",
        display: "grid",
        placeItems: "center",
        // 0.52 of the button, not 0.36. See the ink note above.
        fontSize: Math.round(TAP * 0.52),
        cursor: "pointer",
      }}
    >
      <Icon name={name} />
    </button>
  );

  return (
    <div
      // The desktop cap lives in global.css as `.ellaz-game-panel`, NOT in the
      // inline style below, because it is a media query and an inline style
      // cannot carry one. Everything in this component is `flex: 1 1 0` with no
      // ceiling - exactly right on the 390px phone it was judged at, and on a
      // 1440px desktop the same rule produced a 1193px button reading "Level:
      // Classic", three 456px cards each holding one digit, and a 420px board
      // adrift in 1409px. Measured on the built artifact, all three.
      className="ellaz-game-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "var(--surface-2)",
        padding: 8,
        // WIDTH + BORDER-BOX, both load-bearing. Without them this is a flex
        // item sized by its content: the board inside asks for `min(94vw, …)`,
        // which is nearly the whole frame, and then this padding ADDS 16px on
        // top - so the panel came out 407px wide inside a 390px frame, centred,
        // hanging 8px off each side. #game-frame clips, so the result was a
        // framed panel with its left and right band sliced off. Measured on the
        // built artifact at both widths.
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 9,
          padding: "12px 12px 9px",
          background: "var(--bg)",
          borderRadius: `${SURFACE_RADIUS} ${SURFACE_RADIUS} 0 0`,
        }}
      >
        {/* Row 1 - the buttons, and the difficulty absorbing what is left.
            flexWrap because the item count is fixed but the WIDTH is not: three
            56px squares plus the toggle is 324px of unshrinkable content inside
            296px of usable width on a 320px phone, and this container clips
            rather than scrolls. See a-row-that-grows-with-the-catalog-must-wrap. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {navBtn("home", t("home"), () => ctx.requestExit())}
          {navBtn("redo", t("restart"), onRestart)}
          {navBtn(muted ? "muted" : "sound", t("sound"), () => ctx.audio.toggleMute())}
          {onPaused &&
            navBtn(paused ? "play" : "pause", paused ? t("resume") : t("pause"), () =>
              onPaused(!paused),
            )}
          {levels && current && onLevel && (
            <button
              type="button"
              aria-label={`${t("level")}: ${current.label[ctx.locale]}`}
              onClick={() => onLevel(levels[(i + 1) % levels.length].id)}
              style={{
                height: TAP,
                flex: "1 1 auto",
                // A FLOOR, not zero, and it is what makes the row's `flexWrap`
                // do anything. At `minWidth: 0` a flex item shrinks instead of
                // wrapping, so a fourth nav button leaves this toggle 94px on a
                // 390px phone and "Classic" is clipped INSIDE the card - no
                // element wider than its frame, no overflow anywhere, and the
                // only symptom a missing glyph. 132 is what the widest shipped
                // label plus its dots actually needs, so past that the toggle
                // takes its own row rather than losing letters. See
                // .claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md,
                // which is the same defect one component over.
                minWidth: 132,
                border: "none",
                borderRadius: "var(--radius-2)",
                background: "var(--surface)",
                boxShadow: "var(--shadow-1)",
                color: "var(--text)",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "0 12px",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.12 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text-dim)" }}>
                  {t("level")}
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "Fredoka, inherit" }}>
                  {current.label[ctx.locale]}
                </span>
              </span>
              {/* The dots are the whole affordance: without them a toggle reads
                  as a label and never gets pressed. They say how many levels
                  exist AND which one you are on, in the width of three dots.
                  Past DOT_MAX they stop doing that - twelve 6px dots are 130px
                  of row that nobody can count at a glance - so the same two
                  facts become "3/12", which is legible at any length. */}
              <span
                dir="ltr"
                style={{ display: "flex", gap: 4, alignItems: "center", marginInlineStart: 8 }}
              >
                {levels.length <= DOT_MAX ? (
                  levels.map((l, k) => (
                    <span
                      key={l.id}
                      style={{
                        width: k === i ? 9 : 6,
                        height: k === i ? 9 : 6,
                        borderRadius: "50%",
                        background:
                          k === i ? (current.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]) : "var(--line)",
                      }}
                    />
                  ))
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-dim)" }}>
                    {i + 1}/{levels.length}
                  </span>
                )}
              </span>
            </button>
          )}
        </div>

        {/* Row 2 - the numbers, equal thirds so none of them leaves a hole.
            Absent entirely when a game keeps no numbers: coloring has no score
            and never will, and an empty row would still cost its gap and read
            as something that failed to load. */}
        {stats.length > 0 && (
        <div style={{ display: "flex", gap: 8 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                background: "var(--surface)",
                borderRadius: "var(--radius-2)",
                boxShadow: "var(--shadow-1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "9px 4px",
              }}
            >
              <span style={{ color: "var(--text-dim)", fontSize: 18, display: "block" }}>
                <Icon name={s.icon} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 10, fontWeight: 800, color: "var(--text-dim)" }}>
                  {s.label}
                </span>
                <span
                  dir={s.ltr ? "ltr" : undefined}
                  style={{ display: "block", fontSize: 18, fontWeight: 800, fontFamily: "Fredoka, inherit", lineHeight: 1.1 }}
                >
                  {s.value}
                </span>
              </span>
            </div>
          ))}
        </div>
        )}
      </div>

      <div
        className="ellaz-play-surface"
        style={{
          flex: 1,
          minHeight: 0,
          // The anchor for the pause cover below. Harmless when nothing is
          // paused, and the cover has to live INSIDE this box rather than over
          // the whole panel: the header must stay reachable, because the button
          // that ends the pause is in it.
          position: "relative",
          display: "flex",
          // COLUMN, not row. Most games pass one board, but the kids games pass
          // a <Prompt> above it, and a row would sit the question BESIDE the
          // question it is about. A column with one child centers identically,
          // so this costs the single-child games nothing.
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          overflow: "auto",
          // NO horizontal padding. The frame's own 8px is the gutter, and every
          // game sizes its board against the VIEWPORT (`min(94vw, …)`) rather
          // than against this box - so a second 12px each side is 24px the
          // board never budgeted for, and it is the board that loses.
          padding: "9px 0 12px",
          background: "var(--bg)",
          borderRadius: footer ? undefined : `0 0 ${SURFACE_RADIUS} ${SURFACE_RADIUS}`,
        }}
      >
        {children}

        {/* The cover. It HIDES the board rather than dimming it, and that is
            the decision: a see-through pause is a way to study a falling stack
            for as long as you like, which turns the one control meant for
            putting the tablet down into the cheapest strategy in the game.
            It also swallows every pointer event aimed at the board, so a
            paused game cannot be played through its own cover.

            One tap anywhere on it resumes. The whole surface is the target
            because that is what a four-year-old aims at, and the button inside
            is what says so - it is drawn, not wired, and the click it would
            handle is caught by this parent either way. */}
        {paused && onPaused && (
          <button
            type="button"
            aria-label={t("resume")}
            onClick={() => onPaused(false)}
            style={{
              position: "absolute",
              inset: 0,
              border: "none",
              // Opaque in BOTH themes, and explicitly coloured rather than
              // inheriting: `--text` is near-black on the light theme, so an
              // inherited colour paints this heading black on near-black - the
              // exact thing blocks' game-over sheet has a comment about.
              background: "var(--bg)",
              color: "var(--text)",
              fontFamily: "inherit",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "var(--surface)",
                boxShadow: "var(--shadow-1)",
                color: "var(--brand)",
                display: "grid",
                placeItems: "center",
                fontSize: 46,
              }}
            >
              <Icon name="play" />
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "Fredoka, inherit" }}>
              {t("resume")}
            </span>
          </button>
        )}
      </div>

      {footer && (
        <div
          style={{
            flex: "0 0 auto",
            padding: "0 12px 14px",
            background: "var(--bg)",
            borderRadius: `0 0 ${SURFACE_RADIUS} ${SURFACE_RADIUS}`,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
