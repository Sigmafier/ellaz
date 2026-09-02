import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GA_MEASUREMENT_ID, analyticsTag } from "./analytics";
import { ROUTES } from "./routes";
import { renderRoute } from "./pages";

/**
 * The tag has to be on EVERY document a reader can land on, and on no other
 * artifact at all. Both halves are asserted against rendered output rather than
 * against the emitter's source, because the emitter having a call site and the
 * document carrying the script are two different claims - the same distinction
 * that made the GA install itself worth verifying twice.
 */
/**
 * The kinds that carry NO tag, each for its own reason, each asserted below:
 * the 404 (a document fetches nothing eagerly) and the embed pages (they run
 * on somebody else's domain). A kind added here without its own assertion is
 * an exemption nobody checked, which is how the exclusion becomes a hole.
 */
const UNTAGGED = new Set(["notFound", "embed"]);

describe("the analytics tag", () => {
  it("is on every route the primary host emits, except the 404 and the embeds", () => {
    const missing = ROUTES.filter(
      (r) => !UNTAGGED.has(r.kind) && !renderRoute(r, "/").includes(GA_MEASUREMENT_ID),
    );
    expect(missing.map((r) => r.path)).toEqual([]);
    // The positive control. An empty ROUTES table, or a renderRoute that threw
    // and was caught somewhere, would satisfy the assertion above by vacuum.
    expect(ROUTES.length).toBeGreaterThan(100);
  });

  it("is NOT on an embed page, because it runs inside somebody else's site", () => {
    // The 404's reason is that a document fetches nothing eagerly. An embed
    // page's reason is different and stronger: it is loaded from a stranger's
    // domain, and a third-party beacon fired from their page is exactly what
    // "no external network requests" exists to prevent - the rule that lets
    // this SDK be listed on a portal at all. Two kinds, two reasons, and both
    // are asserted rather than skipped.
    const embeds = ROUTES.filter((r) => r.kind === "embed");
    expect(embeds.length, "no embed routes - the exclusion cannot be checked").toBeGreaterThan(10);
    for (const r of embeds.slice(0, 5)) {
      expect(renderRoute(r, "/"), r.path).not.toContain(GA_MEASUREMENT_ID);
    }
  });

  it("is NOT on the 404, because a document fetches nothing eagerly", () => {
    // Found by `assert-pages.mjs` on the very first run, and it was right: an
    // error page pulling a third-party script is what that rule exists to stop.
    // Asserted here as well as there, because the emitter is where somebody
    // would remove it and the gate is where somebody would notice.
    const four04 = ROUTES.find((r) => r.kind === "notFound");
    expect(four04, "no 404 route - the exclusion cannot be checked").toBeTruthy();
    expect(renderRoute(four04!, "/")).not.toContain(GA_MEASUREMENT_ID);
  });

  it("is on NO route the mirror emits", () => {
    // The GitHub Pages copy serves noindex and Disallow: / on every page. Its
    // traffic is not the product, and counting it would pollute the only
    // measurement this project has.
    const present = ROUTES.filter((r) => renderRoute(r, "/ellaz/").includes(GA_MEASUREMENT_ID));
    expect(present.map((r) => r.path)).toEqual([]);
  });

  it("covers every KIND of page, not just the numerous one", () => {
    // 33 game pages passing tells you nothing about the room, the boards, the
    // home or the 404 - and those are exactly the kinds a coverage check misses,
    // because the list of page kinds never lives in one place.
    const kinds = [...new Set(ROUTES.map((r) => r.kind))];
    expect(kinds.length).toBeGreaterThan(3);
    for (const kind of kinds) {
      if (UNTAGGED.has(kind)) continue; // each has its own test, above
      const one = ROUTES.find((r) => r.kind === kind)!;
      expect(renderRoute(one, "/"), `${kind} (${one.path})`).toContain(GA_MEASUREMENT_ID);
    }
  });

  it("sends no advertising signal, whatever the consent state", () => {
    const tag = analyticsTag("/");
    expect(tag).toContain("ad_storage:'denied'");
    expect(tag).toContain("ad_user_data:'denied'");
    expect(tag).toContain("ad_personalization:'denied'");
    expect(tag).toContain("allow_google_signals:false");
    expect(tag).toContain("allow_ad_personalization_signals:false");
    expect(tag).toContain("ads_data_redaction',true");
  });

  it("declares a consent state at all, before anything is sent", () => {
    // The order is the assertion. A `config` that runs before `consent default`
    // sends its first hit under GA's own defaults, which is the whole thing the
    // consent line exists to prevent - and it still looks completely correct.
    const tag = analyticsTag("/");
    expect(tag.indexOf("consent','default'")).toBeGreaterThan(-1);
    expect(tag.indexOf("consent','default'")).toBeLessThan(tag.indexOf("gtag('config'"));
  });

  it("is empty on any base that is not the primary host", () => {
    expect(analyticsTag("/ellaz/")).toBe("");
    expect(analyticsTag("/anything/")).toBe("");
    // ...and non-empty on the one that is, so the test above cannot pass by
    // the function simply always returning "".
    expect(analyticsTag("/")).not.toBe("");
  });
});

/*
 * The prose and the code disagreed for two days, and the prose is what people
 * read. On 2026-08-22 this file's doc comment contained one bullet saying the
 * tag ships `analytics_storage: 'granted'` and another saying it ships
 * `'denied'` - on the single question that decides whether the property reports
 * anything at all. A reader could leave with either answer, confidently, and
 * one did: a cookieless-AND-counted configuration was proposed to the operator,
 * which measurement then showed cannot exist (granting writes `_ga` even with
 * `client_storage:'none'`, verified live with a control).
 *
 * Nothing else in this repo can catch that. Every other assertion here reads
 * the RENDERED tag, and the tag was correct the whole time - it was the
 * explanation beside it that was wrong.
 */
describe("the comment and the tag agree about consent", () => {
  const source = readFileSync(new URL("./analytics.ts", import.meta.url), "utf8");
  const shipped = /analytics_storage:'(granted|denied)'\}\);/.exec(source)?.[1];

  it("ships exactly one consent state for analytics_storage", () => {
    // The positive control: if this regex ever stops matching, `shipped` is
    // undefined and every assertion below passes vacuously.
    expect(shipped, "the shipped consent literal could not be read").toBeDefined();
    expect(["granted", "denied"]).toContain(shipped);
  });

  it("has no doc bullet claiming the OTHER state", () => {
    const other = shipped === "denied" ? "granted" : "denied";
    // A bullet, not a mention: the comment discusses both words deliberately
    // (the history is the useful part). What it may not do is DECLARE the
    // other one as what the file does.
    const bullets = source
      .split("\n")
      .filter((l) => /^\s*\*\s+-\s+`analytics_storage: '/.test(l));
    expect(bullets.length, "no analytics_storage bullet found to check").toBeGreaterThan(0);
    for (const b of bullets) {
      expect(b, `a doc bullet declares '${other}' while the tag ships '${shipped}'`).not.toContain(
        `analytics_storage: '${other}'`,
      );
    }
  });

  it("says, beside the setting, that granting brings cookies back", () => {
    // The fact that decides the trade. Losing it is how the impossible middle
    // gets proposed again.
    expect(source).toMatch(/granting writes `_ga`|sets `_ga` and/);
  });
});
