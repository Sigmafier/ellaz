// End-to-end probe against the REAL ellaz-games project.
//
// Proves three things that cannot be proven from the client tests, which drive
// a fake backend: the URL shapes are right, anonymous auth is actually on, and
// the deployed rules refuse what they are supposed to refuse.
//
// Includes a POSITIVE control on every negative: a rule that refused everyone
// would pass every negative test ever written.
//
//   npm run probe:cloud
//
// Run it after any change to firestore.rules, and after redeploying them —
// rules are released through the Firebase Rules API, NOT by this repo's CI, so
// a rules edit that was never released is invisible from the source tree.
//
// It leaves two things behind, both deliberate and both harmless: two anonymous
// users (free, and Firebase can be told to expire idle ones), and one
// `codes/PROBE-XXXX` document, because `allow delete: if false` on that
// collection is the rule protecting a real player's code from being freed and
// re-claimed. The PROBE- prefix is ten characters, so `normalizeBackupCode`
// rejects it and it can never collide with a code a player is issued.
const API_KEY = "AIzaSyDauvXsn6WL10fdtKRCo5l5PfLuRVXuWwA";
const PROJECT = "ellaz-games";
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

let pass = 0;
let fail = 0;
function check(label, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}  ${detail}`);
  }
}

async function signUp() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  if (!res.ok) throw new Error(`signUp ${res.status}: ${await res.text()}`);
  return res.json();
}

async function call(token, path, init = {}) {
  const res = await fetch(`${DOCS}/${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* empty */
  }
  return { status: res.status, ok: res.ok, body };
}

const doc = (profile, code) => ({
  fields: {
    profile: { stringValue: JSON.stringify(profile) },
    code: { stringValue: code },
    updatedAt: { integerValue: String(profile.updatedAt) },
  },
});

const run = async () => {
  console.log("1. anonymous sign-in");
  const a = await signUp();
  const b = await signUp();
  check("two distinct anonymous users", a.localId !== b.localId, `${a.localId} ${b.localId}`);

  // Codes are namespaced so a probe can never collide with a real player's.
  const code = `PROBE-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  const profile = { v: 1, coins: 77, stars: 3, owned: ["probe-item"], equipped: {}, games: {}, updatedAt: Date.now() };

  console.log("2. owner writes (POSITIVE control)");
  const wroteProfile = await call(a.idToken, `players/${a.localId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc(profile, code)),
  });
  check("owner may write their own player doc", wroteProfile.ok, `status ${wroteProfile.status}`);

  const wroteCode = await call(a.idToken, `codes/${code}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { uid: { stringValue: a.localId } } }),
  });
  check("owner may claim an unused code", wroteCode.ok, `status ${wroteCode.status}`);

  console.log("3. the restore path a second device takes");
  const index = await call(b.idToken, `codes/${code}`);
  check("a different user may READ the code index", index.ok, `status ${index.status}`);
  const owner = index.body?.fields?.uid?.stringValue;
  check("the index points at the owner", owner === a.localId, String(owner));

  const read = await call(b.idToken, `players/${a.localId}`);
  check("a different user may READ the player doc", read.ok, `status ${read.status}`);
  const restored = JSON.parse(read.body?.fields?.profile?.stringValue ?? "{}");
  check("the profile survives the round trip", restored.coins === 77 && restored.stars === 3, JSON.stringify(restored));

  console.log("4. what the rules must REFUSE");
  const hijackProfile = await call(b.idToken, `players/${a.localId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc({ ...profile, coins: 0 }, code)),
  });
  check(
    "a stranger may NOT overwrite someone's progress (403)",
    hijackProfile.status === 403,
    `status ${hijackProfile.status} ${JSON.stringify(hijackProfile.body?.error?.status)}`,
  );

  const hijackCode = await call(b.idToken, `codes/${code}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { uid: { stringValue: b.localId } } }),
  });
  check(
    "a stranger may NOT repoint an existing code (403)",
    hijackCode.status === 403,
    `status ${hijackCode.status}`,
  );

  const unauth = await fetch(`${DOCS}/players/${a.localId}`);
  check("an UNAUTHENTICATED reader is refused", unauth.status === 403, `status ${unauth.status}`);

  console.log("5. cleanup");
  const delProfile = await call(a.idToken, `players/${a.localId}`, { method: "DELETE" });
  check("owner may delete their own doc", delProfile.ok, `status ${delProfile.status}`);
  const delCode = await call(a.idToken, `codes/${code}`, { method: "DELETE" });
  check("code index delete is refused by design (403)", delCode.status === 403, `status ${delCode.status}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error("PROBE THREW:", e.message);
  process.exit(1);
});
