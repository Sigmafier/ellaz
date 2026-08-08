import { describe, expect, it } from "vitest";
import { sitemapXml } from "./siteFiles";
import { ROUTES } from "./routes";
import { parseSitemap, urlsToSubmit } from "../../scripts/indexnow.mjs";

/**
 * `<lastmod>` is only worth having while it is accurate. An inaccurate one is
 * worse than none, because the signal gets discounted and does not come back -
 * so most of what is pinned here is the ABSENCE of a guess.
 */
describe("sitemap lastmod", () => {
  const indexable = ROUTES.filter((r) => r.indexable);

  it("omits the field entirely when git could not answer", () => {
    // The honest failure. A sitemap with no lastmod is valid and is exactly
    // what this site shipped until now.
    expect(sitemapXml()).not.toContain("<lastmod>");
    expect(sitemapXml(new Map())).not.toContain("<lastmod>");
  });

  it("emits one only for the routes it actually has a date for", () => {
    const one = indexable[0];
    const xml = sitemapXml(new Map([[one.path, "2026-08-04T11:02:24+03:00"]]));
    expect((xml.match(/<lastmod>/g) ?? []).length).toBe(1);
    expect(xml).toContain("<lastmod>2026-08-04T11:02:24+03:00</lastmod>");
  });

  it("puts lastmod inside the same <url> as its <loc>, not adrift", () => {
    const one = indexable[0];
    const xml = sitemapXml(new Map([[one.path, "2026-08-04T11:02:24+03:00"]]));
    const block = xml.match(/<url>[\s\S]*?<\/url>/)![0];
    expect(block).toContain("<lastmod>");
    expect(block).toContain(one.path === "/" ? "<loc>https://ellaz.fun/</loc>" : one.path);
  });

  it("still emits every indexable route when no dates are supplied", () => {
    expect((sitemapXml().match(/<url>/g) ?? []).length).toBe(indexable.length);
  });
});

/**
 * IndexNow submits what CHANGED. Resubmitting all 48 on every deploy is the
 * "everything changed today" noise lastmod exists to avoid, one layer out.
 */
describe("indexnow url selection", () => {
  const NOW = Date.parse("2026-08-08T12:00:00Z");
  const entries = [
    { loc: "https://ellaz.fun/games/snake/", lastmod: "2026-08-08T10:00:00Z" },
    { loc: "https://ellaz.fun/games/sudoku/", lastmod: "2026-08-01T10:00:00Z" },
    { loc: "https://ellaz.fun/world/", lastmod: "2026-08-07T23:00:00Z" },
  ];

  it("submits only what moved inside the window", () => {
    const { urls } = urlsToSubmit(entries, 48, NOW);
    expect(urls).toEqual([
      "https://ellaz.fun/games/snake/",
      "https://ellaz.fun/world/",
    ]);
  });

  it("submits nothing when nothing changed - the point of filtering", () => {
    expect(urlsToSubmit(entries, 1, NOW).urls).toEqual([]);
  });

  it("falls back to everything when the sitemap carries no dates, and SAYS so", () => {
    const undated = entries.map((e) => ({ ...e, lastmod: "" }));
    const { urls, reason } = urlsToSubmit(undated, 48, NOW);
    expect(urls.length).toBe(3);
    expect(reason).toContain("no <lastmod>");
  });

  it("ignores an unparseable date rather than treating it as fresh", () => {
    const bad = [{ loc: "https://ellaz.fun/x/", lastmod: "not-a-date" }];
    expect(urlsToSubmit(bad, 48, NOW).urls).toEqual([]);
  });

  it("parses loc and lastmod out of a real sitemap shape", () => {
    const xml = sitemapXml(new Map([["/", "2026-08-08T10:00:00+03:00"]]));
    const parsed = parseSitemap(xml);
    expect(parsed.length).toBe(ROUTES.filter((r) => r.indexable).length);
    expect(parsed.find((p) => p.loc === "https://ellaz.fun/")?.lastmod).toBe(
      "2026-08-08T10:00:00+03:00",
    );
    // Every other row has no date, and must parse as empty rather than undefined.
    expect(parsed.every((p) => typeof p.lastmod === "string")).toBe(true);
  });
});
