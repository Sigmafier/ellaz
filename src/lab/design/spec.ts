/**
 * The Design Bench - a chrome layout as DATA.
 *
 * The problem this exists for: a header gets approved as a picture, and what
 * ships is a different half-done version, because nothing anywhere holds the
 * approved numbers in a form the code can be compared against. A `ChromeSpec`
 * IS that form. Every decision about how the game chrome is laid out becomes a
 * named variant here, `variant-is-shipped.test.ts` pins the shipped one against
 * the real source files, and the bench renders any of them over a real game.
 *
 * MEASURED, not typed. `shipped` was read off `src/build/layout.ts` and
 * `src/ui/GameChrome.tsx`; `g1` was read off `dist-g1/`, the approved-G1 build
 * of 2026-08-20 20:32, with `scripts/` doing the extraction rather than a
 * person copying digits. That is the whole point - a spec somebody retyped is
 * the same class of artifact as the prose it replaced.
 *
 * This module is PURE apart from `applySpec`, which takes the element to write
 * to. It ships inside the `lab-*` chunk and reaches no child's device.
 */

/** Every number the two halves of the chrome are laid out from. */
export type ChromeSpec = {
  /** Platform bar height, wide viewport. Emitted CSS: `--hh`. */
  hh: number;
  /** Platform bar height at <=719px. Emitted CSS: `--hh` in the media query. */
  hhNarrow: number;
  /** Utility row height, wide. Emitted CSS: `--uh`. */
  uh: number;
  /** Utility row height at <=719px. */
  uhNarrow: number;
  /** Platform header button cell. Emitted CSS: `--tap`. */
  headerTap: number;
  /** Game control cell in the panel - the level toggle and the stat cards. */
  panelTap: number;
  /** Gap between the cells of the level+stats row. */
  panelGap: number;
  /** Floor under the level toggle, so a fourth word cannot be clipped. */
  /** Floor under a full-size stat card. */
  statMinWidth: number;
  /** Corner of the panel's surfaces. A CSS length, because it is a token. */
  radius: string;
  /** Whether a game's record shares its live value's card or gets its own. */
  statShape: "merged" | "split";
  /** Where the restart button is drawn. */
  restartAt: "urow" | "panel";
  /** Where the pause button is drawn, for the two games that have one. */
  pauseAt: "urow" | "panel";
  /** Whether the breadcrumb is a filled pill or plain text. */
  breadcrumb: "pill" | "plain";
};

/**
 * What the code does TODAY. `variant-is-shipped.test.ts` reads the real files
 * and fails if any of these drifts, which is the mechanism that stops an
 * approved layout being quietly replaced by a different one.
 */
export const SHIPPED: ChromeSpec = {
  hh: 60,
  hhNarrow: 58,
  uh: 52,
  uhNarrow: 46,
  headerTap: 44,
  panelTap: 56,
  panelGap: 8,
  statMinWidth: 88,
  radius: "var(--radius-3)",
  statShape: "merged",
  restartAt: "urow",
  pauseAt: "urow",
  breadcrumb: "pill",
};

/**
 * The header the operator approved, recovered from `dist-g1/`.
 *
 * It differs from `SHIPPED` in exactly one place - the breadcrumb, which was
 * plain text when G1 was approved and became a pill afterwards. Every layout
 * token is identical, which is the finding: the emitted half of G1 has been
 * live since it was approved, and the panel is the half G1 never specified.
 */
export const G1: ChromeSpec = { ...SHIPPED, breadcrumb: "plain" };

export const VARIANTS: Record<string, ChromeSpec> = { shipped: SHIPPED, g1: G1 };

/** The CSS custom property each numeric field is written to. */
const TOKEN: Record<string, string> = {
  hh: "--hh",
  uh: "--uh",
  headerTap: "--tap",
  panelTap: "--gc-tap",
  panelGap: "--gc-gap",
  statMinWidth: "--gc-stat-min",
};

/**
 * Write a spec onto an element as custom properties plus `data-design-*`
 * attributes.
 *
 * Nothing here re-renders a component or rewrites markup: the real CSS and the
 * real inline styles read these tokens, so what the bench shows IS the shipped
 * rendering path with different numbers in it. A bench that drew its own
 * approximation would be the static mock we are replacing.
 *
 * The narrow values are not written - a media query decides which arm applies,
 * and a custom property set on the root would beat it. The bench dials the arm
 * the current viewport is in; `hhNarrow`/`uhNarrow` exist so the pin can see
 * them and so a variant carries both.
 */
export function applySpec(spec: ChromeSpec, el: HTMLElement, narrow = false): void {
  const px = (k: keyof ChromeSpec) => `${spec[k] as number}px`;
  el.style.setProperty(TOKEN.hh, narrow ? px("hhNarrow") : px("hh"));
  el.style.setProperty(TOKEN.uh, narrow ? px("uhNarrow") : px("uh"));
  el.style.setProperty(TOKEN.headerTap, px("headerTap"));
  el.style.setProperty(TOKEN.panelTap, px("panelTap"));
  el.style.setProperty(TOKEN.panelGap, px("panelGap"));
  el.style.setProperty(TOKEN.statMinWidth, px("statMinWidth"));
  el.style.setProperty("--gc-radius", spec.radius);
  el.dataset.designStat = spec.statShape;
  el.dataset.designRestart = spec.restartAt;
  el.dataset.designPause = spec.pauseAt;
  el.dataset.designCrumb = spec.breadcrumb;
}

/** Undo `applySpec`, so leaving the bench leaves the page as it was. */
export function clearSpec(el: HTMLElement): void {
  for (const t of Object.values(TOKEN)) el.style.removeProperty(t);
  el.style.removeProperty("--gc-radius");
  delete el.dataset.designStat;
  delete el.dataset.designRestart;
  delete el.dataset.designPause;
  delete el.dataset.designCrumb;
}

const KEY = "ellaz:design:v1";

const NUMERIC = [
  "hh",
  "hhNarrow",
  "uh",
  "uhNarrow",
  "headerTap",
  "panelTap",
  "panelGap",
  "statMinWidth",
] as const;

/**
 * Coerce nothing. A stored spec is either completely valid or it is dropped,
 * and dropping answers exactly what "never picked" answers, so the caller
 * needs one code path for both. Same discipline as `sdk/voiceOverride.ts`:
 * `migrateProfile` salvages junk on purpose because a child's coins are worth
 * salvaging, and a half-valid LAYOUT is worth nothing - it renders a plausible
 * screen that no variant describes, which is the drift this file exists to
 * stop.
 */
export function parseSpec(raw: unknown): ChromeSpec | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  for (const k of NUMERIC) {
    const v = o[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > 400) return undefined;
  }
  if (typeof o.radius !== "string" || !o.radius) return undefined;
  if (o.statShape !== "merged" && o.statShape !== "split") return undefined;
  if (o.restartAt !== "urow" && o.restartAt !== "panel") return undefined;
  if (o.pauseAt !== "urow" && o.pauseAt !== "panel") return undefined;
  if (o.breadcrumb !== "pill" && o.breadcrumb !== "plain") return undefined;
  return raw as ChromeSpec;
}

/** The pick, or `undefined` - never a partially-applied one. */
export function readPick(): ChromeSpec | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseSpec(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

export function savePick(spec: ChromeSpec): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(spec));
  } catch {
    /* a refused write costs a pick, never the page */
  }
}

export function clearPick(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
