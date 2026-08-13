// Which day it is, where the child is — and nothing else.
//
// SPLIT FROM `share.ts` FOR ONE REASON, and it is a payload one. The home
// screen has to ask "was this played today?" to decide whether a share button
// belongs on the page at all, and the home screen is the SHELL. Importing that
// question from `share.ts` would drag the whole share policy — the payload
// shape, the scrubber, the refusal — into every child's first visit, for two
// predicates. `vite.config.ts` pins `share.ts` to a lazy `share-*` chunk
// precisely so it is not there; this file is the small half that may be.
//
// It is also why `daily.ts` is not imported here. That module answers "how many
// calendar days apart are these, without DST eating one", which needs UTC
// round-tripping and a parser, and it is a whole streak implementation. Nothing
// here is persisted or compared across builds, so there is no contract to keep
// in step — only the one rule below, which both files obey independently.

/**
 * `YYYY-MM-DD` in the DEVICE's timezone.
 *
 * NEVER `toISOString().slice(0, 10)`. Israel runs UTC+2/+3, so a child playing
 * at 01:00 on Thursday is still on Wednesday in UTC and would share yesterday's
 * games — once a night, for every timezone east of Greenwich, and the mirror
 * image for every one west of it.
 *
 * An unusable Date answers the empty string rather than "NaN-NaN-NaN", so it
 * lands in the same "no day" state as never having played.
 */
export function localDay(d: Date): string {
  const t = d.getTime();
  if (!Number.isFinite(t)) return "";
  const p = (n: number, w: number) => String(n).padStart(w, "0");
  return `${p(d.getFullYear(), 4)}-${p(d.getMonth() + 1, 2)}-${p(d.getDate(), 2)}`;
}

/**
 * Was this instant on the same calendar day, where the device is?
 *
 * `undefined` — a game never opened — is `false`, never "the epoch". Same rule
 * `profile.ts` applies to `lastPlayedAt` itself: the absence is meaningful, so
 * nothing may default it to 0.
 */
export function playedOn(at: number | undefined, now: Date): boolean {
  if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) return false;
  return localDay(new Date(at)) === localDay(now);
}
