import { describe, it, expect } from "vitest";
import { gamePage } from "./gamePage";
import { boardsPage, homePage, worldPage } from "./sitePages";
import { GAMES } from "../portal/games";
import { snake as snakeContent } from "../content/games/snake";
import { DOCUMENT_CSS } from "./layout";

/**
 * The three screens that hold a playable surface - a game, the room, the
 * boards - wear ONE header, carrying PLATFORM controls only, with the game's
 * own controls below it.
 *
 * Nothing mechanical else keeps any of that true. The header is a string built
 * at build time and the game panel is React, so a control drifting from one to
 * the other type-checks, renders and passes every other test in this repo. And
 * the three screens are emitted by three different functions, so a control
 * added to one of them is invisible from the other two.
 *
 * The specific things being prevented, both of which shipped:
 *
 * - FOUR ways home in one viewport on a game page (a wordmark, a back arrow,
 *   the breadcrumb's Home link and a house button in the row below), and a
 *   header with no width for the game's own name because it was carrying game
 *   controls.
 * - THREE different bars across one product - tinted on a game, transparent
 *   and floating over the room, a white document row on the boards - so "how
 *   do I get home", "where are my coins" and "how do I mute" each had a
 *   different answer per screen, and the room's answers were drawn inside the
 *   scene rather than in any header at all.
 *
 * See .claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md
 */
const meta = GAMES.find((g) => g.id === "snake")!;
const site = { locale: "en" as const, games: GAMES, base: "/", indexable: true };

const PAGES = {
  game: gamePage({ meta, copy: snakeContent.copy.en, locale: "en", base: "/", all: GAMES, indexable: true }),
  world: worldPage(site),
  boards: boardsPage(site),
};
const headerOf = (html: string) => html.slice(html.indexOf("<header"), html.indexOf("</header>"));

/**
 * The UTILITY ROW, which is now part of this file's population.
 *
 * Full screen moved out of the header and onto this row on 2026-08-21 (the
 * operator's call - `mockups/mobile-header.html` draws it there). It is still
 * platform chrome, so the thing this file exists to protect is unchanged:
 * one control, one place, the same place on all three screens. What changed is
 * WHICH row that place is - so the assertions moved down here rather than
 * being deleted, which is the difference between a decision and a regression.
 *
 * Sliced to the row's own div, so a `.ubtn` anywhere else on the page - and
 * a game page has none, but that is not something this test may assume -
 * cannot answer for it.
 */
const urowOf = (html: string) => {
  const start = html.indexOf('<div class="urow"');
  const stage = html.indexOf("<div class=\"stage", start);
  return html.slice(start, stage === -1 ? start + 4000 : stage);
};

/**
 * The header's SHAPE: the ordered list of what it draws, with the words taken
 * out. Two screens whose headers reduce to the same string offer the same
 * controls in the same order, whatever they are called.
 */
function shape(html: string): string {
  return (headerOf(html).match(/<(a|b|button|div|span)\b[^>]*/g) ?? [])
    .map((tag) => {
      const cls = /class="([^"]*)"/.exec(tag)?.[1] ?? "";
      const data = (tag.match(/data-[a-z]+/g) ?? []).join(",");
      const id = /id="([^"]*)"/.exec(tag)?.[1] ?? "";
      return [tag.slice(1).split(/[\s>]/)[0], cls, data, id].filter(Boolean).join(".");
    })
    .join(" | ");
}

describe.each(Object.entries(PAGES))("the %s screen's header", (_name, html) => {
  const header = headerOf(html);

  it("names the screen", () => {
    expect(header).toContain('class="gname"');
  });

  it("offers exactly ONE way home", () => {
    // Counted on DESTINATION, not on the anchor count. Since 2026-08-25 the
    // bar also holds the language sheet, which is three more <a> - and every
    // one of them points at THIS page in another language, so none of them is
    // a second way home. The anchor count was 1 and is now 4; the number that
    // has to stay 1 is how many of them leave for somewhere else.
    // An alternate carries `hreflang`; a way out does not. That attribute is
    // the discriminator rather than a class name, because it is the thing
    // that MAKES the link a translation of this page.
    const tags = header.match(/<a\b[^>]*>/g) ?? [];
    expect(tags.length, "the header holds no links at all").toBeGreaterThan(0);
    const alternates = tags.filter((t) => /hreflang=/.test(t));
    const ways = tags.filter((t) => !/hreflang=/.test(t));
    expect(ways.length, `the header should hold one non-alternate link, home: ${ways}`).toBe(1);
    // The control. Without it this passes on a build that lost the language
    // sheet entirely - which is the state the operator reported.
    expect(alternates.length, "the header lost its language alternates").toBe(3);
    expect(header).toContain('class="hbtn home"');
  });

  it("draws that one as an arrow AND a house, so it says where it goes", () => {
    const home = header.slice(header.indexOf('class="hbtn home"'));
    const paths = home.slice(0, home.indexOf("</a>")).match(/<path\b/g) ?? [];
    // the arrow is one path; the house is three
    expect(paths.length).toBeGreaterThanOrEqual(4);
  });

  it("holds the wallet", () => {
    expect(header).toContain('id="wallet-slot"');
  });

  it("holds mute, emitted hidden so it is never drawn in the wrong state", () => {
    expect(header).toMatch(/data-sound[^>]*hidden/);
  });

  it("no longer holds full screen - that moved DOWN to the utility row", () => {
    // Not a deletion. The negative here is only meaningful beside the
    // positive in the next block, which finds it on the row below; on its
    // own this assertion passes just as well on a build that lost the
    // button entirely.
    expect(header).not.toContain("data-fullscreen");
  });

  it("labels mute, because it is glyph-only", () => {
    const tag = header.slice(header.indexOf("data-sound") - 200, header.indexOf("data-sound") + 200);
    expect(tag, "data-sound needs an aria-label").toContain("aria-label");
  });

  it("holds no GAME control", () => {
    // Restart and difficulty are in the game panel. Neither means anything on
    // the room screen or the boards, which is the test that sorts them.
    expect(header).not.toContain("data-restart");
    expect(header).not.toContain("data-difficulty");
  });

  it("no longer carries the wordmark or the tagline, which a screen is not", () => {
    expect(header).not.toContain('class="brand"');
    expect(header).not.toContain('class="tagline"');
  });

  it("is scoped by a body class derived from the chrome it carries", () => {
    // `class="screen"` is what every header rule hangs off. A page carrying
    // the chrome and not the class renders the bar with none of its styling -
    // a row of unstyled links on an otherwise perfect page - so the two come
    // from one condition in `bodyClass`, not from two fields.
    expect(html).toMatch(/<body class="screen"/);
  });

  it("keeps the breadcrumb OUT of the bar, in the utility row above the stage", () => {
    // Not in the header: a breadcrumb is not platform chrome, and a bar that
    // has to look identical on three screens cannot carry a per-page string.
    //
    // Not below the stage either, which is where it went the day the utility
    // row was deleted - restart went with it, into the game panel, where a
    // fourth 56px cell wrapped the panel's one row onto two lines in 25 of 33
    // games. The row is what makes that row fit.
    expect(html).not.toContain("pagerow");
    expect(header).not.toContain('class="bc"');
    const row = html.indexOf('class="urow"');
    const crumb = html.indexOf('class="bc"');
    const stage = html.indexOf('class="stage');
    expect(row, "the screen should have a utility row").toBeGreaterThan(-1);
    expect(crumb, "the breadcrumb belongs inside it").toBeGreaterThan(row);
    expect(stage, "and the stage comes after both").toBeGreaterThan(crumb);
  });
});

describe("the utility row carries the game's own control, and only there", () => {
  const gameRow = PAGES.game.slice(
    PAGES.game.indexOf('class="urow"'),
    PAGES.game.indexOf('class="stage'),
  );

  it("gives a GAME page pause and restart, both hidden until a game mounts", () => {
    for (const d of ["data-pause", "data-restart"]) {
      expect(gameRow, `${d} belongs in the utility row`).toContain(d);
    }
    expect(gameRow).toContain("aria-label");
    // Hidden, like data-sound and data-fullscreen: the build cannot know
    // whether a game ever mounts, and a restart that restarts nothing is the
    // same dead control as a full-screen button on a browser with no API.
    // Pause is hidden on the 31 games that never pass one, too.
    expect(gameRow).toContain("hidden");
  });

  it("puts pause BEFORE restart, so the mid-run button is not the destructive one", () => {
    expect(gameRow.indexOf("data-pause")).toBeLessThan(gameRow.indexOf("data-restart"));
  });

  it("ships pause's BOTH labels, because the runtime cannot read the page copy", () => {
    // The runtime may not import `src/content` - that would put every word of
    // every page into the precached shell - so a button whose label changes
    // with its state has to carry both strings with it.
    expect(gameRow).toContain("data-label-pause");
    expect(gameRow).toContain("data-label-resume");
  });

  it("gives the room and the boards NEITHER, because neither has a game", () => {
    // The positive control for the tests above. Without it, an emitter that
    // stopped drawing the buttons anywhere would pass every assertion here.
    for (const html of [PAGES.world, PAGES.boards]) {
      expect(html).not.toContain("data-restart");
      expect(html).not.toContain("data-pause");
    }
  });

  it("keeps them out of the header on every screen", () => {
    for (const html of Object.values(PAGES)) {
      expect(headerOf(html)).not.toContain("data-restart");
      expect(headerOf(html)).not.toContain("data-pause");
    }
  });
});

describe("the three screens are the SAME header", () => {
  it("draws the same controls in the same order", () => {
    const [game, world, boards] = [shape(PAGES.game), shape(PAGES.world), shape(PAGES.boards)];
    expect(world).toBe(game);
    expect(boards).toBe(game);
    // A positive control: the shape has to be capable of DISAGREEING, or three
    // identical empty strings pass this for ever. The home page is the same
    // document renderer with no screen chrome at all.
    expect(shape(homePage(site))).not.toBe(game);
  });

  it("tints each one from its OWN ground, so the same bar is not the same colour", () => {
    const grounds = Object.values(PAGES).map((h) => /<header[^>]*--g:([^;"]+)/.exec(h)?.[1]);
    expect(grounds.every(Boolean), "every screen emits --g on its header").toBe(true);
    expect(new Set(grounds).size, "three screens, three grounds").toBe(3);
  });
});

describe.each(Object.entries(PAGES))("the %s screen's utility row", (_name, html) => {
  const urow = urowOf(html);

  it("exists at all", () => {
    // The positive control for the negatives below. Every assertion in this
    // block passes vacuously on an empty string, which is what a renamed
    // class would hand it.
    expect(urow, "no utility row was found on this screen").toContain('class="urow"');
    expect(urow).toContain('class="bc"');
  });

  it("carries full screen, emitted hidden so it is never drawn dead on iOS", () => {
    expect(urow).toMatch(/data-fullscreen[^>]*hidden/);
  });

  it("labels it, because it is glyph-only", () => {
    // Math.max, because the room and the boards pass no `tools` and the
    // button lands within 200 characters of the row's start - and a NEGATIVE
    // slice index counts from the END, so the unclamped version handed this
    // assertion the wrong 400 characters of a correct page and failed on two
    // screens out of three. A window that can silently address the wrong
    // region is the same family as every other instrument in this repo that
    // could not express the failure it was looking for.
    const at = urow.indexOf("data-fullscreen");
    const tag = urow.slice(Math.max(0, at - 200), at + 200);
    expect(tag, "data-fullscreen needs an aria-label").toContain("aria-label");
  });

  it("draws it LAST, at the far edge, after any game control", () => {
    // The acked mock puts expand at the end of the row, and it is also the
    // one button here nobody reaches for mid-run. A game page has pause and
    // restart before it; the room and the boards have nothing before it.
    const buttons = urow.match(/data-(pause|restart|fullscreen)\b/g) ?? [];
    expect(buttons[buttons.length - 1]).toBe("data-fullscreen");
  });
});

describe("full screen is in ONE place on all three screens", () => {
  it("is on the utility row of every screen and in no header", () => {
    // The whole rule in one assertion: a platform control the player has to
    // hunt for is the failure this file was written about, and it does not
    // matter which row it is on as long as it is the same row every time.
    for (const [name, html] of Object.entries(PAGES)) {
      expect(headerOf(html), `${name}'s header`).not.toContain("data-fullscreen");
      expect(urowOf(html), `${name}'s utility row`).toContain("data-fullscreen");
    }
  });
});

describe("a document is NOT a screen", () => {
  it("leaves the home page its wordmark row and no screen chrome", () => {
    const home = homePage(site);
    expect(home).not.toMatch(/<body class="screen"/);
    expect(home).not.toContain("data-fullscreen");
    expect(home).not.toContain('class="hbtn home"');
  });
});

/**
 * MUTE TRAVELS WITH THE WALLET, and this is a pin rather than a nicety.
 *
 * The bar is `space-between` over four items, and `.gname` is `display:none`
 * under 720px - so on a phone the three survivors are spread evenly and mute
 * lands in the DEAD CENTRE of the bar, touching neither group. It shipped that
 * way and was reported as "the sound button just sits in the center".
 *
 * What makes it worth a test: on a DESKTOP it looks perfect. `.gname` is
 * `flex:1 1 0` there and eats the free space, so the two platform controls are
 * already adjacent and an auto margin resolves to zero. The defect exists in
 * exactly the viewport nobody writing the CSS is looking at, and no assertion
 * in this file - or any other here - reads a phone-width RENDER.
 */
describe("the trailing group sits at the far edge, not in the middle of the bar", () => {
  const declarations = DOCUMENT_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

  it("pushes it to the far edge with an auto margin on whichever control LEADS", () => {
    // THE MARGIN MOVED, 2026-08-25, and the reason is the whole point of this
    // block: the language globe joined the group in front of mute, so the
    // rule that used to fix the bug now leaves the GLOBE stranded mid-bar
    // instead. The fix does not stay fixed by staying still.
    //
    // Both rules are asserted. The bare [data-sound] one still holds a page
    // with no translations to offer, and dropping it would be a silent
    // regression on exactly the page nobody screenshots.
    expect(declarations, "the globe does not lead the trailing group").toMatch(
      /body\.screen \.top \.lang\{[^}]*margin-inline-start:\s*auto/,
    );
    expect(declarations, "mute lost its fallback auto margin").toMatch(
      /body\.screen \.top \[data-sound\]\{[^}]*margin-inline-start:\s*auto/,
    );
    // And mute must GIVE IT UP when the globe is there, or two auto margins
    // split the free space between them and both controls end up adrift.
    expect(declarations, "two auto margins would split the free space").toMatch(
      /\.lang \+ \[data-sound\]\{[^}]*margin-inline-start:\s*0/,
    );
  });

  it("uses a LOGICAL margin, so Hebrew flips it for free", () => {
    // margin-left would strand it in the centre of an RTL bar and pass every
    // assertion above it. There is no second rule for RTL and there must not
    // be one - a direction-specific pair is two things to keep in step.
    for (const re of [
      /body\.screen \.top \.lang\{([^}]*)\}/,
      /body\.screen \.top \[data-sound\]\{([^}]*)\}/,
    ]) {
      const m = re.exec(declarations);
      expect(m, `the rule ${re} is missing`).not.toBeNull();
      expect(m![1]).not.toMatch(/margin-left|margin-right/);
    }
  });

  it("hangs it on the BUTTON, which is the element the runtime reveals", () => {
    // A wrapper div would work and would be a second thing to keep in step
    // with the `hidden` attribute - the button is emitted hidden because the
    // build cannot know whether this player is muted.
    expect(PAGES.game).toMatch(/<button[^>]*data-sound[^>]*hidden/);
  });

  it("orders the group globe, then mute, then the wallet", () => {
    // Source order decides what is INSIDE the group; the auto margin above
    // decides where the group sits. Both matter, and the coins pill keeps the
    // corner because it is the thing a child looks for.
    //
    // Scoped to the HEADER, and that is what makes it a test at all: read
    // against the whole document it is vacuous, because `.lang`, `data-sound`
    // and `wallet-wrap` are all SELECTORS in the stylesheet emitted into
    // <head>, hundreds of lines above the markup, so every order passes.
    // Found by planting the swap and watching the document-scoped version
    // survive it.
    const header = headerOf(PAGES.game);
    const lang = header.indexOf('class="lang"');
    const sound = header.indexOf("data-sound");
    const wallet = header.indexOf("wallet-wrap");
    expect(lang, "the language globe is not in the header").toBeGreaterThan(-1);
    expect(sound, "mute is not in the header").toBeGreaterThan(-1);
    expect(wallet, "the wallet is not in the header").toBeGreaterThan(-1);
    expect(lang).toBeLessThan(sound);
    expect(sound).toBeLessThan(wallet);
  });

  it("still draws mute BEFORE the wallet, so the pair reads mute-then-coins", () => {
    // The auto margin decides where the group sits; source order decides what
    // is inside it. Both matter: the coins pill is the thing a child looks
    // for, so it keeps the corner.
    //
    // Scoped to the HEADER, and that is the whole test. Read against the
    // document it is vacuous: `wallet-wrap` is also a selector in the
    // stylesheet emitted into <head>, so the first hit is hundreds of lines
    // above the markup and every order passes. Found by planting the swap and
    // watching this survive.
    const header = headerOf(PAGES.game);
    expect(header).toContain("data-sound");
    expect(header).toContain("wallet-wrap");
    expect(header.indexOf("data-sound")).toBeLessThan(header.indexOf("wallet-wrap"));
  });
});

describe("the breadcrumb on the utility row", () => {
  /* Declarations only. Every colour word below also appears in the comment
     explaining it, and a matcher that cannot tell those apart either fails on
     its own documentation or passes on the real thing. */
  const declarations = DOCUMENT_CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = (() => {
    const m = /body\.screen \.urow \.bc\{([^}]*)\}/.exec(declarations);
    expect(m, "the utility row's breadcrumb rule is missing").not.toBeNull();
    return m![1];
  })();

  it("is PLAIN TEXT, not a pill", () => {
    // The operator's call, 2026-08-23, and the shape the APPROVED build
    // (dist-g1) actually carries - the comment that used to sit over this rule
    // claimed the pill WAS the approved arrangement, and it was believed for
    // three days. Measured before deciding: the same three words are 181px as
    // a pill against 147px plain, and the chip read 16.39:1 against the row,
    // the loudest object on a screen, for something that is not a control.
    expect(rule).not.toMatch(/border-radius/);
    expect(rule).not.toMatch(/padding:/);
    expect(rule).not.toMatch(/background/);
  });

  it("takes its colour from the theme by INHERITING it, never a literal", () => {
    // The trap a fill carried: a hardcoded dark chip with cream text is a dark
    // chip on a DARK ground for everyone on the night theme - legible in
    // exactly one of the two, which is what the pause cover carries a comment
    // about. Plain text inherits `.bc{color:var(--doc-soft)}`, so it cannot
    // pick a side; the only way to get that wrong again is to type a colour.
    expect(rule, "a literal colour is legible in one theme only").not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(rule).not.toMatch(/color:/);
    expect(declarations, "the crumb must still have an ink to inherit").toMatch(
      /\.bc\{[^}]*color:var\(--doc-soft\)/,
    );
  });

  it("gives the link the row's own ink", () => {
    // The page's brand pink on this ground is the one combination here that is
    // actually unreadable, and "Home" is a link. Colour therefore cannot be
    // what says which words are tappable - the underline is.
    expect(declarations).toMatch(/body\.screen \.urow \.bc a\{[^}]*color:inherit/);
  });
});

/**
 * The screen's name is HIDDEN on a phone, never removed from the document.
 *
 * The bar was saying the name twice inside 104px of chrome on the narrowest
 * screen we serve - once in `.gname` and again as the last crumb of the
 * breadcrumb one row below - so the phone hides `.gname`. Every screen keeps
 * its name in its `<h1>`, its `<title>`, its breadcrumb and its JSON-LD.
 *
 * The hide MUST be a media query. An emitter branch would look identical in a
 * phone browser and would drop the name out of the HTML a crawler receives,
 * which is a real cost paid for a layout decision - and nothing in this repo
 * would notice, because every gate here reads a document that was built at one
 * width. Responsive hiding is not cloaking; not emitting it is a different
 * thing entirely.
 */
describe("the header's name is hidden on a phone and still in the document", () => {
  const NARROW = /@media \(max-width:719px\)\{body\.screen \.gname\{display:none\}\}/;

  it("hides it under 720, in CSS", () => {
    expect(DOCUMENT_CSS, "the phone still draws the name in the bar").toMatch(NARROW);
  });

  it("still EMITS it on all three screens", () => {
    for (const [name, html] of Object.entries(PAGES)) {
      expect(html, `${name} stopped emitting .gname`).toContain('class="gname"');
    }
  });

  it("and the name is on the page for a crawler regardless", () => {
    // The reason hiding it is free: three other places say it, and one of them
    // (the breadcrumb) is on screen a row below even on the phone.
    const html = PAGES.game;
    expect(html).toContain("<h1>");
    expect(html).toMatch(/<nav class="bc">[\s\S]*?Snake[\s\S]*?<\/nav>/);
    expect(html).toMatch(/<title>[^<]*Snake/i);
  });

  it("the control that proves those matchers can fail", () => {
    // Every assertion above passes vacuously on a matcher that stopped
    // matching. A width nobody uses must NOT be found, and a class nobody
    // emits must NOT be found either.
    expect(DOCUMENT_CSS).not.toMatch(/@media \(max-width:718px\)\{body\.screen \.gname/);
    expect(PAGES.game).not.toContain('class="gname-does-not-exist"');
  });
});

/**
 * The language globe, on every emitted screen.
 *
 * Operator report 2026-08-25: "i see the language bar in desktop header is
 * missing!". It is not missing from the HOME header - measured there at 1440
 * and at 390 - it was missing from all 34 game pages, the room and the boards,
 * which is where a reader who followed a search result lands. Search Console
 * says 76% of the queries reaching this site are Hebrew.
 *
 * Every assertion here is about the EMITTED markup, because that is the whole
 * design: `src/build/**` ships to nobody, so this control costs a first visit
 * zero bytes, is on screen in the first paint rather than after the bundle,
 * and works with JavaScript off. A <details> gets that for free; a React
 * picker would cost a chunk, a wiring step, and a second control that can
 * disagree with the first.
 */
describe.each(Object.entries(PAGES))("the %s screen's language globe", (_name, html) => {
  const header = headerOf(html);
  const sheet = header.slice(header.indexOf('class="lang"'), header.indexOf("</details>") + 10);

  it("is there at all", () => {
    expect(header, "no language control in this screen's header").toContain('<details class="lang"');
  });

  it("needs no JavaScript to open", () => {
    // The one property that decides the whole implementation. A <button> here
    // would be inert on a document page until the bundle lands - and inert on
    // a page a crawler reads, forever.
    expect(sheet).toContain("<summary");
    expect(sheet, "the globe became a scripted control").not.toMatch(/onclick|data-lang-open/i);
  });

  it("offers the PAGE locales, never the eleven the app speaks", () => {
    // A document can only offer a language it EXISTS in. Seven of the app's
    // eleven would be 404s, and a 404 behind a globe is worse than no globe.
    const alts = sheet.match(/hreflang="[a-z]{2}"/g) ?? [];
    expect(alts.length, `expected 3 alternates, got ${alts}`).toBe(3);
  });

  it("names the current language rather than hiding it, and does not link to it", () => {
    // The sheet says where you ARE as well as where you can go - the same
    // shape the app's picker uses. Shape, not colour: a check glyph, so it
    // reads in a screenshot and for a colour-blind parent.
    expect(sheet, "the current language is not marked").toMatch(/<b[^>]*class="on"/);
    // `</b`, never `</b>`. The emitter writes the closing tag as `</b\n>` so
    // the JSX-style line break does not become a space inside the label, and
    // a `"</b>"` matcher therefore returns -1 - which `slice(at, -1)` turns
    // into "the rest of the sheet", so the assertion below reads three <a>
    // tags that have nothing to do with it. Exactly the shape of
    // .claude/rules/a-diagnostic-that-truncates-what-it-compares.md, and it
    // failed LOUDLY here only by luck: pointed the other way it passes.
    const bAt = sheet.indexOf("<b");
    const bEnd = sheet.indexOf("</b", bAt);
    expect(bEnd, "the current-language entry has no closing tag").toBeGreaterThan(bAt);
    const current = sheet.slice(bAt, bEnd);
    expect(current, "the current language became a link to itself").not.toContain("<a");
    expect(current, "the check glyph is gone").toContain("&#10003;");
  });

  it("gives every entry its own lang and dir", () => {
    // Without them the Hebrew autonym renders left-to-right inside an English
    // document - which is exactly the label somebody looking for Hebrew has to
    // read to find it.
    const entries = sheet.match(/<(a|b)\b[^>]*hreflang="[a-z]{2}"[^>]*>|<b[^>]*class="on"[^>]*>/g) ?? [];
    expect(entries.length, "no sheet entries found").toBeGreaterThan(0);
    for (const e of entries) {
      // `(?<!href)`, and it is not fussiness: `hreflang="es"` CONTAINS
      // `lang="es"`, so a bare /lang="[a-z]{2}"/ is satisfied by the attribute
      // that is already asserted two lines up. Planting the removal of every
      // per-entry `lang` left all 84 tests green.
      expect(e, `entry without its own lang: ${e}`).toMatch(/(?<!href)lang="[a-z]{2}"/);
      expect(e, `entry without dir: ${e}`).toMatch(/dir="(ltr|rtl)"/);
    }
  });

  it("labels itself, because it is glyph-only", () => {
    const summary = sheet.slice(sheet.indexOf("<summary"), sheet.indexOf(">", sheet.indexOf("<summary")));
    expect(summary, "the globe has no accessible name").toContain("aria-label");
  });
});

/**
 * SHARE - a GAME control, so it is on the game page and nowhere else.
 *
 * The rule's own test settles which family it is in: "would this control still
 * mean anything on the World screen or the Boards?" Sharing THIS game does not,
 * so it is emitted by `gamePage` rather than by `screenChrome`, and it belongs
 * on the utility row with pause and restart rather than in the header with
 * mute and the wallet.
 *
 * That is worth pinning rather than trusting, because the header is a string
 * built by one function and the row by another, and a button moved from one to
 * the other type-checks, renders, and passes every other assertion in this file.
 * Operator ruling 2026-08-25: "we should add per game share options instead."
 */
describe("the utility row's share", () => {
  it("is on the GAME page", () => {
    expect(urowOf(PAGES.game)).toContain("data-share");
  });

  it("is on NEITHER the room nor the boards", () => {
    // Not "absent from their utility rows" - absent from their whole documents.
    // A share button drawn anywhere on the room would be a control with no game
    // to share, which is the failure this asserts against rather than describes.
    expect(PAGES.world).not.toContain("data-share");
    expect(PAGES.boards).not.toContain("data-share");
  });

  it("is NOT in the header, on any of the three", () => {
    for (const [name, html] of Object.entries(PAGES)) {
      expect(headerOf(html), `${name} header carries a game control`).not.toContain("data-share");
    }
  });

  it("is emitted hidden, like the three buttons beside it", () => {
    // The sheet is a lazy chunk and what a tap can do is the browser's to
    // decide, so the build cannot draw an honest button. `wireShare` reveals it.
    const row = urowOf(PAGES.game);
    const button = row.slice(row.indexOf("data-share"));
    expect(button.slice(0, button.indexOf(">"))).toContain("hidden");
  });

  it("carries an accessible name, because it is glyph-only", () => {
    const row = urowOf(PAGES.game);
    const button = row.slice(row.indexOf("<button", row.indexOf("data-share") - 200));
    expect(button.slice(0, button.indexOf(">"))).toMatch(/aria-label="[^"]+"/);
  });

  it("draws the three-node mark the operator picked, not a box and an arrow", () => {
    // Five subpaths: three nodes and the two edges between them. The glyph was
    // chosen from five drawn on this row at 390px; `icons.test.ts` pins the
    // path data, and this pins that THIS button is the one drawing it.
    const row = urowOf(PAGES.game);
    const button = row.slice(row.indexOf("data-share"), row.indexOf("</button>", row.indexOf("data-share")));
    expect((button.match(/<path /g) ?? []).length).toBe(5);
  });
});
