import { THEMES, type ThemeId } from "./themes";
import type { Locale } from "../i18n";

/**
 * Pick a look.
 *
 * ONE AT A TIME, not three side by side. Three miniature tables in a row is a
 * comparison exercise; what the operator is actually deciding is "do I want to
 * look at THIS", which needs the real table at real size. So this is a row of
 * swatches that repaints the whole app on tap, and the thing being judged is
 * always the full screen behind it.
 */
export function ThemePicker({
  value,
  onPick,
  locale,
}: {
  value: ThemeId;
  onPick: (id: ThemeId) => void;
  locale: Locale;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {THEMES.map((th) => {
        const on = th.id === value;
        return (
          <button
            key={th.id}
            className="btn ghost"
            aria-pressed={on}
            onClick={() => onPick(th.id)}
            style={{
              flex: 1,
              minHeight: 60,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              // The selected one is marked by a ring AND by the label going
              // bold — a colour-only mark is unreadable in the very situation
              // this picker exists to change.
              border: on ? "2px solid var(--gold)" : "1px solid var(--line)",
              fontWeight: on ? 900 : 600,
              fontSize: 13,
            }}
          >
            <span aria-hidden style={{ display: "flex", borderRadius: 999, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.4)" }}>
              {th.swatch.map((c) => (
                <span key={c} style={{ width: 16, height: 16, background: c }} />
              ))}
            </span>
            <span>{th.label[locale]}</span>
          </button>
        );
      })}
    </div>
  );
}
