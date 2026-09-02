// Read the report inbox and file what is in it as GitHub issues.
//
//   npm run reports:pull            list what is waiting, file nothing
//   npm run reports:pull -- --file  file the unfiled ones
//   npm run reports:pull -- --control   prove this script can do both halves
//
// WHY THIS RUNS ON YOUR MACHINE AND NOT IN THE BROWSER
// Creating an issue needs a token with write access to a public repository.
// Anything shipped in the bundle is readable by everybody, so the browser can
// never hold one. It writes the report to Firestore and this reads it with an
// OWNER credential, which bypasses `allow read: if false`. That gap is also the
// triage step: a report becomes public only after a person has looked at it.
//
// LISTING IS THE DEFAULT AND FILING IS THE FLAG, deliberately. Filing is the
// irreversible half - an issue on a public repo cannot be unpublished - so the
// safe verb is the one you get by typing nothing.
import { execFileSync } from "node:child_process";

const PROJECT = "ellaz-games";
const SA = `ellaz-bootstrap@${PROJECT}.iam.gserviceaccount.com`;
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const REPO = "Sigmafier/ellaz";

const argv = process.argv.slice(2);
const FILE = argv.includes("--file");
const CONTROL = argv.includes("--control");

function token() {
  return execFileSync("gcloud", ["auth", "print-access-token", `--impersonate-service-account=${SA}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function api(tok, path, init = {}) {
  const res = await fetch(`${DOCS}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${res.status} ${path}: ${JSON.stringify(body)?.slice(0, 300)}`);
  return body;
}

/** Firestore's typed cells -> plain values. Only the types this doc uses. */
function plain(fields = {}) {
  const out = {};
  for (const [k, cell] of Object.entries(fields)) {
    if ("stringValue" in cell) out[k] = cell.stringValue;
    else if ("integerValue" in cell) out[k] = Number(cell.integerValue);
    else if ("booleanValue" in cell) out[k] = cell.booleanValue;
    else out[k] = cell;
  }
  return out;
}

async function readAll(tok) {
  // A collection-group query over `items`. No filter and no order-by, so it
  // needs no composite index - the volume here is tiny and filtering in JS is
  // both cheaper and one less thing that can be wrong.
  const body = await api(tok, ":runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "items", allDescendants: true }] },
    }),
  });
  return (Array.isArray(body) ? body : [])
    .filter((row) => row.document)
    .map((row) => ({
      name: row.document.name,
      path: row.document.name.split("/documents/")[1],
      ...plain(row.document.fields),
    }));
}

/** A stable line so a re-run, or a second report of the same thing, is
 *  recognisable. Not a hash of the message - two people describe one bug in two
 *  sentences, and the game plus the reason is what actually collides. */
const signature = (r) => {
  let ctx = {};
  try {
    ctx = JSON.parse(r.ctx || "{}");
  } catch {
    /* a report whose ctx will not parse is still worth filing */
  }
  return `ellaz-report:${ctx?.game?.id ?? "app"}:${r.kind}:${r.reason ?? "none"}`;
};

function issueBody(r) {
  let ctx = {};
  try {
    ctx = JSON.parse(r.ctx || "{}");
  } catch {
    ctx = { unparseable: r.ctx?.slice(0, 200) };
  }
  const g = ctx.game;
  const lines = [
    r.message ? `> ${r.message}` : "_No words - the reporter tapped a reason and sent._",
    "",
    "| | |",
    "|---|---|",
    `| Game | ${g?.id ?? "(not in a game)"} |`,
    g?.level ? `| Level | ${g.level} |` : null,
    g?.sessionAgeMs != null ? `| On this board for | ${Math.round(g.sessionAgeMs / 1000)}s |` : null,
    g?.sessionDropped ? `| Board | not sent: ${g.sessionDropped} |` : null,
    ctx.view ? `| Screen | ${ctx.view.w}x${ctx.view.h} @${ctx.view.dpr} ${ctx.view.orientation} |` : null,
    ctx.app ? `| App | ${ctx.app.locale ?? "?"} - ${ctx.app.theme ?? "?"} - build ${ctx.app.buildStamp ?? "?"} |` : null,
    ctx.client ? `| Client | ${ctx.client.language} - ${ctx.client.userAgent} |` : null,
    r.shot ? `| Picture | attached below |` : null,
    "",
    g?.session ? "<details><summary>The exact board, replayable through this game's own session validator</summary>\n\n```json\n" + JSON.stringify(g.session, null, 2).slice(0, 60000) + "\n```\n</details>" : null,
    Array.isArray(ctx.errors) && ctx.errors.length
      ? "<details><summary>What threw</summary>\n\n```\n" + ctx.errors.map((e) => `${e.message}\n${e.stack ?? ""}`).join("\n---\n").slice(0, 20000) + "\n```\n</details>"
      : null,
    "",
    `<sub>${signature(r)} - ${r.path}</sub>`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

const title = (r) => {
  let ctx = {};
  try {
    ctx = JSON.parse(r.ctx || "{}");
  } catch {
    /* fall through to the generic title */
  }
  const where = ctx?.game?.id ?? "the app";
  const said = (r.message ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const what = said || (r.reason ?? r.kind);
  return `${r.kind === "idea" ? "Idea" : "Bug"} in ${where}: ${what}`;
};

function fileIssue(r) {
  const label = r.kind === "idea" ? "enhancement" : "bug";
  const out = execFileSync(
    "gh",
    ["issue", "create", "--repo", REPO, "--title", title(r), "--body", issueBody(r), "--label", label],
    { encoding: "utf8" },
  ).trim();
  return out.split("\n").pop();
}

async function markFiled(tok, path, url) {
  await api(tok, `/${path}?updateMask.fieldPaths=filed`, {
    method: "PATCH",
    body: JSON.stringify({ fields: { filed: { stringValue: url } } }),
  });
}

async function control(tok) {
  // The instrument, watched doing BOTH things. A puller that can only report
  // "nothing to file" looks identical whether the inbox is empty or the query
  // is broken - so plant one report, prove it is seen and would be filed, then
  // mark it filed and prove it is NOT seen again.
  const uid = "control";
  const minute = String(Math.floor(Date.now() / 60000));
  const path = `reports/${uid}/items/${minute}`;
  let ok = true;
  const say = (label, good) => {
    console.log(`  ${good ? "PASS" : "FAIL"}  ${label}`);
    if (!good) ok = false;
  };

  await api(tok, `/reports/${uid}/items?documentId=${minute}`, {
    method: "POST",
    body: JSON.stringify({
      fields: {
        at: { integerValue: String(Date.now()) },
        kind: { stringValue: "bug" },
        reason: { stringValue: "control" },
        message: { stringValue: "planted by --control" },
        ctx: { stringValue: JSON.stringify({ game: { id: "control-game" } }) },
      },
    }),
  });

  const seen = (await readAll(tok)).find((r) => r.path === path);
  say("a planted report is found by the query", Boolean(seen));
  say("and it is unfiled, so it would be filed", Boolean(seen) && !seen.filed);
  say("and its issue body names the game", Boolean(seen) && issueBody(seen).includes("control-game"));

  await markFiled(tok, path, "https://example.invalid/control");
  const after = (await readAll(tok)).find((r) => r.path === path);
  say("once filed it is skipped", Boolean(after?.filed));

  await api(tok, `/${path}`, { method: "DELETE" });
  const gone = (await readAll(tok)).find((r) => r.path === path);
  say("the control cleans up after itself", !gone);

  console.log(ok ? "\ncontrol OK - this script can see a report AND skip a filed one" : "\nCONTROL FAILED - do not trust a run of this script");
  process.exit(ok ? 0 : 1);
}

const run = async () => {
  const tok = token();
  if (CONTROL) return control(tok);

  const all = await readAll(tok);
  const waiting = all.filter((r) => !r.filed);

  console.log(`${all.length} report(s) in the inbox, ${waiting.length} not yet filed\n`);
  for (const r of all) {
    const when = r.at ? new Date(r.at).toISOString().replace("T", " ").slice(0, 16) : "?";
    console.log(`  ${r.filed ? "filed " : "NEW   "} ${when}  ${title(r)}`);
    if (r.filed) console.log(`          ${r.filed}`);
  }

  if (!FILE) {
    console.log(`\nNothing was filed. Re-run with --file to open ${waiting.length} issue(s).`);
    return;
  }

  for (const r of waiting) {
    const url = fileIssue(r);
    await markFiled(tok, r.path, url);
    console.log(`  filed  ${url}`);
  }
};

run().catch((e) => {
  console.error(String(e.message ?? e));
  process.exit(1);
});
