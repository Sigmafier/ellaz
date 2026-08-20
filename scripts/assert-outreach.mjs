#!/usr/bin/env node
/**
 * The outreach drafts quote numbers about this site. This asserts they are still true.
 *
 * WHY THIS EXISTS. Every other number-bearing surface here is DERIVED. The
 * sitemap, `llms.txt` and the emitted home read the roster, so they cannot be
 * wrong about how many games there are. `src/content/` carries a `provenance`
 * row per figure and `content.test.ts` checks the deriving script still exists.
 * `docs/outreach/**` is the one folder where a number about this site is
 * hand-authored - and it is also the only folder whose contents are meant to
 * leave the repository and be read by strangers.
 *
 * That combination is the whole problem. A stale line in `CLAUDE.md` is fixed by
 * editing `CLAUDE.md`. A stale number in a Show HN post, a press letter or a pull
 * request into somebody else's list is published, permanent, and read as a claim
 * about the project's honesty rather than as a rounding error. `launch.md` says it
 * itself: the one-shot surfaces cannot be re-run.
 *
 * Measured 2026-08-18, six days after the drafts were written: 28 occurrences of
 * "23 games" against a roster of 33, "52 pages" against 144, "two languages"
 * against four, and a first visit of 88,234 B gz against 90,027. Nothing in the
 * repository could see any of it, because nothing reads this folder.
 *
 * IT IS NOT IN `build:check`, ON PURPOSE. Same placement as `assert:standalone`:
 * a gate for an artifact that is published by hand, run before publishing rather
 * than on every build. Wiring it into the build would red every lane that adds a
 * game until somebody edits eight markdown files, and a gate that reds on work it
 * is not about is a gate people learn to skip - see
 * `.claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md`.
 * `--fix` exists so that cost is one command instead of eight files.
 *
 * THE POSITIVE CONTROL IS THE LOAD-BEARING HALF. Every pattern below must find at
 * least `minHits` occurrences across the corpus. A matcher that silently stops
 * matching - because a draft was rephrased, or a language was added - reports a
 * clean sweep over prose it never read, which is exactly the shape
 * `.claude/rules/a-diagnostic-that-truncates-what-it-compares.md` is about. Zero
 * hits is a FAILURE here, never a pass.
 *
 * Usage:
 *   node scripts/assert-outreach.mjs            # report drift; exit 1 on any
 *   node scripts/assert-outreach.mjs --fix      # rewrite the stale numbers in place
 *   node scripts/assert-outreach.mjs --control  # the negative controls
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { firstVisit } from "./assert-payload.mjs";
import { check as ledgerCheck } from "./outreach-ledger.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIX = process.argv.includes("--fix");
const CONTROL = process.argv.includes("--control");

/* ------------------------------------------------------------------ facts */

/** Read a file, or throw naming it. A missing source must never read as zero. */
function read(rel) {
  const path = join(REPO, rel);
  if (!existsSync(path)) throw new Error(`assert-outreach: ${rel} is missing.`);
  return readFileSync(path, "utf8");
}

/**
 * Count the entries of an `export const NAME = [...] as const` array.
 *
 * Throws rather than returning 0 when the shape moves. Every fact here is a
 * number the drafts are compared AGAINST, so a parse that quietly fails would
 * mark every correct draft stale - or, worse under `--fix`, rewrite them all to
 * a wrong value.
 */
function constArrayLength(src, name) {
  const m = new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`).exec(src);
  if (!m) throw new Error(`assert-outreach: cannot find "export const ${name} = [...]".`);
  const n = [...m[1].matchAll(/"[a-z-]+"/g)].length;
  if (n === 0) throw new Error(`assert-outreach: ${name} parsed to zero entries.`);
  return n;
}

function facts() {
  const games = [...read("src/portal/games.ts").matchAll(/^import \{ meta as /gm)].length;
  const loaders = [...read("src/portal/catalog.ts").matchAll(/\(\) => import\(/g)].length;
  if (games === 0) throw new Error("assert-outreach: the roster parsed to zero games.");
  // The two lists are deliberately separate files and `build.test.ts` already
  // pins them equal. Reading both here means a broken parse of either shows up
  // as a disagreement rather than as a confident wrong number.
  if (games !== loaders) {
    throw new Error(`assert-outreach: roster has ${games} games, catalog has ${loaders} loaders.`);
  }

  const metas = readdirSync(join(REPO, "src/games"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(REPO, "src/games", d.name, "meta.ts")))
    .map((d) => readFileSync(join(REPO, "src/games", d.name, "meta.ts"), "utf8"));
  const kidsGames = metas.filter((s) => /ageBand:\s*"kids"/.test(s)).length;
  if (kidsGames === 0) throw new Error('assert-outreach: no meta declares ageBand: "kids".');

  const locales = read("src/i18n/locales.ts");
  const pageLocales = constArrayLength(locales, "PAGE_LOCALES");
  const appLocales = constArrayLength(locales, "APP_LOCALES");

  // A page per game plus home, world and boards, per page language. Derived
  // rather than read off `dist/` so the gate works without a build - and
  // cross-checked against the sitemap below when a build is present, because
  // two independent derivations that agree are the only kind worth quoting.
  const pages = pageLocales * (games + 3);

  // The payload CEILING is quoted beside the measurement in four provenance
  // rows, and it moves on its own schedule - it has been raised three times.
  // Matched separately so a stale ceiling is not reported as a stale first
  // visit, which would send the reader to the wrong file.
  const mCeiling = /const CEILING = ([\d_]+);/.exec(read("scripts/assert-payload.mjs"));
  if (!mCeiling) throw new Error("assert-outreach: cannot find CEILING in scripts/assert-payload.mjs.");
  const ceiling = Number(mCeiling[1].replace(/_/g, ""));

  const dist = join(REPO, "dist");
  let firstVisitB = null;
  if (existsSync(join(dist, "index.html"))) {
    firstVisitB = firstVisit(dist).total;
    const sitemap = join(dist, "sitemap.xml");
    if (existsSync(sitemap)) {
      const locs = [...readFileSync(sitemap, "utf8").matchAll(/<loc>/g)].length;
      if (locs !== pages) {
        throw new Error(
          `assert-outreach: derived ${pages} pages but dist/sitemap.xml lists ${locs}. ` +
            `One of the two is wrong - do not believe either until they agree.`,
        );
      }
    }
  }

  // What the copy calls "room left". Derived rather than quoted, because it is
  // the one figure that moves when EITHER of its two inputs does.
  const spareB = firstVisitB === null ? null : ceiling - firstVisitB;

  return { games, kidsGames, pageLocales, appLocales, pages, ceiling, firstVisitB, spareB };
}

/* --------------------------------------------------------------- spelling */

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Spell 0-99. The drafts write "Twenty-three games" as often as "23 games". */
function spell(n) {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 ? `${t}-${ONES[n % 10]}` : t;
}

const SPELLED = new Set([...ONES, ...TEENS, ...TENS.filter(Boolean)]);
for (const t of TENS.filter(Boolean)) for (const o of ONES.slice(1)) SPELLED.add(`${t}-${o}`);

/* ------------------------------------------------------------- the claims */

/**
 * Each pattern's capture group 1 is the value to compare. `minHits` is the
 * positive control: the corpus is known to make each of these claims, so a
 * pattern finding fewer is a blind matcher rather than a clean sweep.
 *
 * The Hebrew rows are not decoration. `press.md` carries a Hebrew press letter
 * quoting the game and page counts, and an English-only matcher would report the
 * whole folder clean while the one document written for a journalist stayed
 * wrong. Same lesson as the `LOCALES` literal in `content.test.ts`: ask which
 * text is in the gate's population before asking whether its logic is right.
 */
const CLAIMS = [
  {
    id: "games", fact: "games", kind: "digits", minHits: 30,
    // Every shape the drafts use to state the roster size, in both languages.
    // They are enumerated rather than generalised because a loose matcher here
    // rewrites the wrong number under `--fix`; when a draft is rephrased past
    // this list, `minHits` reports BLIND rather than clean.
    res: [
      /\b(\d(?:[\d,]*\d)?)(?=\s+(?:free\s+)?(?:browser\s+|web\s+)?games\b)/g,
      /(?<=game out of )(\d(?:[\d,]*\d)?)/g,
      /(?<=site of )(\d(?:[\d,]*\d)?)/g,
      /(?<=, both )(\d(?:[\d,]*\d)?)/g,
      /\b(\d(?:[\d,]*\d)?)(?=\s+משחקים)/g,
    ],
  },
  {
    // Only the TENS range. "six games with resume" and "two games" are subsets
    // of the roster rather than claims about its size, and a roster count has
    // not been below twenty since these drafts were written. If it ever is, the
    // drafts will spell it small, this matcher will stop firing, and `minHits`
    // reports that as BLIND rather than as clean - the intended failure.
    id: "games-spelled", fact: "games", kind: "words", minHits: 3,
    res: [/\b((?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:-[a-z]+)?)(?=\s+games\b)/gi],
  },
  {
    id: "pages", fact: "pages", kind: "digits", minHits: 4,
    res: [
      /\b(\d(?:[\d,]*\d)?)(?=(?:\s+of its)?\s+(?:emitted\s+)?pages\b)/g,
      /\b(\d(?:[\d,]*\d)?)(?=\s+עמודים)/g,
    ],
  },
  {
    id: "kids", fact: "kidsGames", kind: "digits", minHits: 3,
    res: [
      /\b(\d(?:[\d,]*\d)?)(?=\s+of them for young children)/g,
      /\b(\d(?:[\d,]*\d)?)(?=\s+מהם לגיל הרך)/g,
      /\b(\d(?:[\d,]*\d)?)(?=\s+מהמשחקים)/g,
    ],
  },
  {
    id: "app-locales", fact: "appLocales", kind: "digits", minHits: 2,
    res: [/\b(\d(?:[\d,]*\d)?)(?=\s+(?:interface|app) (?:languages|locales))/g],
  },
  {
    id: "page-locales", fact: "pageLocales", kind: "digits", minHits: 1,
    res: [/\b(\d(?:[\d,]*\d)?)(?=\s+page locales)/g],
  },
  {
    // Every way the drafts name the payload ceiling. The English ones are three
    // different sentences ("ceiling 90,000", "a ceiling of\n90,000", "fails the
    // build above 90,000") and one of them wraps a line, which is why this is a
    // list rather than one tidy phrase.
    id: "ceiling", fact: "ceiling", kind: "digits", minHits: 6,
    res: [/(?<=ceiling\s(?:is\s|of\s)?|above\s|עובר\s)([\d]{2},[\d]{3})/g],
  },
  {
    id: "spare", fact: "spareB", kind: "digits", minHits: 2,
    res: [
      /\b(\d(?:[\d,]*\d)?)(?=\s+bytes of room left)/g,
      /\b(\d(?:[\d,]*\d)?)(?=\s+spare\b)/g,
    ],
  },
  {
    // The last two forms carry no unit after the number - "measured 88,234 on
    // <date>", "reports 88,234 on clean HEAD" - so the unit-anchored form cannot
    // see them. Found by reading rows the gate had just called clean, which is
    // the only way this class of hole is ever found.
    id: "first-visit", fact: "firstVisitB", kind: "digits", minHits: 8,
    res: [
      /(?<!ceiling )(?<!ceiling is )\b([\d]{2},[\d]{3})(?=\s*(?:B gz|bytes gzipped|bytes|בתים))/g,
      /(?<=measured\s)([\d]{2},[\d]{3})/g,
      /(?<=reports\s)([\d]{2},[\d]{3})/g,
    ],
  },
];

/**
 * Claims that are not a number but a PREDICATE about one. "under 90 KB" is the
 * most-repeated sentence in the folder and the one that flipped: it was true at
 * 88,234 B gz and is false at 90,027. A numeric matcher cannot see it, because
 * the number in the sentence is the threshold rather than the measurement.
 */
const PREDICATES = [
  {
    id: "under-90kb",
    re: /under 90\s*KB/gi,
    holds: (f) => f.firstVisitB !== null && f.firstVisitB < 90_000,
    say: (f) => `the first visit is ${f.firstVisitB?.toLocaleString()} B gz`,
  },
];

/* ------------------------------------------------------------------- main */

/**
 * Regions a draft has marked as HISTORY rather than as a live claim.
 *
 *     <!-- outreach-facts:off -->  ...  <!-- outreach-facts:on -->
 *
 * `press.md` recounts that its own payload figure moved once and names both the
 * old and the new number. An auto-fixer cannot tell a claim about the site from
 * a record of what the site used to be, so `--fix` rewrote the history into a
 * sentence that contradicted itself. The marker is explicit, shows up in a diff,
 * and the count of skipped regions is REPORTED on every run - an exemption that
 * could be applied silently is a way to make this gate pass by deleting its job.
 */
function blankHistory(text) {
  const re = /<!--\s*outreach-facts:off\s*-->[\s\S]*?<!--\s*outreach-facts:on\s*-->/g;
  let regions = 0;
  // Replaced space-for-space so every later match keeps its real offset, and the
  // reported line numbers stay the ones a person would open the file to.
  const blanked = text.replace(re, (m) => {
    regions++;
    return m.replace(/[^\n]/g, " ");
  });
  return { blanked, regions };
}

function corpus(dir) {
  return readdirSync(dir)
    .filter((n) => n.endsWith(".md"))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), "utf8");
      const { blanked, regions } = blankHistory(text);
      return { name, path: join(dir, name), text, scan: blanked, regions };
    });
}

function run(dir, f, fix = FIX) {
  const files = corpus(dir);
  if (files.length === 0) throw new Error(`assert-outreach: no markdown under ${dir}.`);

  const drift = [];
  const blind = [];
  const edited = new Map();

  for (const claim of CLAIMS) {
    const want = f[claim.fact];
    let hits = 0;

    for (const file of files) {
      const source = edited.get(file.name) ?? file.text;
      const scan = edited.has(file.name) ? blankHistory(source).blanked : file.scan;
      let out = "";
      let last = 0;
      // One list of matches across every shape this claim takes, in document
      // order, so `--fix` can splice them in a single pass.
      const seen = new Set();
      const matches = claim.res
        .flatMap((re) => [...scan.matchAll(re)])
        .sort((a, b) => a.index - b.index)
        .filter((m) => !seen.has(m.index) && seen.add(m.index));
      for (const m of matches) {
        const found = m[1];
        if (claim.kind === "words" && !SPELLED.has(found.toLowerCase())) continue;
        hits++;
        const ok =
          want === null
            ? null
            : claim.kind === "words"
              ? found.toLowerCase() === spell(want)
              : Number(found.replace(/,/g, "")) === want;
        if (ok === false) {
          const line = source.slice(0, m.index).split("\n").length;
          const right = claim.kind === "words"
            ? (/^[A-Z]/.test(found) ? spell(want)[0].toUpperCase() + spell(want).slice(1) : spell(want))
            : want.toLocaleString("en-US");
          drift.push({ file: file.name, line, claim: claim.id, found, want: right });
          if (fix) {
            out += source.slice(last, m.index) + right;
            last = m.index + found.length;
          }
        }
      }
      if (fix && last > 0) edited.set(file.name, out + source.slice(last));
    }

    if (hits < claim.minHits) {
      blind.push(`${claim.id}: ${hits} occurrence(s), expected at least ${claim.minHits}`);
    }
  }

  const broken = [];
  for (const p of PREDICATES) {
    let hits = 0;
    for (const file of files) {
      const source = edited.get(file.name) ?? file.text;
      const scan = edited.has(file.name) ? blankHistory(source).blanked : file.scan;
      hits += [...scan.matchAll(p.re)].length;
    }
    // No minimum-occurrence control here, unlike the numeric claims: rewriting
    // the copy is the correct way to answer a FALSE predicate, so zero hits is a
    // fixed draft rather than a blind matcher. The control that keeps this
    // honest is a LITERAL fixture in `--control` below, which cannot disappear
    // when the drafts are edited.
    if (hits === 0) {
      // nothing to judge
    } else if (!p.holds(f)) {
      broken.push({ id: p.id, hits, say: p.say(f) });
    }
  }

  if (fix) for (const [name, text] of edited) writeFileSync(join(dir, name), text);

  const skipped = files.reduce((n, f) => n + f.regions, 0);
  return { drift, blind, broken, skipped, edited: [...edited.keys()] };
}

function report(f, r) {
  console.log(
    `outreach facts: ${f.games} games (${f.kidsGames} kids), ${f.pages} pages, ` +
      `${f.pageLocales} page locales, ${f.appLocales} app locales, ` +
      `first visit ${f.firstVisitB === null ? "not measured (no dist/)" : `${f.firstVisitB.toLocaleString()} B gz`} ` +
      `of ${f.ceiling.toLocaleString()}\n`,
  );

  for (const b of r.blind) console.log(`BLIND  ${b}`);
  for (const d of r.drift) {
    console.log(`STALE  ${d.file}:${d.line}  ${d.claim}: says "${d.found}", the tree says "${d.want}"`);
  }
  for (const b of r.broken) {
    console.log(`FALSE  "${b.id}" appears ${b.hits}x and no longer holds - ${b.say}`);
  }

  // The LEDGER half. A number goes stale on its own because the tree moved; a
  // status goes stale because a PERSON did something and did not write it down,
  // and that failure costs a one-shot surface rather than a wrong figure. The
  // population is printed either way - zero drafts or zero rows is the blind
  // case, and it must never read as clean.
  const led = ledgerCheck(REPO);
  console.log(`\nledger: ${led.population.drafts} draft(s), ${led.population.rows} row(s)`);
  for (const p of led.problems) console.log(`${p.kind}  ${p.text}`);

  if (r.skipped) console.log(`\n${r.skipped} region(s) marked outreach-facts:off and not checked.`);
  if (r.edited.length) console.log(`\nrewrote ${r.edited.length} file(s): ${r.edited.join(", ")}`);

  const bad = r.blind.length + r.drift.length + r.broken.length + led.problems.length;
  if (bad === 0) {
    console.log("OK  every quoted number matches the tree, and every surface has a row.");
    return 0;
  }
  if (FIX && r.blind.length === 0 && r.drift.length > 0 && r.broken.length === 0 && led.problems.length === 0) {
    console.log("\nfixed. Re-run without --fix to confirm.");
    return 0;
  }
  console.log(
    `\n${bad} problem(s). Nothing in docs/outreach/ may be published until this is clean - ` +
      `run with --fix for the numeric ones, and rewrite the FALSE claims by hand.`,
  );
  return 1;
}

/* --------------------------------------------------------------- controls */

/**
 * Three controls, because each failure mode here looks like success on its own:
 * a planted wrong number must be CAUGHT, a rephrased draft must be reported as
 * BLIND rather than clean, and an untouched corpus must pass.
 */
function control(f) {
  const tmp = mkdtempSync(join(tmpdir(), "outreach-control-"));
  let failures = 0;
  const check = (name, got, want) => {
    const ok = got === want;
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${got}`);
  };
  try {
    const dir = join(tmp, "outreach");
    cpSync(join(REPO, "docs/outreach"), dir, { recursive: true });

    // Bring the COPY up to date first. The controls ask whether this gate can
    // tell a correct corpus from a wrong one, and that question is independent
    // of whether today's working tree happens to be clean - running them only
    // when it is would make them unavailable exactly when they are wanted.
    run(dir, f, true);

    const clean = run(dir, f);
    // Predicates are deliberately excluded: `--fix` rewrites numbers and never
    // prose, so a FALSE claim surviving an auto-fix is the design rather than a
    // control failure.
    check("a fixed corpus has no drift left", clean.drift.length, 0);
    check("a fixed corpus blinds no matcher", clean.blind.length, 0);

    const victim = join(dir, "reddit.md");
    const before = readFileSync(victim, "utf8");
    const planted = before.replace(`${f.games} games`, `${f.games + 7} games`);
    if (planted === before) throw new Error("control: could not plant a wrong game count.");
    writeFileSync(victim, planted);
    const caught = run(dir, f);
    check("a planted wrong count is caught", caught.drift.filter((d) => d.claim === "games").length >= 1, true);
    writeFileSync(victim, before);

    // Blind the games matcher everywhere: the numbers all become correct-looking
    // prose the pattern cannot see. A gate without this control reports OK.
    for (const file of corpus(dir)) {
      writeFileSync(file.path, file.text.replace(/\bgames\b/g, "titles").replace(/משחקים/g, "כותרים"));
    }
    const blinded = run(dir, f);
    check("a rephrased corpus reports BLIND", blinded.blind.some((b) => b.startsWith("games")), true);

    // The predicate must be able to answer BOTH ways against the same prose.
    // A control that only ever produces the failing reading cannot tell a
    // working predicate from one wired to a constant - the lesson in
    // `.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md`.
    const fixtureDir = join(tmp, "fixture");
    cpSync(dir, fixtureDir, { recursive: true });
    for (const file of corpus(fixtureDir)) rmSync(file.path);
    writeFileSync(join(fixtureDir, "fixture.md"), "The whole site is under 90 KB on a first visit.\n");
    const over = run(fixtureDir, { ...f, firstVisitB: 90_027 });
    const under = run(fixtureDir, { ...f, firstVisitB: 89_000 });
    check("'under 90 KB' is FALSE at 90,027 B gz", over.broken.length, 1);
    check("'under 90 KB' holds at 89,000 B gz", under.broken.length, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(failures === 0 ? "\nOK  all controls behaved." : `\n${failures} control(s) failed.`);
  return failures === 0 ? 0 : 1;
}

const f = facts();
process.exit(CONTROL ? control(f) : report(f, run(join(REPO, "docs/outreach"), f)));
