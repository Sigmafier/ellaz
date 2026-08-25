import { useEffect, useRef, useState } from "react";
import type { AppLocale } from "@i18n/locales";
import { AUTONYM, dirOf } from "@i18n/locales";
import { AVAILABLE, makeT } from "@i18n/strings";
import { Icon } from "./icons";
import { HEADER_PILL } from "./headerPill";

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
 * 4. THE BUTTON IS A GLOBE AT EVERY WIDTH. It used to carry the autonym above
 *    430px and hide it below, through an `.ellaz-lang-label` class the
 *    stylesheet owned. Operator ruling 2026-08-24, verbatim: "always show
 *    language as globe icon but it must be there". So there is no label, no
 *    class and no media query - one control, one appearance, everywhere.
 *
 *    "But it must be there" is the load-bearing half, and it is why this
 *    control is never folded behind a settings button. Measured that day: the
 *    four home shells (`/`, `/he/`, `/es/`, `/fr/`) emit NO language offer bar
 *    - 0 hits against 7 on every content page, because they render no
 *    DOCUMENT_CSS - so on those four pages THIS is the only language
 *    affordance in existence. `/` is also the canonical entry and the
 *    x-default target, and `storedLocale()` answers a first visit in English
 *    by design, while Search Console says 76% of the queries reaching this
 *    site are Hebrew. Hiding this button hides the way out.
 *
 *    The name is not lost with the label: `aria-label` carries it, in the
 *    "Theme: Night" shape the sibling toggles already use, and the sheet it
 *    opens still writes every language in itself.
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
        // The autonym rides the accessible name now that the button draws no
        // label - the same "Theme: Night" shape ThemeToggle uses, so a screen
        // reader still hears which language is current.
        aria-label={`${t("language")}: ${AUTONYM[locale]}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          onTap?.();
          setOpen((v) => !v);
        }}
        // The tap target is the globe and nothing else now, so the shared
        // pill's `minWidth` is the whole width rather than a floor under a
        // label - and being the SAME OBJECT as the theme pill beside it is
        // what makes the two the same shape. They drifted 18px apart once,
        // when this one carried `padding: 0 14px` and its sibling did not; two
        // round controls of different widths side by side is exactly what
        // reads as unfinished. See @ui/headerPill.
        style={HEADER_PILL}
      >
        <Icon name="globe" />
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
