/* Renders selected REAL cards through the shipping pipeline so a layout is
   looked at rather than argued. Outside src/** so `npm test` never runs it.
   npx vitest run --config scripts/repro/vitest.og.config.ts */
import { it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { OG_ROUTES } from "../../src/build/routes";
import { renderOgPng } from "../../src/build/ogImages";
import { ogCardText, cardArt, montageGrid } from "../../src/build/ogCard";
import { GAMES } from "../../src/portal/games";

const OUT = process.env.OG_OUT ?? "/tmp/og-render";
const metaFor = (id: string) => GAMES.find((g) => g.id === id);

// The cells that can go wrong: the three that were byte-identical, the widest
// tagline (fr), both RTL arms, the smallest group (speed, 3) and the largest
// (kids, 9), and a game so the letterbox can be looked at.
const PICK: Array<[string, (r: (typeof OG_ROUTES)[number]) => boolean]> = [
  ["home-en", (r) => r.kind === "home" && r.locale === "en"],
  ["home-he", (r) => r.kind === "home" && r.locale === "he"],
  ["world-en", (r) => r.kind === "world" && r.locale === "en"],
  ["boards-en", (r) => r.kind === "boards" && r.locale === "boards" as never],
  ["boards-en2", (r) => r.kind === "boards" && r.locale === "en"],
  ["speed-en", (r) => r.category === "speed" && r.locale === "en"],
  ["kids-he", (r) => r.category === "kids" && r.locale === "he"],
  ["snake-fr", (r) => r.kind === "game" && r.id === "snake" && r.locale === "fr"],
  ["snake-he", (r) => r.kind === "game" && r.id === "snake" && r.locale === "he"],
];

it("renders the cells that can go wrong", async () => {
  mkdirSync(OUT, { recursive: true });
  for (const [label, match] of PICK) {
    const route = OG_ROUTES.find(match);
    if (!route) continue;
    const png = await renderOgPng(route, route.id ? metaFor(route.id) : undefined);
    writeFileSync(`${OUT}/${label}.png`, png);
    const { title, sub } = ogCardText(route, route.id ? metaFor(route.id) : undefined);
    const tiles = cardArt(route, route.id ? metaFor(route.id) : undefined);
    const g = montageGrid(Math.max(1, tiles.length));
    console.log(
      `${label.padEnd(10)} ${String(png.length).padStart(6)} B  ${String(tiles.length).padStart(2)} tiles  ` +
        `${tiles[0] ? `${tiles[0].w}x${tiles[0].h} ${tiles[0].fit}` : "NO ART"}  "${title}" / "${sub}"`,
    );
  }
});
