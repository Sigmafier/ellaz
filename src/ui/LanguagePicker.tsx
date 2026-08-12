import { useEffect, useRef, useState } from "react";
import type { AppLocale } from "@i18n/locales";
import { AUTONYM, dirOf } from "@i18n/locales";
import { AVAILABLE, makeT } from "@i18n/strings";

/**
 * The language control.
 *
 * A button that opens a wrapping sheet of every language the app speaks, each
 * written in ITSELF. It replaced a two-state `EN / עב` toggle, which stops being
 * a control the moment there are more than two languages.
 *
 * THREE DECISIONS, none of them cosmetic:
 *
 * 1. AUTONYMS, NEVER FLAGS. A flag is a country, not a language - Spanish is not
 *    Spain, Portuguese is mostly not Portugal, Arabic is spoken across twenty-odd
 *    states. On this site specifically, an Israeli flag beside an Arabic one is a
 *    political statement a children's game platform has no business making. And
 *    "Spanish" written in English is unreadable to exactly the person who needs
 *    it most, which is why every entry is written in its own language.
 *
 * 2. IT WRAPS. Eleven items today and the list only grows. A non-wrapping flex
 *    row inside a container with `overflow: hidden` does not scroll - it CLIPS,
 *    silently, on the narrow screens most children actually use. This repo has
 *    paid for that twice already; see
 *    .claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md.
 *
 * 3. THE CURRENT LANGUAGE IS MARKED BY SHAPE, NOT COLOUR. A ring plus a check
 *    glyph, so it reads for a colour-blind parent and in a screenshot.
 *
 * 4. THE AUTONYM ON THE BUTTON IS HIDDEN ON A NARROW SCREEN. `Bahasa Indonesia`
 *    made this control 134px wide beside three 48px siblings, and the home
 *    header has no 134px to give: measured at 390px it asked for 509px of a
 *    350px box. The label is a convenience, not the control - the globe is the
 *    control, `aria-label` carries the name, and the sheet it opens writes
 *    every language in itself. Nothing is lost that the next tap does not show.
 *
 *    It is a CLASS rather than a `useState` on window width, because a resize
 *    listener re-renders on every drag and reads wrong on the first paint; and
 *    because these styles are inline, the label's `display` has to be the one
 *    thing the stylesheet owns or a media query cannot reach it at all.
 *
 * Each entry carries its own `dir` and `lang`, so an Arabic autonym renders
 * right-to-left inside an otherwise left-to-right sheet. Without that, the label
 * of the language somebody is looking for is the one label rendered wrongly.
 */
export function LanguagePicker({
  locale,
  onPick,
  onTap,
}: {
  locale: AppLocale;
  onPick: (next: AppLocale) => void;
  onTap?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const t = makeT(locale);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Escape closes it. A sheet a child opened by accident must be dismissible
  // without hunting for a target.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        aria-label={t("language")}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          onTap?.();
          setOpen((v) => !v);
        }}
        style={{
          minHeight: "var(--tap)",
          // The tap target has to survive losing its label: 14px of padding
          // either side of an 18px globe is 46, which is under the floor every
          // other control in that header holds.
          minWidth: "var(--tap)",
          padding: "0 14px",
          borderRadius: "var(--radius-pill)",
          border: "none",
          background: "var(--surface-2)",
          color: "var(--text)",
          fontWeight: 800,
          fontSize: 15,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <GlobeIcon />
        <span className="ellaz-lang-label" lang={locale} dir={dirOf(locale)}>
          {AUTONYM[locale]}
        </span>
      </button>

      {open && (
        <>
          {/* A full-screen backdrop rather than a document listener: one tap
              anywhere closes it, and the tap does not also land on whatever was
              underneath. */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            aria-hidden="true"
          />
          <div
            ref={sheetRef}
            role="menu"
            aria-label={t("language")}
            // Pinned to the INLINE END so it opens inward on both directions
            // rather than off the edge of the screen in Hebrew.
            style={{
              position: "absolute",
              insetInlineEnd: 0,
              top: "calc(var(--tap) + 8px)",
              zIndex: 41,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-2)",
              boxShadow: "var(--shadow-2)",
              padding: 8,
              display: "grid",
              // Two columns on a phone, more when there is room. `auto-fit`
              // rather than a fixed count, so this never needs revisiting when
              // the twelfth language lands.
              gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
              gap: 6,
              width: "min(84vw, 380px)",
            }}
          >
            {AVAILABLE.map((l) => {
              const current = l === locale;
              return (
                <button
                  key={l}
                  role="menuitemradio"
                  aria-checked={current}
                  lang={l}
                  dir={dirOf(l)}
                  onClick={() => {
                    onTap?.();
                    setOpen(false);
                    if (!current) onPick(l);
                  }}
                  style={{
                    minHeight: "var(--tap)",
                    padding: "0 12px",
                    borderRadius: "var(--radius-pill)",
                    border: current ? "2px solid var(--text)" : "2px solid transparent",
                    background: current ? "var(--surface-2)" : "transparent",
                    color: "var(--text)",
                    fontWeight: current ? 800 : 600,
                    fontSize: 16,
                    textAlign: "start",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {/* Shape, not colour. Always present so the label never
                      shifts sideways when the selection moves. */}
                  <span aria-hidden="true" style={{ width: 14, flex: "0 0 14px" }}>
                    {current ? "✓" : ""}
                  </span>
                  <span>{AUTONYM[l]}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** Original, and a globe rather than a flag for the reason above. */
function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 9h17M3.5 15h17" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
