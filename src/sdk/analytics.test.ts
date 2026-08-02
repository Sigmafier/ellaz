import { describe, it, expect } from "vitest";
import { QUEUE_CAP, createEventQueue, loadPostHog } from "./analytics";

// PostHog is loaded lazily, AFTER first paint, so events can be fired before the
// library exists. Both halves of that arrangement are deliberately pure so they
// are testable in the node vitest env (same reasoning as pickVoice in speech.ts):
// the queue is a plain FIFO, and the loader takes its importer as an injectable
// last parameter, exactly like the rng convention in games/<id>/logic.ts.
//
// What is NOT tested here is the idle scheduling itself — that is platform
// wiring with no logic in it, and the repo does not test DOM/platform glue.

describe("createEventQueue — ordering", () => {
  it("drains in the order events were pushed", () => {
    const q = createEventQueue();
    q.push({ event: "a" });
    q.push({ event: "b" });
    q.push({ event: "c" });
    expect(q.drain().map((e) => e.event)).toEqual(["a", "b", "c"]);
  });

  it("carries props through untouched", () => {
    const q = createEventQueue();
    q.push({ event: "level_complete", props: { game: "snake", level: 3 } });
    expect(q.drain()).toEqual([{ event: "level_complete", props: { game: "snake", level: 3 } }]);
  });

  it("empties on drain, so a second flush cannot double-send", () => {
    const q = createEventQueue();
    q.push({ event: "a" });
    expect(q.drain()).toHaveLength(1);
    expect(q.drain()).toEqual([]);
    expect(q.size).toBe(0);
  });

  it("drains to an empty array when nothing was ever queued", () => {
    expect(createEventQueue().drain()).toEqual([]);
  });
});

describe("createEventQueue — the cap", () => {
  it("caps at QUEUE_CAP and drops the OLDEST, keeping the newest", () => {
    const q = createEventQueue();
    // 5 more than the cap: 0..(CAP+4). The first 5 must be gone.
    for (let i = 0; i < QUEUE_CAP + 5; i++) q.push({ event: `e${i}` });

    expect(q.size).toBe(QUEUE_CAP);
    const drained = q.drain();
    expect(drained).toHaveLength(QUEUE_CAP);
    // Oldest survivor is e5; newest is the last one pushed.
    expect(drained[0].event).toBe("e5");
    expect(drained[drained.length - 1].event).toBe(`e${QUEUE_CAP + 4}`);
  });

  it("keeps the cap at a bound a stalled load cannot grow past", () => {
    // A child playing while the network hangs must not accumulate unbounded
    // memory. 50 is the agreed bound; a change here is a deliberate decision.
    expect(QUEUE_CAP).toBe(50);
  });

  it("honours an explicit smaller cap", () => {
    const q = createEventQueue(2);
    q.push({ event: "a" });
    q.push({ event: "b" });
    q.push({ event: "c" });
    expect(q.drain().map((e) => e.event)).toEqual(["b", "c"]);
  });
});

describe("loadPostHog — never throws, whatever the importer does", () => {
  it("resolves the module's default export", async () => {
    const fake = { capture: () => {}, init: () => {} };
    await expect(loadPostHog(async () => ({ default: fake }))).resolves.toBe(fake);
  });

  it("returns null when the import REJECTS, without throwing", async () => {
    // Offline, blocked by a content blocker, or a CDN 404. Analytics failing
    // must never reach gameplay, so this resolves null rather than rejecting.
    await expect(loadPostHog(async () => Promise.reject(new Error("offline")))).resolves.toBeNull();
  });

  it("returns null when the importer throws synchronously", async () => {
    await expect(
      loadPostHog(() => {
        throw new Error("boom");
      }),
    ).resolves.toBeNull();
  });

  it("returns null when the module arrives without a usable default", async () => {
    await expect(loadPostHog(async () => ({}) as never)).resolves.toBeNull();
  });
});
