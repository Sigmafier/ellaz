import { describe, expect, it } from "vitest";
import { MAX_SESSION_BYTES, MAX_UA, captureContext, type ReportEnv } from "./context";

/* The capture, and the one test that matters most.
   ===========================================================================

   A report is the first thing this app sends that a person composed, from a
   device that may belong to a five-year-old. So the interesting assertions here
   are not "does it carry the level" - they are the NEGATIVE ones: the planted
   backup code, the planted profile, the planted stranger key. Each is a real
   value in the fake storage, and each must be absent from the SERIALISED
   payload, because a field nested three levels down is still sent.

   Serialising and searching the string is deliberate. Asserting
   `ctx.game.code === undefined` only proves the field you thought of is
   missing; searching the JSON proves the VALUE is not anywhere, including in a
   key nobody has written yet. */

const CODE = "7QF4-2KDM";
const UID = "kR3vNq8sTuVwXyZa01";

function env(over: Partial<ReportEnv> = {}): ReportEnv {
  const bag: Record<string, string> = {
    // The things a report is allowed to read.
    "ellaz:snake:session": JSON.stringify({ v: 2, at: 1_700_000_000_000, s: { score: 40 } }),
    "ellaz:snake:level": JSON.stringify("hard"),
    // EXACTLY the bytes the app writes, which is the whole point: `App.tsx`
    // does `setItem(key, "en")`, `themes.ts` writes a bare theme id, and
    // `audio.ts` writes "1"/"0". The first version of this fixture used
    // JSON.stringify for all three, so the fixture agreed with the reader and
    // both disagreed with the app - and every real report shipped
    // `App | ? - ? -` (issue #20) while these tests were green.
    "ellaz:theme": "market",
    "ellaz:muted": "0",
    "ellaz:locale": "en",
    // The things it must never read. All three are real shapes.
    "ellaz:cloud:v1": JSON.stringify({ uid: UID, refreshToken: "AMf-vBxSECRET", code: CODE }),
    "ellaz:profile:v1": JSON.stringify({ v: 1, coins: 412, stars: 30, name: { adj: "swift", noun: "tiger" } }),
    "some-other-app:token": "bearer-abc123",
    ...(over.storage ? {} : {}),
  };
  return {
    storage: {
      read: (k) => bag[k] ?? null,
      keys: () => Object.keys(bag),
    },
    view: { w: 390, h: 844, dpr: 3, orientation: "portrait" },
    client: { userAgent: "Mozilla/5.0 (Linux; Android 14)", language: "en-GB", online: true },
    now: 1_700_000_060_000,
    base: "/",
    buildStamp: "13840666dff557ae",
    ...over,
  };
}

describe("captureContext", () => {
  it("carries the facts that let a bug be reproduced", () => {
    const ctx = captureContext("snake", env());
    expect(ctx.game?.id).toBe("snake");
    expect(ctx.game?.level).toBe("hard");
    expect(ctx.game?.session).toEqual({ v: 2, at: 1_700_000_000_000, s: { score: 40 } });
    // The player has been on this board for a minute.
    expect(ctx.game?.sessionAgeMs).toBe(60_000);
    expect(ctx.view).toEqual({ w: 390, h: 844, dpr: 3, orientation: "portrait" });
    expect(ctx.app.buildStamp).toBe("13840666dff557ae");
    // The three that silently arrived as undefined on every real report until
    // 2026-09-02, because they are stored as PLAIN strings and were read with
    // JSON.parse. Asserting the values - not just "defined" - is what pins it:
    // an undefined here reads as "the player never set it", which is a legal
    // state, so a looser assertion would have passed on the bug too.
    expect(ctx.app.locale).toBe("en");
    expect(ctx.app.theme).toBe("market");
    expect(ctx.app.muted).toBe(false);
  });

  it("reads muted as a boolean either way, and drops a value that is not ours", () => {
    // "1"/"0" is audio.ts's encoding. `false` must survive as false rather than
    // collapsing into undefined - "the player un-muted" and "the player never
    // touched it" are different facts and the issue prints both.
    const withMute = (v: string | null) => {
      const e = env();
      e.storage = { read: (k) => (k === "ellaz:muted" ? v : null), keys: () => [] };
      return captureContext(undefined, e).app.muted;
    };
    expect(withMute("0")).toBe(false);
    expect(withMute("1")).toBe(true);
    // "true" is not our encoding, and JSON.parse would have accepted it - so
    // this cell also fails if anyone reaches for readJson here again.
    expect(withMute("true")).toBeUndefined();
    expect(withMute(null)).toBeUndefined();
  });

  it("NEVER carries the backup code, the uid, or the refresh token", () => {
    const wire = JSON.stringify(captureContext("snake", env()));
    expect(wire).not.toContain(CODE);
    expect(wire).not.toContain(UID);
    expect(wire).not.toContain("AMf-vBxSECRET");
  });

  it("NEVER carries the profile, or any key it was not asked for", () => {
    const wire = JSON.stringify(captureContext("snake", env()));
    expect(wire).not.toContain("412");
    expect(wire).not.toContain("swift");
    expect(wire).not.toContain("bearer-abc123");
  });

  it("reads by name and never enumerates storage", () => {
    // A capture that walks every key is one shop item away from sending the
    // whole profile. The allowlist is the design; this pins it.
    let enumerated = false;
    const e = env();
    const ctx = captureContext("snake", {
      ...e,
      storage: { read: e.storage.read, keys: () => { enumerated = true; return []; } },
    });
    expect(enumerated).toBe(false);
    expect(ctx.game?.level).toBe("hard");
  });

  it("drops an oversized session rather than truncating it", () => {
    const huge = JSON.stringify({ v: 1, at: 1, s: "x".repeat(MAX_SESSION_BYTES + 10) });
    const e = env();
    const ctx = captureContext("snake", {
      ...e,
      storage: {
        read: (k) => (k === "ellaz:snake:session" ? huge : e.storage.read(k)),
        keys: e.storage.keys,
      },
    });
    // Absent, not half a board - a truncated snapshot is invalid JSON that
    // replays as a corrupt game rather than as "no snapshot".
    expect(ctx.game?.session).toBeUndefined();
    expect(ctx.game?.sessionDropped).toBe("too-big");
  });

  it("bounds the user agent", () => {
    const e = env();
    const ctx = captureContext("snake", {
      ...e,
      client: { ...e.client, userAgent: "U".repeat(MAX_UA + 500) },
    });
    expect(ctx.client.userAgent.length).toBe(MAX_UA);
  });

  it("survives storage that throws, and a game that is not playing", () => {
    const e = env();
    const ctx = captureContext(undefined, {
      ...e,
      storage: {
        read: () => { throw new Error("SecurityError"); },
        keys: () => { throw new Error("SecurityError"); },
      },
    });
    expect(ctx.game).toBeUndefined();
    expect(ctx.view.w).toBe(390);
  });

  it("keeps a session whose stored JSON is junk out of the payload", () => {
    const e = env();
    const ctx = captureContext("snake", {
      ...e,
      storage: { read: (k) => (k === "ellaz:snake:session" ? "{not json" : e.storage.read(k)), keys: e.storage.keys },
    });
    expect(ctx.game?.session).toBeUndefined();
    expect(ctx.game?.sessionDropped).toBe("unreadable");
  });
});
