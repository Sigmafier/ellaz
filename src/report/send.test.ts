import { describe, expect, it } from "vitest";
import { REPORT_KEY, createReporter, type FetchLike, type ReportStore } from "./send";

/* The transport, driven entirely through an injected fetch.
   ===========================================================================

   The assertions worth having here are the OUTCOMES, because the sheet renders
   them literally: a 409 must not read as a failure (it is the throttle working,
   and offering a retry would be a lie), and nothing may ever throw. */

function memStore(seed: Record<string, string> = {}): ReportStore {
  const bag = { ...seed };
  return { read: (k) => bag[k] ?? null, write: (k, v) => { bag[k] = v; return true; } };
}

function json(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

/** Records every call, answers by URL. */
function fakeFetch(plan: { signUp?: Response; refresh?: Response; write?: Response }) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    if (url.includes("accounts:signUp")) return plan.signUp ?? json(200, { localId: "U1", refreshToken: "R1", idToken: "T1" });
    if (url.includes("securetoken")) return plan.refresh ?? json(200, { id_token: "T2" });
    return plan.write ?? json(200, { name: "ok" });
  };
  return { impl, calls };
}

const DRAFT = { kind: "bug" as const, reason: "froze", message: "it stopped", ctx: { game: { id: "snake" } } };

describe("createReporter", () => {
  it("signs up on the first report and writes the document at the minute", async () => {
    const f = fakeFetch({});
    const store = memStore();
    const r = createReporter({ fetchImpl: f.impl, store, now: () => 1_700_000_040_000 });
    const out = await r.send(DRAFT);

    expect(out).toEqual({ ok: true, id: "U1/28333334" });
    const write = f.calls.at(-1)!;
    expect(write.url).toContain("/reports/U1/items?documentId=28333334");
    // The identity is kept, so the NEXT report is throttled against the same key.
    expect(JSON.parse(store.read(REPORT_KEY)!)).toEqual({ uid: "U1", refreshToken: "R1" });
  });

  it("sends ctx as a STRING, because the rule that bounds it cannot size a map", async () => {
    const f = fakeFetch({});
    const r = createReporter({ fetchImpl: f.impl, store: memStore(), now: () => 1 });
    await r.send(DRAFT);
    const body = JSON.parse(String(f.calls.at(-1)!.init!.body));
    expect(typeof body.fields.ctx.stringValue).toBe("string");
    expect(JSON.parse(body.fields.ctx.stringValue)).toEqual({ game: { id: "snake" } });
  });

  it("omits the optional fields rather than sending empty ones", async () => {
    const f = fakeFetch({});
    const r = createReporter({ fetchImpl: f.impl, store: memStore(), now: () => 1 });
    await r.send({ kind: "idea", ctx: {} });
    const body = JSON.parse(String(f.calls.at(-1)!.init!.body));
    expect(Object.keys(body.fields).sort()).toEqual(["at", "ctx", "kind"]);
  });

  it("reuses a stored identity instead of signing up again", async () => {
    const f = fakeFetch({});
    const store = memStore({ [REPORT_KEY]: JSON.stringify({ uid: "OLD", refreshToken: "R9" }) });
    const r = createReporter({ fetchImpl: f.impl, store, now: () => 1 });
    const out = await r.send(DRAFT);
    expect(out.ok).toBe(true);
    expect(f.calls.some((c) => c.url.includes("accounts:signUp"))).toBe(false);
    expect(f.calls.at(-1)!.url).toContain("/reports/OLD/items");
  });

  it("calls a 409 the throttle, not a failure, and says how long", async () => {
    const f = fakeFetch({ write: json(409, { error: { status: "ALREADY_EXISTS" } }) });
    // At t=1ms the current minute stamp is 0, so the next one begins at
    // 60_000 and the wait is 59_999ms. Asserted as arithmetic on the clock
    // rather than as a magic number, so a change to either end shows up here.
    const now = 1;
    const r = createReporter({ fetchImpl: f.impl, store: memStore(), now: () => now });
    expect(await r.send(DRAFT)).toEqual({
      ok: false,
      why: "throttled",
      waitMs: (Math.floor(now / 60_000) + 1) * 60_000 - now,
    });
  });

  it("measures the wait on the SERVER clock, not this device's", async () => {
    // `fakeFetch` replies with a Date header, which `serverClock` reads. A
    // phone whose own clock is an hour out must still be told the right number
    // of seconds - that is the entire reason the outcome carries a duration
    // rather than a deadline.
    const f = fakeFetch({ write: json(409, { error: { status: "ALREADY_EXISTS" } }) });
    const wrongByAnHour = 1_700_000_040_000 + 3_600_000;
    const r = createReporter({ fetchImpl: f.impl, store: memStore(), now: () => wrongByAnHour });
    const out = await r.send(DRAFT);
    expect(out.ok).toBe(false);
    if (out.ok === false && out.why === "throttled") {
      // Whatever the two clocks say, a wait is always inside one minute.
      expect(out.waitMs).toBeGreaterThan(0);
      expect(out.waitMs).toBeLessThanOrEqual(60_000);
    } else {
      throw new Error(`expected a throttle, got ${JSON.stringify(out)}`);
    }
  });

  it("calls a 403 refused, so the sheet does not offer a pointless retry", async () => {
    const f = fakeFetch({ write: json(403, { error: {} }) });
    const r = createReporter({ fetchImpl: f.impl, store: memStore(), now: () => 1 });
    expect(await r.send(DRAFT)).toEqual({ ok: false, why: "refused" });
  });

  it("never throws, whatever the network does", async () => {
    const impl: FetchLike = async () => { throw new Error("ERR_INTERNET_DISCONNECTED"); };
    const r = createReporter({ fetchImpl: impl, store: memStore(), now: () => 1 });
    expect(await r.send(DRAFT)).toEqual({ ok: false, why: "failed" });
  });

  it("recovers when a stored refresh token has gone stale", async () => {
    const f = fakeFetch({ refresh: json(400, { error: {} }) });
    const store = memStore({ [REPORT_KEY]: JSON.stringify({ uid: "OLD", refreshToken: "DEAD" }) });
    const r = createReporter({ fetchImpl: f.impl, store, now: () => 1 });
    const out = await r.send(DRAFT);
    // A dead identity is worth nothing, so it mints a new one rather than
    // losing the report.
    expect(out).toEqual({ ok: true, id: "U1/0" });
    expect(f.calls.some((c) => c.url.includes("accounts:signUp"))).toBe(true);
  });

  it("survives storage that refuses to keep the identity", async () => {
    const f = fakeFetch({});
    const store: ReportStore = { read: () => null, write: () => false };
    const r = createReporter({ fetchImpl: f.impl, store, now: () => 1 });
    expect((await r.send(DRAFT)).ok).toBe(true);
  });
});
