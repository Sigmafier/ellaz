import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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
    // DELIBERATE POISON. These three keys are here and they hold the WRONG
    // answers, because nothing may read them any more: locale, theme and mute
    // come from the runtime now. A reader that fell back to storage would
    // report French, night and muted, and the assertions below would name it.
    //
    // Their history is worth keeping. They were read from storage until
    // 2026-09-03, first with `JSON.parse` (which throws on `"en"`, so all
    // three arrived undefined - issue #20) and then raw, which fixed the case
    // where the key EXISTS. It never exists for an ordinary player: `App.tsx`
    // writes the locale only on a language change, `theme.ts` only on a theme
    // change, `audio.ts` only on a mute tap. Measured on the built artifact
    // 2026-09-03, a real send carried `app: { base, buildStamp }` and nothing
    // else - while the sheet showed `en` beside it, off the component's prop.
    "ellaz:theme": "night",
    "ellaz:muted": "1",
    "ellaz:locale": "fr",
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
    app: { locale: "en", theme: "market", muted: false },
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
    // THE RESOLVED THREE, and the fixture's storage says the opposite of every
    // one of them on purpose - fr / night / muted. So this cell fails loudly
    // the moment anybody reads storage for these again, which is the failure it
    // exists for; asserting merely "defined" would pass on both bugs.
    expect(ctx.app.locale).toBe("en");
    expect(ctx.app.theme).toBe("market");
    expect(ctx.app.muted).toBe(false);
  });

  it("asks storage for NOTHING about the locale, the theme or the mute", () => {
    // The positive form of the cell above. A fallback - `env.app.locale ??
    // readRaw(...)` - would still pass that one when the runtime answers, and
    // would quietly resurrect the two-source split the moment it did not.
    const asked: string[] = [];
    const e = env();
    const bag = e.storage.read;
    e.storage = { read: (k) => { asked.push(k); return bag(k); }, keys: () => [] };
    captureContext("snake", e);
    expect(asked).not.toContain("ellaz:locale");
    expect(asked).not.toContain("ellaz:theme");
    expect(asked).not.toContain("ellaz:muted");
    // The CONTROL: it does still read, so an empty list would be the harness
    // failing rather than the reader behaving.
    expect(asked).toContain("ellaz:snake:session");
  });

  it("does not NAME those keys at all, which the behaviour test cannot see", () => {
    // Added because a mutation SURVIVED. `env.app.locale ?? readRaw(env,
    // "ellaz:locale")` changes nothing today - `locale` is a non-optional
    // string, so the right-hand side is unreachable and `??` short-circuits
    // before storage is ever asked. Both behaviour cells above passed it, and
    // both were right to: it is a semantic no-op.
    //
    // It is still the exact shape the two-source split grows back from, one
    // `locale?:` away from being live. So this reads the SOURCE, where a dead
    // branch is as visible as a live one. Comments stripped first - the file's
    // own history section names all three keys, and a scan that reads the
    // prose about a bug as the bug is a family this repo already collects.
    const src = readFileSync(new URL("./context.ts", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const body = src.slice(src.indexOf("export function captureContext"));
    for (const key of ["ellaz:locale", "ellaz:theme", "ellaz:muted"]) {
      expect(body, `captureContext must not name ${key}`).not.toContain(key);
    }
    // CONTROL: it does still name the keys it is allowed to read, so an empty
    // or mis-sliced body cannot pass this by containing nothing at all.
    expect(src).toContain("ellaz:${gameId}:session");
  });

  it("carries market and un-muted as VALUES, not as an absence", () => {
    // "the player never touched it" and "the player is on the default" used to
    // be the same reading - both undefined - and the first is not a fact about
    // the bug while the second is. Every report says which theme drew the
    // screen now, including the default one.
    const ctx = captureContext(undefined, env());
    expect(ctx.app.theme).toBe("market");
    expect(ctx.app.muted).toBe(false);
    expect(Object.keys(ctx.app).sort()).toEqual(
      ["base", "buildStamp", "locale", "muted", "theme"],
    );
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
