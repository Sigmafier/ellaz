import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { lookFor } from "./outcome";
import type { SendOutcome } from "./send";
import { he } from "../i18n/dict/he";
import { en } from "../i18n/dict/en";

/**
 * Only `failed` may offer a retry.
 *
 * Three of the four outcomes cannot be changed by tapping the same button
 * again: a success is done, a throttle needs a minute to pass, and a refusal is
 * the rules block rejecting the shape of this report - the same bytes will be
 * refused again. Before 2026-09-03 `refused` shared BOTH its sentence and its
 * retry button with `failed`, so a player whose report could never land was
 * invited to keep trying forever.
 *
 * These assertions are the only thing in this repo that can hold the mapping:
 * `vitest.config.ts` runs the node environment and includes only `*.test.ts`,
 * so `ReportSheet.tsx` cannot be rendered and read back here. That is why the
 * decision was moved OUT of the component into `outcome.ts`.
 */

const OUTCOMES: Array<{ name: string; outcome: SendOutcome | null }> = [
  { name: "sent", outcome: { ok: true, id: "28333338" } },
  { name: "throttled", outcome: { ok: false, why: "throttled" } },
  { name: "refused", outcome: { ok: false, why: "refused" } },
  { name: "failed", outcome: { ok: false, why: "failed" } },
  { name: "no answer at all", outcome: null },
];

describe("the retry button", () => {
  it("is offered ONLY where a second identical tap could succeed", () => {
    const offered = OUTCOMES.filter((o) => lookFor(o.outcome).retry).map((o) => o.name);
    // `null` is the sheet's own "we never heard back", which is a network
    // failure by another name - so it retries, like `failed`.
    expect(offered.sort()).toEqual(["failed", "no answer at all"]);
  });

  it("is withheld from a refusal, which is the whole point of this file", () => {
    expect(lookFor({ ok: false, why: "refused" }).retry).toBe(false);
  });

  it("gives a refusal its OWN sentence, not the failure's", () => {
    const refused = lookFor({ ok: false, why: "refused" });
    const failed = lookFor({ ok: false, why: "failed" });
    expect(refused.key).toBe("reportRefused");
    expect(refused.key).not.toBe(failed.key);
    // A distinct KEY that resolves to the same words would read identically to
    // a player, which is the defect this fixes rather than a fix for it.
    expect(en[refused.key]).not.toBe(en[failed.key]);
    expect(he[refused.key]).not.toBe(he[failed.key]);
  });

  it("says something different on every one of the four screens", () => {
    const keys = OUTCOMES.map((o) => lookFor(o.outcome).key);
    expect(new Set(keys).size).toBe(4);
    const faces = OUTCOMES.map((o) => lookFor(o.outcome).emoji);
    expect(new Set(faces).size).toBe(4);
  });

  it("defaults an outcome nobody has written yet to NO retry", () => {
    // The safe direction: an unknown refusal is more likely permanent than
    // transient. This is a source assertion because a `why` that does not exist
    // cannot be constructed - `lookFor` must derive `retry` from a POSITIVE
    // test for "failed", never from a list of exclusions.
    const src = readFileSync(new URL("./outcome.ts", import.meta.url), "utf8");
    const body = src.slice(src.indexOf("export function lookFor"));
    expect(body).not.toMatch(/retry:\s*why\s*!==/);
    expect(body).not.toMatch(/retry:\s*!/);
    // Exactly one `retry: true`, and it is the last branch - the fallthrough
    // for `failed` and for a null answer.
    expect(body.match(/retry:\s*true/g)?.length).toBe(1);
  });

  it("names four keys that every dictionary actually has", () => {
    for (const { outcome } of OUTCOMES) {
      const { key } = lookFor(outcome);
      expect(he[key], `he.${key}`).toBeTruthy();
      expect(en[key], `en.${key}`).toBeTruthy();
    }
  });
});
