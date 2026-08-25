import { useEffect, useRef, useState } from "react";
import { dailyStreak, type DailyStateV1 } from "@sdk/index";
// Direct, not through the barrel: `@sdk/index` re-exports `createContext`,
// which reaches back into the portal, and this is portal code. Same reason
// `dailyRotation.ts` imports `@sdk/daily` rather than `@sdk`.
import { claimStreakReward } from "@sdk/streakPayout";
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

// NOTHING RENDERS THIS TODAY, and that is a decision rather than an oversight.
// Operator, 2026-08-25, twice: the chip left the home bar ("we dont need it
// there") and then the game page's header ("i still see it there"). Those were
// its only two call sites.
//
// The file is KEPT rather than deleted. It has no importer, so Rollup drops it
// and it costs a visit nothing; the streak it reads is still live, still
// accruing and still paying milestones; and putting the readout back somewhere
// is then one line rather than a rewrite. `home-header-must-wrap.test.ts`
// asserts both headers stay clear of it, so it cannot drift back in unnoticed.

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

  // Bank whatever the streak is owed. On mount, and again whenever the run
  // LENGTH changes — which is the only thing that can make a milestone due.
  //
  // On mount as well as on change, because a milestone can be reached on a
  // screen this chip was not on yet, and because a device that refused the
  // latch write earlier is owed it still. Every other call is a no-op:
  // `claimStreakReward` is idempotent by an on-disk latch, so calling it from
  // here, from two mounted chips at once, or on every render pays at most once
  // per milestone ever. That property is why this can live in a component at
  // all instead of needing one privileged caller — and it is what makes the
  // eventual move into `winMoment` (see `streakPayout.ts`) a pure improvement
  // rather than a correctness fix.
  //
  // Keyed on `current` rather than on the state OBJECT deliberately: a paid
  // claim writes `paid` and notifies, so an object-keyed effect would re-enter
  // itself once for nothing on every payout.
  useEffect(() => {
    claimStreakReward();
  }, [state.current]);

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
