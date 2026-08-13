import { useEffect, useRef, useState } from "react";
import { dailyStreak, type DailyStateV1 } from "@sdk/index";
import { makeT } from "@i18n/index";
import type { AppLocale } from "@i18n/locales";
import { popEl } from "@juice/index";
import { todayKey } from "./dailyRotation";

// The days-in-a-row readout, beside the wallet.
//
// Deliberately the SMALLEST possible surface: a flame and a number. There is no
// history screen and there is not going to be one - "today's result only" is the
// product decision, and a calendar of missed days is the one thing this design
// exists to avoid. `daily.ts` carries no `brokenAt`, no `missedDays` and no
// lapse flag, so there is nothing here that could shame a child even if a screen
// wanted to.
//
// It renders NOTHING until the first daily puzzle is finished. A "0" beside a
// full wallet on a first visit reads as a debt, exactly the way "0 coins" does
// on the world card - and a child who has never met this feature should not have
// to ask what the dim flame means.

export interface DailyChipProps {
  locale: AppLocale;
  /**
   * Numbers only, no pill of its own - the game page's header already draws
   * one. Same prop and same reason as `WalletChip`; see the note there about
   * why this is a prop rather than a stylesheet rule.
   */
  bare?: boolean;
}

export function DailyChip({ locale, bare = false }: DailyChipProps) {
  const t = makeT(locale);
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<DailyStateV1>(() => dailyStreak.read());
  // What is currently PAINTED, so the pop fires on a real climb rather than on
  // every re-render the parent happens to cause.
  const shown = useRef(state.current);

  useEffect(() => {
    return dailyStreak.subscribe((next) => {
      setState(next);
      if (next.current > shown.current && ref.current) popEl(ref.current, "ellaz-pop");
      shown.current = next.current;
    });
  }, []);

  // Never played a daily puzzle. Nothing to say yet.
  if (state.days === 0 || state.current === 0) return null;

  const done = state.last === todayKey();

  return (
    <div
      ref={ref}
      // The number reads left-to-right in the Hebrew RTL shell, like the wallet.
      dir="ltr"
      // The count belongs in the LABEL, not only in the picture: a screen
      // reader announcing a flame emoji says nothing about a streak.
      aria-label={`${t("dailyStreak")}: ${state.current}`}
      title={done ? t("dailyDone") : t("dailyPuzzle")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        fontWeight: 800,
        whiteSpace: "nowrap",
        flexShrink: 0,
        // Today still to do reads DIMMER, not red and not struck through. It is
        // an invitation, never a warning - the same reason an unaffordable shop
        // item answers with a shake and says nothing.
        opacity: done ? 1 : 0.55,
        ...(bare
          ? { color: "inherit", fontSize: "inherit" }
          : {
              minHeight: "var(--tap)",
              padding: "0 var(--space-3)",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: 17,
              boxShadow: "var(--shadow-1)",
            }),
      }}
    >
      <span aria-hidden="true" style={{ fontSize: bare ? "1em" : 16, lineHeight: 1 }}>
        🔥
      </span>
      {state.current}
    </div>
  );
}
