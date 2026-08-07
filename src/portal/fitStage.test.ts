// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fitStage } from "./fitStage";

/**
 * jsdom has no layout engine, so every rect is zero. The geometry is stubbed
 * instead - which is honest for this module, because the only thing worth
 * testing here is the ARITHMETIC and the branch it picks. Whether a real
 * browser reports the height we expect is a question for the artifact, and it
 * was answered there: 2048 at 1536x638 scales to 0.915 and fits.
 */
function stage(naturalHeight: number, boxHeight: number) {
  const frame = document.createElement("div");
  const box = document.createElement("div");
  document.body.append(box);
  box.append(frame);
  let height = boxHeight;

  // A real rect reports the TRANSFORMED height, so the stub does too. That is
  // what makes the compounding bug reachable from a test: code that measures
  // without clearing the transform first reads its own previous scale back.
  frame.getBoundingClientRect = () => {
    const match = /scale\(([\d.]+)\)/.exec(frame.style.transform);
    return { height: naturalHeight * (match ? Number(match[1]) : 1) } as DOMRect;
  };
  Object.defineProperty(box, "clientHeight", {
    get: () => (box.style.height === "auto" ? naturalHeight : height),
  });

  return { frame, box, resizeTo: (h: number) => (height = h) };
}

/** rAF is where apply() actually runs; drive it by hand so the test is sync. */
let frames: FrameRequestCallback[] = [];
/**
 * Every fitStage in a test gets torn down afterwards. jsdom shares one window
 * across the file, so a leaked resize listener keeps firing in LATER tests -
 * which is how the coalescing case first read 4 scheduled frames instead of 1,
 * one per previous test that had never cleaned up.
 */
let started: Array<() => void> = [];
const start = (frame: HTMLElement, box: HTMLElement) => {
  const stop = fitStage(frame, box);
  started.push(stop);
  return stop;
};

beforeEach(() => {
  frames = [];
  started = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
});
afterEach(() => {
  for (const stop of started) stop();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
const flush = () => {
  const queued = frames;
  frames = [];
  for (const cb of queued) cb(0);
};

describe("fitStage", () => {
  it("scales a game that is taller than the screen it was given", () => {
    // The real measured case: 2048 wants 680px inside a 638px window.
    const { frame, box } = stage(680, 638);
    start(frame, box);
    flush();
    // (638 - 16 gutter) / 680
    expect(frame.style.transform).toBe("scale(0.9147)");
    expect(frame.style.transformOrigin).toBe("center center");
    expect(box.style.height).toBe("");
  });

  it("leaves a game that already fits completely alone", () => {
    const { frame, box } = stage(400, 638);
    start(frame, box);
    flush();
    expect(frame.style.transform).toBe("");
    expect(box.style.height).toBe("");
  });

  it("gives the height back rather than shrinking past the tap-target floor", () => {
    // 1400px of game in a 638px window would need 0.44 - well under MIN_SCALE.
    // Scaling there would take a 2cm kids target to under 1cm, so the page is
    // allowed to scroll instead. Nothing is clipped either way.
    const { frame, box } = stage(1400, 638);
    start(frame, box);
    flush();
    expect(frame.style.transform).toBe("");
    expect(box.style.height).toBe("auto");
  });

  it("measures unscaled, so a second fit does not compound the first", () => {
    const { frame, box, resizeTo } = stage(680, 638);
    start(frame, box);
    flush();
    expect(frame.style.transform).toBe("scale(0.9147)");

    // Shrink the window and fit again. The right answer is derived from the
    // game's NATURAL 680px every time: (500 - 16) / 680.
    resizeTo(500);
    window.dispatchEvent(new Event("resize"));
    flush();
    expect(frame.style.transform).toBe("scale(0.7118)");
    // Code that measured without clearing the transform would read 622px back
    // instead of 680 and land on 0.7781 - visibly smaller, and smaller again
    // on every resize after that.
    expect(frame.style.transform).not.toBe("scale(0.7781)");
  });

  it("coalesces a burst of resizes into one measurement", () => {
    const { frame, box } = stage(680, 638);
    start(frame, box);
    flush(); // let the initial fit finish, so the queue is genuinely empty
    frames = [];
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    // Three events, ONE measurement. Each apply() forces a synchronous layout,
    // and a drag-resize fires these by the dozen.
    expect(frames).toHaveLength(1);
  });

  it("re-fits when a backgrounded tab becomes visible", () => {
    // A hidden tab runs no animation frames and delivers no resize
    // observations, so a page opened in a background tab can mount its whole
    // game without a single fit being computed. Becoming visible has to be a
    // trigger in its own right.
    const { frame, box } = stage(680, 638);
    start(frame, box);
    flush();
    frames = [];
    document.dispatchEvent(new Event("visibilitychange"));
    expect(frames).toHaveLength(1);
  });

  it("hands the elements back with nothing of ours left on them", () => {
    const { frame, box } = stage(1400, 638);
    const stop = start(frame, box);
    flush();
    expect(box.style.height).toBe("auto");
    stop();
    expect(frame.style.transform).toBe("");
    expect(frame.style.transformOrigin).toBe("");
    expect(box.style.height).toBe("");
    // and it really is disconnected
    frames = [];
    window.dispatchEvent(new Event("resize"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(frames).toHaveLength(0);
  });
});
