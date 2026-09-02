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
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { firstVisit } from "./assert-payload.mjs";
import { execFileSync } from "node:child_process";
import { readRecord, RECORD } from "./reach/ci-payload.mjs";
import { check as ledgerCheck, RECORDS, replyRate, replyRateLine } from "./outreach-ledger.mjs";
import { heTitles, rosterIds } from "./lib/roster.mjs";

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
  // Read through the ONE roster reader. This used to count `import { meta as`
  // lines in `games.ts`, which stopped matching the day the roster split at the
  // fold and left this gate refusing with "zero games" - correctly, and a file
  // away from the change. `scripts/lib/roster.mjs` says why there is one now.
  const games = rosterIds(REPO).length;
  const titles = heTitles(REPO);
  // BOTH loader halves - the shell's 15 and `gamesRest.ts`'s 23. They split at
  // the fold on 2026-08-26 for the same reason the metadata did, and reading
  // `catalog.ts` alone made this gate refuse with "roster has 38, catalog has
  // 15" a file away from the change - the identical failure the roster split
  // caused here once already.
  const loaders = ["src/portal/catalog.ts", "src/portal/gamesRest.ts"]
    .map((f) => [...read(f).matchAll(/\(\) => import\(/g)].length)
    .reduce((a, b) => a + b, 0);
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

  // How many CATEGORY landing pages the build emits, per language. Derived the
  // same way the emitter derives it - count the roster's games per category,
  // keep the groups at or above the threshold - so this gate needs no build
  // and still cross-checks against the sitemap below.
  //
  // The threshold is READ from the source rather than typed here. A second
  // copy of a number is a second thing to forget, and this one moves the page
  // count by twenty every time it changes.
  const mMin = /MIN_GAMES_FOR_A_PAGE = (\d+)/.exec(read("src/content/categories.ts"));
  if (!mMin) throw new Error("assert-outreach: cannot find MIN_GAMES_FOR_A_PAGE.");
  const minPerCategory = Number(mMin[1]);
  const byCategory = new Map();
  for (const src of metas) {
    const c = /category:\s*"([a-z]+)"/.exec(src)?.[1];
    if (c) byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
  }
  if (byCategory.size === 0) throw new Error("assert-outreach: no meta declares a category.");
  const pagedCategories = [...byCategory.values()].filter((n) => n >= minPerCategory).length;
  if (pagedCategories === 0)
    throw new Error("assert-outreach: no category reaches the threshold - the parse is wrong.");

  const locales = read("src/i18n/locales.ts");
  const pageLocales = constArrayLength(locales, "PAGE_LOCALES");
  // The NAMES, not just how many. A count matcher cannot see "in Hebrew and
  // English" - there is no digit in it - which is how that exact phrase rode an
  // open pull request on a 4,900-star list for eight days while every check here
  // stayed green, and how the repository's own About box was wrong for weeks. The
  // set of languages a reader is promised is a claim like any other.
  const pageLangs = ((locales.match(/export const PAGE_LOCALES = \[([^\]]*)\]/) ?? [, ""])[1]
    .match(/"([a-z-]+)"/g) ?? []).map((s) => s.replace(/"/g, ""));
  if (pageLangs.length !== pageLocales)
    throw new Error(`assert-outreach: read ${pageLangs.length} PAGE_LOCALES names but ${pageLocales} entries.`);
  const appLocales = constArrayLength(locales, "APP_LOCALES");

  // A page per game, plus home, world and boards, plus one per category big
  // enough to have a page - per page language. Derived rather than read off
  // `dist/` so the gate works without a build, and cross-checked against the
  // sitemap below when a build is present, because two independent
  // derivations that agree are the only kind worth quoting.
  const pages = pageLocales * (games + 3 + pagedCategories);

  // The payload CEILING is quoted beside the measurement in four provenance
  // rows, and it moves on its own schedule - it has been raised three times.
  // Matched separately so a stale ceiling is not reported as a stale first
  // visit, which would send the reader to the wrong file.
  const mCeiling = /const CEILING = ([\d_]+);/.exec(read("scripts/assert-payload.mjs"));
  if (!mCeiling) throw new Error("assert-outreach: cannot find CEILING in scripts/assert-payload.mjs.");
  const ceiling = Number(mCeiling[1].replace(/_/g, ""));

  // THE PUBLISHED FIGURE COMES FROM CI, NOT FROM THIS MACHINE.
  //
  // This used to be `firstVisit(dist).total` - the local build - and that is
  // the wrong instrument for a number that leaves the repository. This machine
  // runs Node 24, the deploy builds on Node 22, and the same commit measures
  // ~50 B apart on the two. Every draft's provenance row NAMES the commit it
  // was measured on, so a local reading under that row is false about the one
  // thing the row exists to let a reader check.
  //
  // The local reading is still taken, and still printed beside the recorded
  // one, because the SPREAD is the thing worth seeing every run rather than
  // rediscovering. It is just not what the copy is checked against.
  const record = readRecord();
  // A RECORD THAT ROTS IN SILENCE IS THE FAILURE THIS REPLACES, not an
  // improvement on it. Three states, three different messages, because they
  // want three different actions:
  //
  //   missing        -> nobody has ever recorded one; refresh it
  //   wrong history  -> it names a commit this branch has never seen, so it is
  //                     from somewhere else and its number describes something
  //                     else. Refusing beats quietly comparing against it.
  //   behind         -> honest but old. Advisory, with the distance named, so a
  //                     draft is never checked against a number from 40 commits
  //                     ago without the reader being told.
  //
  // Never a silent fall back to the local reading: that is exactly what this
  // change removed, and a fallback would restore it on the first bad day.
  if (!record) {
    throw new Error(
      `assert-outreach: no CI payload record at ${RECORD}. The published figure must come from ` +
        `the toolchain that BUILDS the site, not from this machine - run \`npm run reach:ci-payload -- --write\` ` +
        `after a successful deploy. Refusing to check published copy against a local build.`,
    );
  }
  {
    let behind = null;
    try {
      execFileSync("git", ["cat-file", "-e", `${record.commit}^{commit}`], { cwd: REPO, stdio: "ignore" });
      behind = Number(
        execFileSync("git", ["rev-list", "--count", `${record.commit}..HEAD`], { cwd: REPO, encoding: "utf8" }).trim(),
      );
    } catch {
      throw new Error(
        `assert-outreach: the CI payload record names commit ${record.commit}, which this repository does not ` +
          `contain. It was measured on a different history, so its number describes a different artifact.`,
      );
    }
    if (behind > 0) {
      console.log(
        `NOTE  the CI payload figure is from ${record.commit}, ${behind} commit(s) back. ` +
          `Refresh with \`npm run reach:ci-payload -- --write\` before publishing anything.\n`,
      );
    }
  }
  const dist = join(REPO, "dist");
  let localFirstVisitB = null;
  if (existsSync(join(dist, "index.html"))) {
    localFirstVisitB = firstVisit(dist).total;
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

  const firstVisitB = record ? record.firstVisitB : null;
  // What the copy calls "room left". Derived rather than quoted, because it is
  // the one figure that moves when EITHER of its two inputs does - and derived
  // from the RECORDED ceiling, so a ceiling raise that CI has not built yet
  // cannot produce a spare figure describing a tree nobody has measured.
  const spareB = record ? record.ceiling - record.firstVisitB : null;

  return {
    games, kidsGames, pageLocales, pageLangs, appLocales, pages, ceiling,
    firstVisitB, spareB, titles, record, localFirstVisitB,
  };
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
  {
    // ANY KILOBYTE CLAIM ABOUT THE FIRST VISIT, whatever adverb is in front of
    // it. `under-90kb` above caught one spelling, and on 2026-08-26 the site
    // went from ~90 KB to ~53 KB and NINE sentences reading "about 90 KB"
    // survived - because an earlier `--fix` had rewritten "under" to "about" to
    // answer the last flip, and the new wording matched nothing.
    //
    // So this is the predicate that generalises: the number NEAR the words
    // "KB" and a first-visit noun has to be within 25% of the measurement,
    // whichever adverb, whichever spelling. A band rather than equality because
    // "about 53 KB" is honest prose and "53,121" is not something a Show HN
    // post should carry.
    id: "kb-size-claim",
    re: /\b(?:about|around|roughly|under|just over|~)?\s*(\d{2,3})\s*KB\b(?=[^.\n]{0,80}(?:first (?:visit|load)|whole site|shell|before you pick))|(?:first (?:visit|load)|whole site|shell)[^.\n]{0,80}?\b(?:about|around|roughly|under|just over|~)?\s*(\d{2,3})\s*KB\b/gi,
    holds: (f, matches) => {
      if (f.firstVisitB === null) return true; // unmeasured says nothing
      const real = f.firstVisitB / 1000;
      return matches.every((m) => {
        const n = Number(m[1] ?? m[2]);
        return Number.isFinite(n) && Math.abs(n - real) / real <= 0.25;
      });
    },
    say: (f) => `the first visit is ${Math.round((f.firstVisitB ?? 0) / 1000)} KB`,
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
  // A RECORD is frozen. Every number in it is a QUOTATION - what Search Console
  // reported on a date, what the ledger says was fired - so re-deriving it against
  // today's tree is not a correction, it is corruption. Measured 2026-08-20, within
  // a minute of this file existing: --fix rewrote Google's "104 pages are indexed"
  // into our own emitted-page count of 144, silently, in a file whose whole purpose
  // is to say what somebody else measured. The matcher cannot tell a claim ABOUT OUR
  // TREE from a claim about SOMEBODY ELSE'S REPORT, and no amount of pattern work
  // will teach it to - the two are the same sentence.
  //
  // Excluding files from a population is how a gate goes blind, so the count is
  // PRINTED on every run beside the outreach-facts:off regions, and the list is
  // three named files imported from one place rather than a second copy.
  return readdirSync(dir)
    .filter((n) => n.endsWith(".md") && !RECORDS.has(n))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), "utf8");
      const { blanked, regions } = blankHistory(text);
      return { name, path: join(dir, name), text, scan: blanked, regions };
    });
}

/* --------------------------------------------------- the languages we promise */

// English names for the locales this site can WRITE in, plus the app-only ones a
// draft might name by mistake. Only the page set may be advertised as a language
// the site is available in - the interface speaks eleven, the prose exists in four.
const LANG_NAME = {
  en: "English", he: "Hebrew", es: "Spanish", fr: "French", pt: "Portuguese",
  de: "German", ar: "Arabic", it: "Italian", ru: "Russian", tr: "Turkish",
  id: "Indonesian",
};

/**
 * Find every place a draft LISTS languages by name - "in Hebrew and English",
 * "Hebrew, English, Spanish and French" - and require the set to be the whole
 * page set. A proper SUBSET is the failure: it undersells the site and, worse,
 * it is the shape that goes stale silently, because no digit ever changes.
 *
 * A run of ONE name is left alone on purpose. "the Hebrew press letter" and "a
 * Spanish-speaking reader" are ordinary sentences, and a gate that reds on them
 * is a gate somebody switches off - the lesson the French glossary already cost
 * us three times (`.claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md`).
 */
function languageRuns(text, pageLangs) {
  const names = Object.values(LANG_NAME).join("|");
  const re = new RegExp(`\\b(?:${names})(?:\\s*(?:,|and|&|\\+)\\s*(?:${names}))+`, "g");
  const want = new Set(pageLangs.map((l) => LANG_NAME[l]).filter(Boolean));
  const out = [];
  for (const m of text.matchAll(re)) {
    const got = new Set(m[0].match(new RegExp(names, "g")) ?? []);
    const missing = [...want].filter((w) => !got.has(w));
    // Only a SUBSET of what we can write is a defect. A run naming languages we
    // do not publish in is a different claim (an app-locale list, a roadmap) and
    // is not this check's business.
    if (missing.length && [...got].every((g) => want.has(g))) {
      out.push({ found: m[0], missing, index: m.index });
    }
  }
  return out;
}

function run(dir, f, fix = FIX) {
  const files = corpus(dir);
  if (files.length === 0) throw new Error(`assert-outreach: no markdown under ${dir}.`);

  const drift = [];
  const blind = [];
  const langs = [];
  const edited = new Map();

  // The language-name check runs over the SAME blanked text as the numbers, so a
  // historical passage marked outreach-facts:off is exempt from both.
  let langRuns = 0;
  for (const file of files) {
    for (const hit of languageRuns(file.scan, f.pageLangs)) {
      langRuns++;
      langs.push({
        file: file.name,
        line: file.scan.slice(0, hit.index).split("\n").length,
        found: hit.found,
        missing: hit.missing,
      });
    }
    langRuns += 0;
  }
  // The positive control. The corpus describes the site's languages somewhere, so
  // a matcher that finds no RUN at all - not even a correct one - is blind rather
  // than satisfied. Counted separately from the failures above.
  const anyRun = files.some((file) => {
    const names = Object.values(LANG_NAME).join("|");
    return new RegExp(`\\b(?:${names})(?:\\s*(?:,|and|&|\\+)\\s*(?:${names}))+`).test(file.scan);
  });
  if (!anyRun) blind.push("languages - no draft lists the site's languages by name; the matcher is reading nothing");

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
    const matches = [];
    for (const file of files) {
      const source = edited.get(file.name) ?? file.text;
      const scan = edited.has(file.name) ? blankHistory(source).blanked : file.scan;
      const found = [...scan.matchAll(p.re)];
      hits += found.length;
      matches.push(...found);
    }
    // No minimum-occurrence control here, unlike the numeric claims: rewriting
    // the copy is the correct way to answer a FALSE predicate, so zero hits is a
    // fixed draft rather than a blind matcher. The control that keeps this
    // honest is a LITERAL fixture in `--control` below, which cannot disappear
    // when the drafts are edited.
    if (hits === 0) {
      // nothing to judge
    } else if (!p.holds(f, matches)) {
      broken.push({ id: p.id, hits, say: p.say(f) });
    }
  }

  if (fix) for (const [name, text] of edited) writeFileSync(join(dir, name), text);

  const skipped = files.reduce((n, f) => n + f.regions, 0);
  // Read from the RAW text, never the blanked scan: an `outreach-facts:off`
  // region exempts a historical NUMBER, and a game name is not one.
  const names = gameNames(files, f.titles);
  return { drift, blind, broken, langs, names, skipped, edited: [...edited.keys()] };
}


/* ------------------------------------------------------------- game names */
/**
 * A GAME NAME that leaves the repository is a hand-authored fact with no digits
 * in it, and every other matcher here reads numbers.
 *
 * Measured 2026-08-21: `hebrew.md` offered kindergarten teachers a game called
 * גדול וקטן. `sortsize` was deleted from the tree in `0207a33`, and the roster's
 * sorting game is `sort` - which is about COLOUR. Nine days, a clean gate run,
 * and a teacher following the post to a game that is not there.
 *
 * The author declares which games a post names; the gate checks BOTH directions,
 * and both halves are load-bearing:
 *
 *   id in the roster       - a deleted or renamed game reds, by id
 *   title in the prose     - a RETITLED game reds, because the declaration still
 *                            resolves while the Hebrew words underneath do not
 *
 * The second is the one a lazier design misses. Checking only that ids resolve
 * passes forever on prose quoting a title the site stopped using.
 */
const NAMES_RE = /<!--\s*outreach-games:\s*([^>]*?)-->/g;

/**
 * Both sides are normalised before comparing, and BOTH normalisations were found
 * by the gate reding on prose that was correct:
 *
 *   a title's trailing "?"  - `vanish` is "מה נעלם?" and a post naming it inside
 *                             a list writes "מה נעלם", which is the same game
 *   a blockquote line wrap  - "מצא\n> הבדלים" is "מצא הבדלים" to every reader and
 *                             two different strings to `includes`
 *
 * A gate that reds on correct copy is a gate somebody switches off, which is the
 * same lesson the French glossary rules had to learn from the other end. This
 * loosens WHITESPACE and TRAILING punctuation only - a retitled game still reds,
 * because the words themselves have to be there in order.
 */
function flatten(text) {
  return text.replace(/\n\s*>?\s*/g, " ").replace(/\s+/g, " ");
}
const bare = (title) => title.replace(/[?!.]+$/, "").trim();

function gameNames(files, titles) {
  const problems = [];
  let declared = 0;
  let blocks = 0;

  for (const file of files) {
    const src = file.text;
    const hits = [...src.matchAll(NAMES_RE)];
    for (const hit of hits) {
      blocks++;
      const line = src.slice(0, hit.index).split("\n").length;
      const ids = hit[1].split(",").map((s) => s.trim()).filter(Boolean);
      // The prose this block speaks for: up to the next declaration, or the end.
      const from = hit.index + hit[0].length;
      const nextAt = src.slice(from).search(/<!--\s*outreach-games:/);
      const prose = flatten(nextAt < 0 ? src.slice(from) : src.slice(from, from + nextAt));

      for (const id of ids) {
        declared++;
        const he = titles.get(id);
        if (he === undefined) {
          problems.push({ file: file.name, line, id, why: "is not in the roster" });
        } else if (!prose.includes(bare(he))) {
          problems.push({ file: file.name, line, id, why: `is titled "${he}", which the post never says` });
        }
      }
    }
  }
  return { problems, declared, blocks };
}

function report(f, r) {
  console.log(
    `outreach facts: ${f.games} games (${f.kidsGames} kids), ${f.pages} pages, ` +
      `${f.pageLocales} page locales, ${f.appLocales} app locales, ` +
      `first visit ${f.firstVisitB === null ? "NOT RECORDED" : `${f.firstVisitB.toLocaleString()} B gz`} ` +
      `of ${f.ceiling.toLocaleString()}\n`,
  );

  // BOTH readings, every run. The spread between them is the thing worth seeing
  // rather than rediscovering: it is what made the local reading the wrong
  // instrument for published copy in the first place, and a run that prints
  // only one number invites somebody to "fix" the drafts to whichever it is.
  if (f.record) {
    const d = f.localFirstVisitB === null ? null : f.localFirstVisitB - f.record.firstVisitB;
    console.log(
      `payload: CI ${f.record.firstVisitB.toLocaleString()} B gz at ${f.record.commit} ` +
        `(${f.record.measuredAt}, run ${f.record.runId})` +
        (d === null
          ? "  ·  no local dist/ to compare"
          : `  ·  this machine ${f.localFirstVisitB.toLocaleString()} on Node ${process.versions.node.split(".")[0]}, ` +
            `${d >= 0 ? "+" : ""}${d} B apart`) +
      "\n",
    );
  }

  for (const b of r.blind) console.log(`BLIND  ${b}`);
  for (const d of r.drift) {
    console.log(`STALE  ${d.file}:${d.line}  ${d.claim}: says "${d.found}", the tree says "${d.want}"`);
  }
  for (const b of r.broken) {
    console.log(`FALSE  "${b.id}" appears ${b.hits}x and no longer holds - ${b.say}`);
  }
  for (const l of r.langs) {
    console.log(`LANGS  ${l.file}:${l.line}  "${l.found}" - the site also has ${l.missing.join(", ")}`);
  }
  for (const n of r.names.problems) {
    console.log(`NAME   ${n.file}:${n.line}  "${n.id}" ${n.why}`);
  }

  // The LEDGER half. A number goes stale on its own because the tree moved; a
  // status goes stale because a PERSON did something and did not write it down,
  // and that failure costs a one-shot surface rather than a wrong figure. The
  // population is printed either way - zero drafts or zero rows is the blind
  // case, and it must never read as clean.
  const led = ledgerCheck(REPO);
  console.log(`\nledger: ${led.population.drafts} draft(s), ${led.population.rows} row(s)`);
  for (const p of led.problems) console.log(`${p.kind}  ${p.text}`);
  // Derived, never typed: the number the next letter lane is argued from (RCH20).
  console.log(replyRateLine(replyRate(REPO)));

  if (r.skipped) console.log(`\n${r.skipped} region(s) marked outreach-facts:off and not checked.`);
  console.log(`${RECORDS.size} record(s) frozen and not rewritten: ${[...RECORDS].join(", ")}`);
  if (r.edited.length) console.log(`\nrewrote ${r.edited.length} file(s): ${r.edited.join(", ")}`);

  console.log(`game names: ${r.names.declared} declared across ${r.names.blocks} block(s)`);
  const bad = r.blind.length + r.drift.length + r.broken.length + r.langs.length +
    r.names.problems.length + led.problems.length;
  if (bad === 0) {
    console.log("OK  every quoted number matches the tree, and every surface has a row.");
    return 0;
  }
  if (FIX && r.blind.length === 0 && r.drift.length > 0 && r.broken.length === 0 &&
      r.names.problems.length === 0 && led.problems.length === 0) {
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

    {
      // replies/letters: the stamp must move the count, and a missing declaration
      // must read UNDECLARED rather than 0 - the three states must not collapse.
      const ledgerPath = join(dir, "ledger.md");
      const lBefore = readFileSync(ledgerPath, "utf8");
      const tmpRepo = join(tmp, "repo");
      mkdirSync(join(tmpRepo, "docs"), { recursive: true });
      cpSync(dir, join(tmpRepo, "docs/outreach"), { recursive: true });
      const at = (text) => { writeFileSync(join(tmpRepo, "docs/outreach/ledger.md"), text); return replyRate(tmpRepo); };
      const declared = at(lBefore);
      check("replies/letters reads a declaration", declared.declared, true);
      check("no letter has a reply stamp today", declared.replies, 0);
      const firstLetter = declared.letters[0];
      if (!firstLetter) throw new Error("control: the ledger declares no fired letter to plant a reply on.");
      // Planted into the NOTES cell, which is where `replyRate` reads it. The first
      // version of this control put the stamp in the SURFACE cell, where nothing reads
      // it, and reported FAIL - correctly, and about itself rather than about the code.
      const stamped = lBefore
        .split("\n")
        .map((line) => {
          if (!line.startsWith(`| ${firstLetter.surface} |`)) return line;
          const cells = line.split("|");
          cells[6] = ` REPLIED 2026-09-02 ${cells[6]}`;
          return cells.join("|");
        })
        .join("\n");
      if (stamped === lBefore) throw new Error("control: could not plant a REPLIED stamp.");
      check("a planted REPLIED stamp moves the count", at(stamped).replies, 1);
      const undeclared = lBefore.replace(/<!--\s*letters:[^>]*-->/, "");
      check("a ledger with no letters list reads UNDECLARED", at(undeclared).declared, false);
    }

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

    // A RECORD must survive --fix untouched, and the same planted number in a DRAFT
    // must not. Both arms, because "the fixer skipped it" and "the fixer is broken"
    // look identical from one file. Measured 2026-08-20: before this, --fix silently
    // turned Search Console's "104 pages are indexed" into our own 144.
    const record = join(dir, "measured.md");
    if (existsSync(record)) {
      const rBefore = readFileSync(record, "utf8");
      const quote = `${f.pages + 40} pages are indexed`;
      writeFileSync(record, rBefore + `\n<!-- control -->\nSomebody else reported ${quote}.\n`);
      const draftVictim = join(dir, "dev.md");
      const dBefore = readFileSync(draftVictim, "utf8");
      writeFileSync(draftVictim, dBefore + `\n\nThis site emits ${f.pages + 40} pages.\n`);
      run(dir, f, true);
      check("a record's quoted number survives --fix",
            readFileSync(record, "utf8").includes(quote), true);
      check("the same number in a draft is still fixed",
            readFileSync(draftVictim, "utf8").includes(`${f.pages + 40} pages`), false);
      writeFileSync(record, rBefore);
      writeFileSync(draftVictim, dBefore);
    } else {
      check("the record control had a record to run against", false, true);
    }

    // The language check, both arms. A subset must be caught and the FULL set must
    // not - a matcher that reds on every language run is indistinguishable from one
    // that reds on the right ones until you show it a correct sentence it accepts.
    const langVictim = join(dir, "launch.md");
    const lBefore = readFileSync(langVictim, "utf8");
    writeFileSync(langVictim, lBefore + "\n\nAvailable in Hebrew and English.\n");
    const subset = run(dir, f);
    check("a language SUBSET is caught", subset.langs.some((l) => l.file === "launch.md"), true);
    const full = f.pageLangs.length === 4 ? "Hebrew, English, Spanish and French" : null;
    if (full) {
      writeFileSync(langVictim, lBefore + `\n\nAvailable in ${full}.\n`);
      const whole = run(dir, f);
      check("the FULL set is accepted", whole.langs.length, 0);
    } else {
      check("the control knew how many page languages there are", false, true);
    }
    writeFileSync(langVictim, lBefore);

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

    // The GENERALISED size claim, and the reason it exists is in this control.
    // `under 90 KB` above caught exactly one spelling. On 2026-08-26 the site
    // went from ~90 KB to ~53 KB and nine sentences reading "about 90 KB"
    // survived untouched, because an earlier `--fix` had rewritten "under" to
    // "about" to answer the LAST flip and the new wording matched nothing. So
    // the adverb must not matter, and the fixture says three of them.
    writeFileSync(
      join(fixtureDir, "fixture.md"),
      "The whole site is about 90 KB on a first visit.\n" +
        "Around 90 KB before you pick a game.\n" +
        "The shell is roughly 90 KB gzipped.\n",
    );
    const bigClaim = run(fixtureDir, { ...f, firstVisitB: 53_121 });
    const rightClaim = run(fixtureDir, { ...f, firstVisitB: 88_000 });
    check("'about/around/roughly 90 KB' is FALSE at 53 KB", bigClaim.broken.length, 1);
    check("...and it counts every spelling, not the first", 
      bigClaim.broken[0]?.hits ?? 0, 3);
    check("the same prose HOLDS at 88 KB", rightClaim.broken.length, 0);

    // ---- the CI payload record ------------------------------------------
    //
    // The record replaced a LOCAL reading, so the controls have to prove three
    // things this gate could previously get wrong in silence: that a draft
    // quoting the local number is now caught, that a record from another
    // history is REFUSED rather than believed, and that a missing record does
    // not fall back to the local build - which is the behaviour being removed
    // and would return on the first bad day.
    const rec = readRecord();
    check("a CI payload record exists to check against", rec !== null, true);
    if (rec) {
      // The number CI measured is what the copy must carry. A draft quoting
      // THIS MACHINE's build is the exact defect the record exists for, and
      // before this it was the passing answer.
      const localish = rec.firstVisitB + 14;
      const pv = join(dir, "press.md");
      const pBefore = readFileSync(pv, "utf8");
      writeFileSync(pv, pBefore.replace(rec.firstVisitB.toLocaleString(), localish.toLocaleString()));
      const drifted = run(dir, f);
      check(
        "a draft quoting a LOCAL build instead of CI is caught",
        drifted.drift.some((d) => d.claim === "first-visit"),
        true,
      );
      writeFileSync(pv, pBefore);

      // And the other way, so this is not a matcher that reds on every number:
      // the recorded figure itself must be accepted.
      check("the RECORDED figure is accepted", run(dir, f).drift.filter((d) => d.claim === "first-visit").length, 0);
    }
    check(
      "the record names a commit this repository actually has",
      (() => {
        try {
          execFileSync("git", ["cat-file", "-e", `${rec.commit}^{commit}`], { cwd: REPO, stdio: "ignore" });
          return true;
        } catch {
          return false;
        }
      })(),
      true,
    );

    // --- game names ------------------------------------------------------
    // Three arms, because the check has three ways to be useless: it can miss a
    // deleted game, it can miss a RETITLED one, or - after the whitespace and
    // trailing-"?" loosening that stopped it reding on correct prose - it can
    // have stopped discriminating at all. The third is why the last arm is here.
    const namesDir = join(tmp, "names");
    mkdirSync(namesDir, { recursive: true });
    const post = (ids, prose) => `<!-- outreach-games: ${ids} -->\n\n> ${prose}\n`;
    const writeNames = (body) => writeFileSync(join(namesDir, "names.md"), body);

    // A real pair: `sort` is titled "מיון צבעים", wrapped across a blockquote line.
    writeNames(post("sort, memory", "משחקים: מיון\n> צבעים, זיכרון."));
    check("a correct post passes, wrapped mid-name", run(namesDir, f).names.problems.length, 0);

    // The defect this gate was written for: `sortsize` was deleted in 0207a33.
    writeNames(post("sortsize", "משחקים: גדול וקטן."));
    const gone = run(namesDir, f).names;
    check("a deleted game is caught", gone.problems.length, 1);
    check("...and named as absent from the roster", gone.problems[0]?.why ?? "", "is not in the roster");

    // The half a lazier design misses: the id resolves, the words do not.
    writeNames(post("sort", "משחקים: גדול וקטן."));
    const retitled = run(namesDir, f).names;
    check("a game the post never names is caught", retitled.problems.length, 1);
    check("...even though its id resolves", retitled.problems[0]?.why?.startsWith("is titled") ?? false, true);

    // The population control. Every assertion above passes vacuously over a file
    // with no declarations, which is what a broken block matcher produces.
    writeNames("> משחקים: מיון צבעים, זיכרון.\n");
    check("no declaration means nothing is checked", run(namesDir, f).names.declared, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(failures === 0 ? "\nOK  all controls behaved." : `\n${failures} control(s) failed.`);
  return failures === 0 ? 0 : 1;
}

const f = facts();
process.exit(CONTROL ? control(f) : report(f, run(join(REPO, "docs/outreach"), f)));
