// Shared game utilities — the neutral helpers every game may import.
// Import either from the barrel (`@shared`) or the module directly
// (`@shared/rng`); both resolve via the `@shared` alias registered in
// vite.config.ts, tsconfig.json AND vitest.config.ts.
export { mulberry32, seedFrom, randInt, pick, shuffle } from "./rng";
export { PENTATONIC, PENTATONIC_NAMES } from "./notes";
export { winMoment, type WinMomentOptions } from "./winMoment";
