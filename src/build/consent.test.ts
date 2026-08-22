import { describe, expect, it } from "vitest";
import { CONSENT_COPY, CONSENT_CSS, CONSENT_KEY, consentBar, consentBootScript } from "./consent";
import { analyticsTag } from "./analytics";
import { PAGE_LOCALES } from "../i18n/locales";
import { toHtml } from "./html";

const bar = (base = "/", locale: (typeof PAGE_LOCALES)[number] = "en") => {
  const out = consentBar(base, locale);
  return out === "" ? "" : toHtml(out);
};

describe("the consent bar", () => {
  it("is written in every page locale", () => {
    // Derived, not a literal list: a fifth locale must red here rather than
    // silently serve English to readers of a language we DO have prose in.
    for (const l of PAGE_LOCALES) {
      const c = CONSENT_COPY[l];
      expect(c, `${l} has no consent copy`).toBeTruthy();
      expect(c.line.length, `${l} line is empty`).toBeGreaterThan(20);
      expect(c.yes && c.no, `${l} is missing a button label`).toBeTruthy();
      expect(c.yes).not.toBe(c.no);
    }
  });

  it("only ships on the primary host, exactly where the tag does", () => {
    // The pairing is the assertion. A bar on a base with no tag asks for
    // consent to something that was never loaded; a tag with no bar on a base
    // that has one is the thing this whole change exists to stop.
    expect(bar("/ellaz/")).toBe("");
    expect(analyticsTag("/ellaz/")).toBe("");
    expect(bar("/")).not.toBe("");
    expect(analyticsTag("/")).not.toBe("");
  });

  it("leaves the DEFAULT denied, and only UPDATES on an explicit accept", () => {
    // The lawful shape, and the one a reviewer is most likely to "simplify".
    // If the tag ever shipped `granted` by default the bar would be theatre -
    // the cookie would already be written before anyone was asked.
    expect(analyticsTag("/")).toContain("analytics_storage:'denied'");
    const s = consentBootScript();
    expect(s).toContain('gtag("consent","update",{analytics_storage:"granted"})');
    expect(s).not.toContain('analytics_storage:"denied"');
  });

  it("never grants without a stored answer, and validates rather than coerces", () => {
    const s = consentBootScript();
    // Only the exact string grants. Anything else re-asks, which is the safe
    // direction: the unsafe one is granting consent nobody gave.
    expect(s).toContain('v==="granted"');
    expect(s).toContain('v==="denied"');
    expect(s).toContain(JSON.stringify(CONSENT_KEY));
  });

  it("is out of flow and hidden until script shows it", () => {
    // Two properties, both load-bearing. A bar IN FLOW shifts every page on the
    // site - and /world/ went 0.2966 -> 0.0032 the same day this was written.
    // A bar VISIBLE without script cannot be dismissed by a reader who also has
    // no gtag to consent to.
    expect(CONSENT_CSS).toContain("position:fixed");
    expect(CONSENT_CSS).toContain(".consent{display:none");
    expect(CONSENT_CSS).toContain("[data-consent] .consent{display:flex}");
  });

  it("gives accept and decline the SAME button, not a nudged one", () => {
    // One CSS rule away at all times, and the exact thing the regulation is
    // about. Both buttons are styled by ONE selector, so they cannot diverge
    // without that selector being split - which this asserts.
    const html = bar();
    expect(html).toContain("data-yes");
    expect(html).toContain("data-no");
    const rules = CONSENT_CSS.match(/\.consent button\{[^}]*\}/g) ?? [];
    expect(rules.length, "the two buttons are no longer styled as one").toBe(1);
    expect(CONSENT_CSS).not.toMatch(/\[data-(yes|no)\]\s*\{/);
  });

  it("carries the right direction for the language it is written in", () => {
    // A Hebrew sentence in an ltr box puts its full stop on the wrong end.
    expect(bar("/", "he")).toContain('dir="rtl"');
    expect(bar("/", "en")).toContain('dir="ltr"');
  });
});
