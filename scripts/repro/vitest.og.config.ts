/* The OG-crop probe measures how much of a game's art reaches the share card.
   It writes PNGs and is a MEASUREMENT, not a gate, so it is deliberately
   outside `src/**` where the suite would run it on every `npm test`.
   Run it: npx vitest run --config scripts/repro/vitest.og.config.ts */
import { defineConfig } from "vitest/config";
import base from "../../vite.config";

export default defineConfig({
  ...(base as object),
  test: { include: ["scripts/repro/repro-og-*.test.ts"] },
});
