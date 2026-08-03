import { describe, it, expect, vi } from "vitest";
import { createCloud, CLOUD_KEY, type CloudStore, type FetchLike } from "./cloud";
import { emptyProfile, migrateProfile } from "./profile";
import { normalizeBackupCode } from "./backupCode";
import { mulberry32 } from "@shared/rng";

function memStore(seed?: Record<string, string>): CloudStore {
  const map = new Map(Object.entries(seed ?? {}));
  return {
    read: (k) => map.get(k) ?? null,
    write: (k, v) => {
      map.set(k, v);
      return true;
    },
  };
}

const ok = (body: unknown): Response =>
  ({ ok: true, json: async () => body }) as Response;
const fail = (): Response => ({ ok: false, json: async () => ({}) }) as Response;

/** A fake Firebase: signUp, token refresh, and a document store. */
function fakeBackend(opts: { failOn?: RegExp } = {}) {
  const docs = new Map<string, unknown>();
  let users = 0;
  const calls: string[] = [];

  const fetchImpl: FetchLike = async (url, init) => {
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (opts.failOn?.test(url)) return fail();

    if (url.includes("accounts:signUp")) {
      users += 1;
      return ok({
        localId: `uid-${users}`,
        idToken: `id-${users}`,
        refreshToken: `refresh-${users}`,
        expiresIn: "3600",
      });
    }
    if (url.includes("securetoken")) {
      const sent = String(init?.body ?? "");
      const match = /refresh_token=([^&]+)/.exec(sent);
      if (!match) return fail();
      return ok({ id_token: `id-for-${match[1]}`, expires_in: "3600" });
    }
    // Firestore documents.
    const path = url.split("/documents/")[1]?.split("?")[0];
    if (!path) return fail();
    if (init?.method === "PATCH") {
      docs.set(path, JSON.parse(String(init.body)));
      return ok(docs.get(path));
    }
    return docs.has(path) ? ok(docs.get(path)) : fail();
  };

  return { fetchImpl, docs, calls, userCount: () => users };
}

describe("connecting", () => {
  it("signs up anonymously and keeps the identity", async () => {
    const backend = fakeBackend();
    const store = memStore();
    const cloud = createCloud({ fetchImpl: backend.fetchImpl, store, rng: mulberry32(3) });

    const id = await cloud.connect();
    expect(id?.uid).toBe("uid-1");
    expect(normalizeBackupCode(id!.code)).toBe(id!.code);

    const persisted = JSON.parse(store.read(CLOUD_KEY)!);
    expect(persisted.uid).toBe("uid-1");
    expect(persisted.refreshToken).toBe("refresh-1");
    expect(persisted.code).toBe(id!.code);
  });

  it("reuses a stored identity instead of minting a second player", async () => {
    const backend = fakeBackend();
    const store = memStore();

    const first = await createCloud({
      fetchImpl: backend.fetchImpl,
      store,
      rng: mulberry32(3),
    }).connect();

    // A brand new Cloud on the same store — this is a page reload.
    const second = await createCloud({ fetchImpl: backend.fetchImpl, store }).connect();

    expect(second).toEqual(first);
    expect(backend.userCount()).toBe(1);
  });

  it("collapses concurrent connects onto one sign-up", async () => {
    const backend = fakeBackend();
    const cloud = createCloud({ fetchImpl: backend.fetchImpl, store: memStore() });

    const [a, b, c] = await Promise.all([cloud.connect(), cloud.connect(), cloud.connect()]);

    expect(backend.userCount()).toBe(1);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("does not cache a failure — a player in a lift can retry", async () => {
    let offline = true;
    const backend = fakeBackend();
    const cloud = createCloud({
      fetchImpl: (u, i) => (offline ? Promise.reject(new Error("offline")) : backend.fetchImpl(u, i)),
      store: memStore(),
    });

    expect(await cloud.connect()).toBeNull();
    offline = false;
    expect((await cloud.connect())?.uid).toBe("uid-1");
  });
});

describe("pushing a snapshot", () => {
  it("writes the profile and the code index", async () => {
    const backend = fakeBackend();
    const cloud = createCloud({ fetchImpl: backend.fetchImpl, store: memStore(), rng: mulberry32(1) });

    const profile = { ...emptyProfile(), coins: 42, stars: 7 };
    expect(await cloud.push({ profile, records: {} })).toBe(true);

    const id = cloud.identity()!;
    const doc = backend.docs.get(`players/${id.uid}`) as { fields: Record<string, { stringValue: string }> };
    expect(migrateProfile(doc.fields.profile.stringValue).coins).toBe(42);
    expect(backend.docs.get(`codes/${id.code}`)).toEqual({ fields: { uid: { stringValue: id.uid } } });
  });

  it("connects on its own if nobody did", async () => {
    const backend = fakeBackend();
    const cloud = createCloud({ fetchImpl: backend.fetchImpl, store: memStore() });
    expect(await cloud.push({ profile: emptyProfile(), records: {} })).toBe(true);
    expect(cloud.identity()).not.toBeNull();
  });

  it("reports false rather than throwing when the network is gone", async () => {
    const cloud = createCloud({
      fetchImpl: () => Promise.reject(new Error("offline")),
      store: memStore(),
    });
    await expect(cloud.push({ profile: emptyProfile(), records: {} })).resolves.toBe(false);
  });

  it("reports false when the code index fails, even though the profile landed", async () => {
    // A code that resolves to nothing is worse than a code that does not
    // resolve, so a half-written pair must not report success.
    const backend = fakeBackend({ failOn: /\/codes\// });
    const cloud = createCloud({ fetchImpl: backend.fetchImpl, store: memStore() });
    expect(await cloud.push({ profile: emptyProfile(), records: {} })).toBe(false);
  });

  it("reports false when the profile write fails", async () => {
    const backend = fakeBackend({ failOn: /\/players\// });
    const cloud = createCloud({ fetchImpl: backend.fetchImpl, store: memStore() });
    expect(await cloud.push({ profile: emptyProfile(), records: {} })).toBe(false);
  });

  it("writes the code index once per page load, not once per push", async () => {
    // Neither the uid nor the code ever changes for a device, so re-writing the
    // index on every push spends a document write against a fail-closed daily
    // quota to store a value that is already there.
    const backend = fakeBackend();
    const cloud = createCloud({ fetchImpl: backend.fetchImpl, store: memStore() });

    expect(await cloud.push({ profile: { ...emptyProfile(), coins: 1 }, records: {} })).toBe(true);
    expect(await cloud.push({ profile: { ...emptyProfile(), coins: 2 }, records: {} })).toBe(true);

    const id = cloud.identity()!;
    const writes = backend.calls.filter((c) => c.startsWith("PATCH "));
    expect(writes.filter((c) => c.includes(`/codes/${id.code}`))).toHaveLength(1);
    expect(writes.filter((c) => c.includes(`/players/${id.uid}`))).toHaveLength(2);
  });

  it("retries the index on the next push when the first attempt failed", async () => {
    // The "already written" latch is in memory and set only on success, so a
    // dropped index write is repaired by the next push rather than skipped for
    // the rest of the session.
    let indexOffline = true;
    const backend = fakeBackend();
    const cloud = createCloud({
      fetchImpl: (url, init) =>
        indexOffline && url.includes("/codes/") ? Promise.resolve(fail()) : backend.fetchImpl(url, init),
      store: memStore(),
    });

    expect(await cloud.push({ profile: emptyProfile(), records: {} })).toBe(false);
    const id = cloud.identity()!;
    expect(backend.docs.has(`codes/${id.code}`)).toBe(false);

    indexOffline = false;
    expect(await cloud.push({ profile: emptyProfile(), records: {} })).toBe(true);
    expect(backend.docs.has(`codes/${id.code}`)).toBe(true);
  });
});

describe("restoring from a code", () => {
  async function seeded() {
    const backend = fakeBackend();
    const donor = createCloud({ fetchImpl: backend.fetchImpl, store: memStore(), rng: mulberry32(2) });
    await donor.push({
      profile: { ...emptyProfile(), coins: 120, stars: 9, owned: ["hat-crown"] },
      records: { "ellaz:snake:score:default": 4200 },
    });
    return { backend, code: donor.identity()!.code };
  }

  it("brings back the donor's profile onto a fresh device", async () => {
    const { backend, code } = await seeded();
    const fresh = createCloud({ fetchImpl: backend.fetchImpl, store: memStore() });

    const restored = await fresh.restore(code);
    expect(restored?.profile.coins).toBe(120);
    expect(restored?.profile.stars).toBe(9);
    expect(restored?.profile.owned).toEqual(["hat-crown"]);
  });

  it("brings back the personal bests too, which the first version silently dropped", async () => {
    // The whole reason DeviceState has two fields. Records live in their own
    // storage keys, so a document carrying only the profile restored a room
    // with none of the records that filled it, and said nothing about it.
    const { backend, code } = await seeded();
    const fresh = createCloud({ fetchImpl: backend.fetchImpl, store: memStore() });

    const restored = await fresh.restore(code);
    expect(restored?.records).toEqual({ "ellaz:snake:score:default": 4200 });
  });

  it("still returns the room when a document predates records", async () => {
    // An older client wrote documents with no `records` field at all. Losing
    // the records is bad; refusing to return the profile would be worse.
    const { backend, code } = await seeded();
    for (const [path, doc] of backend.docs) {
      if (path.startsWith("players/")) delete (doc as { fields: Record<string, unknown> }).fields.records;
    }
    const fresh = createCloud({ fetchImpl: backend.fetchImpl, store: memStore() });

    const restored = await fresh.restore(code);
    expect(restored?.profile.coins).toBe(120);
    expect(restored?.records).toEqual({});
  });

  it("accepts the code as a child would type it", async () => {
    const { backend, code } = await seeded();
    const fresh = createCloud({ fetchImpl: backend.fetchImpl, store: memStore() });
    expect(await fresh.restore(` ${code.toLowerCase().replace("-", " ")} `)).not.toBeNull();
  });

  it("gives the fresh device its OWN identity, not the donor's", async () => {
    // A backup is a transfer, not a merge: two devices sharing one uid would
    // silently overwrite each other's document on every push.
    const { backend, code } = await seeded();
    const fresh = createCloud({ fetchImpl: backend.fetchImpl, store: memStore() });
    await fresh.restore(code);
    expect(fresh.identity()!.uid).toBe("uid-2");
  });

  it("answers null for a code nobody has", async () => {
    const backend = fakeBackend();
    const cloud = createCloud({ fetchImpl: backend.fetchImpl, store: memStore() });
    expect(await cloud.restore("2345-6789")).toBeNull();
  });

  it("answers null for a code that is not a code, without a request", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error("should not be called")));
    const cloud = createCloud({ fetchImpl: fetchImpl as unknown as FetchLike, store: memStore() });
    expect(await cloud.restore("nope")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("fail-soft everywhere", () => {
  it("survives storage that refuses every write", async () => {
    const backend = fakeBackend();
    const cloud = createCloud({
      fetchImpl: backend.fetchImpl,
      store: { read: () => null, write: () => false },
    });
    // It still works for this session; it simply cannot remember afterwards,
    // which is the same shape as the wallet's refused-write behaviour.
    expect((await cloud.connect())?.uid).toBe("uid-1");
  });

  it("survives junk in its own storage slot", async () => {
    const backend = fakeBackend();
    for (const junk of ["{not json", "null", "[]", '{"uid":"x"}', '{"uid":"x","refreshToken":"y","code":"!!"}']) {
      const cloud = createCloud({ fetchImpl: backend.fetchImpl, store: memStore({ [CLOUD_KEY]: junk }) });
      expect((await cloud.connect())?.uid, junk).toMatch(/^uid-/);
    }
  });

  it("survives a body that is not JSON", async () => {
    const cloud = createCloud({
      fetchImpl: async () =>
        ({
          ok: true,
          json: async () => {
            throw new SyntaxError("not json");
          },
        }) as unknown as Response,
      store: memStore(),
    });
    expect(await cloud.connect()).toBeNull();
  });

  it("signs up again when the refresh token has died", async () => {
    const backend = fakeBackend({ failOn: /securetoken/ });
    const store = memStore({
      [CLOUD_KEY]: JSON.stringify({ uid: "old", refreshToken: "dead", code: "2345-6789" }),
    });
    const cloud = createCloud({ fetchImpl: backend.fetchImpl, store });

    const id = await cloud.connect();
    expect(id?.uid).toBe("uid-1");
    // A new identity gets a NEW code. The old one is not orphaned — its
    // documents survive and stay readable — but we can no longer write to them.
    expect(id?.code).not.toBe("2345-6789");
  });
});
