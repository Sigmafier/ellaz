/* One arm of the no-count-in-a-card before/after. Renders the REAL home card
   through the shipping pipeline; the count arm is produced by patching
   `ogCard.ts` around this run (see repro-og-count.sh) rather than by
   monkey-patching, because an ESM namespace object is frozen and the patch
   fails silently-looking at the call site. */
import { it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { OG_ROUTES } from "../../src/build/routes";
import { renderOgPng } from "../../src/build/ogImages";
import { ogCardText } from "../../src/build/ogCard";

const OUT = process.env.OG_OUT ?? "/tmp/og-count";
const NAME = process.env.OG_ARM ?? "arm";

it("renders the home card as this arm draws it", async () => {
  mkdirSync(OUT, { recursive: true });
  const home = OG_ROUTES.find((r) => r.kind === "home" && r.locale === "en")!;
  writeFileSync(`${OUT}/${NAME}.png`, await renderOgPng(home));
  console.log(`${NAME}: "${ogCardText(home).sub}"`);
});
