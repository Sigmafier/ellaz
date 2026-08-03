import { describe, it, expect } from "vitest";
import {
  BACKUP_ALPHABET,
  CODE_LENGTH,
  formatBackupCode,
  makeBackupCode,
  normalizeBackupCode,
} from "./backupCode";
import { mulberry32 } from "@shared/rng";

describe("the alphabet", () => {
  it("excludes every character a child could mistype for another", () => {
    // Crockford base32. I, L and O are absent because they are indistinguishable
    // from 1 and 0 in most fonts and on a handwritten note, which is exactly
    // where this code lives. U is absent so the alphabet cannot spell an
    // unfortunate word by accident.
    for (const banned of ["I", "L", "O", "U"]) {
      expect(BACKUP_ALPHABET, banned).not.toContain(banned);
    }
    expect(BACKUP_ALPHABET).toHaveLength(32);
    expect(new Set(BACKUP_ALPHABET).size).toBe(32);
    // Uppercase only — normalisation upper-cases before it validates.
    expect(BACKUP_ALPHABET).toBe(BACKUP_ALPHABET.toUpperCase());
  });
});

describe("making a code", () => {
  it("is deterministic for a seeded rng", () => {
    expect(makeBackupCode(mulberry32(4))).toBe(makeBackupCode(mulberry32(4)));
  });

  it("produces a grouped code that reads back as itself", () => {
    const code = makeBackupCode(mulberry32(9));
    expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(normalizeBackupCode(code)).toBe(code);
  });

  it("only ever uses the safe alphabet", () => {
    const rng = mulberry32(21);
    for (let i = 0; i < 2000; i++) {
      for (const ch of makeBackupCode(rng).replace("-", "")) {
        expect(BACKUP_ALPHABET).toContain(ch);
      }
    }
  });

  it("reaches every character of the alphabet", () => {
    const rng = mulberry32(5);
    const seen = new Set<string>();
    for (let i = 0; i < 20000; i++) {
      for (const ch of makeBackupCode(rng).replace("-", "")) seen.add(ch);
    }
    expect(seen.size).toBe(BACKUP_ALPHABET.length);
  });

  it("does not collide in practice", () => {
    // 32^8 is ~1.1e12, so 20k draws colliding would mean the generator is
    // broken rather than that we got unlucky.
    const rng = mulberry32(77);
    const seen = new Set<string>();
    for (let i = 0; i < 20000; i++) seen.add(makeBackupCode(rng));
    expect(seen.size).toBe(20000);
  });

  it("defaults to Math.random", () => {
    expect(normalizeBackupCode(makeBackupCode())).toBeTruthy();
  });
});

describe("reading a code back", () => {
  const canonical = "7K2M-3NPQ";

  it("accepts the shapes a person actually types", () => {
    for (const typed of [
      "7K2M-3NPQ",
      "7k2m-3npq",
      "7K2M3NPQ",
      "  7K2M - 3NPQ  ",
      "7K2M 3NPQ",
      "7-K-2-M-3-N-P-Q",
      // Stray punctuation is dropped rather than refused. Stripping a
      // non-alphanumeric can never turn one valid code into a DIFFERENT valid
      // code — it only ever removes noise — so there is nothing to protect
      // against here, and refusing would be blaming a seven-year-old for a
      // stray keystroke.
      "7K2M-3NPQ!",
    ]) {
      expect(normalizeBackupCode(typed), typed).toBe(canonical);
    }
  });

  it("repairs the confusions the alphabet was chosen to avoid", () => {
    // Someone reading their own handwriting types O for 0 and I or L for 1.
    // Rejecting that would be blaming the child for the font.
    expect(normalizeBackupCode("OIL0-1234")).toBe("0110-1234");
    expect(normalizeBackupCode("oil0-1234")).toBe("0110-1234");
  });

  it("rejects anything that is not a code", () => {
    for (const bad of [
      "",
      "   ",
      "7K2M",
      "7K2M-3NPQ-XXXX",
      "7K2M-3NP",
      "UUUU-UUUU", // U is not in the alphabet and is NOT a confusable
      "....-....",
      null,
      undefined,
      42,
      {},
    ]) {
      expect(normalizeBackupCode(bad as unknown as string), JSON.stringify(bad)).toBeUndefined();
    }
  });

  it("is idempotent", () => {
    const once = normalizeBackupCode("oil0-1234")!;
    expect(normalizeBackupCode(once)).toBe(once);
  });

  it("groups an ungrouped code the same way it makes one", () => {
    expect(formatBackupCode("7K2M3NPQ")).toBe(canonical);
    expect(formatBackupCode("7K2M3NPQ")).toHaveLength(CODE_LENGTH + 1);
  });
});
