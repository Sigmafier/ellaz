import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  WIN,
  WIN_PHRASE,
  run,
  struck,
  voiceBodyMs,
  voiceDurationMs,
} from "@sdk/voice";

/**
 * A WIN IS A PHRASE, AND THE PHRASE MUST HAVE AIR IN IT.
 *
 * Reported 2026-08-27: *"the sound of success after winning and then right away
 * the sound of coins sounds bad"*. It was exactly that. `winMoment` chimed the
 * coin at a hardcoded 620 ms while the win voice ran 961 ms of body, so the
 * coin fired INSIDE the fanfare - every win, in every game, since the day both
 * voices were wired.
 *
 * Nothing could see it. Every voice was a valid spec, every gain sum was under
 * the clipping floor, every duration was under the jingle ceiling, and both
 * numbers were plausible constants sitting beside a comment explaining them.
 * The defect was in the RELATIONSHIP between two files, and a relationship has
 * no line number - the same shape as the `space-between` and the fixed-shell
 * gesture rules.
 *
 * So this asks the only question that matters: has the win voice STOPPED by the
 * time the next sound starts? Derived on both sides, so a re-voice moves the
 * answer rather than invalidating it.
 */
describe("the win phrase", () => {
  const body = voiceBodyMs(WIN);

  it("chimes the coin only after the win voice's notes have stopped", () => {
    expect(WIN_PHRASE.coin).toBeGreaterThan(body);
  });

  it("leaves real air rather than a hairline", () => {
    // 150 ms is about the shortest gap a listener hears as a gap rather than as
    // a smear. The shipped margin is 220; the floor is deliberately lower than
    // the value so a small re-voice is not a red build, and deliberately well
    // above zero so a large one is.
    expect(WIN_PHRASE.coin - body).toBeGreaterThanOrEqual(150);
  });

  it("crowns with the star LAST, not on top of the chord", () => {
    // It fired at 450 ms until 2026-08-27 - inside the win, competing with the
    // chord's own top end for the same air. `voice.ts`'s note on STAR says the
    // timbre was chosen to survive that collision; it should not have had to.
    expect(WIN_PHRASE.star).toBeGreaterThan(WIN_PHRASE.coin);
  });

  it("is still a phrase and not a jingle", () => {
    // A child taps and plays on. The whole sequence has to be over quickly -
    // this is the ceiling that stops "give it more air" from being unbounded.
    expect(WIN_PHRASE.star).toBeLessThan(1500);
  });

  it("spaces off the BODY, never the full duration", () => {
    // The trap this function exists for: `voiceDurationMs` counts the 1.2 s
    // reverb tail, so spacing off it would push the coins most of two seconds
    // out and the win would stop being one gesture. Reverb is the room.
    expect(voiceDurationMs(WIN)).toBeGreaterThan(WIN_PHRASE.star * 1.5);
  });

  it("would have gone RED on the voice that caused the report", () => {
    // THE POSITIVE CONTROL. Every assertion above is satisfiable by a win voice
    // short enough for any gap to clear it, so on its own this file cannot say
    // whether it is capable of failing. Ladder is the actual voice that shipped
    // the defect, transcribed here as a literal (it also lives in
    // `src/lab/previous.ts` as a real, playable arm).
    const ladder = run(
      struck(523.25, 420, "bar", {
        gain: 0.19,
        damp: 0.85,
        space: 0.3,
        tail: 1.6,
      }),
      [0, 2, 4, 7, 9, 12],
      0.062,
    );
    expect(voiceBodyMs(ladder)).toBeCloseTo(961, 0);
    // 620 was the hardcoded chime. It landed 341 ms BEFORE the voice finished.
    expect(620).toBeLessThan(voiceBodyMs(ladder));
    // And the shipped fanfare is what makes the same phrase fit.
    expect(body).toBeLessThan(voiceBodyMs(ladder));
  });
});

/**
 * ONE TEMPO, READ TWICE - never typed twice.
 *
 * `winMoment` plays the real phrase and the lab's win-moment demo plays a copy
 * that must never grant a coin, so the numbers have TWO consumers. They were
 * two hardcoded pairs until 2026-08-27 (`450` and `620`, in both files), which
 * is how the screen whose entire job is to say what a game will play would have
 * gone on demonstrating a sequence the app had stopped playing.
 */
describe("the tempo has one owner", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  const CONSUMERS = ["src/shared/winMoment.ts", "src/lab/Lab.tsx"];

  it.each(CONSUMERS)("%s reads WIN_PHRASE", (p) => {
    expect(read(p)).toContain("WIN_PHRASE");
  });

  it.each(CONSUMERS)("%s schedules no sound off a bare number", (p) => {
    // A `setTimeout(..., 620)` is the whole defect wearing its original
    // clothes. Comments are stripped first, because this file's own history is
    // discussed in the comments of both consumers - a matcher that reads those
    // reports a defect on the prose explaining the fix.
    const src = read(p)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const timers = [...src.matchAll(/setTimeout\([\s\S]*?,\s*([^,()]+)\)/g)].map(
      (m) => m[1].trim(),
    );
    // The control: if this matcher stops finding timers it passes vacuously,
    // and both files really do schedule the coin and the star.
    expect(timers.length, `${p}: no setTimeout found at all`).toBeGreaterThan(1);
    for (const arg of timers) {
      expect(arg, `${p} schedules off the literal ${arg}`).not.toMatch(
        /^\d+$/,
      );
    }
  });
});
