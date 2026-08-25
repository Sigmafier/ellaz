import { describe, it, expect } from "vitest";
import { mulberry32 } from "@shared/rng";
import { makeBackupCode } from "@sdk/backupCode";
import { PROFILE_KEY } from "@sdk/index";
import { CARD_SIZE, emojiFree, resolveVars, shareCardSvg } from "./shareCard";
import { cardFileName, toShareFile } from "./shareCardRender";

const base = { headline: "Today I played Ellaz", lines: ["Snake"], url: "https://ellaz.fun/", rtl: false };

describe("the card is a DOCUMENT, not the fragment the grid inlines", () => {
  it("declares the SVG namespace, or a browser refuses to decode it at all", () => {
    // `gameArt` emits a fragment meant to be inlined into HTML, where the
    // namespace is implied. As a standalone document handed to an <img> it is
    // not an SVG - the image fires onerror and the share silently loses its
    // picture. Same trap `artSvgSized` names for resvg.
    expect(shareCardSvg(base)).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("is square, because this is a picture sent INTO a chat", () => {
    const svg = shareCardSvg(base);
    expect(svg).toContain(`width="${CARD_SIZE}" height="${CARD_SIZE}"`);
  });

  it("leaves no CSS var() for a rasteriser to paint black", () => {
    // Every gameArt scene ends with fill:var(--art-veil,transparent). An <img>
    // is an isolated document with no :root, so the property never resolves and
    // the rect falls back to the SVG initial fill - BLACK, full bleed, over the
    // whole drawing. A plausible picture with no error anywhere.
    const svg = shareCardSvg({ ...base, artId: "snake" });
    expect(svg).not.toContain("var(");
    expect(svg).toContain("transparent");
  });

  it("throws on a var() with no fallback rather than drawing a black square", () => {
    expect(() => resolveVars('<rect style="fill:var(--nope)"/>')).toThrow(/paints that black/);
  });

  it("draws no foreignObject, which would taint the canvas and break toBlob", () => {
    expect(shareCardSvg({ ...base, artId: "snake" })).not.toContain("foreignObject");
  });

  it("references nothing off-device - no font, no image, no external anything", () => {
    // The Poki rule, and also the tainted-canvas rule: a single external
    // reference makes toBlob throw a SecurityError at the last step.
    const svg = shareCardSvg({ ...base, artId: "snake" });
    // The xmlns is a NAMESPACE NAME, not an address - nothing fetches it. It
    // is dropped before the check rather than allowed by the pattern, so the
    // pattern stays a plain "no URLs" rather than a list of exceptions that
    // someone extends until it means nothing.
    const withoutNamespace = svg.replace('xmlns="http://www.w3.org/2000/svg"', "");
    expect(withoutNamespace).not.toMatch(/https?:\/\/(?!ellaz\.fun)/);
    expect(svg).not.toContain("@font-face");
    expect(svg).not.toContain("fonts.googleapis");
    expect(svg).not.toContain("<image");
  });
});

describe("Hebrew, and the trap that is INVERTED here", () => {
  it("hands the browser the LOGICAL order and lets it do the bidi", () => {
    // `src/build/ogCard.ts` reorders with bidi-js because satori and resvg lay
    // <text> out in logical order. A browser implements UAX#9 - so reordering
    // here would reverse an already-correct string and rasterise "נחש" as
    // "שחנ", which is the exact failure the build path exists to avoid. The
    // fix there is the bug here.
    const svg = shareCardSvg({ ...base, lines: ["נחש"], rtl: true });
    expect(svg).toContain(">נחש<");
    expect(svg).not.toContain(">שחנ<");
  });

  it("declares the paragraph direction instead", () => {
    expect(shareCardSvg({ ...base, rtl: true })).toContain("direction:rtl");
    expect(shareCardSvg({ ...base, rtl: false })).toContain("direction:ltr");
  });

  it("aligns to the reading edge", () => {
    expect(shareCardSvg({ ...base, rtl: true })).toContain('text-anchor="end"');
    expect(shareCardSvg({ ...base, rtl: false })).toContain('text-anchor="start"');
  });

  it("keeps the URL left-to-right even on a Hebrew card", () => {
    // An address is not prose. A Hebrew paragraph direction moves its slashes
    // and dots, and somebody would then type what they read.
    const svg = shareCardSvg({ ...base, rtl: true });
    const url = svg.slice(svg.indexOf("https://ellaz.fun/") - 400);
    expect(url).toContain("direction:ltr");
  });
});

describe("nothing that restores a profile reaches the picture either", () => {
  it("refuses a card carrying a backup code", () => {
    // The SECOND exit. `buildGameInvite` guards the text; this guards the picture.
    // A guard on one exit only is how the other one ships.
    const code = makeBackupCode(mulberry32(42));
    expect(() => shareCardSvg({ ...base, lines: [`Snake ${code}`] })).toThrow(
      /storage key or a backup code/,
    );
    expect(() => shareCardSvg({ ...base, headline: code })).toThrow();
    expect(() => shareCardSvg({ ...base, url: `https://ellaz.fun/?c=${code}` })).toThrow();
  });

  it("refuses a card carrying a storage key", () => {
    expect(() => shareCardSvg({ ...base, lines: [PROFILE_KEY] })).toThrow();
  });

  it("puts only the DATE in the file name a stranger sees", () => {
    // A file name travels with the picture into somebody else's phone, which
    // makes it exactly the kind of place a device id gets attached by accident.
    expect(cardFileName("2026-08-13")).toBe("ellaz-2026-08-13.png");
    expect(cardFileName("ellaz:profile:v1")).toBe("ellaz-today.png");
    expect(cardFileName("../../etc/passwd")).toBe("ellaz-today.png");
  });

  it("still builds a normal card, so the refusals above are not just a wall", () => {
    // The positive control. Without it every assertion here is satisfied by a
    // function that throws on everything.
    const svg = shareCardSvg({ ...base, artId: "snake", lines: ["Snake", "Sudoku"] });
    expect(svg).toContain(">Snake<");
    expect(svg).toContain(">Sudoku<");
    expect(svg).toContain(">https://ellaz.fun/<");
  });
});

describe("text with no font to measure against", () => {
  it("clips a long title rather than drawing it off the card", () => {
    // Nothing here can measure text: there is no font loaded and no layout
    // engine to ask. A cap is the honest substitute for a fit.
    const svg = shareCardSvg({ ...base, lines: ["x".repeat(80)] });
    expect(svg).toContain("…");
    expect(svg).not.toContain("x".repeat(40));
  });

  it("gives the URL a longer cap, because a clipped address is a lie", () => {
    const long = "https://sigmafier.github.io/ellaz/";
    expect(shareCardSvg({ ...base, url: long })).toContain(`>${long}<`);
  });

  it("escapes, so a title with an ampersand does not break the document", () => {
    expect(shareCardSvg({ ...base, lines: ["Ben & Jerry"] })).toContain(">Ben &amp; Jerry<");
    expect(shareCardSvg({ ...base, lines: ["<script>"] })).not.toContain("<script>");
  });

  it("draws a flat bar for a game with no art rather than an empty box", () => {
    expect(() => shareCardSvg({ ...base, artId: "no-such-game" })).not.toThrow();
  });
});

describe("emoji belong in the message, not in the picture", () => {
  it("strips the leading glyph a share line carries", () => {
    // Colour-emoji rendering inside an SVG drawn to a canvas is inconsistent
    // across engines, and the failure is tofu boxes in a picture somebody has
    // already sent. The card draws gameArt instead.
    expect(emojiFree("🐍 Snake")).toBe("Snake");
    expect(emojiFree("🔢 2048")).toBe("2048");
    expect(emojiFree("🧩 מה בא אחר כך?")).toBe("מה בא אחר כך?");
  });

  it("leaves the `+3` overflow line alone", () => {
    // The trap: a pattern that strips leading non-letters also eats the `+`,
    // turning "three more games" into "the number three".
    expect(emojiFree("+3")).toBe("+3");
  });

  it("never returns an empty string", () => {
    expect(emojiFree("🐍")).toBe("🐍");
    expect(emojiFree("Snake")).toBe("Snake");
  });
});

describe("the File a chat app is handed", () => {
  it("exists in this environment, so the guard below is a real branch", () => {
    const file = toShareFile(new Blob(["x"], { type: "image/png" }), "2026-08-13");
    expect(file?.name).toBe("ellaz-2026-08-13.png");
    expect(file?.type).toBe("image/png");
  });
});
