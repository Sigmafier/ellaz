import { describe, it, expect } from "vitest";
import { mulberry32 } from "@shared/rng";
import { makeBackupCode } from "./backupCode";
import { CLOUD_KEY } from "./cloud";
import { PROFILE_KEY } from "./profile";
import { SCORE_KEY_PREFIX } from "./scoreboard";
import { DAILY_KEY } from "./daily";
// Test-only, and deliberately reaching UP into the portal: the point of the
// over-match control is to run the REAL catalog through the refusal, and a
// hand-written list of titles would be a second catalog that drifts.
import { GAMES } from "../portal/games";
import { SHIPPED_LOCALES } from "@i18n/locales";
import {
  MAX_ITEMS,
  assertShareSafe,
  buildShare,
  containsSecret,
  scrub,
  type DayPlay,
  type SharePayload,
} from "./share";

const LABELS = { today: "Today I played", invite: "Come and play on Ellaz" };
const URL = "https://ellaz.fun/";

const play = (over: Partial<DayPlay> = {}): DayPlay => ({
  gameId: "snake",
  title: "Snake",
  emoji: "🐍",
  ...over,
});

/** Every string a payload carries, so nothing can hide in a field nobody read. */
function everyString(payload: SharePayload): string[] {
  return [payload.date, payload.headline, payload.invite, payload.text, payload.url, ...payload.items];
}

describe("nothing that restores a profile may ever leave the device", () => {
  /**
   * THE test in this file. A backup code hands a stranger the whole profile -
   * coins, stars, room and every record - on any device they type it into
   * (`cloud.ts` § restore), and an `ellaz:` key names progress sitting on the
   * disk. A shared picture is seen by strangers.
   *
   * Mutation-proven on 2026-08-13 by making `scrub` return its input unchanged:
   * 6 of these went RED, naming the leaked code. Restored immediately after.
   */

  it("redacts a real backup code arriving through a game title", () => {
    // A REAL code from the real generator, not a hand-typed lookalike. If
    // `makeBackupCode` ever changes alphabet or shape, this is what notices.
    const code = makeBackupCode(mulberry32(7));
    const payload = buildShare(
      { date: "2026-08-13", plays: [play({ title: `Snake ${code}` })] },
      LABELS,
      URL,
    );
    expect(payload).toBeDefined();
    for (const value of everyString(payload!)) {
      expect(value, `payload string: ${value}`).not.toContain(code);
    }
  });

  it("redacts a code in EVERY field a caller can reach", () => {
    // The title is the obvious door. The result string, the labels and the URL
    // are the three nobody thinks about, and each of them is caller-supplied.
    const code = makeBackupCode(mulberry32(99));
    const payload = buildShare(
      { date: `2026-08-13 ${code}`, plays: [play({ result: `1:12 ${code}` })] },
      { today: `Today ${code}`, invite: `Play ${code}` },
      `${URL}?c=${code}`,
    );
    for (const value of everyString(payload!)) {
      expect(value, `payload string: ${value}`).not.toContain(code);
    }
  });

  it("redacts every storage key this app owns, by name", () => {
    // Named individually rather than as a pattern so a NEW key added elsewhere
    // has to be added here too - and imported from its owner, so a rename
    // cannot leave this test asserting about a key that no longer exists.
    for (const key of [PROFILE_KEY, CLOUD_KEY, DAILY_KEY, `${SCORE_KEY_PREFIX}easy`]) {
      const payload = buildShare(
        { date: "2026-08-13", plays: [play({ title: `Snake ${key}` })] },
        LABELS,
        URL,
      );
      for (const value of everyString(payload!)) {
        expect(value, `${key} in: ${value}`).not.toMatch(/ellaz:/i);
      }
    }
  });

  it("catches a code the CAP would otherwise bisect into a survivable fragment", () => {
    // The ordering trap inside `safeTitle`. The cap is 40 and a code is 9
    // characters, so 32 characters of padding put the cut ONE CHARACTER from
    // the end of the code: cap-then-scrub leaves `XXXX-XX`, seven of the eight
    // code characters, matching no pattern and therefore passing both the
    // scrubber and `assertShareSafe` - a leak with a green check.
    //
    // The padding is exact rather than generous. At 36 the cut lands three
    // characters in and the fragment is short enough to look harmless, which
    // is how the first version of this test passed over the planted defect.
    const code = makeBackupCode(mulberry32(3));
    const padding = "x".repeat(32);
    const payload = buildShare(
      { date: "2026-08-13", plays: [play({ title: `${padding}${code}` })] },
      LABELS,
      URL,
    );
    const joined = everyString(payload!).join("\n");
    // The whole code, and also the fragment a cap would have left behind.
    expect(joined).not.toContain(code);
    expect(joined).not.toContain(code.slice(0, 7));
  });

  it("recognises 200 real codes, so the local pattern cannot drift from the generator", () => {
    // `share.ts` writes the code pattern out rather than importing
    // `backupCode.ts`, because that module is pinned into the lazy `cloud`
    // chunk. This is what keeps the copy honest.
    for (let seed = 0; seed < 200; seed += 1) {
      const code = makeBackupCode(mulberry32(seed));
      expect(containsSecret(code), code).toBe(true);
      expect(scrub(code), code).not.toContain(code);
    }
  });

  it("still refuses on the second call, which a stateful /g regex would not", () => {
    // `lastIndex` on a shared /g regex makes `test()` answer false on every
    // other call. A guard that fires once and then goes quiet reads exactly
    // like a guard that works.
    const code = makeBackupCode(mulberry32(11));
    expect(containsSecret(code)).toBe(true);
    expect(containsSecret(code)).toBe(true);
    expect(containsSecret(PROFILE_KEY)).toBe(true);
    expect(containsSecret(PROFILE_KEY)).toBe(true);
  });

  it("throws rather than returning a boolean nobody reads", () => {
    const code = makeBackupCode(mulberry32(5));
    const forged: SharePayload = {
      date: "2026-08-13",
      headline: "Today I played Ellaz",
      items: [`🐍 Snake ${code}`],
      invite: "Come and play",
      text: "Today I played Ellaz",
      url: URL,
    };
    expect(() => assertShareSafe(forged)).toThrow(/storage key or a backup code/);
  });

  it("does not quote the secret in the error it throws", () => {
    // An error message reaches a console, a log and a bug report. Quoting the
    // code there would be three more places it exists.
    const code = makeBackupCode(mulberry32(13));
    try {
      assertShareSafe({
        date: "2026-08-13",
        headline: "h",
        items: [],
        invite: "i",
        text: code,
        url: URL,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(String(err)).not.toContain(code);
    }
  });

  it("catches a code glued straight onto a title, with no space to anchor on", () => {
    // The `\b` trap. A word boundary needs a NON-word character before the
    // code, so `snakeABCD-EFGH` has no boundary at the `eA` seam and a
    // `\b`-anchored pattern misses it completely. Found by the bisect test
    // above on its first honest run, not reasoned about in advance.
    const code = makeBackupCode(mulberry32(21));
    expect(containsSecret(`snake${code}`)).toBe(true);
    const payload = buildShare(
      { date: "2026-08-13", plays: [play({ title: `snake${code}` })] },
      LABELS,
      URL,
    );
    expect(everyString(payload!).join("\n")).not.toContain(code);
  });

  it("leaves every real game title in the catalog untouched", () => {
    // The control on the over-match the unanchored pattern buys. A refusal
    // this broad WILL eventually fire on an innocent hyphenated title, and
    // this is what makes that a red build rather than a puzzled parent.
    for (const meta of GAMES) {
      for (const locale of SHIPPED_LOCALES) {
        const title = meta.title[locale];
        expect(scrub(title), `${meta.id}.${locale}`).toBe(title);
      }
    }
  });

  it("leaves an ordinary title completely alone", () => {
    // The positive control, and it is what stops all of the above being
    // satisfied by a scrubber that simply blanks everything.
    const payload = buildShare(
      { date: "2026-08-13", plays: [play({ title: "2048", emoji: "🔢", result: "1:12" })] },
      LABELS,
      URL,
    );
    expect(payload!.items).toEqual(["🔢 2048 · 1:12"]);
    expect(payload!.url).toBe(URL);
    expect(payload!.text).toContain("Come and play on Ellaz https://ellaz.fun/");
  });
});

describe("one day, and there is nowhere to put a second", () => {
  it("says nothing at all for a day with no plays", () => {
    // Not an empty card. A share saying "today I played nothing" is worse than
    // no button, and `undefined` is what keeps the button off the screen.
    expect(buildShare({ date: "2026-08-13", plays: [] }, LABELS, URL)).toBeUndefined();
  });

  it("drops a play with no name rather than shipping a blank line", () => {
    expect(
      buildShare({ date: "2026-08-13", plays: [play({ title: "   " })] }, LABELS, URL),
    ).toBeUndefined();
  });

  it("caps the list and counts the rest as a bare number", () => {
    const plays = Array.from({ length: MAX_ITEMS + 3 }, (_, i) =>
      play({ gameId: `g${i}`, title: `Game ${i}` }),
    );
    const payload = buildShare({ date: "2026-08-13", plays }, LABELS, URL);
    expect(payload!.items).toHaveLength(MAX_ITEMS + 1);
    // `+3` needs no entry in eleven dictionaries and reads in all of them.
    expect(payload!.items.at(-1)).toBe("+3");
  });

  it("carries no field a streak, a total or a history could live in", () => {
    // The structural half of the guarantee, asserted rather than described.
    // The product decision is "today's result only"; this is that decision
    // expressed as a shape, so a future caller has nowhere to put a streak.
    const payload = buildShare({ date: "2026-08-13", plays: [play()] }, LABELS, URL)!;
    expect(Object.keys(payload).sort()).toEqual(
      ["date", "headline", "invite", "items", "text", "url"].sort(),
    );
  });

  it("names one day and never a range", () => {
    const payload = buildShare({ date: "2026-08-13", plays: [play()] }, LABELS, URL)!;
    expect(payload.date).toBe("2026-08-13");
  });
});
