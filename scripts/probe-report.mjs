// The reports rules, probed against the REAL ellaz-games project.
//
// A rules file enforces nothing. It is a document until it is released, and
// this repo's CI never releases it - so the only way to know what the database
// is actually doing is to ask the database. Run it after every rules edit and
// after every `bash scripts/deploy-rules.sh`.
//
//   npm run probe:report
//
// EVERY NEGATIVE HAS A POSITIVE BESIDE IT. A rule that refused everybody would
// pass every negative cell in this file and read as a hardened collection, so
// the first check is that a well-formed report GETS IN. If cell 1 fails, no
// other result here means anything, and the summary says so.
//
// The load-bearing cell is 5. The throttle is not "one document per minute"
// because the client is polite - it is that the rule compares the document ID
// to the server's own clock. Without that comparison a caller invents ids and
// writes as many documents as it likes, and cells 1-4 would all still pass.
//
// It leaves behind two anonymous users and up to two report documents, in a
// collection nothing but an owner credential can read.
const API_KEY = "AIzaSyDauvXsn6WL10fdtKRCo5l5PfLuRVXuWwA";
const PROJECT = "ellaz-games";
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

let pass = 0;
let fail = 0;
let controlOk = false;

function check(label, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}  ${detail}`);
  }
  return ok;
}

async function signUp() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  });
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

/** A well-formed report body. `extra` overrides or adds fields. */
const report = (extra = {}) => ({
  fields: {
    at: { integerValue: String(Date.now()) },
    kind: { stringValue: "bug" },
    ctx: { stringValue: JSON.stringify({ game: { id: "snake", level: "hard" } }) },
    reason: { stringValue: "froze" },
    message: { stringValue: "probe - the snake stopped moving" },
    ...extra,
  },
});

const write = (token, uid, minute, body) =>
  call(token, `reports/${uid}/items?documentId=${minute}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const minuteNow = () => Math.floor(Date.now() / 60000);

const run = async () => {
  const a = await signUp();
  const b = await signUp();

  console.log("1. the positive control - a real report gets in");
  const first = await write(a.idToken, a.localId, String(minuteNow()), report());
  controlOk = check("a well-formed report is accepted", first.ok, `${first.status}`);

  console.log("2. the throttle - a second report in the same minute");
  const again = await write(a.idToken, a.localId, String(minuteNow()), report());
  check(
    "a second report in the same minute is refused (409)",
    again.status === 409,
    `got ${again.status}`,
  );

  console.log("3. you may only write under your own uid");
  const impostor = await write(b.idToken, a.localId, String(minuteNow() + 1), report());
  check("a stranger may NOT write into someone else's reports (403)", impostor.status === 403, `got ${impostor.status}`);

  console.log("4. nobody reads a report from a browser");
  const ownRead = await call(a.idToken, `reports/${a.localId}/items/${minuteNow()}`);
  check("even the author cannot read their own report back (403)", ownRead.status === 403, `got ${ownRead.status}`);
  const strangerRead = await call(b.idToken, `reports/${a.localId}/items/${minuteNow()}`);
  check("a stranger cannot read it either (403)", strangerRead.status === 403, `got ${strangerRead.status}`);

  console.log("5. the doc id is checked against the SERVER's clock");
  const future = await write(b.idToken, b.localId, String(minuteNow() + 60), report());
  check(
    "an invented minute an hour ahead is refused (403)",
    future.status === 403,
    `got ${future.status} - if this passes, the throttle is a comment`,
  );
  const past = await write(b.idToken, b.localId, String(minuteNow() - 60), report());
  check("an invented minute an hour behind is refused (403)", past.status === 403, `got ${past.status}`);

  console.log("6. the shape checks");
  const fat = await write(b.idToken, b.localId, String(minuteNow()), report({ message: { stringValue: "x".repeat(400) } }));
  check("a message over 300 characters is refused (403)", fat.status === 403, `got ${fat.status}`);

  const unknown = await write(b.idToken, b.localId, String(minuteNow()), report({ email: { stringValue: "a@b.c" } }));
  check("an unknown field is refused (403)", unknown.status === 403, `got ${unknown.status}`);

  const mapCtx = await write(b.idToken, b.localId, String(minuteNow()), {
    fields: {
      at: { integerValue: String(Date.now()) },
      kind: { stringValue: "bug" },
      ctx: { mapValue: { fields: { a: { stringValue: "b" } } } },
    },
  });
  check("a ctx sent as a MAP is refused - rules cannot size a map (403)", mapCtx.status === 403, `got ${mapCtx.status}`);

  const badKind = await write(b.idToken, b.localId, String(minuteNow()), report({ kind: { stringValue: "spam" } }));
  check("a kind outside bug|idea is refused (403)", badKind.status === 403, `got ${badKind.status}`);

  console.log("7. the second positive control - b can still get a report in");
  // Without this, every 403 above could be "b is refused everything" rather
  // than "that particular shape is refused".
  const bOk = await write(b.idToken, b.localId, String(minuteNow()), report());
  check("a well-formed report from b is still accepted", bOk.ok, `${bOk.status}`);

  console.log("");
  if (!controlOk) {
    console.log("CONTROL FAILED - the collection refuses even a good report, so every");
    console.log("refusal above is meaningless. Do not read this run as a pass.");
  }
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail === 0 && controlOk ? 0 : 1);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
