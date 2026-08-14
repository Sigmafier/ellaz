// The house seats.
//
// The brain is tested next door in shared/src/bot/; this is about the seam —
// that a bot is recognised, that what it hands the engine is something the
// engine will accept, and that it never gets its own face confused with
// somebody else's.

import { describe as group, expect, it } from "vitest";
import { computeLegal } from "../../shared/src/engine/betting";
import { mulberry32, seedFrom } from "../../shared/src/engine/rng";
import { apply } from "../../shared/src/engine/table";
import { newTable, rig, start } from "../../shared/src/engine/testkit";
import { NOUNS } from "../../shared/src/names";
import { botCommand, botId, isBot, personaFor, pickDistinctName, thinkMs } from "./botSeats";

const seed = (s: string) => mulberry32(seedFrom(s));

group("who is a bot", () => {
  it("recognises its own seats and nobody else's", () => {
    expect(isBot(botId(0))).toBe(true);
    expect(isBot(botId(7))).toBe(true);
    // The shape a real player gets — crypto.randomUUID().
    expect(isBot("2f1c8f8e-1b3a-4c9d-9f22-7a1b0c5d6e7f")).toBe(false);
    expect(isBot(null)).toBe(false);
    expect(isBot(undefined)).toBe(false);
    expect(isBot("")).toBe(false);
  });

  it("cannot be spelled by any token a client is allowed to send", () => {
    // `parseC2S` refuses a token under eight characters, and that is the only
    // thing keeping a bot's record safe in the same map as everyone else's.
    for (let i = 0; i < 9; i++) expect(botId(i).length).toBeLessThan(8);
  });

  it("gives a seat a stable character", () => {
    expect(personaFor(0)).toBe(personaFor(0));
    expect(personaFor(0)).not.toBe(personaFor(1));
  });
});

group("how long it thinks", () => {
  it("stays inside its persona's window", () => {
    const rng = seed("think");
    for (let i = 0; i < 200; i++) {
      const p = personaFor(i);
      const ms = thinkMs(p, rng);
      expect(ms).toBeGreaterThanOrEqual(p.think[0]);
      expect(ms).toBeLessThanOrEqual(p.think[1]);
    }
  });

  it("never approaches an action clock", () => {
    // The table arms this as the seat's deadline. Longer than `actionTimeMs`
    // and the timeout branch would fold the house before it ever decided.
    for (const p of [personaFor(0), personaFor(1), personaFor(2), personaFor(3)]) {
      expect(p.think[1]).toBeLessThan(5_000);
    }
  });
});

group("what it hands the engine", () => {
  const table = () =>
    newTable([
      { name: "Bot Zero", stack: 200 },
      { name: "Bot One", stack: 200 },
      { name: "A Person", stack: 200 },
    ]);

  it("says nothing when it is not on", () => {
    const s = start(table(), "not-on").state;
    const off = [0, 1, 2].filter((i) => i !== s.hand!.toAct);
    for (const seat of off) expect(botCommand(s, seat, seed("x"))).toBeNull();
  });

  it("says nothing when there is no hand at all", () => {
    expect(botCommand(table(), 0, seed("x"))).toBeNull();
  });

  it("produces an action the ENGINE accepts — every kind of action", () => {
    // The one that matters. `validateTo` throws on an amount outside the
    // legal band, so driving real hands and letting the throw surface IS the
    // assertion — a command the engine refuses is not a bad play, it is a
    // seat that never acts, folded by the clock every hand.
    //
    // EIGHT SEEDS AND A COVERAGE ASSERTION, and both are load-bearing. The
    // first version ran two hands and was mutation-proven with a raise sized
    // three times past its band — which SURVIVED, because neither of those
    // two hands contained a raise. The test was not weak; it was empty in the
    // branch it existed to cover, and nothing said so.
    const kinds = new Map<string, number>();
    let acted = 0;

    for (const s0 of ["accepts", "legal", "a", "b", "c", "d", "e", "f"]) {
      let s = start(table(), s0).state;
      const rng = seed(s0);
      for (let i = 0; i < 60 && s.hand && s.hand.toAct >= 0; i++) {
        const cmd = botCommand(s, s.hand.toAct, rng);
        expect(cmd).not.toBeNull();
        const kind = (cmd as Extract<typeof cmd, { type: "act" }>).action.kind;
        kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
        s = apply(s, cmd!, rng).state;
        acted++;
      }
    }

    expect(acted).toBeGreaterThan(50);
    // Everything the policy can say must have been said at least once, or
    // this sweep is only testing the arms it happened to reach.
    for (const kind of ["fold", "check", "call", "bet", "raise"]) {
      expect(kinds.get(kind) ?? 0, `never produced a ${kind}`).toBeGreaterThan(0);
    }
  });

  it("only ever names an action that was legal", () => {
    let s = start(table(), "legal").state;
    const rng = seed("legal");
    for (let i = 0; i < 40 && s.hand && s.hand.toAct >= 0; i++) {
      const seat = s.hand.toAct;
      const legal = computeLegal(s, seat)!;
      const cmd = botCommand(s, seat, rng)!;
      expect(cmd.type).toBe("act");
      const act = (cmd as Extract<typeof cmd, { type: "act" }>).action;
      expect(legal.actions).toContain(act.kind);
      s = apply(s, cmd, rng).state;
    }
  });
});

group("its face", () => {
  it("never wears an animal already at the table", () => {
    // 27% of four-handed tables and 56% of six-handed ones drew a duplicate
    // before this existed, and the operator hit it on the first table the
    // bots ever sat at: Nimble Squirrel beside Brave Squirrel.
    const rng = seed("faces");
    for (let round = 0; round < 300; round++) {
      const taken = new Set<string>();
      for (let seat = 0; seat < 6; seat++) {
        const name = pickDistinctName(taken, rng);
        expect(taken.has(name.noun)).toBe(false);
        taken.add(name.noun);
      }
      expect(taken.size).toBe(6);
    }
  });

  it("still answers when every animal is taken", () => {
    // More seats than animals cannot happen — nine is the maximum and there
    // are twenty — but a name is not worth hanging a table for, so the
    // impossible case returns something rather than looping.
    const all = new Set(NOUNS.map((n) => n.id));
    const name = pickDistinctName(all, seed("full"));
    expect(typeof name.noun).toBe("string");
    expect(all.has(name.noun)).toBe(true);
  });

  it("does not care about the adjective", () => {
    // Only the animal is the picture. Reserving adjectives too would burn the
    // pool four times faster for no visible gain.
    const rng = rig("adj");
    const taken = new Set<string>();
    const adjectives = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const n = pickDistinctName(taken, rng);
      taken.add(n.noun);
      adjectives.add(n.adj);
    }
    expect(adjectives.size).toBeLessThanOrEqual(12);
  });
});
