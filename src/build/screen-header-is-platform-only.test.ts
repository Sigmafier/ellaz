import { describe, it, expect } from "vitest";
import { gamePage } from "./gamePage";
import { boardsPage, homePage, worldPage } from "./sitePages";
import { GAMES } from "../portal/games";
import { snake as snakeContent } from "../content/games/snake";

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
    const links = header.match(/<a\b/g) ?? [];
    expect(links.length, "the header should hold one link, home").toBe(1);
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

  it("holds mute and full screen, emitted hidden so neither is ever drawn dead", () => {
    expect(header).toMatch(/data-sound[^>]*hidden/);
    expect(header).toMatch(/data-fullscreen[^>]*hidden/);
  });

  it("labels them, because they are glyph-only", () => {
    for (const d of ["data-sound", "data-fullscreen"]) {
      const tag = header.slice(header.indexOf(d) - 200, header.indexOf(d) + 200);
      expect(tag, `${d} needs an aria-label`).toContain("aria-label");
    }
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

describe("a document is NOT a screen", () => {
  it("leaves the home page its wordmark row and no screen chrome", () => {
    const home = homePage(site);
    expect(home).not.toMatch(/<body class="screen"/);
    expect(home).not.toContain("data-fullscreen");
    expect(home).not.toContain('class="hbtn home"');
  });
});
