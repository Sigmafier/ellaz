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
describe("the analytics tag", () => {
  it("is on every route the primary host emits, except the 404", () => {
    const missing = ROUTES.filter(
      (r) => r.kind !== "notFound" && !renderRoute(r, "/").includes(GA_MEASUREMENT_ID),
    );
    expect(missing.map((r) => r.path)).toEqual([]);
    // The positive control. An empty ROUTES table, or a renderRoute that threw
    // and was caught somewhere, would satisfy the assertion above by vacuum.
    expect(ROUTES.length).toBeGreaterThan(100);
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
      if (kind === "notFound") continue; // its own test, above
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
