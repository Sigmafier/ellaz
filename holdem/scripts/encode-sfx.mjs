// Turn the Kenney CC0 casino pack into the shipped sample bank.
//
// RUN ONCE, BY HAND, AND COMMIT THE OUTPUT. This is not part of `npm run
// build` on purpose: it needs ffmpeg, it takes half a minute, and its output
// is 36 binary files that must be byte-stable across every build machine.
// A build step that re-encodes audio would put a different bank in the deploy
// depending on which ffmpeg the runner happened to have.
//
//   node scripts/encode-sfx.mjs /path/to/kenney/Audio
//
// What it does, and why each part:
//
//   MONO. These are one-shots played through a mono-summed graph with a
//   reverb send. Stereo is exactly twice the bytes for a width nothing here
//   uses.
//
//   48 kHz OPUS AT 48 kbps. Opus is the smallest at equal quality and every
//   target browser decodes it. 48 kbps rather than 32 because most of this
//   pack is NOISE - card slides, riffles, chip scatter - and noise is the
//   worst case for a low bitrate. The published guidance is to start at
//   48-64 and raise it if "noise tails become metallic", and nobody in this
//   loop can hear, so the conservative end is the honest choice. Measured:
//   32 kbps saves 42 KB across the bank, which is not worth a fourth round
//   of "the sounds are bad".
//
//   NO NORMALISATION IN THE FILE. The peak is MEASURED and written to the
//   manifest as a playback gain instead. Baking it in is irreversible and
//   un-retunable; a number in a manifest can be changed by anyone later
//   without re-encoding, and the file stays the recording Kenney made.
//
//   NO SILENCE TRIM ON THE ATTACK. A transient clipped by a threshold is
//   precisely the defect these recordings exist to fix. Trailing silence is
//   trimmed - Opus encodes it almost free, but it delays the buffer's end
//   and wastes decoded memory.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = process.argv[2];
if (!SRC) {
  console.error("usage: node scripts/encode-sfx.mjs <kenney-Audio-dir>");
  process.exit(2);
}

// v1 is in the PATH, not in a query string. `public/` files are copied
// verbatim and are NOT content-hashed, so a changed pack under the same name
// would be served from a stale cache forever. A new pack is a new directory.
const OUT = new URL("../client/public/sfx/v1/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

/** Every file this bank uses. Dice are excluded - hold'em has none. */
const FILES = [
  ...Array.from({ length: 6 }, (_, i) => `card-slide-${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `card-place-${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `card-shove-${i + 1}`),
  ...Array.from({ length: 2 }, (_, i) => `card-fan-${i + 1}`),
  "card-shuffle",
  ...Array.from({ length: 3 }, (_, i) => `chip-lay-${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `chips-collide-${i + 1}`),
  ...Array.from({ length: 6 }, (_, i) => `chips-handle-${i + 1}`),
  ...Array.from({ length: 6 }, (_, i) => `chips-stack-${i + 1}`),
];

const ff = (args) => execFileSync("ffmpeg", args, { encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] });

/**
 * Peak in dBFS, read from ffmpeg's own analysis of the ENCODED file.
 *
 * `volumedetect` writes to STDERR and exits 0, so `execFileSync` never hands
 * the numbers back on the success path - which is how a first version of this
 * ended up parsing a thrown error's stderr and would have reported nothing at
 * all on a file that encoded cleanly. Redirect in the shell instead.
 */
function peakDb(file) {
  const out = execFileSync(
    "sh",
    ["-c", `ffmpeg -v info -i ${JSON.stringify(file)} -af volumedetect -f null - 2>&1`],
    { encoding: "utf8" },
  );
  const m = /max_volume:\s*(-?[\d.]+) dB/.exec(out);
  if (!m) throw new Error(`no max_volume for ${file}`);
  return Number.parseFloat(m[1]);
}

const TARGET_DB = -6; // where every sample lands, so the strip is a fair test
const rows = [];

for (const name of FILES) {
  const src = join(SRC, `${name}.ogg`);
  const dst = join(OUT, `${name}.opus`);
  ff([
    "-v", "error", "-y", "-i", src,
    "-ac", "1", "-ar", "48000",
    "-af", "silenceremove=stop_periods=-1:stop_threshold=-55dB:stop_duration=0.03",
    "-c:a", "libopus", "-b:a", "48k", "-application", "audio",
    dst,
  ]);
  const db = peakDb(dst);
  const gain = Number((10 ** ((TARGET_DB - db) / 20)).toFixed(4));
  const bytes = readFileSync(dst).length;
  rows.push({ name, bytes, peakDb: db, gain });
}

rows.sort((a, b) => a.name.localeCompare(b.name));
const total = rows.reduce((a, r) => a + r.bytes, 0);

// A GENERATED TS MODULE, not a JSON file under public/.
//
// The gains have to be reachable from audio.ts, which plays a picked sample
// during a hand - so a fetched JSON would be a second request on the path to
// the first sound of a session, and a failed fetch would silently un-level
// the whole bank. Thirty-six numbers belong in the bundle.
const gen = [
  "// GENERATED by scripts/encode-sfx.mjs - do not edit by hand.",
  "//",
  "// Playback gain per sample, bringing every file to a common peak so a strip",
  "// is a fair comparison and not a loudness contest. Measured from the ENCODED",
  "// file, so it accounts for whatever the encoder did, and stored here rather",
  "// than baked into the audio: a number anyone can retune beats an",
  "// irreversible edit to a recording.",
  "//",
  `// ${rows.length} files, ${total} B, mono 48 kHz Opus @ 48 kbps, target ${TARGET_DB} dBFS.`,
  "",
  "export const SAMPLE_GAIN: Record<string, number> = {",
  ...rows.map((r) => `  "${r.name}": ${r.gain},`),
  "};",
  "",
].join("\n");
writeFileSync(new URL("../client/src/audio/sampleGain.gen.ts", import.meta.url).pathname, gen);

console.log(`${rows.length} files, ${total} B total (${(total / 1024).toFixed(1)} KB)`);
console.log("largest:");
for (const r of rows.slice(0, 5)) console.log(`  ${String(r.bytes).padStart(6)}  ${r.name}  peak ${r.peakDb} dB  gain ${r.gain}`);
console.log("quietest (biggest gain):");
for (const r of [...rows].sort((a, b) => b.gain - a.gain).slice(0, 5)) {
  console.log(`  gain ${String(r.gain).padStart(7)}  ${r.name}  peak ${r.peakDb} dB`);
}
console.log(`\ngains written to client/src/audio/sampleGain.gen.ts`);
console.log(`files written to ${OUT}`);
