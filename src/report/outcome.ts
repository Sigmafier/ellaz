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
}

export function lookFor(outcome: SendOutcome | null): ResultLook {
  if (outcome?.ok === true) return { key: "reportThanks", emoji: "\u{1F389}", retry: false };

  const why = outcome?.ok === false ? outcome.why : null;

  // A report already went in this minute. The next one can succeed, but not
  // yet, so a retry button here would fail on every tap for up to 60 seconds.
  if (why === "throttled") return { key: "reportSoon", emoji: "⏳", retry: false };

  // The rules block rejected the SHAPE - an oversized field. The same bytes are
  // refused again however many times they are sent.
  if (why === "refused") return { key: "reportRefused", emoji: "\u{1F615}", retry: false };

  // No identity, no network, a timeout, a 500 - and a null outcome, which is
  // the sheet's own "we never got an answer". Both are worth a second attempt.
  return { key: "reportFailed", emoji: "\u{1F614}", retry: true };
}
