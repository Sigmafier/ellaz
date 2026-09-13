// The committed boss tape is what its recorder emits: re-recorded from the
// scripted hero after the three levels before it, it matches the file row for
// row. The control is a recording that skips the levels before the boss - a
// different carry, so the hero meets the King at level 1 and the rows differ -
// which proves the comparison can fail.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gameDir } from "../data/load";
import type { Tape } from "../sim/tape";
import { formatTape, playable, recordTape } from "./record-tape";

const FILE = join(gameDir("fight"), "tapes", "toybox-boss-1400.json");
const committed = (): Tape & { note: string } => JSON.parse(readFileSync(FILE, "utf8"));

describe("the boss tape reproduces from its recorder", () => {
  it("re-recording toybox-boss-1400 after stage, toybox-2 and toybox-3 gives the committed rows and carry", () => {
    const tape = recordTape({ game: "fight", mode: "toybox-boss", ticks: 1400, after: ["stage", "toybox-2", "toybox-3"] });
    expect(playable(tape)).toEqual(playable(committed()));
  });

  it("the committed file is exactly the recorder's formatting of it, note included", () => {
    const c = committed();
    expect(formatTape(c, c.note)).toBe(readFileSync(FILE, "utf8"));
  });

  it("control: recorded without the levels before it, the carry and the rows differ", () => {
    const fresh = recordTape({ game: "fight", mode: "toybox-boss", ticks: 1400, after: [] });
    expect(fresh.carry).toBeUndefined();
    expect(playable(fresh)).not.toEqual(playable(committed()));
  });
});
