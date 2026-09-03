#!/usr/bin/env node
// Assert that the emitted content pages are real, complete, and correct for the
// host they were built for.
//
// Run after `npm run build`:  node scripts/assert-pages.mjs
// Run it TWICE — once with no BASE_PATH and once with BASE_PATH=/ellaz/ —
// because half of these failures are base-dependent and each deploy workflow
// only ever sees one arm.
//
// The failures this exists to catch are all invisible from a green build:
//
//   * a page that lost its prose but kept its shell
//   * a canonical carrying the base, so the Pages copy advertises
//     https://ellaz.fun/ellaz/games/snake/ — a URL that has never existed
//   * an internal link to /games/n2048/ when the game's id is "2048"
//   * a JSON-LD block that stopped parsing after a quote landed in the prose
//   * a NavigationRoute back in sw.js, hijacking every page for returning
//     visitors and nobody else
//   * `cp dist/index.html dist/404.html` in a workflow, overwriting the real 404
//   * a page that carries the prose but not the runtime, so the frame stays a
//     black box and the game never mounts - perfect in every check that reads
//     the HTML, broken for every human who opens it
//
// Every check below is followed by a negative control at the bottom of the file
// that plants the exact defect and requires the check to fire. A check nobody
// has watched fail is not a check.
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const DIST = process.env.DIST_DIR ?? "dist";

/** The prose floor per page, as a RATCHET. It only ever goes up. */
const MIN_WORDS = 550;
/* Google truncates a SERP title around 580px, which is roughly 60 characters of
   Latin - and `GameCopy.metaTitle` is already documented as "<= 60 chars" and
   pinned at that in content.test.ts. This is deliberately looser than 60: the
   home and world titles are authored elsewhere, an over-long title is a
   cosmetic loss rather than a defect, and a gate that reds on a good page for
   two characters is one people learn to raise rather than read. It is here to
   catch a title that is a paragraph, not to police copywriting. */
const MAX_TITLE = 70;
/* 160 is where Google truncates a snippet, and it is the ceiling
   `content.test.ts` already pins for every game's `metaDescription`. This
   extends the same number to the home, world and boards pages, whose copy lives
   in `site.ts` and was checked by nothing - two of them were over when this gate
   was written (en boards at 176, es home at 171) and both were shortened in the
   same commit, because a gate that reds on day one for something nobody fixes
   that day is one people learn to ignore. */
const MAX_DESC = 160;

/**
 * The measurement tag's id, and the one script src an indexable DOCUMENT is
 * allowed to fetch.
 *
 * One constant, two gates. The eager-assets arm needs the SRC and the coverage
 * gate needs the ID; deriving one from the other is what stops a future tag
 * change from being made in one place and silently loosening the other.
 */
const GA_ID = "G-E25QBB8420";
const GA_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

const failures = [];
const fail = (msg) => failures.push(msg);

// ---------------------------------------------------------------------------
// Extractors. Defined once, so the negative controls exercise the same code the
// real assertions do — a control that runs a different matcher proves nothing.
// ---------------------------------------------------------------------------

/** The visible text of the body: head, script, style and tags all removed. */
export function bodyText(html) {
  const body = html.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "");
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ");
}

/** Visible words. The language and duplicate checks share this exact pipeline. */
export function proseWords(html) {
  return bodyText(html).split(/\s+/).filter(Boolean).length;
}

/**
 * The two markers a printable page fences its BOARDS with, and the whole
 * reason this pair exists.
 *
 * `proseWords` counts every visible word, which is right for every other page
 * here and wrong for a print pack: a sudoku page prints 972 digits and a word
 * search 1,432 loose Hebrew letters, so the raw count reads ~2,100 on a page
 * whose prose is 665. That number clears the floor and means nothing, which is
 * worse than failing it - a confident wrong number is the failure this repo
 * keeps writing rules about.
 *
 * The emitter writes them (`SHEETS_OPEN`/`SHEETS_CLOSE` in `printPage.ts`).
 * Comments rather than a container class, because this is a regex over bytes
 * and a `<div>` cannot be matched to its own closing tag through six levels of
 * nesting; these two cannot nest.
 */
export const SHEETS_OPEN = "<!--sheets-->";
export const SHEETS_CLOSE = "<!--/sheets-->";

/** Everything outside the fenced board blocks, and how many fences were found. */
export function withoutSheets(html) {
  let out = "";
  let rest = html;
  let pairs = 0;
  for (;;) {
    const open = rest.indexOf(SHEETS_OPEN);
    if (open === -1) break;
    const close = rest.indexOf(SHEETS_CLOSE, open + SHEETS_OPEN.length);
    if (close === -1) {
      // An unbalanced fence, reported rather than silently swallowing the tail.
      return { text: out + rest, pairs, unbalanced: true };
    }
    out += rest.slice(0, open) + " ";
    rest = rest.slice(close + SHEETS_CLOSE.length);
    pairs += 1;
  }
  return { text: out + rest, pairs, unbalanced: false };
}

/**
 * A printable page's prose, and whether the measurement can be believed.
 *
 * FAIL-CLOSED on a missing fence. Falling back to the whole body would keep the
 * gate green while measuring the wrong thing, on the day somebody renames a
 * marker - which is precisely the class of instrument failure the fences exist
 * to avoid in the first place.
 *
 * Pure, so the controls at the bottom drive the SAME function the run does.
 */
export function printProseFaults(html, floor) {
  const { text, pairs, unbalanced } = withoutSheets(html);
  if (unbalanced) {
    return [`opens a ${SHEETS_OPEN} fence it never closes - its prose cannot be measured`];
  }
  if (pairs === 0) {
    return [
      `carries no ${SHEETS_OPEN} fence, so its printed boards would be counted as prose ` +
        "- the emitter and this gate have to agree on the marker",
    ];
  }
  const n = proseWords(text);
  return n < floor ? [`has ${n} words of prose outside its sheets, floor is ${floor}`] : [];
}

/**
 * What fraction of the letters belong to each writing system.
 *
 * URLs are stripped FIRST and that is the whole trap: a Hebrew page carrying
 * one `https://ellaz.fun/games/snake/` in visible text donates ~30 Latin
 * characters to the count, and a page with a handful of them classifies as
 * Latin while reading as perfect Hebrew. Digits and punctuation are counted by
 * nobody - `2048` is not evidence of any language.
 */
const SCRIPT_OF_CHAR = [
  ["hebrew", /[֐-׿]/],
  ["arabic", /[؀-ۿݐ-ݿ]/],
  ["cyrillic", /[Ѐ-ӿ]/],
  ["latin", /[A-Za-zÀ-ɏ]/],
];

export function scriptShare(text) {
  const stripped = text.replace(/https?:\/\/\S+/g, " ").replace(/\S+@\S+\.\S+/g, " ");
  const counts = { hebrew: 0, arabic: 0, cyrillic: 0, latin: 0 };
  let total = 0;
  for (const ch of stripped) {
    for (const [name, re] of SCRIPT_OF_CHAR) {
      if (re.test(ch)) {
        counts[name] += 1;
        total += 1;
        break;
      }
    }
  }
  if (total === 0) return { ...counts, total: 0 };
  for (const k of Object.keys(counts)) counts[k] /= total;
  return { ...counts, total };
}

/**
 * The `<title>` and the `<meta name="description">`, as text.
 *
 * THEIR OWN EXTRACTOR, and that is the whole point rather than a convenience.
 * `bodyText()` above strips everything before `<body>`, so a head tag read
 * through it is always the empty string - and every assertion built on that
 * would pass, silently, over a page with no title at all. The same shape as the
 * webfont matcher written from the source and run against the artifact:
 * a check that cannot see its subject reports success about something it never
 * observed. See a-diagnostic-that-truncates-what-it-compares.md.
 *
 * Non-greedy and `[^<]`, so it takes the FIRST title and cannot run away
 * through the document hunting a second `</title>`.
 *
 * SCOPED TO THE HEAD, which is not caution about today's markup - it is about
 * tomorrow's. `<svg><title>` is the standard way to label an inline icon, and
 * this project emits inline SVG on every page. The moment one of those gains a
 * `<title>` (the art currently uses `aria-hidden` instead), an unscoped matcher
 * on a page whose head lost its title would read the icon's label and report it
 * as the document's - a confident, plausible, wrong answer, which is the one
 * outcome a gate must never produce.
 */
export function headMeta(html) {
  const head = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  const scope = head ? head[1] : "";
  const title = /<title>([^<]*)<\/title>/i.exec(scope);
  const desc = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(scope);
  const decode = (s) =>
    (s ?? "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;|&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .trim();
  return { title: decode(title?.[1]), description: decode(desc?.[1]) };
}

/**
 * Is this title written in the language its page claims?
 *
 * ASYMMETRIC, and the asymmetry is load-bearing. The body gate above asks which
 * script DOMINATES, which is right for 900 words of prose and wrong for a title,
 * because a title is short enough that the brand name swings the ratio. Measured
 * on the exact string this gate was written for:
 *
 *     "Ellaz — Games / משחקים"  ->  62.5% latin, 37.5% hebrew
 *
 * Dominant script is Latin. A `share[want] > 0.5` check - the obvious design,
 * and the one already used ten lines away - reports GREEN on the defect it
 * exists to catch. So:
 *
 *   - a LATIN-script locale's title must contain NO non-Latin letters at all.
 *     There is no legitimate reason for Hebrew or Arabic in an English title,
 *     and zero is a bright line no brand name can blur.
 *   - a NON-LATIN locale's title may contain Latin, because the brand is Latin
 *     in every language - the Hebrew home title is legitimately 13.9% Latin
 *     since it begins "Ellaz". There, dominance among the LETTERS THAT CARRY
 *     LANGUAGE is the right question, so Latin is excluded from the comparison.
 *
 * Returns null when the title is fine, or a sentence naming what is wrong.
 */
export function titleScriptFault(title, wantScript) {
  const share = scriptShare(title);
  if (share.total === 0) return "contains no letters at all";
  const foreign = Object.entries(share).filter(
    ([k, v]) => k !== "total" && k !== wantScript && v > 0,
  );
  if (wantScript === "latin") {
    const bad = foreign.filter(([, v]) => v > 0);
    if (bad.length) {
      return (
        `is ${bad.map(([k, v]) => `${(v * 100).toFixed(0)}% ${k}`).join(", ")} — a Latin-script ` +
        `title must carry no other script, and this one reads as neither language`
      );
    }
    return null;
  }
  // Non-Latin locale: ignore the Latin brand and ask whether what remains is
  // this language. A title with a Latin brand and Cyrillic body on a Hebrew
  // page is still wrong, and this catches it.
  const others = foreign.filter(([k]) => k !== "latin");
  const own = share[wantScript] ?? 0;
  const worst = others.sort((a, b) => b[1] - a[1])[0];
  if (own === 0) return `contains no ${wantScript} at all`;
  if (worst && worst[1] >= own) {
    return `is more ${worst[0]} (${(worst[1] * 100).toFixed(0)}%) than ${wantScript}`;
  }
  return null;
}

/**
 * The page's sentences of `minWords` or more, normalised and lowercased.
 *
 * Used to answer "is this locale's body actually a different body?". Short
 * fragments are excluded because a game's own name, a number and a nav label
 * are identical across languages by design and prove nothing either way.
 */
export function longSentences(text, minWords = 5) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?؟])\s/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.split(" ").filter(Boolean).length >= minWords);
}

/**
 * The sitemap's own hreflang clusters: `<loc>` -> the set of alternate hrefs
 * that `<url>` block advertises, x-default excluded.
 *
 * Exported because the sitemap is the artifact NOBODY OPENS. A page's own
 * `<link rel="alternate">` tags and the sitemap's `xhtml:link` rows are two
 * statements about the same thing, made by two different code paths, and the
 * only way they are ever found to disagree is by comparing them.
 */
export function sitemapClusters(xml) {
  const out = new Map();
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = m[1];
    const loc = /<loc>([^<]+)<\/loc>/.exec(block);
    if (!loc) continue;
    const alts = new Set();
    for (const a of block.matchAll(/hreflang="([^"]+)"\s+href="([^"]+)"/g)) {
      if (a[1] !== "x-default") alts.add(a[2]);
    }
    out.set(loc[1], alts);
  }
  return out;
}

/** Every `rel="alternate"` in the head, as `{ hreflang, href }`. */
export function alternatesOf(html) {
  const out = [];
  for (const m of html.matchAll(
    /<link[^>]+rel="alternate"[^>]+hreflang="([^"]+)"[^>]+href="([^"]+)"/gi,
  )) {
    out.push({ hreflang: m[1], href: m[2] });
  }
  return out;
}

export function canonicalOf(html) {
  const m = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i.exec(html);
  return m ? m[1] : null;
}

/** Every asset the page tells a browser to fetch before it renders. */
export function eagerAssets(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/gi)) out.push(m[1]);
  for (const m of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/gi)) out.push(m[1]);
  for (const m of html.matchAll(/<link[^>]+href="([^"]+)"[^>]*rel="modulepreload"/gi)) out.push(m[1]);
  return out;
}

/**
 * What a NON-BOOTING document is still not allowed to fetch.
 *
 * Pure, and beside the other extractors, so the negative controls at the
 * bottom of this file exercise the SAME code the gate runs rather than a
 * restatement of it. The arm this replaced was inline and therefore had no
 * control at all - and it is an arm with an EXCEPTION in it, which is the kind
 * most worth proving can still fire.
 */
export function documentEagerFaults(eager, kind) {
  return carriesTag(kind) ? eager.filter((a) => a !== GA_SRC) : eager;
}

/**
 * Which page kinds carry the measurement tag. ONE predicate for the gate that
 * DEMANDS it (coverage) and the gate that PERMITS it (the document arm), so the
 * two populations cannot drift apart and fail a build in both directions.
 *
 * The 404 fetches nothing eagerly. The EMBED page runs inside a third party's
 * page, where a tag is a frame phoning home from somebody else's site - the one
 * thing that makes a game un-listable on a portal. Both are asserted absent,
 * never skipped: an exemption that is checked stays a decision.
 */
export function carriesTag(kind) {
  return kind !== "notFound" && kind !== "embed";
}

/**
 * Which page kinds deliberately advertise ANOTHER page's share card.
 *
 * Two, and both borrow the card of the GAME they are about: the embed frame,
 * whose canonical IS that game page, and the printable pack, which is that game
 * on paper. Neither draws a picture of its own, so both are held to "your card
 * equals your game's card" instead of to "no two pages share a card".
 *
 * A PREDICATE rather than a `kind ===` at the one call site, so the relation is
 * asserted for both kinds by name below and a third borrower cannot be added by
 * quietly widening a condition.
 */
export function sharesGameCard(kind) {
  return kind === "embed" || kind === "print";
}

/**
 * The hreflang faults of one page, given the locale set it DECLARED.
 *
 * `want` comes off `pages.json` - the route's own `locales` row - rather than
 * from a `kind !==` in this script. An empty set means "no per-language twin"
 * (the 404, every embed page) and demands ZERO alternates and zero x-default; a
 * non-empty set demands exactly that set, an x-default iff the set holds the
 * x-default locale, and a self-alternate at the page's own canonical.
 *
 * Pure, so the controls at the bottom plant a declared `[]` beside a stray
 * alternate, a declared set beside a short cluster, and both correct shapes.
 */
export function hreflangFaults(alts, want, page, xDefaultLocale) {
  const out = [];
  const langAlts = alts.filter((a) => a.hreflang !== "x-default");
  const xDefault = alts.filter((a) => a.hreflang === "x-default");
  if (want.length === 0) {
    if (alts.length > 0) {
      out.push(`advertises ${alts.length} alternate(s), but declares no per-language twin`);
    }
    return out;
  }
  const got = langAlts.map((a) => a.hreflang).sort();
  const wanted = [...want].sort();
  if (got.join(",") !== wanted.join(",")) {
    out.push(`lists hreflang [${got}], expected exactly [${wanted}]`);
  }
  const wantXDefault = want.includes(xDefaultLocale) ? 1 : 0;
  if (xDefault.length !== wantXDefault) {
    out.push(`has ${xDefault.length} x-default links, expected exactly ${wantXDefault}`);
  }
  const self = langAlts.find((a) => a.hreflang === page.locale);
  if (!self) {
    out.push("does not list ITSELF as an alternate - the cluster has no anchor");
  } else if (self.href !== page.canonical) {
    out.push(`self-alternate is ${self.href}, expected its own canonical ${page.canonical}`);
  }
  const wantX = langAlts.find((a) => a.hreflang === xDefaultLocale);
  if (xDefault.length === 1 && wantX && xDefault[0].href !== wantX.href) {
    out.push(`x-default is ${xDefault[0].href}, expected the ${xDefaultLocale} twin ${wantX.href}`);
  }
  return out;
}

/** Local stylesheet links, base-relative. The Google Fonts one is skipped. */
export function localStylesheets(html) {
  const out = [];
  for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/gi)) {
    if (!/^https?:/i.test(m[1])) out.push(m[1]);
  }
  return out;
}

/** What `#game-frame` contains in the EMITTED html. Must be nothing. */
export function frameContents(html) {
  const m = /<div id="game-frame"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  return m ? m[1].trim() : null;
}

export function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1],
  );
}

/** Same-site hrefs only: no scheme, no fragment-only, no mailto. */
export function internalLinks(html) {
  const out = [];
  for (const m of html.matchAll(/<a[^>]+href="([^"]+)"/gi)) {
    const href = m[1];
    if (/^[a-z]+:/i.test(href) || href.startsWith("#")) continue;
    out.push(href);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The real run
// ---------------------------------------------------------------------------

function readManifest() {
  const path = join(DIST, "pages.json");
  if (!existsSync(path)) {
    console.error(`FAIL  no ${path} — run \`npm run build\` first.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}


/**
 * The share card a page advertises, as a dist-relative file.
 *
 * `og:image` is always absolute and always points at ellaz.fun, on BOTH hosts,
 * exactly like the canonical - a scraper gets the URL with no page context, so
 * a relative one is unusable. That means the path maps straight to a file.
 */
function ogImageOf(html) {
  const m = html.match(/<meta property="og:image" content="([^"]+)"/);
  return m ? m[1] : "";
}

const OG_CEILING = 600 * 1024;

/** Every card the pages point at: exists, non-trivial, and under WhatsApp's cap. */
function checkOgCard(html, where, kind) {
  const url = ogImageOf(html);
  // The 404 has no card ON PURPOSE. Asserted rather than skipped, so the
  // exemption stays a decision instead of becoming a hole the day a card
  // silently stops being written for some other page kind too.
  if (kind === "notFound") {
    if (url) fail(`${where} advertises a share card; a 404 is never deliberately shared`);
    return;
  }
  if (!url) {
    fail(`${where} has no og:image - every link shared to WhatsApp previews with no picture`);
    return;
  }
  if (!url.startsWith("https://ellaz.fun/og/")) {
    fail(`${where} og:image is "${url}" - must be an absolute ellaz.fun URL, like the canonical`);
    return;
  }
  if (!/<meta name="twitter:card" content="summary_large_image"/.test(html)) {
    fail(`${where} has an og:image but still asks for a small twitter card`);
  }
  const file = join(DIST, url.replace("https://ellaz.fun/", ""));
  if (!existsSync(file)) {
    fail(`${where} points at ${url}, which was never written`);
    return;
  }
  const bytes = statSync(file).size;
  // A card that renders as a flat colour - art missing, or an unresolved CSS
  // var painting the whole thing black - compresses to almost nothing. The
  // floor catches that; the ceiling catches WhatsApp silently dropping it.
  if (bytes < 4096) {
    fail(`${where} card is only ${bytes} B - a flat colour, so the art did not render`);
  }
  if (bytes > OG_CEILING) {
    fail(`${where} card is ${bytes} B, over WhatsApp's ${OG_CEILING} B limit - it will be dropped`);
  }
}


/**
 * The page's own embedded images, as {src, alt} - the ONLY thing a crawler can
 * choose a result thumbnail from.
 *
 * Deliberately separate from `ogImageOf`. They look like the same subject and
 * are not: `og:image` is a social card read by a scraper handed a URL with no
 * page, while this is what Google picks from when it decides whether a result
 * gets a picture. Measured 2026-08-22, ellaz.fun had a perfect og:image on
 * every page and no `<img>` anywhere, and the result had no picture - which is
 * exactly the confusion the two names invite.
 *
 * `[\s\S]` and not `.` - the emitter writes the attributes one per line, and a
 * matcher that cannot cross a newline reports ZERO images on a page that has
 * one. That is the reading this whole gate exists to disprove, so getting it
 * from our own regex would be the worst possible false green.
 */
export function embeddedImages(html) {
  return [...html.matchAll(/<img\b([\s\S]*?)>/g)].map((m) => {
    const attrs = m[1];
    const pick = (name) => {
      const a = attrs.match(new RegExp(`\\b${name}="([^"]*)"`));
      return a ? a[1] : "";
    };
    return { src: pick("src"), alt: pick("alt"), w: pick("width"), h: pick("height") };
  });
}

/**
 * Every game page carries exactly one real picture, and the file is there.
 *
 * Only game pages. The home shells, the room and the boards draw their art
 * with the app once it boots, and pretending otherwise here would make this
 * gate red for pages nobody claimed to have fixed. Stated rather than skipped,
 * so the exemption stays a decision.
 */
/**
 * No two share cards are the SAME PICTURE.
 *
 * THE FAILURE THIS EXISTS FOR IS NOT A MISSING FILE. Measured 2026-08-23,
 * `home-en.png`, `world-en.png` and `boards-en.png` were byte-identical in all
 * four languages - twelve files, four pictures - because `/world/` and
 * `/boards/` fell through to the site's own brand and tagline, so the three
 * drew the same two strings on the same empty ground.
 *
 * Every gate in this repo was green over it, and the near miss is the useful
 * part: `ogCard.test.ts` DOES assert distinctness, of FILE NAMES, which were
 * always distinct. A gate can be pointed at the right subject and still be
 * unable to express the failure. The byte floor could not see it either - a
 * flat slab WITH TEXT on it compresses to 16 KB, four times over the 4096 B
 * floor written to catch a flat colour.
 *
 * Compares content hashes rather than sizes, because two different mosaics of
 * the same ten scenes differ by a handful of bytes and two identical renders
 * differ by none - a size comparison is exactly the instrument that let a
 * deploy skip 49 pages once already.
 */
function checkCardsAreDistinct() {
  const dir = join(DIST, "og");
  if (!existsSync(dir)) {
    fail("dist/og does not exist - no share card was written at all");
    return;
  }
  const names = readdirSync(dir).filter((n) => n.endsWith(".png"));
  if (names.length === 0) {
    fail("dist/og holds no cards");
    return;
  }
  const byHash = new Map();
  for (const name of names) {
    const hash = createHash("sha256").update(readFileSync(join(dir, name))).digest("hex");
    byHash.set(hash, [...(byHash.get(hash) ?? []), name]);
  }
  for (const [hash, group] of byHash) {
    if (group.length > 1) {
      fail(
        `${group.length} share cards are the SAME PICTURE (sha256 ${hash.slice(0, 12)}): ` +
          `${group.join(", ")} - each is advertising a page it does not describe`,
      );
    }
  }
  // Positive control. Without it a run that read ZERO cards - a moved
  // directory, a changed extension - reports every card distinct and passes.
  // The floor is the route count rather than 1, so a partial write is a
  // failure rather than a quiet pass over whatever happened to be there.
  if (names.length < 100) {
    fail(`dist/og holds only ${names.length} cards - the emitter wrote a partial set`);
  }

  // TWO PAGES POINTING AT ONE CARD.
  //
  // Since 2026-08-26 a card's filename carries the hash of its own bytes, so
  // two identical pictures now collapse into ONE FILE and the content-hash
  // check above can no longer see them - it would report every file distinct,
  // truthfully, over a defect that is still live. The duplicate shows up one
  // layer out instead: two different pages advertising the same name. That is
  // also the more direct statement of the defect, which was always "four
  // category pages in five previewing the wrong group".
  const byCard = new Map();
  const manifestPages = readManifest().pages;
  /** embed page file -> the card it advertises; compared to its game page's, below. */
  const embedCards = new Map();
  for (const page of manifestPages) {
    const file = page.file;
    if (!file || !file.endsWith(".html") || !existsSync(join(DIST, file))) continue;
    const html = readFileSync(join(DIST, file), "utf8");
    const m = /<meta property="og:image" content="[^"]*\/(og\/[^"]+)"/.exec(html);
    if (!m) continue;
    // AN EMBED FRAME AND A PRINT PACK share their game page's card BY DESIGN:
    // the frame's canonical IS that page, and a pack of printable sudoku is
    // that game on paper. Both are kept out of the one-card-per-page relation
    // and held to the sharing instead, which is the stronger statement.
    if (sharesGameCard(page.kind)) {
      embedCards.set(page, m[1]);
      continue;
    }
    byCard.set(m[1], [...(byCard.get(m[1]) ?? []), file]);
  }
  for (const [page, card] of embedCards) {
    // THE GAME PAGE IN THIS PAGE'S OWN LOCALE. An embed frame is emitted in the
    // canonical locale, so this is the same lookup it always did; a print pack
    // is Hebrew, and pointing it at the English card would preview a Hebrew
    // worksheet with an English picture.
    const game = manifestPages.find(
      (p) => p.kind === "game" && p.id === page.id && p.locale === page.locale,
    );
    const gameFile = game && join(DIST, game.file);
    const gameHtml = gameFile && existsSync(gameFile) ? readFileSync(gameFile, "utf8") : "";
    const gameCard = /<meta property="og:image" content="[^"]*\/(og\/[^"]+)"/.exec(gameHtml)?.[1];
    if (!gameCard) {
      fail(`${page.file} is about "${page.id}" but its ${page.locale} game page advertises no card`);
    } else if (gameCard !== card) {
      fail(`${page.file} advertises ${card}, its game page advertises ${gameCard} - it must preview as its game`);
    }
  }
  // The population, printed. Zero borrowers means the predicate stopped
  // matching and every assertion in this loop passed over nothing.
  if (embedCards.size === 0) {
    fail("no page borrows a game's card - sharesGameCard matched nothing, so this check is blind");
  }
  if (byCard.size === 0) {
    fail("no emitted page names an og:image - the matcher found nothing, so this check is blind");
  }
  for (const [card, pages] of byCard) {
    if (pages.length > 1) {
      fail(`${pages.length} pages share the card ${card}: ${pages.join(", ")}`);
    }
  }

  // `-unhashed` IS A REAL NAME AND NO CARD IS EVER WRITTEN UNDER IT.
  //
  // `ogImageFile` falls back to it when the hash registry is empty, which is the
  // state `build.test.ts` reads `allEmittedFiles` in - pure and synchronous,
  // never having rasterised anything. In a REAL build the cards are rendered
  // first and every hash is registered, so a page carrying this marker means the
  // ordering in `pages.ts` broke and 184 previews are pointing at nothing.
  //
  // It is refused here rather than made impossible upstream on purpose: the
  // alternative fallback is the bare, un-suffixed name, which looks perfectly
  // plausible in every page and 404s on every card. Fail-closed beats fail-open,
  // and this is the line that makes it so. It caught itself on the first build:
  // `transformIndexHtml` runs before `generateBundle`, so `/` shipped one.
  for (const [card, pages] of byCard) {
    if (card.includes("-unhashed.")) {
      fail(`${pages.join(", ")} reference ${card} - no card is written under that name`);
    }
  }

  console.log(
    `   ${names.length} share cards, ${byHash.size} distinct pictures, ` +
      `${byCard.size} referenced by ${[...byCard.values()].flat().length} pages`,
  );
}

function checkPageImage(html, where, kind, base) {
  const imgs = embeddedImages(html);
  if (kind !== "game") return imgs;
  if (imgs.length === 0) {
    fail(`${where} embeds no <img> - a result thumbnail is chosen from images the page embeds, so this page can never have one`);
    return imgs;
  }
  const [img] = imgs;
  if (!img.src) {
    fail(`${where} has an <img> with no src - markup, not an image`);
    return imgs;
  }
  if (!img.src.startsWith(base)) {
    fail(`${where} image src is "${img.src}", which does not carry the base ${base} - a 404 on the mirror`);
    return imgs;
  }
  const file = join(DIST, img.src.slice(base.length));
  if (!existsSync(file)) {
    fail(`${where} embeds ${img.src}, which was never written`);
    return imgs;
  }
  // Both dimensions, because the browser reserves the box from the PAIR. One
  // of them alone gives it no aspect ratio and the picture still shifts the
  // page when it lands.
  if (!img.w || !img.h) {
    fail(`${where} image declares no width/height - the main image then shifts the layout as it lands`);
  }
  if (!img.alt || img.alt.length < 3) {
    fail(`${where} image alt is "${img.alt}" - a crawler and a screen reader read the same string`);
  }
  return imgs;
}

function main() {
  const manifest = readManifest();
  const base = manifest.base;
  const primary = base === "/";
  const emitted = manifest.pages.filter((p) => p.emitted);

  // A zero-page run satisfies every per-page assertion below forever. Same
  // reason assert-first-visit refuses a zero-entry precache manifest.
  if (emitted.length === 0) {
    console.error("FAIL  the manifest lists no emitted pages — the emitter is broken, not the gate.");
    process.exit(1);
  }

  const known = new Set(manifest.pages.map((p) => p.path));
  /** game page -> the game chunk it preloads. Two games must never share one. */
  const preloadedGame = new Map();
  /** embed page's game id -> the chunk IT preloads; must equal what the game's pages preload. */
  const embedChunk = new Map();

  // The locale lists, read off the artifact rather than duplicated here. A gate
  // holding its own copy of "which languages have pages" is a second list that
  // can disagree with the first, and it would report green while it disagreed.
  const L = manifest.locales;
  if (!L || !Array.isArray(L.page) || L.page.length === 0) {
    console.error("FAIL  the manifest carries no locale lists — the emitter is broken, not the gate.");
    process.exit(1);
  }
  /** canonical URL -> the set of alternate URLs it declares. Gate 5's reciprocity. */
  const cluster = new Map();
  /** page family (the path with its locale prefix removed) -> one entry per locale. */
  const families = new Map();
  let words = Infinity;
  let thinnest = "";
  let printWords = Infinity;
  let thinnestPrint = "";

  // The app's own eager asset set, as the yardstick every booting page is
  // measured against. Read once, from the artifact.
  const indexHtml = readFileSync(join(DIST, "index.html"), "utf8");
  const norm = (u) => (u.startsWith(base) ? u.slice(base.length) : u).replace(/^\//, "");
  const rootEager = eagerAssets(indexHtml).map(norm).sort();
  if (rootEager.length === 0) {
    console.error("FAIL  index.html lists no eager assets — the matcher is broken, not the build.");
    process.exit(1);
  }

  /* GATE 6's shared state. Titles and descriptions are checked per page for
     presence and language, and ACROSS pages for uniqueness - two pages sharing
     a title is Google's own "duplicate title tag" finding, and on a site whose
     pages are 29 games x 3 languages it is the realistic way a copy-paste
     mistake ships. `/` is seeded into these below, beside the other gates that
     have to reach past `emitted`. */
  const titles = new Map();
  const descriptions = new Map();
  /** game id -> locale -> alt, so the alt can be proven LOCALISED and not a constant. */
  const altsByGame = new Map();
  /** every art file some page actually embeds, dist-relative. */
  const embeddedArt = new Set();
  const seeTitle = (where, html, locale) => {
    const { title, description } = headMeta(html);
    if (!title) {
      fail(`${where} has no <title> — it is the strongest on-page signal there is`);
    } else {
      if (title.length > MAX_TITLE) {
        fail(`${where} title is ${title.length} chars, over ${MAX_TITLE}: "${title}"`);
      }
      const wantScript = L.script[locale];
      const fault = wantScript && titleScriptFault(title, wantScript);
      if (fault) fail(`${where} is lang="${locale}" but its title ${fault}: "${title}"`);
      if (titles.has(title)) fail(`${where} and ${titles.get(title)} share a title: "${title}"`);
      else titles.set(title, where);
    }
    if (!description) {
      fail(`${where} has no meta description — it is the snippet a search result shows`);
    } else if (description.length > MAX_DESC) {
      fail(`${where} description is ${description.length} chars, over ${MAX_DESC} — it will be cut`);
    } else if (descriptions.has(description)) {
      fail(`${where} and ${descriptions.get(description)} share a meta description`);
    } else {
      descriptions.set(description, where);
    }
  };

  for (const page of emitted) {
    const file = join(DIST, page.file);
    if (!existsSync(file)) {
      fail(`${page.file} is in the route table but was never written`);
      continue;
    }
    const html = readFileSync(file, "utf8");
    const where = page.file;

    // --- GATE 6: the title and the description ---------------------------
    //
    // Added 2026-08-16, after `/` was found shipping `Ellaz — Games / משחקים`
    // - a bilingual literal nothing owned - as the title of the site's
    // canonical entry and x-default target, beside an English og:title and
    // lang="en". It survived the 2026-08-14 language flip that rewrote every
    // other tag on that page, because until now the strings "title" and
    // "description" did not appear anywhere in this file. The title is the
    // strongest on-page signal there is and the line a search result shows.
    seeTitle(where, html, page.locale);

    // --- the page is a real document -------------------------------------
    //
    // The EMBED page is a frame, not a document: no prose, no heading, one
    // game and one link. Asserted rather than skipped, so a heading creeping
    // into the frame is a red gate and not a quiet drift.
    if (page.kind === "embed") {
      if (/<h1[\s>]/i.test(html)) fail(`${where} is an embed frame and carries an <h1>`);
    } else if (!/<h1[\s>]/i.test(html)) fail(`${where} has no <h1>`);
    const n = proseWords(html);
    if (page.kind === "game" && n < MIN_WORDS) {
      fail(`${where} has ${n} words of prose, floor is ${MIN_WORDS}`);
    }
    if (page.kind === "game" && n < words) {
      words = n;
      thinnest = where;
    }
    // A PRINT PACK INHERITS THE GAME FLOOR, deliberately and not by default.
    // It is an indexable article that exists to be found by somebody searching
    // for worksheets, so the argument for 550 words is exactly the argument the
    // game pages make: below that it is a page of boards with a heading, which
    // is a thin page whatever its subject. What changes is WHERE the words are
    // counted - outside the fenced boards, or the digits pass the floor for it.
    if (page.kind === "print") {
      const faults = printProseFaults(html, MIN_WORDS);
      for (const f of faults) fail(`${where} ${f}`);
      if (faults.length === 0) {
        const p = proseWords(withoutSheets(html).text);
        if (p < printWords) {
          printWords = p;
          thinnestPrint = where;
        }
      }
    }

    // --- language ---------------------------------------------------------
    // The direction comes from the manifest rather than from a `=== "he"`
    // here. Arabic is the next RTL language and it must not need an edit in
    // this file to be checked correctly - a gate holding its own copy of a
    // list is a second list, and a second list drifts.
    const dir = L.dir[page.locale] ?? "ltr";
    if (!new RegExp(`<html lang="${page.locale}" dir="${dir}"`).test(html)) {
      fail(`${where} should declare lang="${page.locale}" dir="${dir}"`);
    }

    // --- GATE 4: the prose is in the language the page claims -------------
    //
    // A page emitted under the wrong locale's route is a valid document with a
    // correct canonical, a correct hreflang cluster and 900 words of prose. It
    // is also the named duplicate-content anti-pattern, and every other check
    // in this file passes over it. Comparing the SCRIPT of what was emitted
    // against the script the locale is written in is the one signal that
    // separates "translated" from "copied" without reading a word.
    //
    // The assertion is a COMPARISON, not a threshold: the expected script must
    // simply be the dominant one. There is no constant here to go stale, and
    // the two states are nowhere near each other - measured on this build, a
    // Hebrew page is 97% Hebrew and an English page is 100% Latin.
    const wantScript = L.script[page.locale];
    const share = scriptShare(bodyText(html));
    if (!wantScript) {
      fail(`${where} is locale "${page.locale}", which the manifest declares no script for`);
    } else if (share.total === 0) {
      fail(`${where} contains no letters at all in any script`);
    } else {
      const dominant = Object.entries(share)
        .filter(([k]) => k !== "total")
        .sort((a, b) => b[1] - a[1])[0];
      if (dominant[0] !== wantScript) {
        fail(
          `${where} is lang="${page.locale}" (${wantScript}) but its prose is mostly ` +
            `${dominant[0]} (${(dominant[1] * 100).toFixed(0)}%) - this page is in the wrong language`,
        );
      }
    }

    // --- GATE 5: the hreflang cluster is exactly what the route declared ---
    //
    // The set is read off the manifest's own `locales` row, never assumed to
    // be PAGE_LOCALES. A page declaring `[]` - the 404, every embed page - has
    // no per-language twin and must carry NO cluster at all; a page declaring
    // a set must carry exactly it. Asserted in both shapes rather than skipped
    // for a kind: an exemption that is checked stays a decision, and one that
    // is skipped becomes a hole the day some other page kind quietly stops
    // emitting its alternates too.
    const alts = alternatesOf(html);
    const langAlts = alts.filter((a) => a.hreflang !== "x-default");
    if (!Array.isArray(page.locales)) {
      fail(`${where} has no \`locales\` row in pages.json - the emitter is broken, not the gate`);
    } else {
      // The two kinds with no twin, named: a 404 is one document for the
      // whole site, an embed page is one document per GAME that takes its
      // language from `?lang=` at runtime. A per-locale embed would be a
      // second copy of the frame, which the route table forbids.
      if ((page.kind === "notFound" || page.kind === "embed") && page.locales.length !== 0) {
        fail(`${where} is a ${page.kind} page and declares twins [${page.locales}] - it has none`);
      }
      for (const f of hreflangFaults(alts, page.locales, page, L.xDefault)) fail(`${where} ${f}`);
      for (const a of alts) {
        if (!a.href.startsWith("https://ellaz.fun/")) {
          fail(`${where} hreflang=${a.hreflang} is ${a.href} - alternates are absolute, like the canonical`);
        } else if (!primary && a.href.includes(base)) {
          fail(`${where} hreflang=${a.hreflang} carries the base: ${a.href}`);
        }
      }
      if (page.locales.length > 0) {
        cluster.set(page.canonical, new Set(langAlts.map((a) => a.href)));
      }
    }

    // --- canonical --------------------------------------------------------
    const canonical = canonicalOf(html);
    if (canonical !== page.canonical) {
      fail(`${where} canonical is ${canonical}, expected ${page.canonical}`);
    }
    // The embed page's canonical is its GAME page in the canonical locale -
    // checked against ANOTHER row of the manifest, not only against its own,
    // so a route table that resolved `canonicalPath` to the wrong place would
    // fail here rather than agree with itself.
    if (page.kind === "embed") {
      const game = manifest.pages.find(
        (p) => p.kind === "game" && p.id === page.id && p.locale === L.canonical,
      );
      if (!game) fail(`${where} embeds game "${page.id}", which has no ${L.canonical} game page`);
      else if (canonical !== game.canonical) {
        fail(`${where} canonical is ${canonical}, expected its game page ${game.canonical}`);
      }
    }
    if (!primary && canonical && canonical.includes(base)) {
      fail(`${where} canonical carries the base: ${canonical} — that URL exists on neither host`);
    }

    // --- the share card ---------------------------------------------------
    checkOgCard(html, where, page.kind);
    const pageImgs = checkPageImage(html, where, page.kind, base);
    if (page.kind === "game" && pageImgs[0]) {
      const seen = altsByGame.get(page.id) ?? new Map();
      seen.set(page.locale, pageImgs[0].alt);
      altsByGame.set(page.id, seen);
      embeddedArt.add(pageImgs[0].src.slice(base.length));
    }

    // --- indexability -----------------------------------------------------
    const noindex = /<meta name="robots" content="noindex/i.test(html);
    if (!primary && !noindex) fail(`${where} must be noindex on the Pages duplicate`);
    if (primary && page.indexable && noindex) {
      fail(`${where} is noindex on the primary host`);
    }
    if (page.kind === "notFound" && !noindex) {
      fail(`${where} must be noindex — an indexable 404 body is a soft 404`);
    }
    // The frame is not a destination; the game page is. An indexable embed is
    // a second URL for every game, competing with the one that carries the
    // prose. `noindex, follow` so the one link in it still counts.
    if (page.kind === "embed" && !noindex) {
      fail(`${where} must be noindex - the game page is the destination, the frame is not`);
    }
    if (page.kind === "embed" && page.indexable) {
      fail(`${where} is an embed page the route table marks indexable`);
    }

    // --- the runtime, and the two elements it is allowed to own -----------
    //
    // A page that boots the app must load EXACTLY what the app loads. The
    // names carry a content hash, so a page whose set has drifted is a page
    // running different code from the one at `/` - and the shape that failure
    // takes is a game that never mounts, on a page that looks perfect.
    // Read off the emitter's own manifest, so "which pages boot" cannot drift
    // between the route table and this gate. A page kind missing here is not a
    // soft failure: it gets held to the DOCUMENT rules instead and fails for a
    // reason that has nothing to do with what is wrong.
    //
    // An emitted HOME page is the app shell rather than a content page: it
    // mounts into `#root` over its own emitted home document, the way `/`
    // does, so it boots the same bundle and owns none of the content-page
    // furniture. Held to the content-page rules it would fail on four checks
    // that have nothing to do with what a home page is.
    const shell = page.kind === "home";
    const embed = page.kind === "embed";
    const boots =
      shell || embed || page.kind === "game" || page.kind === "world" || page.kind === "boards";
    const eager = eagerAssets(html).map(norm).sort();
    if (boots) {
      // A booting page must load everything index.html loads - the names carry a
      // content hash, so a page whose set has DRIFTED is running different code.
      // It may additionally name the lazy chunks it is about to fetch anyway:
      // the content-page runtime, and on a game page that ONE game. Without
      // those two preloads the page loads in three serial round trips.
      //
      // EXCEPT the measurement tag, on an embed. `index.html` carries it on the
      // primary host and the frame must not, so the yardstick for the embed is
      // the shell's set minus the tag - and the tag's absence is asserted
      // below by name rather than falling out of the subtraction.
      const mustLoad = embed ? rootEager.filter((a) => a !== GA_SRC) : rootEager;
      if (embed && eager.includes(GA_SRC)) {
        fail(`${where} is an embed frame and fetches the measurement tag from inside a third party's page`);
      }
      const missing = mustLoad.filter((a) => !eager.includes(a));
      if (missing.length > 0) {
        fail(
          `${where} does not load what index.html loads.\n` +
            `    missing: ${missing.join(", ")}\n    page: ${eager.join(", ") || "(none)"}`,
        );
      }
      const extra = eager.filter((a) => !rootEager.includes(a));
      const pageChunks = extra.filter((a) => /^assets\/page-[\w-]+\.js$/.test(a));
      const gameChunks = extra.filter((a) => /^assets\/game-[\w-]+\.js$/.test(a));
      const other = extra.filter((a) => !pageChunks.includes(a) && !gameChunks.includes(a));
      // A content page preloads the runtime it is about to import. The shell
      // must NOT: the home grid never mounts a game or the room, so naming
      // `page-*` here would put the whole content-page runtime on the first
      // visit of every English and Spanish player - the exact bytes
      // `assert-first-visit.mjs` keeps off `/`.
      const wantPage = shell ? 0 : 1;
      if (pageChunks.length !== wantPage) {
        fail(
          `${where} preloads ${pageChunks.length} page runtime chunks, expected ${wantPage}`,
        );
      }
      const wantGames = page.kind === "game" || embed ? 1 : 0;
      if (gameChunks.length !== wantGames) {
        fail(
          `${where} preloads ${gameChunks.length} game chunk(s), expected ${wantGames}` +
            (gameChunks.length ? `: ${gameChunks.join(", ")}` : ""),
        );
      }
      if (other.length > 0) fail(`${where} eagerly fetches ${other.join(", ")}`);
      if (page.kind === "game") preloadedGame.set(page.file, gameChunks[0]);
      if (embed) embedChunk.set(page.id, gameChunks[0]);
      if (localStylesheets(html).length === 0) {
        fail(`${where} boots the app with no app stylesheet — the game renders unstyled`);
      }
      if (shell) {
        // The shell's own three, and each one is a way the page renders
        // perfectly and is still wrong.
        //
        // No `#root`: the emitted home sits there forever and nothing the
        // player taps does anything - the defect this whole arm was written
        // for, reported by a person after every gate here reported green.
        // No `#home-doc`: `/en/` goes back to a 29-byte body for every AI
        // crawler, which is `a-spa-shell-is-invisible-to-ai-crawlers.md`.
        // Wrong order: a node React does not know about, inside the container
        // it reconciles, is the nested-root teardown crash in a new costume.
        const hasRoot = /<div id="root"><\/div>/.test(html);
        const hasDoc = /id="home-doc"/.test(html);
        if (!hasRoot) fail(`${where} is an app shell with no empty #root to mount into`);
        if (!hasDoc) {
          fail(`${where} has no #home-doc — the shell serves a blank page to every AI crawler`);
        }
        // Only when BOTH are present. `indexOf` answers -1 for a missing
        // marker, so `a < b` on an absent node reports a confident ordering
        // verdict about a document that has no order — the exact false reading
        // the mutation control for this gate produced on its first run, and
        // the one already written up in
        // a-spa-shell-is-invisible-to-ai-crawlers.md. A second failure line
        // blaming the ordering sends the reader to the wrong repair.
        if (hasRoot && hasDoc && html.indexOf('id="home-doc"') > html.indexOf('id="root"')) {
          fail(`${where} emits #home-doc after #root — it must be the sibling BEFORE it`);
        }
        if (!/<body[^>]*class="app-shell"/.test(html)) {
          fail(`${where} is an app shell without class="app-shell" — the app cannot own the viewport`);
        }
        if (/id="game-frame"/.test(html)) {
          fail(`${where} carries #game-frame — a home page mounts the grid, not a game host`);
        }
      } else {
        if (!/<div id="game-frame"[^>]*>/.test(html)) {
          fail(`${where} boots the app but has no #game-frame to mount into`);
        }
        // React owns the CHILDREN of #game-frame. Anything emitted inside it is a
        // node React does not know about sitting in a tree it reconciles - the
        // nested-root teardown bug in a different costume.
        const inside = frameContents(html);
        if (inside) fail(`${where} emits markup inside #game-frame: ${inside.slice(0, 60)}`);
        if (!/id="game-poster"/.test(html)) {
          fail(`${where} has no poster — the frame is a black box until the game arrives`);
        }
        if (page.kind === "game" && !/id="wallet-slot"/.test(html)) {
          fail(`${where} has no #wallet-slot`);
        }
        if (embed) {
          // The frame's whole contract: one game, one way OUT of the frame,
          // nothing of the document around it. `target="_top"` is what stops
          // the link navigating the iframe itself and trapping the visitor on
          // the host page; the href must be this game's own page.
          const home = /<a\b[^>]*\bid="embed-home"[^>]*>/.exec(html)?.[0] ?? "";
          if (!home) fail(`${where} has no #embed-home link - the frame offers no way out`);
          else {
            if (!/\btarget="_top"/.test(home)) {
              fail(`${where} #embed-home lacks target="_top" - it would navigate the frame, not the tab`);
            }
            const to = /\bhref="([^"]+)"/.exec(home)?.[1] ?? "";
            const wantTo = `${base}${`games/${page.id}/`}`;
            if (to !== wantTo) fail(`${where} #embed-home points at ${to}, expected ${wantTo}`);
          }
          if (/<header\b/.test(html)) fail(`${where} is an embed frame and carries a <header>`);
          if (/<footer\b/.test(html)) fail(`${where} is an embed frame and carries a <footer>`);
          if (/<nav\b/.test(html)) fail(`${where} is an embed frame and carries a breadcrumb`);
          if (!/<body[^>]*class="app-shell"/.test(html)) {
            fail(`${where} is an embed frame without class="app-shell" - the app cannot own the viewport`);
          }
        }
      }
      if (!/<body[^>]+data-page="/.test(html)) {
        fail(`${where} carries no data-page — the runtime cannot tell what page it is on`);
      }
    } else {
      // A DOCUMENT: an article, not a screen. It must not download the app -
      // that is what this arm has always been for, and it caught the whole
      // class the first time a category page shipped.
      //
      // The measurement tag is the single exception, and it is a narrower rule
      // than "nothing eagerly" rather than a hole in it. Until category pages
      // existed the only non-booting page was the 404, so "no scripts at all"
      // and "no measurement on an error page" were the same sentence; they are
      // two different rules and this is where they come apart. An INDEXABLE
      // document is a page somebody arrives on deliberately, and a page whose
      // arrivals are invisible looks exactly like a page nobody visits - which
      // is the failure the analytics gate below exists to prevent. The 404
      // still carries none, and that is asserted there by name.
      //
      // `kind !== "notFound"` is the SAME predicate the coverage gate uses for
      // `wants`, deliberately and not by coincidence: one of them demands the
      // tag and the other permits it, so writing the population twice is how
      // they end up disagreeing and failing a build in both directions at
      // once. (The manifest carries no `indexable` field - the first version
      // of this line read one, got `undefined` on every page, and failed all
      // twenty category pages with a message about a script it was supposed
      // to be allowing.)
      const allowed = documentEagerFaults(eager, page.kind);
      if (allowed.length > 0) {
        fail(`${where} is a document and should fetch nothing eagerly: ${allowed.join(", ")}`);
      }
    }
    if (!shell && /id="root"/.test(html)) {
      fail(`${where} contains #root — the app shell would boot over the prose`);
    }

    // --- structured data --------------------------------------------------
    for (const block of jsonLdBlocks(html)) {
      let parsed;
      try {
        parsed = JSON.parse(block);
      } catch (e) {
        fail(`${where} has JSON-LD that does not parse: ${e.message}`);
        continue;
      }
      // The game node must say which picture represents this page, and every
      // URL it names must exist. Structured data claiming an image the site
      // does not serve is worse than none: it is a statement a crawler acts on.
      for (const node of parsed["@graph"] ?? []) {
        const types = [node?.["@type"]].flat();
        if (!types.includes("VideoGame")) continue;
        // Co-typed, and the pair is asserted rather than assumed. `VideoGame`
        // alone is not a Google Search feature - the Software App page asks for
        // exactly this pairing - so the half that produces nothing is the half
        // that is easy to keep and easy to lose.
        if (!types.includes("SoftwareApplication")) {
          fail(`${where} types its game as [${types}] - VideoGame alone is not a Search feature`);
        }
        const images = [node.image].flat().filter(Boolean);
        if (images.length === 0) {
          fail(`${where} game node carries no image - every image-bearing feature is closed by omission`);
          continue;
        }
        for (const url of images) {
          if (!String(url).startsWith("https://ellaz.fun/")) {
            fail(`${where} game image "${url}" is not an absolute ellaz.fun URL`);
            continue;
          }
          if (!existsSync(join(DIST, String(url).replace("https://ellaz.fun/", "")))) {
            fail(`${where} game image ${url} was never written`);
          }
        }
      }
    }

    // --- internal links ---------------------------------------------------
    for (const link of internalLinks(html)) {
      if (!link.startsWith(base)) {
        fail(`${where} links to ${link}, which does not start with the base ${base}`);
        continue;
      }
      const path = `/${link.slice(base.length)}`.split("#")[0];
      if (path === "/" || known.has(path)) continue;
      fail(`${where} links to ${link}, which is not a page this build emits`);
    }

    // --- collected for GATE 3, below -------------------------------------
    // The family is the path with its locale prefix removed, so
    // `/en/games/snake/` and `/games/snake/` are two versions of one page.
    // Derived from the manifest's own locale list rather than a regex over
    // two-letter directories, which would also strip a future `/id/` game.
    const prefix = L.page.find((l) => page.path.startsWith(`/${l}/`));
    const family = prefix ? page.path.slice(prefix.length + 1) : page.path;
    if (!families.has(family)) families.set(family, []);
    families.get(family).push({ locale: page.locale, where, text: bodyText(html) });
  }

  // --- `/` joins the language gates, because it is a document too ----------
  //
  // The home is `emitted: false` in the manifest - it is the app shell, head-
  // enhanced in place rather than written from the route table - so the loop
  // above never sees it. That is exactly the blind spot that let `/` serve a
  // 29-byte body to every AI crawler for months while every gate here read
  // `dist/` and reported green
  // (.claude/rules/a-spa-shell-is-invisible-to-ai-crawlers.md).
  //
  // It reproduced itself here on the first run: the reciprocity check reported
  // that `/en/` pointed at a canonical "no emitted page has", when in fact `/`
  // carries a complete and correct cluster and the GATE could not see it. A
  // blind spot that reports as a defect on the neighbouring page is the worst
  // shape available, so `/` is seeded in explicitly.
  // GATE 6 too, and `/` is the page it was WRITTEN for - the bilingual title
  // lived here and nowhere else. Seeding it in is not a nicety: without this
  // line the new gate would be green over the exact defect that prompted it,
  // which is this blind spot's third appearance in this file.
  seeTitle("index.html", indexHtml, L.canonical);

  const homeCanonical = "https://ellaz.fun/";
  const homeAlts = alternatesOf(indexHtml).filter((a) => a.hreflang !== "x-default");
  cluster.set(homeCanonical, new Set(homeAlts.map((a) => a.href)));
  if (!families.has("/")) families.set("/", []);
  families.get("/").push({ locale: L.canonical, where: "index.html", text: bodyText(indexHtml) });
  {
    const share = scriptShare(bodyText(indexHtml));
    const want = L.script[L.canonical];
    if (share.total === 0) {
      fail("index.html has no prose at all — the emitted home body is missing");
    } else if (share[want] <= 0.5) {
      fail(
        `index.html is the ${L.canonical} home but only ${(share[want] * 100).toFixed(0)}% ` +
          `${want} — the emitted home body is in the wrong language`,
      );
    }
  }

  // --- GATE 3: two locales of one page are two different bodies ------------
  //
  // Google, verbatim: "Localized versions of a page are only considered
  // duplicates if the main content of the page remains untranslated." This is
  // that sentence, mechanised. It is the check that catches the realistic
  // mistake - a content file copied to start a new language and then not
  // rewritten - which every other gate here waves through, because the copy is
  // a complete, valid, well-formed document.
  //
  // Sentences rather than words, and only sentences of 5+ words: a game's
  // name, a number and a nav label are identical across languages by design.
  // Measured on this build, a Hebrew page and its English twin share 0 of 40
  // long sentences, and a copied body shares all of them - so the two states
  // are 0% and 100% and the line between them is not a tuned number. 20% is
  // where it sits because a real translation cannot reach it and a partial
  // copy cannot hide under it.
  const MAX_SHARED_SENTENCES = 0.2;
  let mostShared = -1;
  let mostSharedWhere = "";
  for (const [family, versions] of families) {
    if (versions.length < 2) continue;
    for (let i = 0; i < versions.length; i += 1) {
      for (let j = i + 1; j < versions.length; j += 1) {
        const a = longSentences(versions[i].text);
        const b = longSentences(versions[j].text);
        if (a.length === 0 || b.length === 0) continue;
        const setB = new Set(b);
        const shared = a.filter((s) => setB.has(s)).length;
        const ratio = shared / Math.min(a.length, b.length);
        if (ratio > mostShared) {
          mostShared = ratio;
          mostSharedWhere = `${family} (${versions[i].locale} vs ${versions[j].locale})`;
        }
        if (ratio > MAX_SHARED_SENTENCES) {
          fail(
            `${versions[i].where} and ${versions[j].where} share ${shared} of ` +
              `${Math.min(a.length, b.length)} sentences (${(ratio * 100).toFixed(0)}%). ` +
              `A locale page whose body is not translated is a DUPLICATE, not a partial page.`,
          );
        }
      }
    }
  }

  // --- GATE 5, second half: the cluster is reciprocal ----------------------
  //
  // Self-reference and completeness are checked per page above. Reciprocity is
  // not a property any single page has: A can list B while B never lists A,
  // and Google discards a one-directional cluster entirely. Nothing asserted
  // this before today.
  for (const [self, alts] of cluster) {
    for (const other of alts) {
      if (other === self) continue;
      const back = cluster.get(other);
      if (!back) {
        fail(`${self} lists ${other} as an alternate, but no emitted page has that canonical`);
      } else if (!back.has(self)) {
        fail(`${self} lists ${other}, but ${other} does not link back - hreflang must be reciprocal`);
      }
    }
  }

  // --- GATE 2: no directory for a language that has no prose ---------------
  //
  // The failure this catches is the whole plan in one line: a language added to
  // the app leaking a document. It fails BY NAME, so the message says what to
  // delete rather than that a count moved.
  //
  // Both directions, and the second one is the positive control: a language
  // that HAS prose must have its directory, so a broken emitter writing no
  // locale directories at all cannot pass the first half by vacuum.
  const dirs = new Set(
    readdirSync(DIST, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name),
  );
  for (const loc of L.app) {
    const hasPages = L.page.includes(loc);
    if (!hasPages && dirs.has(loc)) {
      fail(
        `dist/${loc}/ exists, but "${loc}" is not in PAGE_LOCALES. A locale page whose body ` +
          `is not translated is a duplicate - write the prose, or delete dist/${loc}/.`,
      );
    }
    if (hasPages && loc !== L.canonical && !dirs.has(loc)) {
      fail(`"${loc}" is in PAGE_LOCALES but dist/${loc}/ was never written`);
    }
  }

  // A page preloading a SIBLING's chunk downloads code it can never run, and
  // it looks identical to the correct thing in every per-page check above. All
  // the locales of one game share a chunk; two different games never do.
  //
  // The multiplier is `L.page.length`, off the manifest, and it used to be a
  // literal 2. That was right while exactly two languages had pages and became
  // a false RED the moment Spanish landed - the shape this whole lane keeps
  // meeting, caught here in the friendly direction: a gate that fails loudly on
  // a correct build rather than passing quietly on a broken one.
  const byChunk = new Map();
  for (const [file, chunk] of preloadedGame) {
    const id = (/(^|\/)games\/([^/]+)\//.exec(file) ?? [])[2];
    const seen = byChunk.get(chunk);
    if (seen && seen !== id) fail(`games ${seen} and ${id} both preload ${chunk}`);
    byChunk.set(chunk, id);
  }
  if (preloadedGame.size > 0 && byChunk.size * L.page.length !== preloadedGame.size) {
    fail(
      `${byChunk.size} distinct game chunks across ${preloadedGame.size} game pages ` +
        `(expected ${byChunk.size * L.page.length} for ${L.page.length} page languages)`,
    );
  }

  // --- the embed pages: one per game, preloading THAT game -----------------
  //
  // The route table is the population and the game pages are the control: an
  // embed page preloading a chunk no game page of that id preloads is a frame
  // that plays a different game from the one it is named after, and the
  // per-page checks above cannot see a relation between two pages.
  const gameIds = new Set(manifest.pages.filter((p) => p.kind === "game").map((p) => p.id));
  const embeds = manifest.pages.filter((p) => p.kind === "embed");
  if (gameIds.size > 0 && embeds.length !== gameIds.size) {
    fail(`${embeds.length} embed pages for ${gameIds.size} games - one per game, no more, no fewer`);
  }
  for (const e of embeds) {
    if (!gameIds.has(e.id)) fail(`${e.path} embeds "${e.id}", which is not a game this build knows`);
    if (e.locale !== L.canonical) fail(`${e.path} is emitted in ${e.locale}, not the canonical ${L.canonical}`);
    if (!e.path.startsWith("/embed/")) fail(`${e.path} is an embed route outside /embed/`);
  }
  const chunkOfGame = new Map([...byChunk].map(([chunk, id]) => [id, chunk]));
  for (const [id, chunk] of embedChunk) {
    const want = chunkOfGame.get(id);
    if (want && chunk !== want) fail(`embed/${id}/ preloads ${chunk}, its game pages preload ${want}`);
  }

  // --- index.html: the app shell, head-enhanced in place --------------------
  const index = indexHtml;
  if (canonicalOf(index) !== `https://ellaz.fun/`) {
    fail(`index.html canonical is ${canonicalOf(index)}, expected https://ellaz.fun/`);
  }
  if (jsonLdBlocks(index).length === 0) {
    fail("index.html carries no JSON-LD — a crawler landing on / finds no game links at all");
  }
  for (const block of jsonLdBlocks(index)) {
    try {
      JSON.parse(block);
    } catch (e) {
      fail(`index.html JSON-LD does not parse: ${e.message}`);
    }
  }
  if (!/id="root"/.test(index)) fail("index.html lost #root — the app has nowhere to mount");

  // The workflow line `cp dist/index.html dist/404.html` would make these equal.
  if (readFileSync(join(DIST, "404.html"), "utf8") === index) {
    fail("404.html is a copy of index.html — something overwrote the real 404");
  }

  // --- the service worker ---------------------------------------------------
  const sw = readFileSync(join(DIST, "sw.js"), "utf8");
  if (/NavigationRoute/.test(sw)) {
    fail(
      "sw.js registers a NavigationRoute. Returning visitors get the app shell at every page URL " +
        "while crawlers and fresh browsers get the right page. Set navigateFallback: undefined.",
    );
  }
  if (!/ellaz-pages/.test(sw)) {
    fail("sw.js has no navigate runtimeCaching rule — offline navigation is gone entirely");
  }

  for (const page of emitted) {
    if (sw.includes(`url:"${page.file}"`)) {
      fail(`${page.file} is PRECACHED — add its directory to workbox.globIgnores`);
    }
  }

  // --- the pictures ---------------------------------------------------------
  //
  // Three artifacts state the same fact and each is checked against the others,
  // because two of them are files nobody opens. The page's own `<img>` is what
  // a crawler can choose; the JSON-LD says which picture represents the page;
  // the sitemap is how the image is DISCOVERED. Checking any one alone is
  // checking the wrong thing, and it reads green.
  // Every card is a distinct picture. Set-level, so it runs once rather than
  // per page - the failure it catches is a RELATION between cards, which no
  // per-page check can see.
  checkCardsAreDistinct();

  {
    const artDir = join(DIST, "art");
    const art = existsSync(artDir) ? readdirSync(artDir) : [];
    // The population, printed. A zero-file run satisfies every per-file
    // assertion below forever - the same shape as a zero-page manifest.
    if (art.length === 0) {
      fail("dist/art is empty or absent - the art emitter produced nothing, so every game page's picture is a 404");
    }
    for (const name of art) {
      const svg = readFileSync(join(artDir, name), "utf8");
      if (!svg.includes("<svg")) fail(`art/${name} is not an SVG document`);
      // An unresolved custom property is the failure that renders as a
      // plausible picture under an opaque black rectangle - `ogCard.ts` throws
      // on it, and this is the artifact-side half of that same assertion.
      if (svg.includes("var(")) fail(`art/${name} carries an unresolved var() - it paints black outside a browser`);
      if (svg.length < 200) fail(`art/${name} is ${svg.length} B - too small to be a scene`);
    }
    // Every art file is REACHED by a page. An orphan means a game lost its
    // picture while the file went on being written, which is invisible from
    // either side alone.
    for (const name of art) {
      if (!embeddedArt.has(`art/${name}`)) fail(`art/${name} is emitted but no page embeds it`);
    }

    // The alt must be LOCALISED. It was the page's H1 for an hour, and that
    // reads "2048" in three of the four languages - identical everywhere,
    // which is what this catches.
    for (const [id, byLocale] of altsByGame) {
      const distinct = new Set(byLocale.values());
      if (byLocale.size > 1 && distinct.size === 1) {
        fail(`${id}: the image alt is "${[...distinct][0]}" in all ${byLocale.size} languages - it is a name, not a description`);
      }
    }
  }

  // --- sitemap <-> filesystem ----------------------------------------------
  if (primary) {
    const sitemap = readFileSync(join(DIST, "sitemap.xml"), "utf8");
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    // The image extension. Declared namespace first: without it the rows are
    // ignored by every consumer while validating perfectly, which is a whole
    // feature that silently does nothing.
    if (!sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')) {
      fail("sitemap carries no image namespace - any <image:> row in it is ignored");
    }
    const imageLocs = [...sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => m[1]);
    if (imageLocs.length === 0) {
      fail("sitemap advertises no images - the one file whose job is telling Google which pictures exist names none");
    }
    for (const loc of new Set(imageLocs)) {
      if (!loc.startsWith("https://ellaz.fun/")) {
        fail(`sitemap image ${loc} is not an absolute ellaz.fun URL`);
        continue;
      }
      // `art/undefined.svg` is a row that validates, a file that does not
      // exist, and a 404 advertised to every crawler. It is what a route with
      // no id emits if the row is keyed on the kind alone.
      if (!existsSync(join(DIST, loc.replace("https://ellaz.fun/", "")))) {
        fail(`sitemap advertises image ${loc}, which was never written`);
      }
    }
    // One row per GAME page, and none anywhere else. A category page has no
    // picture of its own, so a row for it would be a claim we cannot keep.
    const gamePages = manifest.pages.filter((p) => p.kind === "game" && p.emitted);
    if (imageLocs.length !== gamePages.length) {
      fail(`sitemap carries ${imageLocs.length} image rows for ${gamePages.length} game pages`);
    }
    // The manifest's OWN flag - the same one the sitemap was built from - not
    // a `kind !==` list here that has to learn every non-indexable kind by
    // hand. A row without the flag is an older emitter, and that fails loudly
    // rather than reading as "nothing is indexable".
    const unflagged = manifest.pages.filter((p) => typeof p.indexable !== "boolean");
    if (unflagged.length > 0) {
      fail(`${unflagged.length} manifest rows carry no \`indexable\` flag - the emitter is broken, not the gate`);
    }
    const indexable = manifest.pages.filter((p) => p.indexable === true);
    if (indexable.length === 0) fail("the manifest marks NO page indexable - the sitemap would be empty");
    for (const p of indexable) {
      if (!locs.includes(p.canonical)) fail(`sitemap is missing ${p.canonical}`);
    }
    for (const loc of locs) {
      if (!indexable.some((p) => p.canonical === loc)) fail(`sitemap advertises ${loc}, which this build does not emit`);
    }
    // By PATH, not by canonical: an embed page's canonical IS its game page,
    // which is rightly in the sitemap. The frame's own address must not be.
    for (const p of manifest.pages.filter((x) => x.kind === "embed")) {
      const own = `https://ellaz.fun${p.path}`;
      if (locs.includes(own)) fail(`sitemap advertises the embed frame ${own} - only the game page belongs there`);
    }

    // --- the sitemap's cluster must equal the page's own ------------------
    //
    // Two code paths emit the same hreflang cluster: `renderDocument` writes
    // the page's <link rel="alternate"> tags from an explicit list, and
    // `siteFiles.ts` derives the sitemap's <xhtml:link> rows by LOOKING UP a
    // sibling route. When those disagree, the page is right and the sitemap is
    // wrong - and nobody opens the sitemap, so nothing notices.
    //
    // It has now happened twice. First the boards declared the ROOM as their
    // twin, for as long as the boards existed. Then category pages: the lookup
    // keyed on `kind` and `id`, a category route carries no `id`, so 16 of 20
    // pages named `kids` as their alternate in every language while their own
    // tags were perfect. Reciprocity passed both times, because it reads the
    // PAGE tags. This gate is the one that reads the other artifact.
    const smClusters = sitemapClusters(sitemap);
    for (const [loc, smAlts] of smClusters) {
      const own = cluster.get(loc);
      if (!own) continue; // already reported by the bijection check above
      const missing = [...own].filter((h) => !smAlts.has(h));
      const extra = [...smAlts].filter((h) => !own.has(h));
      if (missing.length || extra.length) {
        fail(
          `sitemap cluster for ${loc} disagrees with the page's own alternates` +
            (extra.length ? ` - sitemap names ${extra.join(", ")}` : "") +
            (missing.length ? ` - page names ${missing.join(", ")}` : ""),
        );
      }
    }

    if (!existsSync(join(DIST, "robots.txt"))) fail("no robots.txt");
    const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
    // --- lastmod is honest, or absent -------------------------------------
    // Absent is fine and is what this site shipped for months. What is NOT
    // fine is 48 identical dates: that is a shallow clone (or a build-time
    // stamp) claiming every page changed at once, which reads as plausible
    // and teaches Google to discount the field permanently.
    const mods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    if (mods.length > 0) {
      if (mods.length !== locs.length) {
        fail(`sitemap has ${mods.length} <lastmod> for ${locs.length} URLs - partial dates order nothing`);
      }
      if (new Set(mods).size === 1) {
        fail(
          `every sitemap <lastmod> is ${mods[0]} - a shallow clone or a build-time stamp. ` +
            "Set fetch-depth: 0 on actions/checkout, or omit the field.",
        );
      }
      for (const m of mods) {
        if (!Number.isFinite(Date.parse(m))) fail(`sitemap <lastmod> "${m}" is not a parseable date`);
      }
    }

    // --- the IndexNow ownership file --------------------------------------
    // Emitted on the primary host only. Without it every submission is
    // rejected, and the rejection is invisible from here.
    const keyFiles = readdirSync(DIST).filter((f) => /^[0-9a-f]{16,128}\.txt$/.test(f));
    if (keyFiles.length !== 1) {
      fail(`expected exactly one IndexNow key file in dist/, found ${keyFiles.length}`);
    } else {
      const key = keyFiles[0].replace(/\.txt$/, "");
      if (readFileSync(join(DIST, keyFiles[0]), "utf8").trim() !== key) {
        fail(`${keyFiles[0]} must contain exactly its own key, or IndexNow rejects every submission`);
      }
    }

    if (!robots.includes("Sitemap: https://ellaz.fun/sitemap.xml")) {
      fail("robots.txt does not point at the sitemap");
    }
  } else {
    if (existsSync(join(DIST, "sitemap.xml"))) {
      fail("the Pages duplicate emitted a sitemap — it would invite indexing of a noindex copy");
    }
    const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
    if (!/^Disallow: \/$/m.test(robots)) fail("the Pages duplicate's robots.txt must Disallow: /");
  }

  // --- report ---------------------------------------------------------------
  // Missing files are skipped rather than stat'd. They are already reported by
  // name in the loop above - and until 2026-08-11 this line threw ENOENT first,
  // so the gate died with a Node stack trace and that report was never printed.
  // A summary line must never be able to suppress the findings it summarises.
  const bytes = emitted.reduce(
    (n, p) => n + (existsSync(join(DIST, p.file)) ? statSync(join(DIST, p.file)).size : 0),
    0,
  );
  // --- GATE: measurement is on every document, or on none ------------------
  //
  // Emitter-level tests already assert this across both bases. They are blind
  // to what the FILE carries, which is the whole reason this script exists: a
  // call site and a served byte are different claims, and every outage recorded
  // in this repo lived in the gap between them.
  //
  // The two arms are opposite by design. On the primary host a document without
  // the tag is a page whose arrivals are invisible; on the mirror a document
  // WITH it pollutes the only measurement this project has. A single-arm check
  // would pass on a build that tagged everything everywhere.
  const reads = emitted.map((p) => ({ p, html: readFileSync(join(DIST, p.file), "utf8") }));
  const wants = reads.filter((r) => carriesTag(r.p.kind));
  const tagged = reads.filter((r) => r.html.includes(GA_ID));
  const shellTagged = indexHtml.includes(GA_ID);

  if (!primary) {
    // The mirror serves noindex and Disallow: / on every page. Its traffic is
    // not the product, and counting it would pollute the only measurement this
    // project has.
    for (const r of tagged) fail(`${r.p.path} carries the analytics tag on a noindex mirror`);
    if (shellTagged) fail("index.html carries the analytics tag on a noindex mirror");
  } else if (tagged.length === 0 && !shellTagged) {
    // ALL OR NONE, and this is the "none" arm: a build with the feature absent
    // is a valid build, so it must not be a failure. Written this way after the
    // first version failed 143 pages on a tree where the emitter's half of the
    // change was still uncommitted in a peer's working copy - a gate that reds
    // on a legitimately un-instrumented build is a gate somebody switches off.
    console.log("analytics: not installed in this build (0 documents, no shell tag)");
  } else {
    // Installed - so it must be EVERYWHERE, because partial coverage is the
    // failure this exists to catch: a page whose arrivals are invisible looks
    // exactly like a page nobody visits.
    for (const r of wants) {
      if (!r.html.includes(GA_ID)) fail(`${r.p.path} carries no analytics tag`);
    }
    const four04 = reads.find((r) => r.p.kind === "notFound");
    if (!four04) fail("no 404 in the manifest - the analytics exclusion cannot be checked");
    else if (four04.html.includes(GA_ID))
      fail("404.html carries the analytics tag; a document fetches nothing eagerly");
    // The other exemption, asserted the same way: every embed page, by name.
    // A frame inside a stranger's page that reports to our property is the
    // one request this whole lane promises never to make.
    const framed = reads.filter((r) => r.p.kind === "embed");
    if (framed.length === 0) fail("no embed page in the manifest - the analytics exclusion cannot be checked");
    for (const r of framed) {
      if (r.html.includes(GA_ID)) fail(`${r.p.path} is an embed frame and carries the analytics tag`);
    }
    // The inconsistent state, named explicitly. The shell and the emitted pages
    // are wired at two different call sites in two different files, so exactly
    // one of them landing is the realistic half-finished shape - and without
    // this line the "none" arm above would wave it through.
    if (shellTagged && tagged.length === 0)
      fail("index.html is tagged but no emitted page is - the emitter's half of the wiring is missing");
    if (!shellTagged && tagged.length > 0)
      fail("emitted pages are tagged but index.html is not - the app shell's half is missing");
  }
  console.log(
    `analytics: ${tagged.length} of ${wants.length} documents tagged` +
      `${shellTagged ? " + the app shell" : ""} (base ${base})`,
  );

  console.log(
    `\npages: ${emitted.length} emitted, ${(bytes / 1024).toFixed(0)} KiB total, base ${base}`,
  );
  console.log(`thinnest game page: ${thinnest} at ${words} words (floor ${MIN_WORDS})`);
  if (thinnestPrint) {
    console.log(
      `thinnest print page: ${thinnestPrint} at ${printWords} words outside its sheets ` +
        `(floor ${MIN_WORDS})`,
    );
  }
  console.log(
    `locales: ${L.page.length} with pages (${L.page.join(", ")}), ` +
      `${L.app.length - L.page.length} app-only, x-default ${L.xDefault}`,
  );
  if (mostShared >= 0) {
    console.log(
      `most-alike locale pair: ${mostSharedWhere} at ${(mostShared * 100).toFixed(0)}% ` +
        `shared sentences (ceiling ${MAX_SHARED_SENTENCES * 100}%)`,
    );
  }

  runControls();

  if (failures.length > 0) {
    console.error(`\nFAIL  ${failures.length} problem(s):`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log("OK  every emitted page is a real, correctly-addressed document.");
}

// ---------------------------------------------------------------------------
// Negative controls. Each plants the exact defect its checker exists to catch
// and requires the checker to fire, using the SAME extractor the real run uses.
// ---------------------------------------------------------------------------
function runControls() {
  const controls = [
    [
      "a script tag on a content page",
      () => eagerAssets('<script src="/assets/index-abc.js"></script>').length === 1,
    ],
    [
      "a modulepreload on a content page",
      () =>
        eagerAssets('<link rel="modulepreload" href="/assets/game-snake-abc.js">').length === 1,
    ],
    [
      "a base-carrying canonical",
      () => canonicalOf('<link rel="canonical" href="https://ellaz.fun/ellaz/games/snake/" />').includes("/ellaz/"),
    ],
    [
      "JSON-LD that does not parse",
      () => {
        const [block] = jsonLdBlocks('<script type="application/ld+json">{"a":}</script>');
        try {
          JSON.parse(block);
          return false;
        } catch {
          return true;
        }
      },
    ],
    [
      "an internal link nobody emits",
      () => internalLinks('<a href="/games/n2048/">x</a>')[0] === "/games/n2048/",
    ],
    [
      "an external link is NOT treated as internal",
      () => internalLinks('<a href="https://example.com/">x</a>').length === 0,
    ],
    [
      "markup left inside the game frame",
      () => frameContents('<div id="game-frame"><p>hi</p></div>') === "<p>hi</p>",
    ],
    [
      "an empty frame reads as empty",
      () => frameContents('<div id="game-frame"></div>') === "",
    ],
    [
      "a remote stylesheet is not counted as the app's",
      () =>
        localStylesheets('<link rel="stylesheet" href="https://fonts.googleapis.com/x">').length ===
        0,
    ],
    [
      "a page stripped of its prose",
      () => proseWords("<html><body><h1>Hi</h1></body></html>") < MIN_WORDS,
    ],
    [
      "a page with no og:image",
      () => ogImageOf('<html><head><title>x</title></head></html>') === "",
    ],
    [
      "an og:image that is not an absolute ellaz.fun URL",
      () =>
        !ogImageOf('<meta property="og:image" content="/og/x.png" />').startsWith(
          "https://ellaz.fun/og/",
        ),
    ],
    [
      "prose is counted, not markup",
      () => proseWords("<html><body><p>one two three four five</p></body></html>") === 5,
    ],

    // --- the language gates ------------------------------------------------
    [
      "an English body under a Hebrew route reads as Latin",
      () => {
        const s = scriptShare("The snake game is played with the arrow keys.");
        return s.latin > s.hebrew && s.latin > 0.9;
      },
    ],
    [
      "a Hebrew body reads as Hebrew",
      () => {
        const s = scriptShare("משחק הנחש נשלט בעזרת מקשי החיצים");
        return s.hebrew > s.latin;
      },
    ],
    [
      "a URL does not vote on the language",
      () => {
        // Six Hebrew letters against a 34-character Latin URL. Counted raw the
        // page is 85% Latin; this is the exact shape that would misclassify a
        // short Hebrew page, and it is why the URL strip runs first.
        const s = scriptShare("שלום https://ellaz.fun/games/snake/");
        return s.hebrew === 1 && s.latin === 0;
      },
    ],
    [
      "Cyrillic and Arabic are told apart from Latin",
      () => {
        const ru = scriptShare("Игра змейка управляется стрелками");
        const ar = scriptShare("لعبة الثعبان تلعب بأزرار الأسهم");
        return ru.cyrillic > 0.9 && ar.arabic > 0.9 && ru.arabic === 0 && ar.cyrillic === 0;
      },
    ],
    [
      "a copied body shares all of its sentences",
      () => {
        const body = "The snake grows by one square every time it eats. " +
          "Turning into your own tail ends the run immediately.";
        const a = longSentences(body);
        const b = new Set(longSentences(body));
        return a.length >= 2 && a.every((s) => b.has(s));
      },
    ],
    [
      "a real translation shares none",
      () => {
        const en = longSentences("The snake grows by one square every time it eats.");
        const he = longSentences("הנחש גדל בריבוע אחד בכל פעם שהוא אוכל משהו.");
        return en.length === 1 && he.length === 1 && en[0] !== he[0];
      },
    ],
    [
      "short fragments are not counted as sentences",
      () => longSentences("Snake. 2048. Play now.").length === 0,
    ],

    // --- the hreflang gates ------------------------------------------------
    [
      "an alternate link is read, hreflang and href both",
      () => {
        const [a] = alternatesOf(
          '<link rel="alternate" hreflang="en" href="https://ellaz.fun/en/games/snake/" />',
        );
        return a.hreflang === "en" && a.href === "https://ellaz.fun/en/games/snake/";
      },
    ],
    [
      "x-default is separated from the language alternates",
      () => {
        const all = alternatesOf(
          '<link rel="alternate" hreflang="he" href="https://ellaz.fun/" />' +
            '<link rel="alternate" hreflang="x-default" href="https://ellaz.fun/en/" />',
        );
        return all.length === 2 && all.filter((a) => a.hreflang === "x-default").length === 1;
      },
    ],
    [
      "a page with no alternates reads as none, not as an error",
      () => alternatesOf("<html><head><title>x</title></head></html>").length === 0,
    ],

    // --- GATE 6: the title and the description -----------------------------
    [
      "a title and a description are read out of the head",
      () => {
        const m = headMeta(
          '<html><head><title>Snake</title><meta name="description" content="A game." />' +
            "</head><body>x</body></html>",
        );
        return m.title === "Snake" && m.description === "A game.";
      },
    ],
    [
      "a missing title reads as absent, not as the empty-string success",
      () => headMeta("<html><head></head><body>x</body></html>").title === "",
    ],
    [
      // The reason headMeta is head-scoped. An inline `<svg><title>` is the
      // standard way to label an icon, and this site emits inline SVG on every
      // page. Unscoped, a page whose head lost its title would report the
      // icon's label as the document title - a confident wrong answer.
      "an <svg><title> in the body is not the document's title",
      () =>
        headMeta("<html><head></head><body><svg><title>icon</title></svg></body></html>").title ===
        "",
    ],
    [
      "entities in a title are decoded, so `&amp;` is not a false failure",
      // bubbles' English metaTitle really contains an ampersand, and it is
      // emitted as `&amp;`. Without the decode this gate red-lines one correct
      // page forever, which is how a gate gets switched off.
      () => headMeta("<head><title>Letters &amp; Numbers</title></head>").title === "Letters & Numbers",
    ],
    [
      // THE control for this whole gate. The bilingual title that really
      // shipped on `/` is 62.5% Latin, so the obvious design - the same
      // script-DOMINANCE test gate 4 uses ten lines away - reports GREEN on the
      // exact defect this was written to catch. Both halves are asserted: that
      // dominance would have passed, and that the asymmetric rule does not.
      "the bilingual title that shipped on / is rejected, where a dominance test would pass it",
      () => {
        const shipped = "Ellaz — Games / משחקים";
        const share = scriptShare(shipped);
        const dominanceWouldPass = share.latin > 0.5;
        return dominanceWouldPass && titleScriptFault(shipped, "latin") !== null;
      },
    ],
    [
      "a clean English title on a Latin page is accepted",
      () => titleScriptFault("Free Snake Game - Play Online, No Download | Ellaz", "latin") === null,
    ],
    [
      // The other side of the asymmetry, and the reason it exists. This title
      // is 55% Hebrew to 45% Latin - it clears a dominance test by ONE LETTER,
      // which is a tripwire under the copy: rename the brand to "Ellaz Games"
      // and a correct Hebrew page goes red. Excluding the Latin brand from the
      // comparison removes the margin rather than tuning it.
      "a Hebrew title carrying the Latin brand is accepted, and not by a hair",
      () => {
        const share = scriptShare("השיאים - Ellaz");
        return share.latin > 0.4 && titleScriptFault("השיאים - Ellaz", "hebrew") === null;
      },
    ],
    [
      "an English title on a Hebrew page is rejected",
      () => titleScriptFault("Leaderboards - Ellaz", "hebrew") !== null,
    ],
    [
      "a Cyrillic title on a Hebrew page is rejected even though the brand is Latin",
      () => titleScriptFault("Рекорды - Ellaz", "hebrew") !== null,
    ],
    [
      "a title of pure punctuation is rejected rather than passing as 'no foreign script'",
      () => titleScriptFault("— / |", "latin") !== null,
    ],
    // The document arm carries an EXCEPTION, so all three directions need
    // proving: the app is still refused on a document, the tag is still
    // refused on the 404, and the exception itself still lets the tag through
    // - a filter that quietly matched everything would pass the first two.
    [
      "a document that pulls the app is refused",
      () => documentEagerFaults(["assets/shell-abc.js", GA_SRC], "category").length === 1,
    ],
    [
      "the 404 is refused the measurement tag",
      () => documentEagerFaults([GA_SRC], "notFound").length === 1,
    ],
    [
      "and the exception is real: the tag alone passes on an indexable document",
      () => documentEagerFaults([GA_SRC], "category").length === 0,
    ],
    // The tag predicate is ONE function for both gates that read it, so its
    // three answers are proven here once: refused on the 404, refused on the
    // embed frame, demanded on an ordinary document.
    ["the embed frame is refused the measurement tag", () => carriesTag("embed") === false],
    ["the 404 is refused it too, through the same predicate", () => carriesTag("notFound") === false],
    ["and an ordinary document is DEMANDED it", () => carriesTag("category") === true],
    // GATE 5 reads the declared locale set. All four shapes, because a checker
    // that only ever sees the full set would pass a page declaring `[]` and
    // carrying a stray twin, and one that only sees `[]` would pass a short
    // cluster on a real page.
    [
      "a page declaring NO twins is refused a stray alternate",
      () =>
        hreflangFaults(
          [{ hreflang: "he", href: "https://ellaz.fun/he/embed/snake/" }],
          [],
          { locale: "en", canonical: "https://ellaz.fun/games/snake/" },
          "en",
        ).length === 1,
    ],
    [
      "a page declaring NO twins and carrying none is clean",
      () =>
        hreflangFaults([], [], { locale: "en", canonical: "https://ellaz.fun/games/snake/" }, "en")
          .length === 0,
    ],
    [
      "a page declaring twins is refused a cluster short of one",
      () =>
        hreflangFaults(
          [
            { hreflang: "en", href: "https://ellaz.fun/games/snake/" },
            { hreflang: "x-default", href: "https://ellaz.fun/games/snake/" },
          ],
          ["en", "he"],
          { locale: "en", canonical: "https://ellaz.fun/games/snake/" },
          "en",
        ).some((f) => f.includes("expected exactly [en,he]")),
    ],
    [
      "and a complete, self-referencing cluster with its x-default is clean",
      () =>
        hreflangFaults(
          [
            { hreflang: "en", href: "https://ellaz.fun/games/snake/" },
            { hreflang: "he", href: "https://ellaz.fun/he/games/snake/" },
            { hreflang: "x-default", href: "https://ellaz.fun/games/snake/" },
          ],
          ["en", "he"],
          { locale: "en", canonical: "https://ellaz.fun/games/snake/" },
          "en",
        ).length === 0,
    ],
    // The sitemap-vs-page comparison, both directions. A parser that returned
    // an empty map would pass every "they agree" assertion vacuously, so the
    // positive control is the one that earns its place here.
    [
      "a sitemap cluster naming another page's twin is caught",
      () => {
        const xml =
          '<url><loc>https://e.fun/games/think/</loc>' +
          '<xhtml:link rel="alternate" hreflang="he" href="https://e.fun/he/games/kids/"/>' +
          "</url>";
        const c = sitemapClusters(xml).get("https://e.fun/games/think/");
        return c.size === 1 && !c.has("https://e.fun/he/games/think/");
      },
    ],
    [
      "and a correct cluster parses as correct - the parser can see 'present'",
      () => {
        const xml =
          '<url><loc>https://e.fun/games/think/</loc>' +
          '<xhtml:link rel="alternate" hreflang="he" href="https://e.fun/he/games/think/"/>' +
          '<xhtml:link rel="alternate" hreflang="x-default" href="https://e.fun/games/think/"/>' +
          "</url>";
        const c = sitemapClusters(xml).get("https://e.fun/games/think/");
        return c.size === 1 && c.has("https://e.fun/he/games/think/");
      },
    ],

    // --- GATE 5 on a ONE-LOCALE page (the printable packs) -----------------
    //
    // BOTH DIRECTIONS, because only one of them is dangerous. A gate that
    // demanded PAGE_LOCALES of every page would red the correct Hebrew-only
    // page - loudly, and somebody would fix it. A gate that accepted anything
    // once the set is short would wave through a pack advertising an English
    // twin that was never written, which is a promise to Google that nothing
    // else here can see.
    [
      "a page declaring ONE locale is refused an alternate in another language",
      () =>
        hreflangFaults(
          [
            { hreflang: "he", href: "https://ellaz.fun/he/print/sudoku/" },
            { hreflang: "en", href: "https://ellaz.fun/print/sudoku/" },
          ],
          ["he"],
          { locale: "he", canonical: "https://ellaz.fun/he/print/sudoku/" },
          "en",
        ).some((f) => f.includes("expected exactly [he]")),
    ],
    [
      "and the correct one-locale cluster - itself, and no x-default - is clean",
      () =>
        hreflangFaults(
          [{ hreflang: "he", href: "https://ellaz.fun/he/print/sudoku/" }],
          ["he"],
          { locale: "he", canonical: "https://ellaz.fun/he/print/sudoku/" },
          "en",
        ).length === 0,
    ],
    [
      // x-default answers "we have no page in your language". A pack that is
      // only ever Hebrew is not that page, and claiming it would send every
      // non-Hebrew reader on earth to a Hebrew worksheet.
      "a one-locale page is refused an x-default it has no twin for",
      () =>
        hreflangFaults(
          [
            { hreflang: "he", href: "https://ellaz.fun/he/print/sudoku/" },
            { hreflang: "x-default", href: "https://ellaz.fun/he/print/sudoku/" },
          ],
          ["he"],
          { locale: "he", canonical: "https://ellaz.fun/he/print/sudoku/" },
          "en",
        ).some((f) => f.includes("x-default")),
    ],
    [
      "a one-locale page that forgot to list ITSELF has no anchor and is refused",
      () =>
        hreflangFaults(
          [],
          ["he"],
          { locale: "he", canonical: "https://ellaz.fun/he/print/sudoku/" },
          "en",
        ).some((f) => f.includes("does not list ITSELF")),
    ],

    // --- the printable pages' prose is measured OUTSIDE the boards ---------
    [
      "the boards are removed before the words are counted",
      () => {
        const html = `<body><p>one two three</p>${SHEETS_OPEN}<td>5</td><td>3</td>${SHEETS_CLOSE}</body>`;
        return proseWords(html) === 5 && proseWords(withoutSheets(html).text) === 3;
      },
    ],
    [
      "a print page whose prose is thin is refused, even with a wall of digits on it",
      () => {
        const digits = Array.from({ length: 400 }, (_, i) => `<td>${i % 9}</td>`).join("");
        const html = `<body><p>two words</p>${SHEETS_OPEN}${digits}${SHEETS_CLOSE}</body>`;
        // The raw count is enormous and would sail past any floor; the fenced
        // one is 2. This is the whole reason the fence exists.
        return proseWords(html) > 400 && printProseFaults(html, 550).length === 1;
      },
    ],
    [
      "a print page with real prose passes",
      () => {
        const prose = `<p>${"מילה ".repeat(600)}</p>`;
        const html = `<body>${prose}${SHEETS_OPEN}<td>1</td>${SHEETS_CLOSE}</body>`;
        return printProseFaults(html, 550).length === 0;
      },
    ],
    [
      "a print page carrying NO fence is refused rather than measured wrongly",
      () => {
        const html = `<body><p>${"מילה ".repeat(600)}</p></body>`;
        return printProseFaults(html, 550).some((f) => f.includes("no <!--sheets--> fence"));
      },
    ],
    [
      "an unclosed fence is refused rather than swallowing the rest of the page",
      () =>
        printProseFaults(`<body><p>x</p>${SHEETS_OPEN}<td>1</td></body>`, 550).some((f) =>
          f.includes("never closes"),
        ),
    ],

    // --- which kinds borrow a game's card ----------------------------------
    ["an embed frame borrows its game's card", () => sharesGameCard("embed") === true],
    ["a print pack borrows its game's card", () => sharesGameCard("print") === true],
    [
      "and an ordinary page does not - so the one-card-per-page rule still binds",
      () => sharesGameCard("game") === false && sharesGameCard("category") === false,
    ],
  ];

  controls.push(
    [
      "an <img> whose attributes span NEWLINES is still found",
      () => {
        // The emitter writes one attribute per line. A matcher built on `.`
        // reports ZERO images on a page that has one - which is the exact
        // reading the image gate exists to disprove, so a false green here
        // would be indistinguishable from the defect.
        const html = '<img\n  class="art"\n  src="/art/snake.svg"\n  alt="a snake"\n  width="1200"\n  height="900"\n/>';
        const [img] = embeddedImages(html);
        return img?.src === "/art/snake.svg" && img.alt === "a snake" && img.w === "1200";
      },
    ],
    [
      "a page with NO <img> reads as zero - the extractor can see 'absent'",
      () => embeddedImages('<p>art drawn as <svg viewBox="0 0 2 2"></svg> inline</p>').length === 0,
    ],
    [
      "an <img> with no alt reports an EMPTY alt rather than being skipped",
      () => {
        // Skipping it would make a missing alt look like a page with no image
        // at all, and the two get different messages for different fixes.
        const [img] = embeddedImages('<img src="/art/x.svg">');
        return img !== undefined && img.src === "/art/x.svg" && img.alt === "";
      },
    ],
  );

  let fired = 0;
  for (const [name, probe] of controls) {
    if (probe()) fired++;
    else fail(`negative control DEAD: "${name}" did not fire — every result above is void`);
  }
  console.log(`negative control: ${fired}/${controls.length} planted defects detected`);
}

main();
