import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createReporter, MAX_SHOT } from "./send";
import { captureContext, MAX_SESSION_BYTES, type ReportEnv } from "./context";

/* Found by /deep-test 2026-09-02, category C6.
   ===========================================================================
   The throttle id is a minute stamp and the rules block compares it to
   `request.time` within +/-2 minutes. It was computed from the DEVICE's clock,
   so a tablet 3 minutes out was refused on every report it would ever send -
   and the sheet answers a 403 with "That did not send. Try again?", which
   resends a byte-identical id. Three taps produced one id and three 403s.

   A guard's clock is the only clock worth stamping with, so the minute now
   comes off the `Date` header of the auth call we already make. */

const draft = { kind: "bug" as const, reason: "broke", ctx: { at: 1 } };
const store = { read: () => null, write: () => true };
const SERVER = 1_700_000_000_000;

function serverLike(seen: string[], withDate: boolean) {
  const headers = { get: (h: string) => (withDate && h === "date" ? new Date(SERVER).toUTCString() : null) };
  return async (url: string) => {
    if (url.includes("accounts:signUp") || url.includes("securetoken"))
      return { ok: true, status: 200, headers, json: async () => ({ localId: "u1", idToken: "t", refreshToken: "r" }) } as never;
    const id = new URL(url, "https://x").searchParams.get("documentId") ?? "";
    seen.push(id);
    // The rules block, verbatim.
    const drift = Math.abs(Number(id) - Math.floor(SERVER / 60000));
    return { ok: drift <= 2, status: drift <= 2 ? 200 : 403, headers, json: async () => ({}) } as never;
  };
}
const send = (skewMin: number, withDate = true, seen: string[] = []) =>
  createReporter({ fetchImpl: serverLike(seen, withDate) as never, now: () => SERVER + skewMin * 60_000, store }).send(draft);

describe("a device with a wrong clock can still report", () => {
  it("sends at every skew, including four hours slow", async () => {
    for (const m of [0, 1, 2, 3, 4, 30, -240]) {
      expect(await send(m).then((o) => (o.ok ? "ok" : o.why)), `${m} min skew`).toBe("ok");
    }
  });

  it("stamps the SERVER's minute, not the device's", async () => {
    const seen: string[] = [];
    await send(30);
    await send(30, true, seen);
    expect(seen).toEqual([String(Math.floor(SERVER / 60000))]);
  });

  it("CONTROL - without the server's Date the old cliff returns at 3 minutes", async () => {
    // Proves these cells can fail: the fix is the header, not the harness.
    expect(await send(2, false).then((o) => o.ok)).toBe(true);
    expect(await send(3, false).then((o) => (o.ok ? "ok" : o.why))).toBe("refused");
  });

  it("a missing or malformed Date falls back to the local clock rather than throwing", async () => {
    expect((await send(0, false)).ok).toBe(true);
    const bad = async (url: string) => {
      const headers = { get: () => "not-a-date" };
      return url.includes("accounts:signUp")
        ? ({ ok: true, status: 200, headers, json: async () => ({ localId: "u", idToken: "t" }) } as never)
        : ({ ok: true, status: 200, headers, json: async () => ({}) } as never);
    };
    expect((await createReporter({ fetchImpl: bad as never, now: () => SERVER, store }).send(draft)).ok).toBe(true);
  });
});

describe("an oversized picture costs the picture, never the report", () => {
  it("MAX_SHOT matches the cap in firestore.rules", () => {
    const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
    expect(rules).toContain(`shot.size() <= ${MAX_SHOT}`);
  });

  it("the ctx a full session produces stays clear of the rules' 100,000 cap", () => {
    // Nothing else pins this: the client caps the SESSION and the rules cap the
    // SERIALISED ctx, and they are different measurements of different things.
    const big = JSON.stringify({ v: 2, at: 1, s: { p: "x".repeat(MAX_SESSION_BYTES - 100) } });
    const env: ReportEnv = {
      storage: { read: (k) => (k === "ellaz:g:session" ? big : null), keys: () => [] },
      view: { w: 390, h: 844, dpr: 3, orientation: "portrait" },
      client: { userAgent: "UA", language: "en", online: true },
      now: 1, base: "/", buildStamp: "x",
    };
    const wire = JSON.stringify(captureContext("g", env));
    expect(wire.length).toBeLessThan(100_000);
  });
});
