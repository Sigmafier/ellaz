/**
 * Generates `src/games/lettercross/words.ts` - the Lettercross validation dictionary.
 *
 * PROVENANCE (game-content-template.md: every number names the script that
 * derives it). Source: ENABLE1, Alan Beale and M. Leo Cooper, formally released
 * into the PUBLIC DOMAIN - "Anyone is free to use it or distribute it in any
 * manner they see fit." ENABLE exists precisely because the Scrabble tournament
 * lists (TWL / NWL / OWL / OSPD / SOWPODS / Collins) are commercial products
 * owned by Hasbro, Mattel, Merriam-Webster and NASPA and may NOT be
 * redistributed. None of those is used here, directly or indirectly.
 *
 * WHY THE FILTERS EXIST, measured 2026-08-24 against the raw list:
 * ENABLE contains 49 of 49 slurs and obscenities probed, including every
 * racial slur tested. This platform's audience starts at four. The list is
 * therefore filtered, and the filtering is a SCRIPT rather than a hand-edit so
 * it can be re-run, argued with, and audited.
 *
 * THE THREAT MODEL, stated because it decides the whole design:
 * this dictionary VALIDATES what a player built from their own tiles. It is
 * never used to SHOW a player a word. A child who spells something unpleasant
 * from their own rack already knew it; the game merely declines to score it.
 * The moment anything DISPLAYS a dictionary word - a hint button, an AI
 * opponent's move - that surface must draw from an affirmative allowlist
 * instead, never from this file. See `.claude/rules/name-pool-convention.md`
 * for the same reasoning applied to player names.
 *
 * Usage:  node scripts/build-lettercross-words.mjs [path-to-enable1.txt]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

/**
 * The two-letter words, AUTHORED rather than filtered.
 *
 * Two-letter words are structural in a crossword game - without them almost no
 * perpendicular play is legal and the board locks up after a few turns. But
 * ENABLE's 96 two-letter entries are mostly tournament cheese (aa, ae, ai, al,
 * ar, ba, bi, bo, oe, oi, ut, xi, za), and a child who tries "at" and is told
 * "no" while "za" scores is being taught that the game is arbitrary.
 *
 * So this set is affirmative: every entry is a word an English-speaking child
 * would recognise, and nothing arrives here by surviving a filter.
 */
const TWO_LETTER = [
  "am","an","as","at","be","by","do","go","he","hi","if","in","is","it","me","my",
  "no","of","on","or","so","to","up","us","we","ox","ah","oh","us","id","ad",
];

const MIN_LEN = 3;
const MAX_LEN = 6;

/**
 * Exact-match blocklist. EXACT match only, never substring - "grape" contains
 * "rape", "cocktail" contains "cock", and a substring rule turns a safety
 * filter into a comedy generator (the Scunthorpe problem). The few strings
 * that are never innocent as substrings live in SUBSTRINGS below.
 */
const BLOCK_EXACT = new Set([
  "anal","anus","arse","arsed","arses","ass","assed","asses","balls","bang","banged",
  "bastard","bitch","bitched","bitches","bollix","boner","boners","boob","boobs","booty",
  "bugger","bum","bums","butt","butts","clit","clits","cock","cocks","coon","coons","crap",
  "craps","crappy","cum","cums","cunt","cunts","dago","dagos","damn","damns","dick","dicks",
  "dildo","dildos","dong","dongs","dump","dyke","dykes","fag","fagot","fags","fanny","fart",
  "farts","felch","fuck","fucks","gay","gays","gook","gooks","gyp","gyps","hell","hells",
  "hoe","hoes","homo","homos","honky","hooker","hookers","horny","hump","humps","jism","jiz",
  "jugs","kike","kikes","kinky","knob","knobs","lust","lusts","mick","micks","milf","minge",
  "nazi","nazis","negro","nigga","nigger","nude","nudes","nuts","paki","pakis","pecker",
  "pee","pees","penes","penis","perv","pervs","pimp","pimps","piss","pissy","poo","poop",
  "poops","porn","porno","porns","prick","pricks","pube","pubes","pubic","puke","pukes",
  "punk","pussy","queer","queers","quim","rape","raped","raper","rapers","rapes","rapist",
  "rectal","rectum","sex","sexed","sexes","sexy","shag","shags","shit","shits","shitty",
  "skank","slag","slags","slut","sluts","smut","smuts","sodom","sperm","spic","spics",
  "sputum","stiff","suck","sucks","tit","tits","titty","tramp","tramps","trans","turd",
  "turds","twat","twats","urine","vagina","vulva","wank","wanks","whore","whores","willy",
  "wog","wogs","womb","wombs","wop","wops","yid","yids",
  // Added 2026-08-24 after a probe of the FIRST generated output found these
  // still present. That probe is the point: a denylist is never provably
  // complete, which is why nothing may DISPLAY a word from this file.
  "abo","abos","gimp","gimps","gimpy","retard","spaz","spazz","loony","loonie",
  "cretin","moron","morons","idiot","idiots","imbecile","spastic","mongol","lame",
  "midget","tranny","hooch","junkie","junkies","hobo","hobos","bum","bums",
  // death, weapons and self-harm - not obscene, but not for a four-year-old
  "corpse","dead","death","die","died","dies","gun","guns","kill","killed","kills","knife",
  "murder","noose","nooses","shoot","shot","shots","slay","slays","stab","stabs","suicide",
  "war","wars","weapon","blood","bloody","dying","hang","hanged","hangs","gore","gores",
  // drugs, alcohol, gambling
  "beer","beers","booze","bong","bongs","crack","dope","dopes","drug","drugs","drunk",
  "gin","gins","heroin","joint","joints","meth","opium","rum","rums","vodka","weed","weeds",
  "whisky","wine","wines","casino","bet","bets","gamble","odds","poker","stoned",
]);

/** Never innocent, at any position. Kept deliberately tiny. */
const SUBSTRINGS = ["fuck", "cunt", "nigg", "shit", "bitch", "whore", "rapist", "faggot"];

const src = process.argv[2] ?? "/tmp/enable1.txt";
if (!existsSync(src)) {
  console.error(`ABORT: ${src} not found.

Fetch ENABLE1 first, e.g.
  curl -sSL -o /tmp/enable1.txt https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt

then re-run. A generator that silently emits an EMPTY dictionary is worse than
one that refuses: an empty word list makes every play illegal and the game
merely looks broken rather than unbuilt.`);
  process.exit(1);
}

const raw = readFileSync(src, "utf8").split("\n").map((w) => w.trim().toLowerCase()).filter(Boolean);
if (raw.length < 100_000) {
  console.error(`ABORT: ${src} holds ${raw.length} words; ENABLE1 has ~172,800. Wrong file?`);
  process.exit(1);
}

// POSITIVE CONTROL. If a word we know is present reads absent, the reader is
// broken and every count below is fiction. A filter that cannot fire reports a
// clean corpus - `.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`.
const control = raw.includes("cat") && raw.includes("zebra");
if (!control) {
  console.error("ABORT: positive control failed - 'cat'/'zebra' missing from the source.");
  process.exit(1);
}

const onlyLetters = /^[a-z]+$/;
let nLen = 0, nShape = 0, nExact = 0, nSub = 0;
const kept = [];
for (const w of raw) {
  if (w.length < MIN_LEN || w.length > MAX_LEN) { nLen++; continue; }
  if (!onlyLetters.test(w)) { nShape++; continue; }
  if (BLOCK_EXACT.has(w)) { nExact++; continue; }
  if (SUBSTRINGS.some((s) => w.includes(s))) { nSub++; continue; }
  kept.push(w);
}
for (const w of TWO_LETTER) if (!kept.includes(w)) kept.push(w);
kept.sort();

// NEGATIVE CONTROL. The filter must be PROVEN to have fired, not assumed to
// have. Each of these was measured present in raw ENABLE on 2026-08-24.
const mustBeGone = ["fuck", "shit", "cunt", "nigger", "kike", "spic", "whore", "rape", "slut", "damn",
  // these four SURVIVED the first generated output on 2026-08-24 - the control
  // exists because the blocklist was wrong, not to confirm that it was right
  "abo", "gimp", "retard", "spaz"];
const leaked = mustBeGone.filter((w) => kept.includes(w));
if (leaked.length) {
  console.error(`ABORT: the filter did not fire. Still present: ${leaked.join(", ")}`);
  process.exit(1);
}
// ...and the filter must not have eaten the game. Innocents that must survive.
const mustRemain = ["cat", "zebra", "grape", "cocoa", "class", "happy", "shell", "assess", "scrap",
  // the authored two-letter set must actually reach the output
  "at", "in", "on", "it", "up", "we"];
const eaten = mustRemain.filter((w) => !kept.includes(w));
if (eaten.length) {
  console.error(`ABORT: the filter is too broad - it ate: ${eaten.join(", ")}`);
  process.exit(1);
}

const header = `// GENERATED by scripts/build-lettercross-words.mjs - do not hand-edit.
//
// Source: ENABLE1 (Alan Beale, M. Leo Cooper), released into the PUBLIC DOMAIN.
// NOT derived from TWL / NWL / OWL / OSPD / SOWPODS / Collins, all of which are
// owned commercial lists that may not be redistributed. See NOTICE.md.
//
// ${kept.length} words: an authored 2-letter set plus ENABLE at ${MIN_LEN}-${MAX_LEN} letters, generated ${new Date().toISOString().slice(0, 10)}.
// Filters applied: length ${nLen} dropped, non-alpha ${nShape}, blocklist ${nExact}, substring ${nSub}.
//
// This list VALIDATES what a player built from their own tiles. Nothing may use
// it to DISPLAY a word to a player - a hint or an AI move needs an affirmative
// allowlist, not this file.
`;
const body = `\nexport const WORDS: ReadonlySet<string> = new Set(\n  ${JSON.stringify(kept.join(" ")).replace(/(.{100}[^ ]*) /g, "$1 \" +\n  \"")}.split(" "),\n);\n`;
writeFileSync("src/games/lettercross/words.ts", header + body.replace('.split(" ")', '').replace("new Set(\n  ", "new Set(\n  (").replace(/,\n\);\n$/, ')\n    .split(" "),\n);\n'), "utf8");

console.log(`population : ${raw.length} words in ${src}`);
console.log(`positive control (cat, zebra) : PRESENT`);
console.log(`dropped    : ${nLen} by length, ${nShape} non-alpha, ${nExact} blocklist, ${nSub} substring`);
console.log(`negative control : ${mustBeGone.length}/${mustBeGone.length} blocked words absent from output`);
console.log(`innocents kept   : ${mustRemain.length}/${mustRemain.length} (grape, cocoa, class, assess ...)`);
console.log(`KEPT       : ${kept.length} words -> src/games/lettercross/words.ts`);
