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
    expect(written(el).get("--hh")).toBe("58px");
    expect(written(el).get("--uh")).toBe("46px");
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

  /** The control: a table whose entries are all equal cannot show a difference. */
  it("has at least two entries that differ", () => {
    const seen = new Set(Object.values(VARIANTS).map((v: ChromeSpec) => JSON.stringify(v)));
    expect(seen.size).toBeGreaterThan(1);
  });
});
