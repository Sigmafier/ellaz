import type { ReactElement } from "react";
import type { Locale } from "@i18n/index";
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
  locale: Locale;
  /** Bigger touch target for the kids games (age-5 minimum). */
  kids?: boolean;
}): ReactElement {
  const { options, value, onChange, locale, kids } = props;
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((o) => (
        <Button
          key={o.id}
          kids={kids}
          variant={o.id === value ? "primary" : "ghost"}
          ariaLabel={`difficulty ${o.id}`}
          onClick={() => onChange(o.id)}
          style={{ fontSize: 16, padding: "0 var(--space-3)" }}
        >
          {o.label[locale]}
        </Button>
      ))}
    </div>
  );
}
