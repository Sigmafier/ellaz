import type { ReactElement } from "react";
import type { Locale } from "@i18n/index";
import type { AppLocale } from "@i18n/locales";
import { textFor } from "@i18n/index";
import { Button } from "./components";

// The difficulty selector every game shares. Eight games hand-rolled the same
// Button row; this is that row, extracted verbatim from the reference copy in
// `games/hidden/Hidden.tsx` so adopting it shifts nothing visually.
//
// This is the one place `@ui` reaches for `@i18n` — deliberate, and safe: i18n
// is a leaf module with no dependencies of its own, so the direction of the
// arrow can never become a cycle.

export interface DifficultyOption<T extends string = string> {
  id: T;
  label: Record<Locale, string>;
}

export function DifficultySelector<T extends string>(props: {
  options: readonly DifficultyOption<T>[];
  value: T;
  onChange: (id: T) => void;
  locale: AppLocale;
  /** Bigger touch target for the kids games (age-5 minimum). */
  kids?: boolean;
}): ReactElement {
  const { options, value, onChange, locale, kids } = props;
  return (
    // It WRAPS, because the number of options is the caller's decision and one
    // caller (the boards) passes a list read off the player's own records.
    //
    // Without this the row does not overflow — it SHRINKS, and the shrink clips
    // the text inside each pill. Measured on the built artifact at 390px:
    // sudoku's six boards rendered `Expert` as `Exper` (48px box, 58px needed)
    // and cut the last glyph off both `Animals N×N`, while the row itself
    // reported exactly the container's width and no element anywhere was wider
    // than its frame. A width check cannot see this; only the glyphs can.
    //
    // Wrapping is a no-op whenever the options already fit, so the seventeen
    // games rendering three or four pills are unchanged.
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, rowGap: 8 }}>
      {options.map((o) => (
        <Button
          key={o.id}
          kids={kids}
          variant={o.id === value ? "primary" : "ghost"}
          ariaLabel={`difficulty ${o.id}`}
          onClick={() => onChange(o.id)}
          style={{ fontSize: 16, padding: "0 var(--space-3)" }}
        >
          {textFor(o.label, locale)}
        </Button>
      ))}
    </div>
  );
}
