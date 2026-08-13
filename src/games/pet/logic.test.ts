import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  CARE,
  CARE_KINDS,
  GRANTED_GAIN,
  MAX_CARE_KEYS,
  MAX_STAGE,
  MILESTONE_EVERY,
  PETS,
  PET_IDS,
  PLAIN_GAIN,
  STAGE_CARE,
  careFor,
  careOf,
  growth,
  isPetState,
  newPet,
  petById,
  reWish,
  sanitizeGrown,
  scoreReport,
  stageFor,
  startOver,
  type CareKind,
  type PetState,
} from "./logic";

const seeded = (label: string) => mulberry32(seedFrom(label));

/** A state written by hand, so a rule can be checked without playing to it. */
function at(care: number, wish: CareKind = "feed", pet = PET_IDS[0]): PetState {
  return { care: { [pet]: care }, wish };
}

describe("the cast — creatures and the four kinds of care", () => {
  it("offers exactly four kinds of care, each with a face and a name in every written language", () => {
    expect(CARE_KINDS).toEqual(["feed", "wash", "play", "cuddle"]);
    for (const kind of CARE_KINDS) {
      const action = CARE[kind];
      expect(action.emoji.length, `${kind} has no face`).toBeGreaterThan(0);
      // A `Record<PageLocale, string>` cannot be short a language at compile
      // time; this catches the other half — a key present and left empty.
      for (const value of Object.values(action.name)) {
        expect(value.length, `${kind} has an empty name`).toBeGreaterThan(0);
      }
    }
  });

  it("offers three creatures with distinct ids, and resolves one by id", () => {
    expect(PETS).toHaveLength(3);
    expect(new Set(PET_IDS).size).toBe(PETS.length);
    for (const p of PETS) expect(petById(p.id)).toBe(p);
  });

  it("falls back to the first creature rather than undefined for an id it has never heard of", () => {
    // A stored level id from a build that shipped a fourth creature reaches
    // here. Answering `undefined` renders a pet with no colour and no name.
    expect(petById("nobody-at-all")).toBe(PETS[0]);
  });
});

describe("growing up", () => {
  it("starts at the first stage and ends at the last", () => {
    expect(stageFor(0)).toBe(0);
    expect(stageFor(STAGE_CARE[MAX_STAGE])).toBe(MAX_STAGE);
    expect(stageFor(STAGE_CARE[MAX_STAGE] * 100)).toBe(MAX_STAGE);
  });

  it("crosses into a stage exactly at its threshold, never one short", () => {
    for (let s = 1; s <= MAX_STAGE; s++) {
      expect(stageFor(STAGE_CARE[s] - 1)).toBe(s - 1);
      expect(stageFor(STAGE_CARE[s])).toBe(s);
    }
  });

  it("never goes backwards as care climbs", () => {
    let last = 0;
    for (let care = 0; care <= STAGE_CARE[MAX_STAGE] + 40; care++) {
      const s = stageFor(care);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
  });

  it("treats nonsense care as a newborn rather than throwing", () => {
    // Every one of these can arrive off a hand-edited disk.
    expect(stageFor(-5)).toBe(0);
    expect(stageFor(Number.NaN)).toBe(0);
    expect(stageFor(Number.POSITIVE_INFINITY)).toBe(MAX_STAGE);
  });

  it("reports how far into the current stage the pet is, bounded to 0..1", () => {
    for (let care = 0; care <= STAGE_CARE[MAX_STAGE] + 40; care++) {
      const g = growth(care);
      expect(g.stage).toBe(stageFor(care));
      expect(g.ratio).toBeGreaterThanOrEqual(0);
      expect(g.ratio).toBeLessThanOrEqual(1);
    }
    // Fully grown reads as full, not as a division by a zero-width stage.
    expect(growth(STAGE_CARE[MAX_STAGE]).ratio).toBe(1);
  });
});

describe("a new pet", () => {
  it("has cared for nobody yet and is already wishing for something", () => {
    const s = newPet(seeded("new"));
    expect(s.care).toEqual({});
    expect(CARE_KINDS).toContain(s.wish);
    expect(careOf(s, PET_IDS[0])).toBe(0);
  });

  it("is the same pet twice from the same seed", () => {
    expect(newPet(seeded("same"))).toEqual(newPet(seeded("same")));
  });

  it("reads a creature nobody has touched as zero rather than undefined", () => {
    expect(careOf(newPet(seeded("x")), PET_IDS[2])).toBe(0);
  });

  it("reads a hand-edited negative or NaN as zero", () => {
    expect(careOf({ care: { pip: -40 }, wish: "feed" }, "pip")).toBe(0);
    expect(careOf({ care: { pip: Number.NaN }, wish: "feed" }, "pip")).toBe(0);
  });
});

describe("caring for it — there is no wrong tap", () => {
  const pet = PET_IDS[0];

  it("accepts every kind of care, always, whatever the pet asked for", () => {
    for (const wish of CARE_KINDS) {
      for (const kind of CARE_KINDS) {
        const r = careFor(at(4, wish), pet, kind, seeded(`${wish}-${kind}`));
        expect(r.outcome.gain, `${kind} against a wish for ${wish} paid nothing`).toBeGreaterThan(0);
        expect(r.outcome.care).toBeGreaterThan(4);
      }
    }
  });

  it("pays more for the thing the pet actually asked for", () => {
    expect(GRANTED_GAIN).toBeGreaterThan(PLAIN_GAIN);
    const wanted = careFor(at(0, "play"), pet, "play", seeded("a"));
    const other = careFor(at(0, "play"), pet, "feed", seeded("a"));
    expect(wanted.outcome.granted).toBe(true);
    expect(other.outcome.granted).toBe(false);
    expect(wanted.outcome.gain).toBeGreaterThan(other.outcome.gain);
  });

  it("asks for something else once the wish is granted, and never for the same thing again", () => {
    for (const wish of CARE_KINDS) {
      const r = careFor(at(0, wish), pet, wish, seeded(`grant-${wish}`));
      expect(r.state.wish).not.toBe(wish);
      expect(CARE_KINDS).toContain(r.state.wish);
    }
  });

  it("keeps wishing for the same thing when something else was offered", () => {
    const r = careFor(at(0, "wash"), pet, "feed", seeded("keep"));
    expect(r.state.wish).toBe("wash");
  });

  it("never mutates the state it was handed", () => {
    const before = at(7, "cuddle");
    const snapshot = JSON.stringify(before);
    careFor(before, pet, "cuddle", seeded("pure"));
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("leaves the other creatures alone", () => {
    const s: PetState = { care: { [PET_IDS[0]]: 10, [PET_IDS[1]]: 30 }, wish: "feed" };
    const r = careFor(s, PET_IDS[0], "feed", seeded("solo"));
    expect(careOf(r.state, PET_IDS[1])).toBe(30);
  });
});

describe("what a run is paid for, and paid for once", () => {
  const pet = PET_IDS[0];

  /** Tap the same care 400 times and collect what each tap reported. */
  function longRun(kind: CareKind = "feed") {
    const rng = seeded("long");
    let s = newPet(rng);
    const grew: number[] = [];
    const milestones: number[] = [];
    for (let i = 0; i < 400; i++) {
      const r = careFor(s, pet, kind, rng);
      s = r.state;
      if (r.outcome.grew) grew.push(r.outcome.stage);
      if (r.outcome.milestone) milestones.push(r.outcome.care);
    }
    return { state: s, grew, milestones };
  }

  it("reports each growth exactly once, in order, and never past the last stage", () => {
    const { grew } = longRun();
    expect(grew).toEqual([1, 2, 3, 4].slice(0, MAX_STAGE));
    expect(new Set(grew).size).toBe(grew.length);
  });

  it("reports a milestone only on crossing a multiple of the step", () => {
    const { milestones } = longRun();
    expect(milestones.length).toBeGreaterThan(10);
    for (const care of milestones) {
      // The crossing tap lands ON the multiple or barely past it - never
      // before - so the remainder is smaller than the biggest a tap can gain.
      expect(care % MILESTONE_EVERY, `${care} is not a crossing`).toBeLessThan(GRANTED_GAIN);
    }
    expect(new Set(milestones).size).toBe(milestones.length);
  });

  it("never pays a milestone and a growth for the same tap", () => {
    const rng = seeded("both");
    let s = newPet(rng);
    for (let i = 0; i < 400; i++) {
      const r = careFor(s, pet, "feed", rng);
      expect(r.outcome.grew && r.outcome.milestone).toBe(false);
      s = r.state;
    }
  });

  /**
   * The double-pay trap, stated as a property rather than as a story.
   *
   * Both flags are derived from the care value alone, and care is persisted. So
   * a snapshot taken anywhere in a run and replayed reports exactly what the
   * live run reported at that point — leaving the game and coming back cannot
   * re-collect a growth or a milestone, because there is no separate latch to
   * lose. See session-snapshot-convention.md.
   */
  it("reports the same thing for a state whether it was played to or restored", () => {
    const rng = seeded("replay");
    let s = newPet(rng);
    for (let i = 0; i < 120; i++) {
      const live = careFor(s, pet, "feed", rng);
      // The same state, arriving off a disk with a fresh rng behind it.
      const restored = careFor(JSON.parse(JSON.stringify(s)) as PetState, pet, "feed", seeded(`r${i}`));
      expect(restored.outcome.grew).toBe(live.outcome.grew);
      expect(restored.outcome.milestone).toBe(live.outcome.milestone);
      expect(restored.outcome.care).toBe(live.outcome.care);
      s = live.state;
    }
  });
});

describe("starting over, and changing who is on screen", () => {
  it("puts one creature back to the beginning and leaves the others untouched", () => {
    const s: PetState = { care: { [PET_IDS[0]]: 90, [PET_IDS[1]]: 12 }, wish: "feed" };
    const next = startOver(s, PET_IDS[0], seeded("over"));
    expect(careOf(next, PET_IDS[0])).toBe(0);
    expect(careOf(next, PET_IDS[1])).toBe(12);
    expect(stageFor(careOf(next, PET_IDS[0]))).toBe(0);
  });

  it("gives a fresh wish on a re-wish, and a different one", () => {
    for (const wish of CARE_KINDS) {
      expect(reWish({ care: {}, wish }, seeded(`w-${wish}`)).wish).not.toBe(wish);
    }
  });
});

describe("the record", () => {
  it("measures how big this creature has ever grown, on its own board", () => {
    const s: PetState = { care: { [PET_IDS[0]]: 61, [PET_IDS[1]]: 4 }, wish: "feed" };
    expect(scoreReport(s, PET_IDS[0])).toEqual({
      value: 61,
      unit: "points",
      board: PET_IDS[0],
    });
    // Per creature, because they are three separate pets rather than three
    // difficulties of one.
    expect(scoreReport(s, PET_IDS[1]).board).not.toBe(scoreReport(s, PET_IDS[0]).board);
  });

  it("says nothing about a creature nobody has raised, rather than a negative", () => {
    expect(scoreReport(newPet(seeded("z")), PET_IDS[2]).value).toBe(0);
  });
});

describe("what may come back off the disk", () => {
  it("accepts a pet this build wrote", () => {
    expect(isPetState(newPet(seeded("ok")))).toBe(true);
    expect(isPetState({ care: {}, wish: "play" })).toBe(true);
  });

  it("accepts one missing a creature this build has, so adding a creature does not wipe a pet", () => {
    expect(isPetState({ care: { [PET_IDS[0]]: 30 }, wish: "feed" })).toBe(true);
  });

  it("refuses anything a renderer would draw wrong", () => {
    const junk: unknown[] = [
      null,
      undefined,
      42,
      "pet",
      [],
      {},
      { care: {} },
      { wish: "feed" },
      { care: {}, wish: "sing" },
      { care: {}, wish: 3 },
      { care: [], wish: "feed" },
      { care: null, wish: "feed" },
      { care: { pip: "lots" }, wish: "feed" },
      { care: { pip: -1 }, wish: "feed" },
      { care: { pip: Number.NaN }, wish: "feed" },
      { care: { pip: Number.POSITIVE_INFINITY }, wish: "feed" },
    ];
    for (const value of junk) {
      expect(isPetState(value), `accepted ${JSON.stringify(value)}`).toBe(false);
    }
  });

  it("refuses a blob carrying more creatures than this app could ever have", () => {
    const care: Record<string, number> = {};
    for (let i = 0; i <= MAX_CARE_KEYS; i++) care[`pet-${i}`] = 1;
    expect(isPetState({ care, wish: "feed" })).toBe(false);
  });

  it("keeps only sane growth latches out of the lifetime record", () => {
    expect(sanitizeGrown(null)).toEqual({});
    expect(sanitizeGrown("nope")).toEqual({});
    expect(sanitizeGrown([1, 2])).toEqual({});
    expect(sanitizeGrown({ pip: 3, mo: "big", tuli: -2, x: Number.NaN })).toEqual({ pip: 3 });
    // Clamped, so a hand-edited 900 cannot silence every future growth reward
    // by claiming this pet already passed a stage that does not exist.
    expect(sanitizeGrown({ pip: 900 })).toEqual({ pip: MAX_STAGE });
  });
});

describe("the rules keep no clock", () => {
  /**
   * The pet must never get hungry, sad or sick while the app is closed, and the
   * cheapest way to guarantee that is for the rules to have no way of knowing
   * time passed at all. A wall clock reaching this file is how a warm toy turns
   * into a responsibility simulator by accident.
   *
   * The second half is the memory-lock trap from session-snapshot-convention:
   * the state carries only what a TAP can change, so there is no field a
   * pending timeout must clear and therefore none that can reach the disk
   * half-cleared. Every transient reaction lives in the renderer.
   */
  it("names no clock and schedules nothing", () => {
    const src = readFileSync(new URL("./logic.ts", import.meta.url), "utf8");
    for (const forbidden of ["Date.now", "new Date", "setTimeout", "setInterval", "performance.now"]) {
      expect(src.includes(forbidden), `logic.ts reaches for ${forbidden}`).toBe(false);
    }
  });

  it("stores nothing a timer would have to clear", () => {
    expect(Object.keys(newPet(seeded("keys"))).sort()).toEqual(["care", "wish"]);
  });
});
