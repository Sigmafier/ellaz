/* Measures how much of a game's art composition survives onto the share card.
   Throwaway probe: renders the scene at its NATIVE 4:3 beside the 1200x630
   slice the card actually paints, so the crop is looked at rather than argued. */
import { it } from "vitest";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { artSvgSized, OG_WIDTH, OG_HEIGHT } from "../../src/build/ogCard";

const OUT = process.env.OG_OUT ?? "/tmp/og-probe";

it("renders native vs card-slice art", () => {
  mkdirSync(OUT, { recursive: true });
  for (const id of ["snake", "sudoku", "match3", "2048"]) {
    const native = new Resvg(artSvgSized(id, 1200, 900), {
      fitTo: { mode: "width", value: 1200 },
    }).render().asPng();
    writeFileSync(`${OUT}/native-${id}.png`, native);

    const slice = new Resvg(artSvgSized(id, OG_WIDTH, OG_HEIGHT), {
      fitTo: { mode: "width", value: OG_WIDTH },
    }).render().asPng();
    writeFileSync(`${OUT}/slice-${id}.png`, slice);
  }
  // 200x150 art, xMidYMid slice into 1200x630: scale = max(6, 4.2) = 6,
  // so the composition renders 900 tall and 630 is shown -> 135 cut off each end.
  // The 230px title bar then covers the bottom of what remains.
  const scale = Math.max(OG_WIDTH / 200, OG_HEIGHT / 150);
  const rendered = 150 * scale;
  const barPx = 230;
  console.log(`composition renders ${rendered}px tall`);
  console.log(`card window        ${OG_HEIGHT}px  -> ${((rendered - OG_HEIGHT) / 2).toFixed(0)}px cut top AND bottom`);
  console.log(`title bar covers   ${barPx}px`);
  console.log(`VISIBLE            ${OG_HEIGHT - barPx}px of ${rendered} = ${(((OG_HEIGHT - barPx) / rendered) * 100).toFixed(1)}%`);
});
