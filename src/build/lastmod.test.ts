import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sitemapXml } from "./siteFiles";
import { gameSources } from "./lastmod";
import { ROUTES } from "./routes";
import { GAMES } from "../portal/games";
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
 * WHICH FILES A DATE IS DERIVED FROM - the half nothing asserted, and the half
 * that was wrong.
 *
 * Every gate on lastmod until now read the EMITTER: is the field absent when
 * git cannot answer, is it inside the right `<url>`, are the dates non-uniform.
 * All of those passed while `/games/2048/` advertised the wrong date for four
 * days, because the defect was upstream of everything they look at - the page
 * asked git about a file that does not exist, `lastCommitISO` dropped the
 * missing path without a word, and the answer that came back was a real date
 * derived from the wrong sources. A plausible date is indistinguishable from a
 * correct one downstream.
 */
describe("a game page's date is derived from its own prose", () => {
  const ids = GAMES.map((g) => g.id);
  const localeDirs = readdirSync("src/content/games", { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  it("resolves the renderer and at least one prose file for every game", () => {
    const bare = ids.filter((id) => gameSources(id).length < 2);
    expect(bare).toEqual([]);
  });

  it("resolves only paths that exist - a dropped one is silent, not loud", () => {
    const missing = ids.flatMap((id) => gameSources(id).filter((p) => !existsSync(p)));
    expect(missing).toEqual([]);
  });

  it("reaches into every locale directory, so a new language is not dropped", () => {
    // Derived from the tree rather than named, because the failure this
    // prevents arrives with a directory that does not exist yet.
    expect(localeDirs.length).toBeGreaterThan(0);
    for (const dir of localeDirs) {
      const blind = ids.filter(
        (id) => !gameSources(id).some((p) => p.startsWith(`src/content/games/${dir}/`)),
      );
      expect(blind, `no ${dir}/ prose reached for these games`).toEqual([]);
    }
  });

  it("pins the game whose id is not its directory, by name", () => {
    // 28 of 29 games have id === directory, which is precisely why assuming it
    // survived review. This one does not, and both of its conventions differ.
    const paths = gameSources("2048");
    expect(paths).toContain("src/games/n2048");
    expect(paths).toContain("src/content/games/n2048.ts"); // named for the DIRECTORY
    expect(paths).toContain("src/content/games/fr/2048.ts"); // named for the ID
  });

  it("CONTROL: the assumption that shipped finds nothing for that game", () => {
    // The mutation, kept as a test rather than performed once by hand. If this
    // ever passes, `src/content/games/2048.ts` has been created and the three
    // assertions above have quietly stopped proving anything.
    expect(existsSync("src/content/games/2048.ts")).toBe(false);
  });

  it("CONTROL: resolves no prose for a name nothing is called", () => {
    // Without this, "every game resolves prose" would also pass an index that
    // matched everything - the vacuous green this repo keeps finding.
    expect(gameSources("no-such-game")).toEqual([]);
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
