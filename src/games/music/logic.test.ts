import { describe, expect, it } from "vitest";
import { PENTATONIC } from "@shared/notes";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  LENGTHS,
  MILESTONE_EVERY,
  ROWS,
  STEPS,
  VOICES,
  cellIndex,
  clearTune,
  columnRows,
  isVoice,
  milestoneStep,
  newTune,
  noteCount,
  pitchFor,
  resize,
  scoreReport,
  setVoice,
  surprise,
  toggleCell,
  type TuneState,
} from "./logic";

const seeded = (label: string) => mulberry32(seedFrom(label));

/** Turn a picture of a tune into a state, so a failure is readable in the diff. */
function tuneFrom(rows: string[], voice: TuneState["voice"] = "round"): TuneState {
  const steps = rows[0].length;
  const level = LENGTHS.find((l) => STEPS[l] === steps)!;
  const state = newTune(level, voice);
  return {
    ...state,
    cells: state.cells.map((_, i) => rows[Math.floor(i / steps)][i % steps] === "x"),
  };
}

describe("a blank tune", () => {
  it("opens with nothing in it, at every length", () => {
    for (const level of LENGTHS) {
      const tune = newTune(level);
      expect(tune.steps).toBe(STEPS[level]);
      expect(tune.cells).toHaveLength(ROWS * STEPS[level]);
      expect(tune.cells.every((c) => c === false)).toBe(true);
      expect(noteCount(tune)).toBe(0);
    }
  });

  it("has one row per note the scale offers", () => {
    // The grid IS the scale. A row with no pitch behind it would be a square a
    // child can turn on that makes no sound.
    expect(ROWS).toBe(PENTATONIC.length);
  });

  it("starts on a voice this game actually has", () => {
    expect(VOICES).toContain(newTune("medium").voice);
  });
});

describe("turning notes on and off", () => {
  it("reports which square changed, and which way", () => {
    const blank = newTune("medium");
    const at = cellIndex(2, 3, blank.steps);
    const on = toggleCell(blank, at);
    expect(on.outcome).toEqual({ kind: "on", row: 2, col: 3 });
    expect(noteCount(on.state)).toBe(1);

    const off = toggleCell(on.state, at);
    expect(off.outcome).toEqual({ kind: "off", row: 2, col: 3 });
    expect(noteCount(off.state)).toBe(0);
  });

  it("leaves everything else alone", () => {
    const tune = tuneFrom(["x.....", "......", "......", "......", "......", "......"]);
    const next = toggleCell(tune, cellIndex(5, 5, tune.steps)).state;
    expect(next.cells[cellIndex(0, 0, tune.steps)]).toBe(true);
    expect(noteCount(next)).toBe(2);
  });

  it("says nothing about a square that is not there", () => {
    const tune = newTune("short");
    for (const bad of [-1, tune.cells.length, 2.5, Number.NaN]) {
      const { state, outcome } = toggleCell(tune, bad);
      expect(outcome).toEqual({ kind: "ignored" });
      expect(state).toBe(tune);
    }
  });

  it("lets a whole column ring at once", () => {
    // Chords are allowed on purpose: the scale has no semitone and no tritone,
    // so ANY handful of these notes together is consonant. A one-note-per-column
    // rule would be protecting a child from something that cannot happen.
    const tune = tuneFrom(["x...", "x...", "....", "x...", "....", "...."]);
    expect(columnRows(tune, 0)).toEqual([0, 1, 3]);
    expect(columnRows(tune, 1)).toEqual([]);
  });

  it("reads a column from the top down, so a chord always plays in the same order", () => {
    const tune = tuneFrom(["....", ".x..", ".x..", "....", ".x..", "...."]);
    expect(columnRows(tune, 1)).toEqual([1, 2, 4]);
  });

  it("has nothing to play in a column that is not there", () => {
    const tune = newTune("short");
    expect(columnRows(tune, -1)).toEqual([]);
    expect(columnRows(tune, tune.steps)).toEqual([]);
  });
});

describe("which note a row is", () => {
  it("runs high at the top and low at the bottom", () => {
    // The one thing this game teaches without a word: higher up is higher up.
    // Getting it upside down would be invisible in every other test here.
    const pitches = Array.from({ length: ROWS }, (_, r) => pitchFor(r));
    expect(pitches[0]).toBe(Math.max(...PENTATONIC));
    expect(pitches[ROWS - 1]).toBe(Math.min(...PENTATONIC));
    for (let r = 1; r < ROWS; r++) expect(pitches[r]).toBeLessThan(pitches[r - 1]);
  });

  it("uses the shared scale rather than a private copy of it", () => {
    expect(new Set(Array.from({ length: ROWS }, (_, r) => pitchFor(r)))).toEqual(
      new Set(PENTATONIC),
    );
  });

  it("refuses a row that has no note behind it", () => {
    // Loudly, rather than returning undefined: a silent square is a bug a child
    // would report as "this one is broken", weeks later.
    expect(() => pitchFor(ROWS)).toThrow(/no note/);
    expect(() => pitchFor(-1)).toThrow(/no note/);
  });
});

describe("changing the length", () => {
  it("keeps every note that still fits", () => {
    // A child's tune is the thing they made. Wiping it to change the length
    // would be the same mistake as ranking their drawing.
    const short = tuneFrom(["x...", "..x.", "....", "....", "....", "...x"]);
    const long = resize(short, "long");
    expect(long.steps).toBe(STEPS.long);
    expect(long.cells[cellIndex(0, 0, long.steps)]).toBe(true);
    expect(long.cells[cellIndex(1, 2, long.steps)]).toBe(true);
    expect(long.cells[cellIndex(5, 3, long.steps)]).toBe(true);
    expect(noteCount(long)).toBe(3);
  });

  it("drops the notes past the new end, and nothing else", () => {
    const long = tuneFrom([
      "x......x",
      "........",
      "........",
      "........",
      "........",
      "........",
    ]);
    const short = resize(long, "short");
    expect(short.steps).toBe(STEPS.short);
    expect(noteCount(short)).toBe(1);
    expect(short.cells[cellIndex(0, 0, short.steps)]).toBe(true);
  });

  it("survives a round trip when nothing was cut", () => {
    const short = tuneFrom(["x.x.", "....", ".x..", "....", "....", "...x"]);
    expect(resize(resize(short, "long"), "short")).toEqual(short);
  });

  it("keeps the chosen voice", () => {
    expect(resize(newTune("short", "bright"), "long").voice).toBe("bright");
  });

  it("changes nothing when the length is already that", () => {
    const tune = tuneFrom(["x...", "....", "....", "....", "....", "...."]);
    expect(resize(tune, tune.level)).toEqual(tune);
  });
});

describe("the voice", () => {
  it("only accepts one this game has", () => {
    for (const v of VOICES) expect(isVoice(v)).toBe(true);
    for (const bad of ["loud", "", null, 3, undefined]) expect(isVoice(bad)).toBe(false);
  });

  it("changes the voice and not the notes", () => {
    const tune = tuneFrom(["x.x.", "....", "....", "....", "....", "...."]);
    const next = setVoice(tune, "soft");
    expect(next.voice).toBe("soft");
    expect(next.cells).toEqual(tune.cells);
  });

  it("ignores a voice it has never heard of", () => {
    const tune = newTune("short", "round");
    expect(setVoice(tune, "wobble" as never)).toBe(tune);
  });
});

describe("starting from something rather than nothing", () => {
  it("puts exactly one note in every column", () => {
    // The blank-page problem, answered. A child who taps this gets a tune that
    // already sounds like something and can then be changed.
    for (const level of LENGTHS) {
      const tune = surprise(newTune(level), seeded(`s-${level}`));
      expect(noteCount(tune)).toBe(STEPS[level]);
      for (let col = 0; col < tune.steps; col++) expect(columnRows(tune, col)).toHaveLength(1);
    }
  });

  it("replaces what was there rather than adding to it", () => {
    const busy = tuneFrom(["xxxx", "xxxx", "xxxx", "xxxx", "xxxx", "xxxx"]);
    expect(noteCount(surprise(busy, seeded("replace")))).toBe(busy.steps);
  });

  it("replays the same tune from the same seed, and a different one otherwise", () => {
    const a = surprise(newTune("long"), seeded("one"));
    expect(surprise(newTune("long"), seeded("one")).cells).toEqual(a.cells);
    expect(surprise(newTune("long"), seeded("two")).cells).not.toEqual(a.cells);
  });

  it("keeps the length and the voice", () => {
    const tune = surprise(newTune("medium", "bright"), seeded("keep"));
    expect(tune.steps).toBe(STEPS.medium);
    expect(tune.voice).toBe("bright");
  });
});

describe("clearing", () => {
  it("empties the grid and keeps the length and the voice", () => {
    const tune = surprise(newTune("long", "soft"), seeded("clear"));
    const blank = clearTune(tune);
    expect(noteCount(blank)).toBe(0);
    expect(blank.steps).toBe(tune.steps);
    expect(blank.voice).toBe("soft");
  });
});

describe("what the record measures", () => {
  it("counts the notes in the tune", () => {
    const tune = tuneFrom(["x.x.", "....", ".x..", "....", "....", "...x"]);
    expect(scoreReport(tune, "short")).toEqual({ value: 4, unit: "points", board: "short" });
  });

  it("reports points, so a bigger tune ranks higher", () => {
    // It measures the SIZE of what a child built, never whether the music is
    // any good - that judgement is the reason `coloring` has no record at all.
    // The unit is the whole ranking decision and `src/sdk/score.ts` is the only
    // thing that reads it; `score-unit-declared.test.ts` pins it to meta.ts.
    expect(scoreReport(newTune("short"), "short").unit).toBe("points");
  });

  it("hands out a coin every few notes, and never for the same note twice", () => {
    expect(milestoneStep(0)).toBe(0);
    expect(milestoneStep(MILESTONE_EVERY - 1)).toBe(0);
    expect(milestoneStep(MILESTONE_EVERY)).toBe(1);
    expect(milestoneStep(MILESTONE_EVERY * 3 + 2)).toBe(3);
    // Erasing walks it back down, which is exactly why the renderer stores the
    // HIGHEST step it has ever paid rather than deriving one from the count.
    // Without that, erasing five notes and adding them again would pay twice.
    expect(milestoneStep(MILESTONE_EVERY)).toBeGreaterThan(milestoneStep(MILESTONE_EVERY - 1));
  });
});
