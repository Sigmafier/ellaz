import { describe, expect, it } from "vitest";
import { GAMES } from "../portal/games";
import {
  cardArt,
  montageIds,
  montageGrid,
  ogCardText,
  artSvgSized,
  OG_HEIGHT,
  OG_WIDTH,
  ogCardTree,
  ogImageFile,
  ogImagePath,
  toVisualOrder,
} from "./ogCard";
import { OG_ROUTES, ROUTES } from "./routes";
import { CANONICAL_LOCALE, PAGE_LOCALES } from "../i18n/locales";

/**
 * These tests exist because BOTH renderers in the share-card pipeline get
 * Hebrew wrong on their own, and both do it silently: a valid PNG of reversed
 * words, no error, no warning. An eyeball review passed the bug once already.
 */
describe("visual order - the whole Hebrew story", () => {
  it("reverses a pure-Hebrew word, because that is what RTL display is", () => {
    // "נחש" is nun-chet-shin. Displayed RTL, the FIRST letter sits rightmost,
    // so the paint order left-to-right is shin-chet-nun.
    expect(toVisualOrder("נחש", "he")).toBe("שחנ");
  });

  it("leaves digits alone - the case that makes naive reversal wrong", () => {
    // This is a real shipping title. Reversed character by character it would
    // read "8402", and it would have looked fine to anyone not reading closely.
    expect(toVisualOrder("2048", "he")).toBe("2048");
    expect([...GAMES].some((g) => g.title.he === "2048")).toBe(true);
  });

  it("moves a trailing question mark to the left, per UAX#9", () => {
    // The other shipping title that defeats reversal: neutral punctuation at
    // the end of an RTL run belongs on the visual LEFT.
    const visual = toVisualOrder("מה בא אחר כך?", "he");
    expect(visual.startsWith("?")).toBe(true);
    expect(visual).toBe("?ךכ רחא אב המ");
  });

  it("leaves English untouched", () => {
    expect(toVisualOrder("Big & Small", "en")).toBe("Big & Small");
    expect(toVisualOrder("Snake", "en")).toBe("Snake");
  });

  it("puts every Hebrew game title through it, not just the ones tested above", () => {
    for (const g of GAMES) {
      const visual = toVisualOrder(g.title.he, "he");
      expect(visual.length).toBe(g.title.he.length);
      // Any title with Hebrew letters must actually be reordered; one that
      // comes back identical means the algorithm did not run on it.
      if (/[֐-׿]/.test(g.title.he) && g.title.he.length > 1) {
        expect(visual).not.toBe(g.title.he);
      }
    }
  });
});

describe("the art, as a standalone document", () => {
  it("carries an xmlns, without which a rasteriser sees no root node", () => {
    expect(artSvgSized("snake")).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("carries explicit dimensions, because a rasteriser has no layout engine", () => {
    const svg = artSvgSized("snake");
    expect(svg).toContain(`width="${OG_WIDTH}"`);
    expect(svg).toContain(`height="${OG_HEIGHT}"`);
  });

  it("resolves every CSS var - an unresolved one rasterises as opaque BLACK", () => {
    // Each scene ends with `fill:var(--art-veil,transparent)`. In a browser the
    // fallback wins and the rect is invisible. A rasteriser does not implement
    // custom properties, falls back to the SVG initial fill, and paints a black
    // rectangle over the entire card. Every game, not just the one that caught it.
    for (const g of GAMES) {
      expect(artSvgSized(g.id), `${g.id} art still carries an unresolved var()`).not.toContain(
        "var(",
      );
    }
  });
});

describe("card files", () => {
  it("names one card per page, all distinct - except the packs that borrow one", () => {
    // A printable pack advertises the card of the GAME it prints, so its entry
    // in OG_ROUTES resolves to that game's name on purpose and the raw list
    // holds one duplicate per pack. The relation is asserted rather than
    // subtracted: each borrowed name must be a name a real game route already
    // produces, so a pack pointing at a card nothing writes still fails here.
    const borrowed = OG_ROUTES.filter((r) => r.path.includes("/print/"));
    const own = OG_ROUTES.filter((r) => !r.path.includes("/print/"));
    const names = own.map(ogImageFile);
    expect(new Set(names).size).toBe(names.length);
    expect(borrowed.length, "no borrowed cards - this assertion is vacuous").toBeGreaterThan(0);
    for (const r of borrowed) expect(names).toContain(ogImageFile(r));
  });

  it("covers every route except the 404 and the embeds", () => {
    // Two kinds carry no share card, for two different reasons. The 404 is not
    // a page anyone shares. An embed page is noindex and lives inside somebody
    // else's article, so the card that belongs to it is the GAME page's - a
    // second card on the same game would compete with it in every preview.
    const CARDLESS = ROUTES.filter((r) => r.kind === "notFound" || r.kind === "embed");
    expect(CARDLESS.length, "no cardless kinds - the assertion is vacuous").toBeGreaterThan(10);
    expect(OG_ROUTES.length).toBe(ROUTES.length - CARDLESS.length);
    for (const kind of ["notFound", "embed"]) {
      expect(OG_ROUTES.some((r) => r.kind === kind), kind).toBe(false);
    }
  });

  it("includes the bare-URL home page even though it does not emit a document", () => {
    // `/` is the app shell rather than a generated page, and it is also the
    // most-shared URL on the site. Filtering on `emit` would silently drop it.
    const home = OG_ROUTES.find((r) => r.kind === "home" && r.locale === CANONICAL_LOCALE);
    expect(home).toBeDefined();
    expect(home!.emit).toBe(false);
  });

  it("uses base-free paths, like every other path here", () => {
    for (const r of OG_ROUTES) expect(ogImagePath(r)).toMatch(/^\/og\/[a-z0-9-]+\.png$/);
  });
});

describe("the card tree", () => {
  const heSnake = OG_ROUTES.find((r) => r.kind === "game" && r.locale === "he" && r.id === "snake")!;
  const snake = GAMES.find((g) => g.id === "snake")!;

  it("renders the title in VISUAL order, never the logical string", () => {
    const tree = ogCardTree(heSnake, snake, ["data:image/png;base64,AA=="]);
    const bar = tree.props.children as Array<{ props: { children: unknown } }>;
    const texts = JSON.stringify(bar);
    expect(texts).toContain(toVisualOrder(snake.title.he, "he"));
    expect(texts).not.toContain(snake.title.he);
  });

  it("omits the art node when there is no rasterised art, rather than half-drawing one", () => {
    const withArt = JSON.stringify(ogCardTree(heSnake, snake, ["data:image/png;base64,AA=="]));
    const without = JSON.stringify(ogCardTree(heSnake, snake));
    expect(withArt).toContain('"img"');
    expect(without).not.toContain('"img"');
  });

  it("aligns the bar to the reading edge of the locale", () => {
    const en = OG_ROUTES.find((r) => r.kind === "game" && r.locale === "en" && r.id === "snake")!;
    expect(JSON.stringify(ogCardTree(heSnake, snake))).toContain('"alignItems":"flex-end"');
    expect(JSON.stringify(ogCardTree(en, snake))).toContain('"alignItems":"flex-start"');
  });
});

/* The four defects that shipped on 2026-08-23, each of which was invisible to
   every gate in this repo at the time. Written as ASSERTIONS ABOUT THE PICTURE
   rather than about the markup, because the markup was correct throughout:
   `og:image`, `og:title`, `og:description`, width, height and alt were all
   present and right on all 164 cards while a third of them drew nothing. */
describe("every card carries a picture, and no two draw the same one", () => {
  it("draws art on EVERY route - 32 of 164 used to draw none", () => {
    const blank = OG_ROUTES.filter(
      (r) => cardArt(r, r.id ? GAMES.find((g) => g.id === r.id) : undefined).length === 0,
    );
    expect(blank.map((r) => `${r.kind}/${r.category ?? r.id ?? ""}/${r.locale}`)).toEqual([]);
  });

  it("gives home, the room and the boards DIFFERENT words", () => {
    // These three rendered byte-identical PNGs in every language - measured,
    // sha256-equal - because world and boards fell through to `site.brand`.
    // The existing distinctness assertion compares FILE NAMES, which were
    // always distinct, so it could never have expressed this failure.
    for (const locale of PAGE_LOCALES) {
      const words = (["home", "world", "boards"] as const).map((kind) => {
        const r = OG_ROUTES.find((x) => x.kind === kind && x.locale === locale)!;
        const { title, sub } = ogCardText(r);
        return `${title}|${sub}`;
      });
      expect(new Set(words).size, `${locale}: home/world/boards share a card`).toBe(3);
    }
  });

  it("never bakes a COUNT into a card, because a scraper caches the picture", () => {
    // A card is a PNG cached on WhatsApp's and Facebook's own infrastructure
    // for weeks. `{games}` is safe in HTML because the page is rebuilt every
    // deploy; a number baked into an image goes stale in a cache this repo
    // cannot reach. Operator, 2026-08-23: "stop saying 33 games, we are going
    // to grow super fast and this number is gonna grow as we go."
    for (const route of OG_ROUTES) {
      const { title, sub } = ogCardText(route, route.id ? GAMES.find((g) => g.id === route.id) : undefined);
      // The TITLE may legitimately hold digits - "2048" is a game's name.
      // The second line is the site's own countless promise and may not.
      expect(sub, `${route.kind}/${route.locale} bakes a number into a card`).not.toMatch(/\d/);
      expect(sub).not.toContain("{games}");
      expect(title).not.toContain("{games}");
    }
  });

  it("shows a category its OWN games, never the wider roster", () => {
    for (const route of OG_ROUTES.filter((r) => r.category)) {
      const ids = montageIds(route);
      const foreign = ids.filter(
        (id) => GAMES.find((g) => g.id === id)?.category !== route.category,
      );
      expect(foreign, `${route.category} card shows ${foreign.join(", ")}`).toEqual([]);
      expect(ids.length).toBeGreaterThan(0);
    }
  });

  it("fills the grid exactly - a short last row reads as a broken render", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const { cols, rows } = montageGrid(n);
      expect(cols * rows, `${n} scenes leave a gap`).toBeGreaterThanOrEqual(n);
      expect((cols - 1) * rows, `${n} scenes fit in fewer columns`).toBeLessThan(n);
    }
  });

  it("CONTROL: the assertions can fail - a game card is one WHOLE scene", () => {
    // Without this, every assertion above passes on a build that draws
    // nothing but mosaics, or on one where `cardArt` returns a constant.
    const snake = OG_ROUTES.find((r) => r.kind === "game" && r.id === "snake" && r.locale === "en")!;
    const tiles = cardArt(snake, GAMES.find((g) => g.id === "snake"));
    expect(tiles).toHaveLength(1);
    expect(tiles[0]!.fit).toBe("meet");
    expect(tiles[0]!.w).toBe(1200);
    // and a mosaic really is many tiles, sliced
    const home = OG_ROUTES.find((r) => r.kind === "home" && r.locale === "en")!;
    expect(cardArt(home).length).toBeGreaterThan(1);
    expect(cardArt(home)[0]!.fit).toBe("slice");
  });
});
