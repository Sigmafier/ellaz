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
  uh: 60,
  uhNarrow: 56,
  headerTap: 44,
  panelTap: 56,
  panelGap: 8,
  statMinWidth: 88,
  radius: "var(--radius-3)",
  statShape: "merged",
  restartAt: "urow",
  pauseAt: "urow",
  /*
   * PLAIN since 2026-08-23, on the operator's ACK - so this now EQUALS `G1`,
   * and the bench reports zero differences between what shipped and what was
   * approved. That is the state this whole bench was built to reach, and it
   * is also the state in which the pin's positive control goes vacuous: see
   * `variant-is-shipped.test.ts`, which now proves its READER can tell the
   * two shapes apart rather than leaning on the tree to differ.
   */
  breadcrumb: "plain",
};

/**
 * The header the operator approved, recovered from `dist-g1/`.
 *
 * G1's own numbers are written out here as LITERALS, never spread off
 * `SHIPPED`. It was a spread until 2026-08-22, and that is a record of what
 * was approved which silently becomes a copy of whatever ships next - the
 * exact drift this whole bench exists to stop, one file inside the bench. It
 * showed itself the first time the shipped row changed: raising `--uh` for
 * the row's clearance would have rewritten history to say G1 asked for it.
 *
 * It differed from `SHIPPED` in exactly one place when recovered - the
 * breadcrumb, which was plain text then and became a pill afterwards. That
 * last difference CLOSED on 2026-08-23: the operator was shown both arms
 * measured and chose plain, so the shipped rule went back to what this record
 * always said. `SHIPPED` and `G1` are now equal in every field.
 *
 * AMENDED 2026-08-23, by the operator, deliberately and dated - which is the
 * opposite of the drift above rather than an exception to it. `uh` was
 * recovered as 52/46, and 46 against a 44px button is ONE PIXEL of clearance:
 * not a number anybody picked, just what you get when a row is sized to its
 * tallest child. It was raised to 60/56 on 2026-08-22 and the operator kept
 * that when the bench could finally show them the difference ("Keep 56, update
 * G1"). So the record now says 60/56 too, and the bench stops reporting a
 * difference that was really "this record predates a fix".
 *
 * The rule the spread violated and this does not: a record may be CHANGED, by
 * the person whose record it is, with the date and the reason written down. It
 * may not change by itself because something else moved.
 */
export const G1: ChromeSpec = {
  hh: 60,
  hhNarrow: 58,
  uh: 60,
  uhNarrow: 56,
  headerTap: 44,
  panelTap: 56,
  panelGap: 8,
  statMinWidth: 88,
  radius: "var(--radius-3)",
  statShape: "merged",
  restartAt: "urow",
  pauseAt: "urow",
  breadcrumb: "plain",
};

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
 *
 * TWO SURFACES, and they are not interchangeable - this is the whole bug of
 * 2026-08-23, found by ground-truth-probing a KPI rather than by reading code:
 *
 *   TOKENS     -> the BODY. `layout.ts` declares them in `body.screen{...}`,
 *                 and a declaration ON an element beats one inherited from its
 *                 parent - so a token written on `<html>` is inherited straight
 *                 past by the very rule that defines it. Measured on the live
 *                 G1 arm: `<html>` carried `--uh: 46px`, the computed value on
 *                 the body was 56px, and the row drew 56. Every numeric knob in
 *                 the drawer was inert, and `#/lab/design` therefore compared
 *                 two arms that could only ever differ in the breadcrumb.
 *
 *   ATTRIBUTES -> the ROOT. The candidate CSS selects `:root[data-design-*]`,
 *                 which is why the breadcrumb was the one thing that DID work,
 *                 and why "just write everything to the body" would have traded
 *                 one silent half for the other.
 *
 * So `applySpec` resolves both from the element it is handed rather than
 * trusting the caller to pass the right one. `Buttons.tsx` has carried a
 * comment about this exact trap since the bench existed; the lesson never
 * travelled to `Drawer.tsx`, and nothing could see that because a token that
 * does nothing renders identically to a token whose value already matches.
 */
export function applySpec(spec: ChromeSpec, el: HTMLElement, narrow = false): void {
  const px = (k: keyof ChromeSpec) => `${spec[k] as number}px`;
  const box = el.ownerDocument?.body ?? el;
  box.style.setProperty(TOKEN.hh, narrow ? px("hhNarrow") : px("hh"));
  box.style.setProperty(TOKEN.uh, narrow ? px("uhNarrow") : px("uh"));
  box.style.setProperty(TOKEN.headerTap, px("headerTap"));
  box.style.setProperty(TOKEN.panelTap, px("panelTap"));
  box.style.setProperty(TOKEN.panelGap, px("panelGap"));
  box.style.setProperty(TOKEN.statMinWidth, px("statMinWidth"));
  box.style.setProperty("--gc-radius", spec.radius);
  el.dataset.designStat = spec.statShape;
  el.dataset.designRestart = spec.restartAt;
  el.dataset.designPause = spec.pauseAt;
  el.dataset.designCrumb = spec.breadcrumb;
}

/** Undo `applySpec`, so leaving the bench leaves the page as it was. */
export function clearSpec(el: HTMLElement): void {
  const box = el.ownerDocument?.body ?? el;
  for (const t of Object.values(TOKEN)) box.style.removeProperty(t);
  box.style.removeProperty("--gc-radius");
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
