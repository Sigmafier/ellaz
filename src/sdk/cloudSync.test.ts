// The scheduling half of cloud backup: what gets uploaded, and what does not.
//
// Both of this module's dependencies are module singletons — `wallet` and the
// `Cloud` behind a dynamic import — so they are mocked rather than driven. The
// real wallet cannot help here anyway: the node test env has no localStorage,
// so every mutation it makes is refused and rolled back, and its profile can
// never hold anything worth backing up.
//
// `vi.resetModules()` before each import is what gives each test its own
// module-level dedupe state, which is also why nothing test-only had to be
// exported from cloudSync itself.
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProfileV1 } from "./profile";

const fake = vi.hoisted(() => ({
  // Built as a literal rather than from `emptyProfile()`: vi.hoisted runs
  // before the imports above exist.
  profile: {
    v: 1,
    coins: 5,
    stars: 0,
    owned: [],
    equipped: {},
    games: {},
    updatedAt: 1_000,
  } as ProfileV1,
  pushed: [] as ProfileV1[],
  pushOk: true,
}));

vi.mock("./wallet", () => ({
  wallet: {
    snapshot: () => JSON.parse(JSON.stringify(fake.profile)) as ProfileV1,
    subscribe: () => () => {},
  },
}));

vi.mock("./cloud", () => ({
  createCloud: () => ({
    connect: async () => null,
    identity: () => null,
    push: async (profile: ProfileV1) => {
      fake.pushed.push(profile);
      return fake.pushOk;
    },
    restore: async () => null,
  }),
}));

/** A cloudSync with its own dedupe state, as a fresh page load would have. */
async function freshSync() {
  vi.resetModules();
  return import("./cloudSync");
}

const base: ProfileV1 = {
  v: 1,
  coins: 5,
  stars: 0,
  owned: [],
  equipped: {},
  games: {},
  updatedAt: 1_000,
};

beforeEach(() => {
  fake.profile = { ...base };
  fake.pushed = [];
  fake.pushOk = true;
});

describe("skipping a push that would change nothing", () => {
  it("does not upload again when only the timestamp moved", async () => {
    // The trap this pins: every wallet mutation bumps `updatedAt`, so a
    // comparison over the RAW serialised profile can never match and the whole
    // check becomes dead code that always lets the push through. Comparing
    // without `updatedAt` is what makes it real.
    const sync = await freshSync();

    expect(await sync.pushNow()).toBe(true);
    fake.profile = { ...base, updatedAt: base.updatedAt + 7_531 };
    expect(await sync.pushNow()).toBe(true);

    expect(fake.pushed).toHaveLength(1);
  });

  it("uploads again when something a player would notice changed", async () => {
    const sync = await freshSync();

    expect(await sync.pushNow()).toBe(true);
    fake.profile = { ...base, coins: 6, updatedAt: base.updatedAt + 1 };
    expect(await sync.pushNow()).toBe(true);

    expect(fake.pushed).toHaveLength(2);
    expect(fake.pushed[1].coins).toBe(6);
  });

  it("retries after a failed push, even with nothing new to say", async () => {
    // A failure must never be remembered as "the cloud already has this", or a
    // player whose one upload failed would never be backed up again.
    const sync = await freshSync();

    fake.pushOk = false;
    expect(await sync.pushNow()).toBe(false);

    fake.pushOk = true;
    expect(await sync.pushNow()).toBe(true);

    expect(fake.pushed).toHaveLength(2);
  });

  it("keeps a first-time visitor off the network entirely", async () => {
    const sync = await freshSync();

    fake.profile = { ...base, coins: 0 };
    expect(await sync.pushNow()).toBe(false);
    expect(fake.pushed).toHaveLength(0);
  });
});
