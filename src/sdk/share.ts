// Sharing - turning ONE GAME into an invite a parent can send, and nothing else.
//
// Fourth sibling of economy.ts, score.ts and session.ts, and the same shape: a
// screen reports WHAT IT IS and this module alone decides what may leave the
// device. A caller cannot hand it a score, a streak, a lifetime total or a
// history, because there is no field for one - `GameInvite` holds a game id, a
// title and a glyph. The absence of those fields is the feature, exactly as
// `daily.ts` has no `brokenAt`.
//
// It used to be a DAILY DIGEST, keyed on a `ShareDay`, sent from the home
// screen. Operator ruling 2026-08-25 retired both halves: "the share card in
// homepage shouldmove from here. we should add per game share options instead",
// and, asked what a per-game share should carry, "An invite - just the game."
// `buildShare`, `ShareDay`, `DayPlay` and `shareDay.ts` were DELETED in the same
// change rather than left beside this - two payload builders, one wired and one
// not, is `.claude/rules/... no-half-migrated-duplicate-systems`.
//
// THE ABSOLUTE CONSTRAINT
// A share payload is seen by strangers. This device's backup code restores the
// whole profile - coins, stars, room, records - onto any device that has it
// (`cloud.ts` § restore), and every `ellaz:` key is a name for progress sitting
// on the disk. NEITHER MAY EVER TRAVEL. Two things enforce that and they are
// deliberately different in kind:
//
//   1. STRUCTURAL. The payload is CONSTRUCTED field by field from an allow-list
//      below. Nothing here spreads, serialises or iterates a piece of app state,
//      so there is no path by which a field added elsewhere arrives here.
//   2. MECHANICAL. Every string that reaches the payload passes `scrub()`, and
//      `buildGameInvite` asserts the finished payload afterwards. A title that
//      contains a code or a storage key is REDACTED rather than refused, so the
//      failure mode is a share with a dot in it rather than a child who cannot
//      share at all.
//
// The structural half is the one that actually holds. The mechanical half is
// there because "nothing can reach here" is a claim about code somebody will
// change, and `share.test.ts` plants both leaks to prove the claim is checkable.
//
// PURE. No DOM, no storage, no clock at all - which is the shape the day payload
// could never have. The picture lives in `portal/shareCard.ts`, the rasteriser
// in `portal/shareCardRender.ts`, and the sheet in `portal/ShareSheet.tsx`.

/**
 * What leaves the device. Every field is listed here, and that list IS the
 * allow-list — adding one is a deliberate edit to this interface.
 */
export interface SharePayload {
  /**
   * The day, kept so a caller can label the card. Never a range.
   *
   * OPTIONAL since the per-game invite landed: an invite is not about a day at
   * all, and a `""` standing in for one is a value every downstream reader has
   * to remember to special-case. `assertShareSafe` already filters non-strings,
   * so absence costs the guard nothing.
   */
  date?: string;
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
 * A title longer than this is not a title. Capping is fail-closed rather than
 * cosmetic: everything downstream draws into a fixed-width bar, and a crafted
 * 4,000-character game name would otherwise decide the layout.
 */
const MAX_TITLE = 40;

/**
 * Emoji are SANCTIONED IN THIS FILE and nowhere else nearby.
 *
 * The house rule is "never emojis in product output, SVG only", and it is right
 * about UI chrome: an emoji cannot be styled, sizes unpredictably and renders
 * differently on every OS. A share message is the one place where none of that
 * applies - it is plain text landing in somebody else's chat app, which draws it
 * with ITS font, and a bare game name reads as spam. The operator sanctioned it
 * for this surface specifically. The CARD still draws `gameArt` SVG rather than
 * a glyph, for the original reason.
 */

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

/** One game, offered to somebody who has never been here. */
export interface GameInvite {
  gameId: string;
  /** Already resolved to the reader's language by the caller. */
  title: string;
  /** The game's own glyph. Sanctioned here - see the note above `SEPARATOR`. */
  emoji?: string;
}

/**
 * The words for an invite. Complete phrases per language, never fragments this
 * module joins - the same law the daily labels carry, and for the reason
 * recorded there: a missing preposition only shows up in the language nobody on
 * the team reads.
 */
export interface InviteLabels {
  /** The platform line: "Free in your browser. No ads, no account." */
  note: string;
  /** The closing line: "Come and play on Ellaz" */
  invite: string;
}

/**
 * AN INVITE, AND NOTHING ELSE. Operator ruling 2026-08-25, asked which of two
 * shapes a per-game share should take: "An invite - just the game."
 *
 * So there is no field here for a score, a time, a record or a streak, and that
 * absence is the product decision expressed as a type rather than as a
 * convention - the same move the retired day payload made about a second day. It is also
 * what lets this work on all 34 games including `coloring`, which deliberately
 * keeps no score at all and would otherwise be the one game with nothing to
 * share.
 *
 * Returns `undefined` for a game with no title, which is the honest answer and
 * also the one that keeps a dead button off the screen.
 */
export function buildGameInvite(
  game: GameInvite,
  labels: InviteLabels,
  url: string,
): SharePayload | undefined {
  const title = safeTitle(game.title);
  if (title === "") return undefined;

  const headline = game.emoji ? `${game.emoji} ${title}` : title;
  const note = scrub(labels.note.trim());
  const invite = scrub(labels.invite.trim());
  const safeUrl = scrub(url.trim());

  const payload: SharePayload = {
    headline,
    items: note === "" ? [] : [note],
    invite,
    text: [headline, note, `${invite} ${safeUrl}`].filter((l) => l !== "").join("\n"),
    url: safeUrl,
  };

  // Same belt the day payload carried, and it is not ceremonial here either: the title
  // arrives from a game's own meta, which is exactly the string `safeTitle`
  // exists to scrub, and the URL is built by the caller.
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
