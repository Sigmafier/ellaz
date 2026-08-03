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
import type { DeviceState } from "./cloud";
import type { Records } from "./records";

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
  records: {} as Records,
  pushed: [] as DeviceState[],
  pushOk: true,
}));

vi.mock("./records", () => ({
  readRecords: () => JSON.parse(JSON.stringify(fake.records)) as Records,
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
    push: async (state: DeviceState) => {
      fake.pushed.push(state);
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
  fake.records = {};
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
    expect(fake.pushed[1].profile.coins).toBe(6);
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

describe("personal bests are part of what gets backed up", () => {
  it("uploads a new record even when the profile did not move", async () => {
    // A personal best set while the session coin cap is holding moves stars but
    // could leave the rest of the profile untouched. If the fingerprint ignored
    // records, that push would be skipped as "already sent" and the record
    // would exist on exactly one device.
    const { pushNow } = await freshSync();
    expect(await pushNow()).toBe(true);

    fake.records = { "ellaz:snake:score:default": 4200 };
    expect(await pushNow()).toBe(true);

    expect(fake.pushed).toHaveLength(2);
    expect(fake.pushed[1].records).toEqual({ "ellaz:snake:score:default": 4200 });
  });

  it("still skips when neither the profile nor the records moved", async () => {
    const { pushNow } = await freshSync();
    fake.records = { "ellaz:snake:score:default": 4200 };
    await pushNow();
    await pushNow();
    expect(fake.pushed).toHaveLength(1);
  });

  it("is worth backing up on records alone", async () => {
    // An empty profile with a record is a real state: a child who played one
    // game well and bought nothing. Bailing here would lose it.
    const { pushNow } = await freshSync();
    fake.profile = { v: 1, coins: 0, stars: 0, owned: [], equipped: {}, games: {}, updatedAt: 1 };
    fake.records = { "ellaz:frog:score:easy": 3 };
    expect(await pushNow()).toBe(true);
  });
});
