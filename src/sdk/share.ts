// Sharing — turning ONE DAY into something a parent can send, and nothing else.
//
// Fourth sibling of economy.ts, score.ts and session.ts, and the same shape: a
// screen reports WHAT HAPPENED and this module alone decides what may leave the
// device. A caller cannot hand it a streak, a lifetime total or a history,
// because there is no field for one — `ShareDay` holds a single date and the
// plays that belong to it. The absence of those fields is the feature, exactly
// as `daily.ts` has no `brokenAt`.
//
// THE ABSOLUTE CONSTRAINT
// A share payload is seen by strangers. This device's backup code restores the
// whole profile — coins, stars, room, records — onto any device that has it
// (`cloud.ts` § restore), and every `ellaz:` key is a name for progress sitting
// on the disk. NEITHER MAY EVER TRAVEL. Two things enforce that and they are
// deliberately different in kind:
//
//   1. STRUCTURAL. The payload is CONSTRUCTED field by field from an allow-list
//      below. Nothing here spreads, serialises or iterates a piece of app state,
//      so there is no path by which a field added elsewhere arrives here.
//   2. MECHANICAL. Every string that reaches the payload passes `scrub()`, and
//      `buildShare` asserts the finished payload afterwards. A title that
//      contains a code or a storage key is REDACTED rather than refused, so the
//      failure mode is a share with a dot in it rather than a child who cannot
//      share at all.
//
// The structural half is the one that actually holds. The mechanical half is
// there because "nothing can reach here" is a claim about code somebody will
// change, and `share.test.ts` plants both leaks to prove the claim is checkable.
//
// PURE. No DOM, no storage, no clock of its own — the caller says which day it
// is, through `shareDay.ts`, which is split out because the HOME SCREEN has to
// ask "was this played today?" and the home screen is the shell. The picture
// lives in `portal/shareCard.ts`, the rasteriser in `portal/shareCardRender.ts`,
// and the sheet in `portal/ShareSheet.tsx`.

/** One game, played on the day being shared. */
export interface DayPlay {
  gameId: string;
  /** Already resolved to the reader's language by the caller (`textFor`). */
  title: string;
  /** The game's own glyph. Sanctioned here — see the note above `SEPARATOR`. */
  emoji?: string;
  /**
   * Today's result, ALREADY FORMATTED by the caller through `formatScore`.
   *
   * A string rather than `{ value, unit }` on purpose: `score.ts` owns how a
   * unit reads, and there must be exactly one answer to "is 12750 fast or
   * good". A second formatter here would be a second answer.
   */
  result?: string;
}

/**
 * One day. There is no field for a second one, and that is the product law
 * ("today's result only") expressed as a type rather than as a convention.
 */
export interface ShareDay {
  /** `YYYY-MM-DD` in the DEVICE's timezone — see `localDay` in `shareDay.ts`. */
  date: string;
  plays: DayPlay[];
}

/**
 * The words. Passed in, because a policy module has no business holding prose.
 *
 * Each label is a COMPLETE phrase in its own language, never a fragment this
 * module joins to another. The first draft built the headline as
 * `${today} ${appName}`, which is "Today I played Ellaz" in English and
 * "היום שיחקתי אלז" in Hebrew - a missing preposition, and the kind of defect
 * that only shows up in the language nobody on the team reads. The brand goes
 * inside `invite`, written out per language.
 */
export interface ShareLabels {
  /** "Today I played" / "היום שיחקתי" */
  today: string;
  /** "Come and play on Ellaz" / "בואו לשחק גם אתם באלז" */
  invite: string;
}

/**
 * What leaves the device. Every field is listed here, and that list IS the
 * allow-list — adding one is a deliberate edit to this interface.
 */
export interface SharePayload {
  /** The day, kept so a caller can label the card. Never a range. */
  date: string;
  /** One line: what this is. */
  headline: string;
  /** One line per game, capped. `"🐍 Snake · 1:12"`. */
  items: string[];
  /** The closing line. */
  invite: string;
  /** The whole message body, ready for `navigator.share({ text })`. */
  text: string;
  /** Where to send them. Always the public site, never a device-scoped URL. */
  url: string;
}

/**
 * How many games one card and one chat message can carry before both stop
 * being readable. Past this the count is shown as a bare `+3`, which needs no
 * translation and carries no words.
 */
export const MAX_ITEMS = 5;

/**
 * A title longer than this is not a title. Capping is fail-closed rather than
 * cosmetic: everything downstream draws into a fixed-width bar, and a crafted
 * 4,000-character game name would otherwise decide the layout.
 */
const MAX_TITLE = 40;

/**
 * Emoji are SANCTIONED IN THIS FILE and nowhere else nearby.
 *
 * The house rule is "never emojis in product output, SVG only"
 * (`~/.claude/rules/global/never-use-em-dash.md` § Sibling Hard Laws), and it is
 * right about UI chrome: an emoji cannot be styled, sizes unpredictably and
 * renders differently on every OS. A share message is the one place where none
 * of that applies — it is plain text landing in somebody else's chat app, which
 * draws it with ITS font, and a bare list of game names reads as spam. The
 * operator sanctioned it for this surface specifically. The CARD still draws
 * `gameArt` SVG rather than a glyph, for the original reason.
 */
const SEPARATOR = " · ";

/**
 * A backup code, as `backupCode.ts` writes one: eight Crockford base32
 * characters as `XXXX-XXXX`.
 *
 * WRITTEN OUT HERE RATHER THAN IMPORTED, and the reason is chunking, not
 * laziness: `backupCode.ts` is pinned into the lazy `cloud` chunk by
 * `vite.config.ts`, so importing it would drag the whole backup client behind
 * this module. `share.test.ts` pins the pattern against real output from
 * `makeBackupCode`, so the two cannot drift apart in silence.
 *
 * NO `\b` ANCHORS, and that is a fix rather than sloppiness. A word boundary
 * requires a non-word character before the code, so `snakeABCD-EFGH` — a code
 * glued straight onto a title — has no boundary at the `eA` seam and slips
 * through a `\b`-anchored pattern entirely. The bisect test below caught that
 * on the first run with the anchors in place.
 *
 * Case-insensitive, and unanchored means it can also fire on an innocent
 * hyphenated title of the right shape (`Race-2048` matches; `Word-Play` does
 * not, because the excluded letters I/L/O/U rule out most English). That
 * over-match is the correct direction for a REFUSAL guarding a child's whole
 * profile: a false positive puts a `•••` in one shared message, a false
 * negative hands a stranger the room. The control in `share.test.ts` runs every
 * real catalog title through it, so a title that starts tripping this shows up
 * as a red build rather than as a puzzled parent.
 */
const BACKUP_CODE_RE = /[0-9ABCDEFGHJKMNPQRSTVWXYZ]{4}-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{4}/gi;

/**
 * Any storage key in this app's namespace: the profile, the identity, a record,
 * a session snapshot, the streak. Matching the NAMESPACE rather than a list of
 * keys is what makes this hold for a key nobody has invented yet.
 */
const STORAGE_KEY_RE = /ellaz:[\w.:-]*/gi;

/** What a redaction looks like. Visible on purpose — a silent drop reads as a bug. */
const REDACTED = "•••";

/** Does this string carry something that must never leave the device? */
export function containsSecret(value: string): boolean {
  // `lastIndex` is stateful on a /g regex, so these are reset rather than
  // trusted. A shared /g regex silently answering `false` on every second call
  // is exactly the shape of a guard that reads correct and never fires.
  BACKUP_CODE_RE.lastIndex = 0;
  STORAGE_KEY_RE.lastIndex = 0;
  return BACKUP_CODE_RE.test(value) || STORAGE_KEY_RE.test(value);
}

/**
 * The mechanical half. Redacts rather than refuses, so a player with an odd
 * game title still gets to share something.
 */
export function scrub(value: string): string {
  return value.replace(STORAGE_KEY_RE, REDACTED).replace(BACKUP_CODE_RE, REDACTED);
}

/**
 * A title: flattened, SCRUBBED, then capped. The order is the whole point.
 *
 * Capping first would cut a code that straddles the boundary into `ABCD-EF`,
 * which no longer matches the pattern — so six of its eight characters would
 * survive both the scrubber AND `assertShareSafe`, which is a leak wearing a
 * green check. Scrubbing first leaves nothing for the cap to bisect, and the
 * worst it can then truncate is a `•••`.
 */
function safeTitle(value: string): string {
  const flat = scrub(value.replace(/\s+/g, " ").trim());
  return flat.length > MAX_TITLE ? `${flat.slice(0, MAX_TITLE - 1)}…` : flat;
}

/**
 * The payload. Built field by field; nothing here reads state it was not given.
 *
 * Returns `undefined` for a day with nothing in it. That is the honest answer
 * and it is also the one that keeps the button off the screen: a share card
 * saying "today I played nothing" is worse than no button.
 */
export function buildShare(
  day: ShareDay,
  labels: ShareLabels,
  url: string,
): SharePayload | undefined {
  const plays = day.plays.filter((p) => p.title.trim() !== "");
  if (plays.length === 0) return undefined;

  const shown = plays.slice(0, MAX_ITEMS);
  const items = shown.map((p) => {
    const head = p.emoji ? `${p.emoji} ${safeTitle(p.title)}` : safeTitle(p.title);
    return p.result ? `${head}${SEPARATOR}${scrub(p.result)}` : head;
  });
  // A bare `+3` rather than a sentence: it reads in every language this app
  // speaks and needs no entry in eleven dictionaries.
  if (plays.length > shown.length) items.push(`+${plays.length - shown.length}`);

  const headline = scrub(labels.today.trim());
  const invite = scrub(labels.invite.trim());
  const safeUrl = scrub(url.trim());

  const payload: SharePayload = {
    date: scrub(day.date),
    headline,
    items,
    invite,
    text: [headline, ...items, `${invite} ${safeUrl}`].join("\n"),
    url: safeUrl,
  };

  // The belt, checked after the braces. If this ever throws, the structural
  // guarantee above was broken by an edit somewhere and the right answer is a
  // loud failure rather than a share that quietly carries a code.
  assertShareSafe(payload);
  return payload;
}

/**
 * Walks every string in a finished payload. Exported so a caller assembling a
 * card or a filename can hold itself to the same bar.
 *
 * Deliberately a THROW rather than a boolean: this is the last gate before
 * something leaves the device, and a boolean is a gate somebody forgets to read.
 */
export function assertShareSafe(payload: SharePayload): void {
  const strings = [payload.date, payload.headline, payload.invite, payload.text, payload.url]
    .concat(payload.items)
    .filter((v) => typeof v === "string");
  for (const value of strings) {
    if (containsSecret(value)) {
      // The offending text is NOT quoted in the message. An error string ends
      // up in a console, a log and a bug report, which is three more places the
      // code would then exist.
      throw new Error("share payload carries a storage key or a backup code");
    }
  }
}
