import { describe, expect, it, beforeEach } from "vitest";
import {
  applySpec,
  clearSpec,
  parseSpec,
  readPick,
  savePick,
  clearPick,
  SHIPPED,
  G1,
  VARIANTS,
  type ChromeSpec,
} from "./spec";

/** A DOM stub with the two surfaces `applySpec` writes to. */
function element(): HTMLElement {
  const props = new Map<string, string>();
  return {
    style: {
      setProperty: (k: string, v: string) => props.set(k, v),
      removeProperty: (k: string) => props.delete(k),
      // the test reads through this, so it sees exactly what was written
      _props: props,
    },
    dataset: {} as Record<string, string>,
  } as unknown as HTMLElement;
}

/**
 * A ROOT and a BODY that are different objects, which the bare stub above is
 * not - it has no `ownerDocument`, so `el.ownerDocument?.body ?? el` resolves
 * to itself and every assertion reads the same map whichever surface was
 * written. That is why this file was green through the whole life of the bug:
 * it could not express the difference it exists to check.
 */
function page(): { root: HTMLElement; body: HTMLElement } {
  const body = element();
  const root = element();
  (root as unknown as { ownerDocument: { body: HTMLElement } }).ownerDocument = { body };
  return { root, body };
}
const written = (el: HTMLElement) =>
  (el.style as unknown as { _props: Map<string, string> })._props;

describe("applySpec", () => {
  it("writes every token the chrome reads", () => {
    const el = element();
    applySpec(SHIPPED, el);
    const p = written(el);
    // If a token stops being written the bench silently stops controlling that
    // dimension, and a knob that moves nothing looks exactly like a knob whose
    // value happens to be right.
    for (const t of ["--hh", "--uh", "--tap", "--gc-tap", "--gc-gap", "--gc-radius"]) {
      expect(p.get(t), `${t} not written`).toBeTruthy();
    }
    expect(p.get("--gc-tap")).toBe("56px");
    expect(p.get("--hh")).toBe("60px");
  });

  it("writes the narrow arm when asked", () => {
    const el = element();
    applySpec(SHIPPED, el, true);
    // Read off the spec rather than retyped. A copied literal reds this file
    // every time a token moves, which is how a test becomes a thing you edit
    // to green rather than a thing you read.
    expect(written(el).get("--hh")).toBe(`${SHIPPED.hhNarrow}px`);
    expect(written(el).get("--uh")).toBe(`${SHIPPED.uhNarrow}px`);
    // The control that makes reading the spec safe: the two arms must really
    // differ, or these two lines pass on an applySpec that ignores `narrow`.
    const wide = element();
    applySpec(SHIPPED, wide, false);
    expect(written(wide).get("--hh")).not.toBe(written(el).get("--hh"));
    expect(written(wide).get("--uh")).not.toBe(written(el).get("--uh"));
  });

  it("puts the non-numeric choices on data attributes", () => {
    const el = element();
    applySpec(G1, el);
    expect(el.dataset.designCrumb).toBe("plain");
    expect(el.dataset.designRestart).toBe("urow");
  });

  it("clears everything it wrote", () => {
    const el = element();
    applySpec(SHIPPED, el);
    clearSpec(el);
    expect(written(el).size).toBe(0);
    expect(el.dataset.designCrumb).toBeUndefined();
  });
});

describe("parseSpec drops rather than coerces", () => {
  it("accepts a real spec", () => {
    expect(parseSpec(JSON.parse(JSON.stringify(SHIPPED)))).toBeTruthy();
  });

  // Each of these renders a plausible screen that no variant describes, which
  // is the exact drift this module exists to stop - so each must be DROPPED,
  // giving the caller the same answer as "never picked".
  const junk: Array<[string, unknown]> = [
    ["null", null],
    ["a string", "56"],
    ["a missing key", (() => { const s: Record<string, unknown> = { ...SHIPPED }; delete s.panelTap; return s; })()],
    ["a string where a number belongs", { ...SHIPPED, panelTap: "56" }],
    ["NaN", { ...SHIPPED, panelTap: Number.NaN }],
    ["zero", { ...SHIPPED, panelTap: 0 }],
    ["absurdly large", { ...SHIPPED, panelTap: 4000 }],
    ["an unknown statShape", { ...SHIPPED, statShape: "stacked" }],
    ["an unknown restartAt", { ...SHIPPED, restartAt: "header" }],
    ["an empty radius", { ...SHIPPED, radius: "" }],
  ];
  for (const [name, value] of junk) {
    it(`drops ${name}`, () => expect(parseSpec(value)).toBeUndefined());
  }
});

describe("the pick round-trips", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    };
  });

  it("returns what was saved", () => {
    savePick(G1);
    expect(readPick()?.breadcrumb).toBe("plain");
  });

  it("returns undefined when nothing was picked", () => {
    expect(readPick()).toBeUndefined();
  });

  it("returns undefined for a truncated write, never a half-applied spec", () => {
    localStorage.setItem("ellaz:design:v1", '{"hh":60,"uh":');
    expect(readPick()).toBeUndefined();
  });

  it("forgets a pick when cleared", () => {
    savePick(SHIPPED);
    clearPick();
    expect(readPick()).toBeUndefined();
  });
});

describe("the variant table", () => {
  it("carries the shipped one and the approved G1", () => {
    expect(VARIANTS.shipped).toBe(SHIPPED);
    expect(VARIANTS.g1).toBe(G1);
  });

  /**
   * The two records AGREE, since 2026-08-23, and that is the finished state.
   *
   * This assertion used to be the opposite - "at least two entries differ" -
   * as a control against a table that could not show a difference. It went red
   * the day the bench succeeded: the operator picked plain, the code matched
   * the approval, and `shipped` became equal to `g1` in every field. A control
   * phrased as a disagreement between two records expires exactly when the
   * work lands, so it was the wrong control to write.
   *
   * The real control moved to `variant-is-shipped.test.ts`, where the READER
   * is handed two stylesheets it did not come from and must return two
   * different answers. That one holds whether or not the records agree.
   */
  it("agrees, because everything g1 asked for has shipped", () => {
    expect(VARIANTS.shipped).toEqual(VARIANTS.g1);
  });

  /**
   * ...and the table can still HOLD a difference, which is what the old
   * assertion was really reaching for. Proven on a third entry rather than on
   * the two real ones, so it cannot expire again.
   */
  it("can still carry a variant that differs", () => {
    const other: ChromeSpec = { ...SHIPPED, breadcrumb: "pill" };
    const seen = new Set(
      [...Object.values(VARIANTS), other].map((v: ChromeSpec) => JSON.stringify(v)),
    );
    expect(seen.size).toBe(2);
  });
});

/**
 * TOKENS on the body, ATTRIBUTES on the root - and they are not interchangeable.
 *
 * `layout.ts` declares the tokens in `body.screen{...}`, and a declaration ON an
 * element beats one inherited from its parent, so a token written to `<html>` is
 * inherited straight past by the very rule that defines it. The candidate CSS,
 * meanwhile, selects `:root[data-design-*]`, so the attributes have to go the
 * other way. Writing both to one surface silently kills one half.
 *
 * Measured on the live G1 arm before the fix: `<html>` carried `--uh: 46px`, the
 * computed value on the body was 56px, the row drew 56 - every numeric knob in
 * the drawer inert, and `#/lab/design` comparing two arms that could only ever
 * differ in the breadcrumb.
 */
describe("applySpec writes each thing where the CSS that reads it can see it", () => {
  it("puts every token on the BODY", () => {
    const { root, body } = page();
    applySpec(SHIPPED, root);
    for (const t of ["--hh", "--uh", "--tap", "--gc-tap", "--gc-gap", "--gc-radius"]) {
      expect(written(body).get(t), `${t} did not reach the body`).toBeTruthy();
      expect(written(root).has(t), `${t} was written to the root, where body.screen beats it`).toBe(false);
    }
  });

  it("puts every attribute on the ROOT", () => {
    const { root, body } = page();
    applySpec(G1, root);
    expect(root.dataset.designCrumb).toBe("plain");
    expect(root.dataset.designStat).toBe(G1.statShape);
    // The candidate CSS is `:root[data-design-crumb=...]`. On the body it selects
    // nothing, and the breadcrumb - the one thing that DID work - would break.
    expect(body.dataset.designCrumb, "the attribute went to the body, where no rule reads it").toBeUndefined();
  });

  it("clearSpec cleans both surfaces", () => {
    const { root, body } = page();
    applySpec(SHIPPED, root);
    clearSpec(root);
    expect(written(body).size, "tokens left on the body").toBe(0);
    expect(root.dataset.designCrumb).toBeUndefined();
  });

  it("the control: the two surfaces are really distinguishable", () => {
    // Every assertion above passes vacuously if root and body are the same
    // object, which is exactly what the bare stub gives you.
    const { root, body } = page();
    expect(root).not.toBe(body);
    expect(written(root)).not.toBe(written(body));
  });
});
