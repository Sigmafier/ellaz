import { describe, expect, it } from "vitest";

import { mulberry32, seedFrom } from "./engine/rng";
import {
  ADJECTIVES,
  isPlayerName,
  NAME_COMBINATIONS,
  nameEmoji,
  NOUNS,
  pickName,
  type PlayerName,
  renderName,
  rerollName,
  resolveName,
} from "./names";

const rng = () => mulberry32(seedFrom("names-1"));

describe("the pool", () => {
  it("has enough names that a table of nine rarely collides", () => {
    expect(NAME_COMBINATIONS).toBe(ADJECTIVES.length * NOUNS.length);
    expect(NAME_COMBINATIONS).toBeGreaterThanOrEqual(300);
  });

  it("has unique ids in both halves", () => {
    expect(new Set(ADJECTIVES.map((a) => a.id)).size).toBe(ADJECTIVES.length);
    expect(new Set(NOUNS.map((n) => n.id)).size).toBe(NOUNS.length);
  });

  it("gives every noun a distinct emoji, so two seats never wear one face", () => {
    expect(new Set(NOUNS.map((n) => n.emoji)).size).toBe(NOUNS.length);
  });

  it("never ranks a player — no adjective describes skill", () => {
    // "Best", "Winning", "Pro" would make a name read as a prize that the
    // player on the next seat missed out on. A name is not a leaderboard.
    const ranking = /best|winner|winning|pro|top|elite|champion|rich|poor|loser/i;
    for (const a of ADJECTIVES) expect(a.en, `${a.id} ranks the player`).not.toMatch(ranking);
  });
});

describe("resolving a name", () => {
  it("renders adjective then noun", () => {
    expect(renderName({ adj: ADJECTIVES[0].id, noun: NOUNS[0].id })).toBe(
      `${ADJECTIVES[0].en} ${NOUNS[0].en}`,
    );
  });

  it("returns undefined rather than a placeholder when a word is unknown", () => {
    expect(renderName({ adj: "no-such-word", noun: NOUNS[0].id })).toBeUndefined();
    expect(renderName({ adj: ADJECTIVES[0].id, noun: "no-such-animal" })).toBeUndefined();
    expect(renderName(undefined)).toBeUndefined();
  });

  it("gives back the noun's emoji", () => {
    expect(nameEmoji({ adj: ADJECTIVES[0].id, noun: NOUNS[3].id })).toBe(NOUNS[3].emoji);
    expect(nameEmoji({ adj: "nope", noun: "nope" })).toBeUndefined();
  });
});

// This is the half that matters on a server: the ids arrive over a socket from
// a client we do not control, so they are input, not data.
describe("isPlayerName, as a wire guard", () => {
  it("accepts a well-formed pair", () => {
    expect(isPlayerName({ adj: "swift", noun: "tiger" })).toBe(true);
  });

  it("rejects everything that is not one", () => {
    for (const bad of [
      null,
      undefined,
      "swift tiger",
      42,
      [],
      ["swift", "tiger"],
      {},
      { adj: "swift" },
      { noun: "tiger" },
      { adj: "", noun: "tiger" },
      { adj: "swift", noun: "" },
      { adj: 1, noun: 2 },
      { adj: ["swift"], noun: "tiger" },
    ]) {
      expect(isPlayerName(bad), `${JSON.stringify(bad)} must be rejected`).toBe(false);
    }
  });

  it("is a SHAPE check and does not vouch for the words", () => {
    // Shape and membership are separate questions. resolveName answers the
    // second one, and it is the one the server must ask before storing.
    expect(isPlayerName({ adj: "made-up", noun: "invented" })).toBe(true);
    expect(resolveName({ adj: "made-up", noun: "invented" })).toBeUndefined();
  });

  it("refuses a name carrying anything beyond the two ids", () => {
    // A client that can smuggle a field through the guard can smuggle it into
    // storage. Extra keys are rejected rather than dropped, so the refusal is
    // visible instead of silent.
    expect(isPlayerName({ adj: "swift", noun: "tiger", label: "<script>" })).toBe(false);
  });
});

describe("picking", () => {
  it("only ever produces names that resolve", () => {
    const r = rng();
    for (let i = 0; i < 2000; i++) expect(resolveName(pickName(r))).toBeDefined();
  });

  it("reaches every combination given enough draws", () => {
    const r = rng();
    const seen = new Set<string>();
    for (let i = 0; i < 40_000; i++) {
      const n = pickName(r);
      seen.add(`${n.adj}/${n.noun}`);
    }
    expect(seen.size).toBe(NAME_COMBINATIONS);
  });
});

describe("rerolling", () => {
  it("ALWAYS changes the name", () => {
    // The button's whole job. Drawing-and-retrying would be unbounded on a
    // degenerate rng; this must be a guarantee, not a probability.
    const r = rng();
    let current: PlayerName = pickName(r);
    for (let i = 0; i < 5000; i++) {
      const next = rerollName(current, r);
      expect(`${next.adj}/${next.noun}`).not.toBe(`${current.adj}/${current.noun}`);
      current = next;
    }
  });

  it("survives a degenerate rng that always returns 0", () => {
    const zero = () => 0;
    const current = pickName(zero);
    expect(rerollName(current, zero)).not.toEqual(current);
  });

  it("survives an rng pinned just below 1", () => {
    const high = () => 0.9999999;
    const current = pickName(high);
    const next = rerollName(current, high);
    expect(resolveName(next)).toBeDefined();
    expect(next).not.toEqual(current);
  });

  it("still returns a real name when the current one is unresolvable", () => {
    expect(resolveName(rerollName({ adj: "gone", noun: "gone" }, rng()))).toBeDefined();
    expect(resolveName(rerollName(undefined, rng()))).toBeDefined();
  });

  it("can still reach every OTHER combination", () => {
    const r = rng();
    const current: PlayerName = { adj: ADJECTIVES[0].id, noun: NOUNS[0].id };
    const seen = new Set<string>();
    for (let i = 0; i < 40_000; i++) {
      const n = rerollName(current, r);
      seen.add(`${n.adj}/${n.noun}`);
    }
    expect(seen.size).toBe(NAME_COMBINATIONS - 1);
    expect(seen.has(`${current.adj}/${current.noun}`)).toBe(false);
  });
});
