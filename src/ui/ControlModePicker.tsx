import type { ReactElement } from "react";
import { CONTROL_MODES, type ControlMode } from "@shared/useControlMode";

// The "Controls" row a steering game draws in its footer, directly above
// whatever the chosen mode puts on screen: Arrows, Joystick, On the board.
//
// Drawn off the operator-picked mock (2026-09-14): a quiet label, then three
// pills, the chosen one filled. It is a GAME control and lives in the game's
// own footer - it means nothing on the World screen or the Boards
// (game-controls-and-platform-chrome-never-share-a-bar.md).
//
// Real buttons with `aria-pressed`, never a styled div: this is a toggle group
// a player on assistive input must be able to reach, and the Arrows pill is the
// way back to the one mode a child who cannot drag can always play with.
//
// Pinned to the `page` chunk in vite.config.ts beside `DirectionPad`. Nothing on
// the home screen draws it, and the `src/ui/` catch-all would otherwise ship it
// to every child before they had chosen a game.

/** The i18n key for each mode's label. Exported so the test reads the map. */
export const CONTROL_MODE_LABEL: Record<ControlMode, string> = {
  arrows: "controlArrows",
  joystick: "controlJoystick",
  board: "controlBoard",
};

export function ControlModePicker(props: {
  mode: ControlMode;
  onMode: (next: ControlMode) => void;
  /** The game's translator, `ctx.t`. */
  t: (key: string) => string;
}): ReactElement {
  const { mode, onMode, t } = props;
  const label = t("controls");
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: "flex",
        // WRAPS, so a long translation drops a pill to a second line rather
        // than pushing one off the side of a 360px phone.
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: "100%",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 14, color: "var(--text-dim)", marginInlineEnd: 2 }}>
        {label}
      </span>
      {CONTROL_MODES.map((m) => {
        const on = m === mode;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (!on) onMode(m);
            }}
            style={{
              minHeight: 44,
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              // --brand-strong, not --brand-fill: night's fill is a gradient and
              // no ink clears 4.5:1 across it
              // (a-contrast-floor-is-a-floor-not-a-target.md).
              background: on ? "var(--brand-strong)" : "var(--surface)",
              color: on ? "var(--on-brand)" : "var(--text)",
              boxShadow: on ? "none" : "var(--shadow-1)",
              font: "inherit",
              fontSize: 14,
              fontWeight: 700,
              whiteSpace: "nowrap",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            {t(CONTROL_MODE_LABEL[m])}
          </button>
        );
      })}
    </div>
  );
}
