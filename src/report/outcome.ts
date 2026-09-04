/* What each send outcome LOOKS like, as data rather than as JSX.
   ===========================================================================

   This exists so the mapping can be tested. `vitest.config.ts` runs the node
   environment and includes only `*.test.ts`, so nothing in this repo can render
   `ReportSheet.tsx` and read the button back - which is exactly how `refused`
   and `failed` came to share one screen and one retry button unnoticed until
   2026-09-03. A pure function over the outcome union is the part a node test
   CAN hold, so the decision lives here and the component only draws it.

   THE PROPERTY WORTH THE FILE: `retry` is derived from a POSITIVE test for the
   one outcome a second identical tap can change. A future `why` therefore
   arrives with no retry button, which is the safe default - an unknown refusal
   is more likely permanent than transient, and a button that cannot work is a
   lie in the same class the throttle screen was already careful not to tell. */

import type { SendOutcome } from "./send";

export interface ResultLook {
  /** The dictionary key for the sentence under the face. */
  key: "reportThanks" | "reportSoon" | "reportRefused" | "reportFailed";
  /** Decorative, `aria-hidden` - the sentence carries the meaning. */
  emoji: string;
  /** Whether the retry button is offered AT ALL. */
  retry: boolean;
  /**
   * How long until a retry could work, in milliseconds, or `null` when waiting
   * changes nothing.
   *
   * Only `throttled` has one. It is a DURATION rather than a deadline so the
   * sheet can tick it down against elapsed time and never has to reconcile the
   * phone's clock with the server's - see the note on `SendOutcome`.
   *
   * `retry` and `waitFor` are deliberately independent: while the wait is
   * running a retry genuinely cannot work, so the button stays withheld and the
   * player is shown the seconds instead of a button that would fail. The one
   * thing the throttle screen must never become is a button that lies, which is
   * the defect this whole file exists to have fixed.
   */
  waitFor: number | null;
}

export function lookFor(outcome: SendOutcome | null): ResultLook {
  if (outcome?.ok === true) return { key: "reportThanks", emoji: "\u{1F389}", retry: false, waitFor: null };

  const why = outcome?.ok === false ? outcome.why : null;

  // A report already went in this minute. The next one can succeed, but not
  // yet, so a retry button here would fail on every tap for up to 60 seconds.
  if (why === "throttled") {
    // The sheet counts this down and offers the retry when it reaches zero. A
    // wait that has somehow already elapsed, or a nonsensical one, is clamped
    // to the full minute rather than trusted - the value crosses a network and
    // a clock, and a negative countdown would read as broken.
    const raw = outcome?.ok === false && outcome.why === "throttled" ? outcome.waitMs : 0;
    const waitFor = Number.isFinite(raw) && raw > 0 && raw <= 60000 ? raw : 60000;
    return { key: "reportSoon", emoji: "⏳", retry: false, waitFor };
  }

  // The rules block rejected the SHAPE - an oversized field. The same bytes are
  // refused again however many times they are sent.
  if (why === "refused") return { key: "reportRefused", emoji: "\u{1F615}", retry: false, waitFor: null };

  // No identity, no network, a timeout, a 500 - and a null outcome, which is
  // the sheet's own "we never got an answer". Both are worth a second attempt.
  return { key: "reportFailed", emoji: "\u{1F614}", retry: true, waitFor: null };
}
