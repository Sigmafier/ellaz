#!/usr/bin/env node
/**
 * A game declares its band, and a `showcase` game keeps the promise.
 *
 * WHY THIS IS A SCRIPT AND NOT ONLY A TEST. `tier-is-declared.test.ts` pins the
 * declaration, and it runs under vitest - which BOTH deploy workflows run
 * exactly ZERO times. They run `build:check`. So a gate that is meant to be a
 * refusal rather than a courtesy has to live here, in the list a deploy
 * actually executes. (Measured 2026-09-12: `npm test` / `vitest` appear 0 times
 * in deploy-hostinger.yml and deploy-pages.yml.)
 *
 * WHAT IS ENFORCED, AND WHAT IS ONLY REPORTED
 *
 *   ENFORCED   every game declares one of the two bands
 *   ENFORCED   no meta.ts imports an asset (it is in the shell chunk)
 *   ENFORCED   at least one game in each band - or this gate reads nothing
 *   REPORTED   a showcase game carries sprites, five clips, effects, 2+ weapons
 *   REPORTED   a showcase game's own weight is within SHOWCASE_BUDGET
 *
 * The split is deliberate and it has a rule of its own:
 * `.claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md`. The
 * one showcase game on the roster today is `survivors`, which is being rebuilt
 * onto the studio cast and carries NONE of the four requirements yet - measured
 * 2026-09-12: zero matches for sprite/atlas/manifest, no `@juice` import, no
 * weapons. Enforcing the requirements today would mean a red build on every
 * push until the rebuild lands, and a gate that is red for a week is a gate
 * whose red stops being read.
 *
 * ARM THEM in the same commit that makes the rebuild pass:
 *
 *     TIER_REQUIREMENTS=1 node scripts/assert-tier.mjs
 *
 * and then delete the env check so it is unconditional. The switch lives beside
 * the constant so the person who finishes the rebuild finds it.
 *
 * Usage:
 *   node scripts/assert-tier.mjs              # the gate
 *   node scripts/assert-tier.mjs --control    # the negative control (below)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GAMES = join(REPO, "src/games");
const DIST = process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : join(REPO, "dist");
const CONTROL = process.argv.includes("--control");
const REQUIREMENTS_ARMED = process.env.TIER_REQUIREMENTS === "1";

const BANDS = ["simple", "showcase"];

/**
 * What a showcase game may weigh, in bytes, counting its own lazy chunk plus
 * any asset only it references.
 *
 * 300 KB, the operator's ruling 2026-09-12. NOT YET MEASURED against a real
 * sprite-carrying game, which is why it only reports: the five snes16 sheets in
 * `studio/dist-export` are ~1.36 MB of PNG between them at the export's scale 2,
 * so the honest number for a game that ships three characters is not known until
 * task 2 measures it. Re-rule this against that measurement before arming, and
 * name the tree the new figure came from
 * (.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md).
 */
const SHOWCASE_BUDGET = 300 * 1024;

/** The five clip ids the studio export emits for every character. */
const CLIPS = ["idle", "walk", "attack", "hurt", "ko"];

// ---------------------------------------------------------------------------
// reading the roster out of the source, textually
// ---------------------------------------------------------------------------

const dirs = readdirSync(GAMES, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

/** Every non-test source file a game owns, concatenated. */
function sourceOf(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const path = join(d, entry.name);
      if (entry.isDirectory()) { walk(path); continue; }
      if (entry.name.includes(".test.")) continue;
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      out.push(readFileSync(path, "utf8"));
    }
  };
  walk(join(GAMES, dir));
  return out.join("\n");
}

const games = dirs.map((dir) => {
  const metaPath = join(GAMES, dir, "meta.ts");
  const meta = readFileSync(metaPath, "utf8");
  return {
    dir,
    id: meta.match(/\bid: *"([^"]+)"/)?.[1] ?? dir,
    tier: meta.match(/\btier: *"([a-z]+)"/)?.[1],
    meta,
    src: sourceOf(dir),
  };
});

// ---------------------------------------------------------------------------
// the control
// ---------------------------------------------------------------------------

if (CONTROL) {
  // Plant each failure IN MEMORY rather than on disk: a control that edits
  // tracked files leaves a tree nobody can explain when the run is killed, and
  // this repo has already paid for that once.
  games.push({ dir: "__control_no_tier", id: "__control_no_tier", tier: undefined, meta: "", src: "" });
  games.push({ dir: "__control_bad_tier", id: "__control_bad_tier", tier: "deluxe", meta: "", src: "" });
  games.push({
    dir: "__control_asset_import",
    id: "__control_asset_import",
    tier: "simple",
    meta: 'import sheet from "./sprites/robot.png";\n',
    src: "",
  });
  console.log("  CONTROL: planted a tierless game, an unknown band, and a meta.ts importing a sheet");
}

// ---------------------------------------------------------------------------

const failures = [];
const reports = [];

console.log(`population: ${games.length} games under src/games/`);

// --- ENFORCED: every game declares a band -----------------------------------
const undeclared = games.filter((g) => g.tier === undefined);
const unknown = games.filter((g) => g.tier !== undefined && !BANDS.includes(g.tier));
for (const g of undeclared) {
  failures.push(
    `${g.id} declares no tier. Add \`tier: "simple"\` to src/games/${g.dir}/meta.ts - ` +
      `"simple" asks nothing of the game and is what the roster already is.`,
  );
}
for (const g of unknown) {
  failures.push(
    `${g.id} declares tier "${g.tier}", which is not a band. The two are ` +
      `${BANDS.join(" and ")}, and there is deliberately no third.`,
  );
}

const byBand = Object.fromEntries(BANDS.map((b) => [b, games.filter((g) => g.tier === b)]));
console.log(`  declared      ${games.length - undeclared.length - unknown.length} of ${games.length}`);
for (const b of BANDS) console.log(`  ${b.padEnd(13)} ${byBand[b].length}${byBand[b].length && b === "showcase" ? " -> " + byBand[b].map((g) => g.id).join(", ") : ""}`);

// --- ENFORCED: the positive control -----------------------------------------
// Without this every check below passes over an empty set, which reads exactly
// like a gate that works.
for (const b of BANDS) {
  if (byBand[b].length === 0) {
    failures.push(
      `no game declares "${b}". A band with no members means everything this gate ` +
        `checks about it is passing over nothing - delete the gate rather than leave it green.`,
    );
  }
}

// --- ENFORCED: meta.ts may not import an asset ------------------------------
for (const g of games) {
  const assets = [...g.meta.matchAll(/from "([^"]*\.(?:png|jpe?g|webp|gif|svg|json|css))"/g)].map((m) => m[1]);
  // A default import of an asset does not use `from` at all in some styles, so
  // catch the bare form too rather than trusting one shape.
  const bare = [...g.meta.matchAll(/import\s+[\w{},*\s]*\s*from\s*"([^"]*\.(?:png|jpe?g|webp|gif|svg))"/g)].map((m) => m[1]);
  const hit = [...new Set([...assets, ...bare])];
  if (hit.length) {
    failures.push(
      `${g.id}/meta.ts imports ${hit.join(", ")}. meta.ts is pinned to the SHELL chunk, ` +
        `so those bytes land in the first visit of a child who has not picked a game yet. ` +
        `Import it from the game's renderer, which is lazy.`,
    );
  }
}

// --- REPORTED: the four requirements ----------------------------------------
function requirementsOf(g) {
  const src = g.src;
  return {
    sprites: /sprites?\//.test(src) || /\batlas\b/i.test(src) || /\bmanifest\b/i.test(src),
    animation: CLIPS.every((c) => new RegExp(`["'\`]${c}["'\`]`).test(src)),
    effects: /@juice/.test(src),
    weapons: new Set([...src.matchAll(/\bweapon(?:s)?\s*[:=]/gi)].map((m) => m[0])).size > 0
      && [...src.matchAll(/\bWEAPONS?\b/g)].length > 0,
  };
}

for (const g of byBand.showcase) {
  const req = requirementsOf(g);
  const missing = Object.entries(req).filter(([, ok]) => !ok).map(([k]) => k);
  if (missing.length === 0) continue;
  const line =
    `${g.id} is showcase and its source shows no ${missing.join(", no ")}. ` +
    `Showcase means ALL FOUR: real studio sprites from the cast, the five clips ` +
    `(${CLIPS.join("/")}), hit effects and juice, and 2+ weapons that look different.`;
  (REQUIREMENTS_ARMED ? failures : reports).push(line);
}

// --- REPORTED: the weight budget --------------------------------------------
function weightOf(id) {
  const assetsDir = join(DIST, "assets");
  if (!existsSync(assetsDir)) return null;
  let total = 0;
  for (const name of readdirSync(assetsDir)) {
    if (!name.startsWith(`game-${id}-`)) continue;
    total += statSync(join(assetsDir, name)).size;
  }
  return total;
}

for (const g of byBand.showcase) {
  const bytes = weightOf(g.id);
  if (bytes === null) {
    reports.push(`${g.id}: no ${DIST}/assets to weigh - run a build first if you want the weight reading.`);
    continue;
  }
  const line =
    `${g.id} weighs ${bytes.toLocaleString()} B against the ${SHOWCASE_BUDGET.toLocaleString()} B showcase budget` +
    (bytes > SHOWCASE_BUDGET ? " - OVER." : ` (${(SHOWCASE_BUDGET - bytes).toLocaleString()} B spare).`);
  if (bytes > SHOWCASE_BUDGET) (REQUIREMENTS_ARMED ? failures : reports).push(line);
  else console.log(`  weight        ${line}`);
}

// ---------------------------------------------------------------------------

if (reports.length) {
  console.log("\n  REPORTED, not enforced (arm with TIER_REQUIREMENTS=1):");
  for (const r of reports) console.log(`    ${r}`);
  console.log(
    "\n  These are the showcase promises. They are reported rather than refused because\n" +
      "  the rebuild that keeps them has not landed yet, and a gate that is red every day\n" +
      "  for something nobody can fix that day is a gate whose red stops being read.\n" +
      "  Arm them in the commit that makes the last one pass.",
  );
}

if (failures.length) {
  console.error(`\nFAIL  ${failures.length} tier violation${failures.length === 1 ? "" : "s"}:`);
  for (const f of failures) console.error(`      ${f}`);
  process.exit(1);
}

if (CONTROL) {
  console.error(
    "\nFAIL  the CONTROL passed. A tierless game, an unknown band and a meta.ts importing\n" +
      "      a sprite sheet were all planted, and the gate did not notice - so its green\n" +
      "      on a real run is worth nothing.",
  );
  process.exit(1);
}

console.log(
  `\nOK  ${games.length} games declare a band, ${byBand.showcase.length} showcase and ` +
    `${byBand.simple.length} simple, and no meta.ts imports an asset.`,
);
