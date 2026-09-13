#!/usr/bin/env node
// The tenth gate: every game's data, assets and goldens agree with each
// other. For each game under games/ (a directory with data/modes/ - a game is
// what its modes say it is): every data file validates against the engine's
// schema for its kind (toybox/data/schemas); every fighter names a sprite set
// that is present in assets/ AND carries a moves file; every mode names an
// arena, a match and an ai that exist; the committed assets reproduce
// byte-for-byte from dist-export (copy-sprites --check, with its vacuum
// guard); and each golden matches the tape it claims to pin. A directory
// under games/ that carries data/ but no modes/ is a defect, not a skip.
//
// What this gate does NOT do: re-run the sim. The suite already replays the
// goldens through the vitest import path, and toybox/harness/run-tape.mjs
// replays them through each cell's BUILT bundle - that is the hop where a
// bundler alias could swap a module under the suite, so it belongs there.
//
//   node scripts/assert-fight.mjs             # every games/*
//   node scripts/assert-fight.mjs --control   # plant each defect

import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runControls, report } from "./lib/control.mjs";
import { validate } from "./lib/schema.mjs";

const STUDIO = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const GAMES = join(STUDIO, "games");
const FIGHT = join(GAMES, "fight");
// the engine's schemas, one per kind directory and named after it (toybox/data/schemas/fighters.schema.json holds data/fighters/*.json)
const SCHEMAS = join(STUDIO, "toybox", "data", "schemas");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const HEX8 = /^[0-9a-f]{8}$/;

/** every json under data/<kind>/ against the engine's schemas/<kind>.schema.json */
function checkSchemas(root) {
  const out = [];
  const dataDir = join(root, "data");
  for (const kind of readdirSync(dataDir).filter((k) => statSync(join(dataDir, k)).isDirectory())) {
    const dir = join(dataDir, kind);
    const schemaFile = join(SCHEMAS, `${kind}.schema.json`);
    if (!existsSync(schemaFile)) { out.push(`data/${kind}: no schema - ${schemaFile} is missing`); continue; }
    const schema = readJson(schemaFile);
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json") && !x.endsWith(".schema.json"))) out.push(...validate(schema, readJson(join(dir, f))).map((v) => `data/${kind}/${f} ${v}`));
  }
  return out;
}

/** every json of one kind directory, parsed; a kind the game does not carry is an empty list, and a mode naming into it reads as a missing name */
const idsOf = (root, kind) => (existsSync(join(root, "data", kind)) ? readdirSync(join(root, "data", kind)).filter((f) => f.endsWith(".json") && !f.endsWith(".schema.json")).map((f) => readJson(join(root, "data", kind, f))) : []);

const has = (list, id) => list.some((x) => x.id === id);

/** a set's files under assets/, for a fighter (four files) or a turn unit (three: a strike is a rule, not a hitbox) */
function checkSet(assets, what, id, set, exts, out) {
  for (const ext of exts) {
    if (!existsSync(join(assets, set, `${set}.${ext}`))) out.push(`${what} "${id}" names set "${set}" but assets/${set}/${set}.${ext} is missing`);
  }
}

/** a TURN mode names a battle and rules that exist; every placement names a unit that exists; every unit a set with its sheet and manifest */
function checkTurnRefs(root, assets, m, out) {
  const battles = idsOf(root, "battles"), rules = idsOf(root, "rules"), units = idsOf(root, "units");
  if (!has(battles, m.battle)) out.push(`mode "${m.id}" names battle "${m.battle}", which does not exist`);
  if (!has(rules, m.rules)) out.push(`mode "${m.id}" names rules "${m.rules}", which does not exist`);
  const battle = battles.find((b) => b.id === m.battle);
  (battle?.placements ?? []).forEach((p, i) => {
    if (!has(units, p.unit)) out.push(`battle "${battle.id}" placement ${i} names unit "${p.unit}", which does not exist`);
  });
  for (const u of units) checkSet(assets, "unit", u.id, u.sprites, ["png", "atlas.json", "manifest.json"], out);
}

/**
 * A DUNGEON mode names a room and a rules file that exist; the room's start and
 * every spawn name an actor that exists; every actor's side set has its four
 * files and a knight's facings set its three; the room's scenery set (the
 * picture the cells draw, hand-made like the facings) has its three too.
 */
function checkDungeonRefs(root, assets, m, out) {
  const rooms = idsOf(root, "rooms"), rules = idsOf(root, "dungeon"), actors = idsOf(root, "actors");
  if (!has(rooms, m.room)) out.push(`mode "${m.id}" names room "${m.room}", which does not exist`);
  if (!has(rules, m.dungeon)) out.push(`mode "${m.id}" names dungeon rules "${m.dungeon}", which does not exist`);
  const room = rooms.find((r) => r.id === m.room);
  if (room?.start && !has(actors, room.start.actor)) out.push(`room "${room.id}" starts actor "${room.start.actor}", which does not exist`);
  (room?.spawns ?? []).forEach((s, i) => {
    if (!has(actors, s.actor)) out.push(`room "${room.id}" spawn ${i} names actor "${s.actor}", which does not exist`);
  });
  for (const a of actors) {
    checkSet(assets, "actor", a.id, a.sprites, ["png", "atlas.json", "manifest.json", "moves.json"], out);
    if (a.facings !== undefined) checkSet(assets, "actor", a.id, a.facings, ["png", "atlas.json", "manifest.json"], out);
  }
  const scenery = room?.art?.scenery;
  if (typeof scenery === "string") checkSet(assets, "room", room.id, scenery, ["png", "atlas.json", "manifest.json"], out);
  else if (room) out.push(`room "${room.id}" names no art.scenery set`);
}

/** fighters name real sets with moves; modes name real arenas, matches, ais, fighters - or, for a turn mode, a battle, rules and units; or, for a dungeon mode, a room, rules, actors and scenery */
function checkRefs(root, assets) {
  const out = [];
  const fighters = idsOf(root, "fighters"), arenas = idsOf(root, "arena"), matches = idsOf(root, "match"), ais = idsOf(root, "ai");
  for (const f of fighters) checkSet(assets, "fighter", f.id, f.sprites, ["png", "atlas.json", "manifest.json", "moves.json"], out);
  const stages = idsOf(root, "stage");
  for (const m of idsOf(root, "modes")) {
    if (m.kind === "turn") { checkTurnRefs(root, assets, m, out); continue; }
    if (m.kind === "dungeon") { checkDungeonRefs(root, assets, m, out); continue; }
    if (m.kind !== undefined) { out.push(`mode "${m.id}" names an unknown kind ${JSON.stringify(m.kind)}`); continue; }
    if (!has(arenas, m.arena)) out.push(`mode "${m.id}" names arena "${m.arena}", which does not exist`);
    if (!has(matches, m.match)) out.push(`mode "${m.id}" names match "${m.match}", which does not exist`);
    for (const c of m.cast ?? []) {
      if (!has(fighters, c.fighter)) out.push(`mode "${m.id}" casts fighter "${c.fighter}", which does not exist`);
      if (c.control === "ai" && !has(ais, c.ai)) out.push(`mode "${m.id}" gives "${c.fighter}" ai "${c.ai}", which does not exist`);
    }
    // a stage mode: its stage file, and every wave's spawns, the same names the cast is held to
    if (m.stage !== undefined && !has(stages, m.stage)) out.push(`mode "${m.id}" names stage "${m.stage}", which does not exist`);
    (m.waves ?? []).forEach((w, wi) => (w.spawns ?? []).forEach((s, si) => {
      if (!has(fighters, s.fighter)) out.push(`mode "${m.id}" wave ${wi} spawn ${si} names fighter "${s.fighter}", which does not exist`);
      if (!has(ais, s.ai)) out.push(`mode "${m.id}" wave ${wi} spawn ${si} names ai "${s.ai}", which does not exist`);
    }));
  }
  return out;
}

/** the golden pins the tape it names, tick for tick, with whole hashes - both live in the game's tapes/ */
function checkGolden(root) {
  const out = [];
  const tapes = join(root, "tapes");
  if (!existsSync(tapes)) return [`tapes/ is missing - no tape has been recorded`];
  const files = readdirSync(tapes).filter((f) => f.endsWith(".golden.json"));
  if (files.length === 0) out.push(`tapes/ holds no *.golden.json`);
  for (const f of files) {
    const g = readJson(join(tapes, f));
    const tapeFile = join(tapes, `${g.tape}.json`);
    if (!existsSync(tapeFile)) { out.push(`${f} pins tape "${g.tape}", which is not in tapes/`); continue; }
    const tape = readJson(tapeFile);
    if (tape.ticks !== g.ticks) out.push(`${f} says ${g.ticks} ticks, tape ${g.tape} says ${tape.ticks}`);
    if (!idsOf(root, "modes").some((m) => m.id === tape.mode)) out.push(`tape ${g.tape} names mode "${tape.mode}", which does not exist`);
    for (const k of ["hash", "chain", "eventHash"]) if (!HEX8.test(String(g[k]))) out.push(`${f}.${k} is ${JSON.stringify(g[k])}, not 8 hex chars`);
  }
  return out;
}

/** copy-sprites reads the fighters of `game` under games/ (the scratch trees of the controls carry the fight's) */
function checkAssets(assets, game) {
  const r = spawnSync(process.execPath, [join(STUDIO, "toybox", "harness", "copy-sprites.mjs"), "--check", "--game", game, "--assets", assets], { encoding: "utf8" });
  if (r.status === 0) return [];
  return [`copy-sprites --check exit ${r.status}: ${(r.stdout + r.stderr).trim().split("\n").filter((l) => /DIFF|compared|exist|export/.test(l)).join(" | ")}`];
}

/**
 * The HAND-MADE sets: not export sets, so copy-sprites cannot hold them; each
 * has a generator under tools/ with a reproduce.sh that re-emits into scratch
 * and diffs against its committed output. A game whose assets/ carries one of
 * these runs that gate, and where the generator's output lives under the tool
 * (the facings' out/), the game's copy is compared to it file by file too.
 * A registry, because a generator cannot be found from a png.
 */
const HAND_MADE = {
  "knight-facings": { tool: join(STUDIO, "tools", "facings-painter"), source: join(STUDIO, "tools", "facings-painter", "out") },
  "crypt-room": { tool: join(STUDIO, "tools", "room-painter"), source: null },
};

function checkHandMade(assets) {
  const out = [];
  for (const [set, { tool, source }] of Object.entries(HAND_MADE)) {
    const dir = join(assets, set);
    if (!existsSync(dir)) continue;
    const r = spawnSync("bash", [join(tool, "reproduce.sh")], { encoding: "utf8" });
    if (r.status !== 0) out.push(`${set}: ${tool}/reproduce.sh exit ${r.status}: ${(r.stdout + r.stderr).trim().split("\n").slice(-2).join(" | ")}`);
    if (source) {
      for (const f of readdirSync(source)) {
        const mine = join(dir, f);
        if (!existsSync(mine)) { out.push(`${set}: assets/${set}/${f} is missing (the generator emits it)`); continue; }
        if (!readFileSync(mine).equals(readFileSync(join(source, f)))) out.push(`${set}: assets/${set}/${f} differs from ${source}/${f}`);
      }
    }
  }
  return out;
}

/** one game's tree against itself; `game` names it for copy-sprites, `root` may be a scratch copy */
export function scanFight(root = FIGHT, assets = join(root, "assets"), game = "fight") {
  return [...checkSchemas(root), ...checkRefs(root, assets), ...checkGolden(root), ...checkAssets(assets, game), ...checkHandMade(assets)];
}

/**
 * The games under `gamesRoot`: every directory holding data/modes/. A directory
 * with data/ and no modes/ is reported as a defect (a game is what its modes say
 * it is); a directory with no data/ at all is not a game and is skipped by name.
 */
export function listGames(gamesRoot = GAMES) {
  const games = [], bad = [], skipped = [];
  if (!existsSync(gamesRoot)) return { games, bad: [`${gamesRoot} does not exist`], skipped };
  for (const name of readdirSync(gamesRoot).filter((n) => statSync(join(gamesRoot, n)).isDirectory()).sort()) {
    if (!existsSync(join(gamesRoot, name, "data"))) { skipped.push(name); continue; }
    if (!existsSync(join(gamesRoot, name, "data", "modes"))) { bad.push(`games/${name}: has data/ but no data/modes/ - a game is what its modes say it is`); continue; }
    games.push(name);
  }
  return { games, bad, skipped };
}

/** every game's findings, prefixed by the game's name */
export function scanGames(gamesRoot = GAMES) {
  const { games, bad, skipped } = listGames(gamesRoot);
  const out = [...bad];
  for (const g of games) out.push(...scanFight(join(gamesRoot, g), join(gamesRoot, g, "assets"), g).map((v) => `${g}: ${v}`));
  return { games, skipped, findings: out };
}

/** a scratch copy of data/ + tapes/, mutated by `fn`; assets stay the real ones unless the control copies them */
function controls() {
  const scratch = (fn) => {
    const dir = mkdtempSync(join(tmpdir(), "assert-fight-"));
    cpSync(join(FIGHT, "data"), join(dir, "data"), { recursive: true });
    cpSync(join(FIGHT, "tapes"), join(dir, "tapes"), { recursive: true });
    const assets = fn(dir) ?? join(FIGHT, "assets");
    const out = scanFight(dir, assets);
    rmSync(dir, { recursive: true, force: true });
    return out;
  };
  const edit = (dir, rel, fn) => { const p = join(dir, rel); const j = readJson(p); fn(j); writeFileSync(p, JSON.stringify(j, null, 2)); };
  const copyAssets = (dir) => { cpSync(join(FIGHT, "assets"), join(dir, "assets"), { recursive: true }); return join(dir, "assets"); };
  // the turn game's data in a scratch copy, run through checkRefs alone: the one check a placement can fail
  const EMBER = join(GAMES, "ember");
  const emberRefs = (fn) => {
    const dir = mkdtempSync(join(tmpdir(), "assert-fight-ember-"));
    cpSync(join(EMBER, "data"), join(dir, "data"), { recursive: true });
    fn(dir);
    const out = checkRefs(dir, join(EMBER, "assets"));
    rmSync(dir, { recursive: true, force: true });
    return out;
  };
  // the dungeon game's data in a scratch copy, run through checkRefs alone, with its assets real or a scratch copy of them
  const HOLLOW = join(GAMES, "hollow");
  const hollowRefs = (fn, withAssets = false) => {
    const dir = mkdtempSync(join(tmpdir(), "assert-fight-hollow-"));
    cpSync(join(HOLLOW, "data"), join(dir, "data"), { recursive: true });
    let assets = join(HOLLOW, "assets");
    if (withAssets) { cpSync(assets, join(dir, "assets"), { recursive: true }); assets = join(dir, "assets"); }
    fn(dir, assets);
    const out = checkRefs(dir, assets);
    rmSync(dir, { recursive: true, force: true });
    return out;
  };
  // a games root holding one directory with data/ but no modes/ - the walk must name it, not skip it
  const gamesRootWithAModelessGame = () => {
    const dir = mkdtempSync(join(tmpdir(), "assert-fight-games-"));
    cpSync(FIGHT, join(dir, "fight"), { recursive: true });
    cpSync(join(FIGHT, "data", "ai"), join(dir, "ghost", "data", "ai"), { recursive: true });
    const out = scanGames(dir).findings;
    rmSync(dir, { recursive: true, force: true });
    return out;
  };
  return [
    { name: "the real tree", expect: "PASS", run: () => scanGames().findings },
    { name: "a games/ directory with data/ but no modes/", expect: "FIRE", run: gamesRootWithAModelessGame },
    { name: "a mode naming an arena that does not exist", expect: "FIRE", run: () => scratch((d) => edit(d, "data/modes/versus.json", (m) => { m.arena = "moon"; })) },
    { name: "a float cooldown in an ai file", expect: "FIRE", run: () => scratch((d) => edit(d, "data/ai/teddy-cpu.json", (a) => { a.cooldownTicks[0] = 42.5; })) },
    { name: "a fighter naming a set that is not in assets", expect: "FIRE", run: () => scratch((d) => edit(d, "data/fighters/teddy.json", (f) => { f.sprites = "ghost--snes16"; })) },
    { name: "a set present in assets but without its moves file", expect: "FIRE", run: () => scratch((d) => { const a = copyAssets(d); unlinkSync(join(a, "teddy--snes16", "teddy--snes16.moves.json")); return a; }) },
    { name: "a stray key on the match file", expect: "FIRE", run: () => scratch((d) => edit(d, "data/match/versus.json", (m) => { m.gravity = 900; })) },
    { name: "a golden whose tick count disagrees with its tape", expect: "FIRE", run: () => scratch((d) => edit(d, "tapes/versus-600.golden.json", (g) => { g.ticks = 599; })) },
    { name: "a golden hash one digit short", expect: "FIRE", run: () => scratch((d) => edit(d, "tapes/versus-600.golden.json", (g) => { g.chain = g.chain.slice(1); })) },
    { name: "a wave spawn naming a fighter that does not exist", expect: "FIRE", run: () => scratch((d) => edit(d, "data/modes/stage.json", (m) => { m.waves[1].spawns[2].fighter = "ghost"; })) },
    { name: "one byte flipped in a committed sheet", expect: "FIRE", run: () => scratch((d) => { const a = copyAssets(d); const p = join(a, "robot--snes16", "robot--snes16.png"); const b = readFileSync(p); b[Math.floor(b.length / 2)] ^= 0xff; writeFileSync(p, b); return a; }) },
    { name: "the turn game's refs as committed (checkRefs alone)", expect: "PASS", run: () => emberRefs(() => {}) },
    { name: "a turn battle placement naming a unit that does not exist", expect: "FIRE", run: () => emberRefs((d) => edit(d, "data/battles/meadow.json", (b) => { b.placements[2].unit = "ghost"; })) },
    { name: "a turn mode naming rules that do not exist", expect: "FIRE", run: () => emberRefs((d) => edit(d, "data/modes/meadow.json", (m) => { m.rules = "moon"; })) },
    { name: "the dungeon game's refs as committed (checkRefs alone)", expect: "PASS", run: () => hollowRefs(() => {}) },
    { name: "a room spawn naming an actor that does not exist", expect: "FIRE", run: () => hollowRefs((d) => edit(d, "data/rooms/crypt.json", (r) => { r.spawns[2].actor = "ghost"; })) },
    { name: "a dungeon mode naming a room that does not exist", expect: "FIRE", run: () => hollowRefs((d) => edit(d, "data/modes/crypt.json", (m) => { m.room = "moon"; })) },
    { name: "a room whose scenery set has lost its manifest", expect: "FIRE", run: () => hollowRefs((_d, a) => unlinkSync(join(a, "crypt-room", "crypt-room.manifest.json")), true) },
    { name: "a knight whose facings set is not in assets", expect: "FIRE", run: () => hollowRefs((d) => edit(d, "data/actors/knight.json", (k) => { k.facings = "knight-ghost"; })) },
    { name: "the hand-made sets as committed (the two reproduce.sh, the facings copy)", expect: "PASS", run: () => checkHandMade(join(HOLLOW, "assets")) },
    { name: "a facings copy one byte off its generator's output", expect: "FIRE", run: () => { const dir = mkdtempSync(join(tmpdir(), "assert-fight-hand-")); cpSync(join(HOLLOW, "assets"), join(dir, "assets"), { recursive: true }); const p = join(dir, "assets", "knight-facings", "knight-facings.png"); const b = readFileSync(p); b[Math.floor(b.length / 2)] ^= 0xff; writeFileSync(p, b); const out = checkHandMade(join(dir, "assets")); rmSync(dir, { recursive: true, force: true }); return out; } },
  ];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { games, skipped, findings } = scanGames();
  // the vacuum guard: a gate over no games, or over a game with no modes, is not a pass
  if (games.length === 0 || games.some((g) => idsOf(join(GAMES, g), "modes").length === 0)) {
    console.error(`assert-fight: no game with a mode file under games/ (${games.join(", ") || "none"}) - a gate over nothing is not a pass`);
    process.exit(1);
  }
  if (process.argv.includes("--control")) process.exit(runControls("assert-fight", controls()) ? 0 : 1);
  const summary = games.map((g) => `${g} (${idsOf(join(GAMES, g), "modes").length} mode(s), ${idsOf(join(GAMES, g), "fighters").length} fighter(s), ${readdirSync(join(GAMES, g, "assets")).length} sprite set(s))`).join("; ");
  process.exit(report("assert-fight", `${games.length} game(s) under games/: ${summary}${skipped.length ? `; skipped (no data/): ${skipped.join(", ")}` : ""}`, findings));
}
