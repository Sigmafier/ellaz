import { describe, expect, it } from "vitest";
import { GAMES } from "../portal/games";
import {
  artSvgSized,
  OG_HEIGHT,
  OG_WIDTH,
  ogCardTree,
  ogImageFile,
  ogImagePath,
  toVisualOrder,
} from "./ogCard";
import { OG_ROUTES, ROUTES } from "./routes";
import { CANONICAL_LOCALE } from "../i18n/locales";

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
  it("names one card per page, all distinct", () => {
    const names = OG_ROUTES.map(ogImageFile);
    expect(new Set(names).size).toBe(names.length);
  });

  it("covers every route except the 404", () => {
    expect(OG_ROUTES.length).toBe(ROUTES.length - ROUTES.filter((r) => r.kind === "notFound").length);
    expect(OG_ROUTES.some((r) => r.kind === "notFound")).toBe(false);
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
    const tree = ogCardTree(heSnake, snake, "data:image/png;base64,AA==");
    const bar = tree.props.children as Array<{ props: { children: unknown } }>;
    const texts = JSON.stringify(bar);
    expect(texts).toContain(toVisualOrder(snake.title.he, "he"));
    expect(texts).not.toContain(snake.title.he);
  });

  it("omits the art node when there is no rasterised art, rather than half-drawing one", () => {
    const withArt = JSON.stringify(ogCardTree(heSnake, snake, "data:image/png;base64,AA=="));
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
