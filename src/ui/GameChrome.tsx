import { type ReactNode } from "react";
import type { GameContext } from "@sdk/index";
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
  label: { he: string; en: string };
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
  /** The game's own secondary area, under the board. */
  footer?: ReactNode;
  /** The board. */
  children: ReactNode;
}) {
  const he = ctx.locale === "he";
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
          {navBtn("home", he ? "בית" : "Home", () => ctx.requestExit())}
          {navBtn("redo", he ? "מחדש" : "Restart", onRestart)}
          {navBtn(muted ? "muted" : "sound", he ? "קול" : "Sound", () => ctx.audio.toggleMute())}
          {levels && current && onLevel && (
            <button
              type="button"
              aria-label={`${he ? "רמה" : "Level"}: ${current.label[ctx.locale]}`}
              onClick={() => onLevel(levels[(i + 1) % levels.length].id)}
              style={{
                height: TAP,
                flex: "1 1 0",
                minWidth: 0,
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
                  {he ? "רמה" : "Level"}
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
