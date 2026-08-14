// The registry and the stylesheet must agree, in both directions.
//
// This is the only gate that can catch the look system's characteristic
// failure, which does not throw and does not look like a bug: AN ARM THAT
// CHANGES NOTHING. Pick it and the table stays exactly as it was, which reads
// to whoever is choosing as "that option is boring" rather than as "that
// option is broken" — so it is never reported, and the axis quietly has one
// fewer real choice than the screen claims.
//
// Both directions matter and they catch different mistakes:
//   registry -> css   an arm somebody added and never styled, or renamed on
//                     one side only. This is the common one.
//   css -> registry   a rule for an arm no strip offers. Dead style, and
//                     usually the wreckage of a rename going the other way.
//
// It reads the REAL stylesheet off disk rather than a copy of the arm list,
// because a gate that checks a list against itself proves only that copying
// worked.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe as group, expect, it } from "vitest";
import { AXES } from "./axes";
import { LOOK_KEYS } from "./lookStore";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "look.css"),
  "utf8",
);

/** Every `data-look-<key>="<arm>"` the stylesheet actually selects on. */
const styled = new Set<string>();
for (const m of CSS.matchAll(/data-look-([a-z]+)="([a-z0-9-]+)"/g)) {
  styled.add(`${m[1]}:${m[2]}`);
}

group("the stylesheet was read at all", () => {
  // The positive control. Every assertion below is of the form "this set
  // contains / does not contain X", and an empty set passes half of them
  // silently — which is exactly how a matcher written against the source of a
  // file rather than its real bytes reports success over nothing.
  it("found a useful number of arm rules", () => {
    expect(styled.size).toBeGreaterThan(40);
  });

  it("found one it can name", () => {
    expect(styled.has("deck:four")).toBe(true);
  });
});

group("registry and stylesheet agree", () => {
  it("every non-default arm has a rule that does something", () => {
    const missing: string[] = [];
    for (const axis of AXES) {
      for (const arm of axis.arms) {
        if (arm.current) continue;
        if (!styled.has(`${axis.key}:${arm.id}`)) missing.push(`${axis.key}:${arm.id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every rule in the stylesheet belongs to an arm somebody can pick", () => {
    const offered = new Set(
      AXES.flatMap((a) => a.arms.map((arm) => `${a.key}:${arm.id}`)),
    );
    expect([...styled].filter((s) => !offered.has(s))).toEqual([]);
  });

  // The default is the plain rule with no attribute. Giving it an arm rule as
  // well would put the shipped look in two places, and the day they disagree
  // the lab would show "now" as something the table does not do.
  it("no arm marked `now` has a rule of its own", () => {
    const dupes: string[] = [];
    for (const axis of AXES) {
      for (const arm of axis.arms) {
        if (arm.current && styled.has(`${axis.key}:${arm.id}`)) dupes.push(`${axis.key}:${arm.id}`);
      }
    }
    expect(dupes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// An inline style beats a stylesheet rule.
//
// This is the look system's OTHER silent failure, and the gate above is
// structurally blind to it: the registry and the stylesheet can agree
// perfectly while the component writes the same property inline, so the
// attribute lands on <html>, the rule matches, and the browser ignores it.
//
// It is not hypothetical. `#felt` carried `borderRadius`, `background`,
// `border` and `boxShadow` inline, which killed every arm of THREE axes —
// table, cloth and rail, fourteen options — while every other check was green.
// Measured in a real browser: `data-look-table="circle"` set, computed
// border-radius still `48% / 40%`.
//
// So each element the look system owns declares what it is still allowed to
// set inline, and anything else fails here. A false RED is the friendly
// direction: it stops a build and names the property, where the failure it
// replaces reads as "that option is boring".
const FILES = (name: string) =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "table", name), "utf8");

/** The style object literal that follows a marker, up to its closing `}}`. */
function styleAfter(src: string, marker: string): string {
  const at = src.indexOf(marker);
  if (at < 0) throw new Error(`marker not found: ${marker}`);
  const open = src.indexOf("style={{", at);
  if (open < 0) return "";
  const close = src.indexOf("}}", open);
  return src.slice(open, close);
}

group("the components leave the look alone", () => {
  const cases: { file: string; marker: string; allowed: string[] }[] = [
    // The felt: only what the measured layout knows.
    { file: "Table.tsx", marker: 'id="felt"', allowed: ["--felt-inset", "--rail-w"] },
    // The card: only its width. Height, radius, colour and the deal animation
    // are all derived from it in the stylesheet.
    {
      file: "CardFace.tsx",
      marker: 'className="hm-card"',
      allowed: ["position", "--card-w", "background", "boxShadow", "overflow", "animationDelay"],
    },
    // The nameplate: only what the table's scaling owns.
    { file: "Seat.tsx", marker: 'className="hm-plate"', allowed: ["padding", "textAlign", "minWidth"] },
  ];

  for (const c of cases) {
    it(`${c.file} ${c.marker} sets only what the stylesheet cannot know`, () => {
      const block = styleAfter(FILES(c.file), c.marker);
      // Both quoted computed keys (["--x" as string]) and bare ones.
      const keys = [...block.matchAll(/(?:\["?(--[a-z-]+)"?[^\]]*\]|(?:^|[\s{])([a-zA-Z]+))\s*:/g)]
        .map((m) => m[1] ?? m[2])
        .filter((k) => k && k !== "style");
      expect(keys.filter((k) => !c.allowed.includes(k))).toEqual([]);
    });
  }

  // The positive control: the extractor must actually be reading something.
  // An `indexOf` that missed would return "" and every assertion above would
  // pass over an empty string — the same shape as a precache matcher that
  // finds zero entries and reports every absence as satisfied.
  it("the extractor found real style blocks", () => {
    for (const c of cases) expect(styleAfter(FILES(c.file), c.marker).length).toBeGreaterThan(20);
  });
});

group("the registry is well formed", () => {
  it("covers every key the store knows, in order", () => {
    expect(AXES.map((a) => a.key)).toEqual([...LOOK_KEYS]);
  });

  it("gives every axis exactly one shipped default", () => {
    for (const axis of AXES) {
      expect(axis.arms.filter((a) => a.current)).toHaveLength(1);
    }
  });

  it("gives every axis a real choice", () => {
    for (const axis of AXES) expect(axis.arms.length).toBeGreaterThanOrEqual(4);
  });

  it("has no duplicate arm id within an axis", () => {
    for (const axis of AXES) {
      expect(new Set(axis.arms.map((a) => a.id)).size).toBe(axis.arms.length);
    }
  });

  // The store's own filter. An id that would not survive a round trip through
  // storage is one nobody can keep, and the failure is silent: pick it, close
  // the app, and it is gone.
  it("has only arm ids the store will accept back", () => {
    const ok = /^[a-z0-9][a-z0-9-]{0,23}$/;
    for (const axis of AXES) {
      for (const arm of axis.arms) expect(ok.test(arm.id), arm.id).toBe(true);
    }
  });

  it("says something about every arm", () => {
    for (const axis of AXES) {
      for (const arm of axis.arms) {
        expect(arm.name.length, arm.id).toBeGreaterThan(2);
        expect(arm.blurb.length, arm.id).toBeGreaterThan(12);
      }
    }
  });
});
