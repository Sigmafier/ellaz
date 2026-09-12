#!/usr/bin/env node
/**
 * THE BRIDGE: studio art -> a shipping game, by COPY and never by import.
 * ===========================================================================
 *
 * `studio/` is a third independent workspace and `studio/scripts/assert-boundary.mjs`
 * is armed against both directions: nothing in `src/` may import from it, and
 * nothing in it may import from `src/`. That gate scans `src`, `holdem` and
 * `studio` - NOT this directory - which is exactly the shape a bridge should
 * have. A BUILD script may reach across; the code a child downloads may not.
 * So this writes plain files into the game and the game imports those.
 *
 * WHAT IT WRITES, per character, into src/games/<game>/sprites/:
 *   <char>.png            the sheet
 *   <char>.atlas.json     frame rects
 *   <char>.manifest.json  clips, pivot, hitbox, sockets, provenance
 *   <char>.moves.json     only when the character has a moves table
 *
 * WHY IT RE-ENCODES THE SHEET, AND WHY THAT IS FREE. The studio's exporter
 * produces its sheet through a canvas `toDataURL`, which always writes RGBA.
 * The art is a 16-colour palette - measured 2026-09-12: 17, 10, 10, and the
 * two swarm characters - so every sheet is an indexed PNG wearing four bytes
 * per pixel. Re-encoding to a real palette is LOSSLESS and enormous:
 *
 *   slime, 1850x875, 10 colours    canvas RGBA  54,011 B -> indexed  8,104 B
 *
 * That is not a quality decision and must never become one. Every run proves
 * it by ROUND TRIP - the file this script just wrote is decoded again and
 * every pixel compared to the source - and the script refuses to write
 * anything if a sheet needs more than a palette can hold.
 *
 * Node's `zlib` is built in, so the encoder below has no dependency at all.
 * That is deliberate: the only Pillow on this machine lives in a venv outside
 * the repo, and a generator whose --check needs a tool CI does not have can
 * only ever be verified on one laptop.
 * See .claude/rules/a-generator-of-committed-literals-lives-beside-them.md
 *
 *   node scripts/sprites/sync-sprites.mjs           # write the sheets
 *   node scripts/sprites/sync-sprites.mjs --check   # prove the tree matches
 *
 * Like `scripts/fonts/sync-fonts.mjs`, --check RE-DERIVES from the source
 * (it drives the studio's own exporter in a headless browser) and byte-compares
 * against what is committed. Also like it, this is run deliberately and is NOT
 * in `build:check`: it needs a browser, and a gate that cannot run in the
 * deploy is a gate that reds the deploy for its own reasons.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
/** From this file, never from a cwd - the script must run from anywhere. */
const REPO = join(HERE, "..", "..");
const STUDIO = join(REPO, "studio");

/**
 * The game being fed, and the cast it draws.
 *
 * These are the roles the standard names, and the sizes the operator approved
 * on 2026-09-12 after seeing them on screen: robot the hero at 48, the swarm at
 * 32, the golem boss at 64. `HEIGHT_BY_ROLE` in the studio is the GRID SLOT a
 * character is rigged into, not its drawn height - the slime really does ink
 * 23 of its 32 rows, which is art rather than a defect.
 */
const GAME = "survivors";
const STYLE = "snes16";

/**
 * Scale 1, not the export's default 2, and this is the whole size decision.
 *
 * Every authored pixel is drawn as a `unit * scale` block and `unit` is 5 for
 * the entire cast, so scale 2 stores each authored pixel as a 10x10 block -
 * four times the pixels of scale 1 for exactly the same picture. Scale 1 is
 * also what the look demo the operator acked drew, so this is what was
 * approved rather than a reduction from it.
 *
 * NOTE FOR LATER, not a task: even scale 1 stores each authored pixel as 5x5.
 * Shipping at authored resolution would be another ~25x fewer pixels, but it
 * needs the rig's `unit` to be a parameter and the budget already fits with
 * room to spare, so it is written down rather than built.
 */
const SCALE = 1;

const CAST = ["robot", "slime", "bat", "crab", "golem"];

/** The five clip ids the export emits for every character. */
const CLIPS = ["idle", "walk", "attack", "hurt", "ko"];

const OUT_DIR = join(REPO, "src", "games", GAME, "sprites");

// ---------------------------------------------------------------------------
// an indexed PNG, from built-ins only
// ---------------------------------------------------------------------------

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/**
 * Per-row adaptive filtering, bit depth 8 and one byte per pixel, so the
 * "previous pixel" for Sub is simply the byte before. Picking the row filter
 * with the smallest sum of absolute signed deviations is the heuristic the PNG
 * spec itself suggests, and it is what makes this beat a naive encoder by more
 * than 2x on flat pixel art - long runs of one index filter to long runs of
 * zero, which deflate eats.
 */
function filterRows(idx, w, h) {
  const out = Buffer.alloc(h * (w + 1));
  let prev = Buffer.alloc(w);
  for (let y = 0; y < h; y++) {
    const row = idx.subarray(y * w, (y + 1) * w);
    const none = Buffer.from(row);
    const sub = Buffer.alloc(w);
    const up = Buffer.alloc(w);
    for (let i = 0; i < w; i++) {
      sub[i] = (row[i] - (i ? row[i - 1] : 0)) & 0xff;
      up[i] = (row[i] - prev[i]) & 0xff;
    }
    let best = [0, none];
    let bestScore = Infinity;
    for (const cand of [[0, none], [1, sub], [2, up]]) {
      let s = 0;
      for (let i = 0; i < w; i++) {
        const v = cand[1][i];
        s += v < 128 ? v : 256 - v;
      }
      if (s < bestScore) {
        bestScore = s;
        best = cand;
      }
    }
    out[y * (w + 1)] = best[0];
    best[1].copy(out, y * (w + 1) + 1);
    prev = row;
  }
  return out;
}

function encodeIndexedPng(idx, w, h, palette) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // colour type 3 = palette
  const plte = Buffer.alloc(palette.length * 3);
  const trns = Buffer.alloc(palette.length);
  palette.forEach((c, i) => {
    plte[i * 3] = c[0];
    plte[i * 3 + 1] = c[1];
    plte[i * 3 + 2] = c[2];
    trns[i] = c[3];
  });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    chunk("tRNS", trns),
    chunk("IDAT", zlib.deflateSync(filterRows(idx, w, h), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// what two copies of a file must agree on
// ---------------------------------------------------------------------------

/**
 * `manifest.json` carries `built: {commit, dirty, at}` from the studio's export
 * index, and `at` is a timestamp that moves every time the export is re-run -
 * which `cd studio && npm run build:check` does as one of its own steps. Compared
 * raw, this gate would red whenever somebody had run the studio's gates since the
 * last sync: a red for the GATE'S reasons rather than for drift, which is exactly
 * how a check teaches its reader to skip it.
 *
 * So the stamp is normalised out of the COMPARISON while staying in the file,
 * where it is the provenance that says which studio commit this art came from.
 * (Learned from `studio/toybox/harness/copy-sprites.mjs`, whose header names the
 * same trap - two scripts, one job, and the other one had already paid for it.)
 *
 * NOTHING ELSE is normalised, and that is the half worth checking: the sheet, the
 * atlas and the moves are compared byte for byte, and every field of the manifest
 * except `built` is too, so a moved pivot, a renamed frame or a changed fps still
 * reds. An unparsable file is a real difference rather than something to smooth
 * away.
 */
function comparable(name, buf) {
  if (!name.endsWith(".manifest.json") || buf.length === 0) return buf;
  try {
    const m = JSON.parse(buf.toString("utf8"));
    delete m.built;
    return Buffer.from(JSON.stringify(m));
  } catch {
    return buf;
  }
}

// ---------------------------------------------------------------------------
// the studio side
// ---------------------------------------------------------------------------

/** Pull one character's sheet out of the studio, as palette indices. */
async function packOne(page, char, built) {
  return page.evaluate(
    async ([ch, style, scale, b]) => {
      const x = window.studio.exportCharacter(ch, style, scale, b);
      const img = new Image();
      await new Promise((ok, no) => {
        img.onload = ok;
        img.onerror = () => no(new Error(`${ch}: the exported sheet did not decode`));
        img.src = x.sheetPng;
      });
      const cv = document.createElement("canvas");
      cv.width = img.width;
      cv.height = img.height;
      const cx = cv.getContext("2d");
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, cv.width, cv.height).data;

      const map = new Map();
      const pal = [];
      const idx = new Uint8Array(d.length / 4);
      let hash = 2166136261 >>> 0;
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const key = ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
        let v = map.get(key);
        if (v === undefined) {
          v = pal.length;
          map.set(key, v);
          pal.push([d[i], d[i + 1], d[i + 2], d[i + 3]]);
        }
        idx[p] = v;
      }
      for (let i = 0; i < d.length; i++) {
        hash ^= d[i];
        hash = Math.imul(hash, 16777619) >>> 0;
      }
      let s = "";
      const CH = 0x8000;
      for (let i = 0; i < idx.length; i += CH) s += String.fromCharCode.apply(null, idx.subarray(i, i + CH));
      return {
        w: cv.width,
        h: cv.height,
        pal,
        b64: btoa(s),
        hash,
        atlas: x.atlas,
        manifest: x.manifest,
        moves: x.moves ?? null,
        frames: x.frames,
      };
    },
    [char, STYLE, SCALE, built],
  );
}

/** Decode what we wrote, in the browser, and compare every pixel to the source. */
async function roundTrip(page, png) {
  return page.evaluate(
    async ([dataUrl]) => {
      const img = new Image();
      await new Promise((ok, no) => {
        img.onload = ok;
        img.onerror = () => no(new Error("the written PNG did not decode"));
        img.src = dataUrl;
      });
      const cv = document.createElement("canvas");
      cv.width = img.width;
      cv.height = img.height;
      const cx = cv.getContext("2d");
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, cv.width, cv.height).data;
      let hash = 2166136261 >>> 0;
      for (let i = 0; i < d.length; i++) {
        hash ^= d[i];
        hash = Math.imul(hash, 16777619) >>> 0;
      }
      return { w: cv.width, h: cv.height, hash };
    },
    ["data:image/png;base64," + png.toString("base64")],
  );
}

// ---------------------------------------------------------------------------

async function main() {
  const check = process.argv.includes("--check");
  const { openRunner } = await import(join(STUDIO, "scripts", "lib", "browser.mjs"));

  const indexPath = join(STUDIO, "dist-export", "index.json");
  if (!existsSync(indexPath)) {
    throw new Error(
      `${indexPath} is missing - run the studio export once so this script has a build stamp to copy.`,
    );
  }
  const built = JSON.parse(readFileSync(indexPath, "utf8")).built;

  if (!check) mkdirSync(OUT_DIR, { recursive: true });

  const { browser, page, errors } = await openRunner();
  const rows = [];
  let differ = 0;
  let total = 0;

  try {
    for (const char of CAST) {
      const src = await packOne(page, char, built);

      // A palette holds 256. Over that, indexing would silently CHANGE the art,
      // and that is a decision for a person, not a saving for a script.
      if (src.pal.length > 256) {
        throw new Error(
          `${char}: ${src.pal.length} distinct colours, over a palette's 256. Indexing it would ` +
            `not be lossless. Ship this one as the exporter's own RGBA sheet, or re-rule the style.`,
        );
      }

      // Every clip must be present, or a game asks for a frame that is not there
      // at the exact moment it needs it.
      const missing = CLIPS.filter((c) => !src.manifest.animations[c]);
      if (missing.length) throw new Error(`${char}: manifest is missing clip(s) ${missing.join(", ")}`);

      const png = encodeIndexedPng(Buffer.from(src.b64, "base64"), src.w, src.h, src.pal);

      // LOSSLESSNESS IS PROVED ON EVERY RUN, not inherited from the day the
      // encoder was written. It is one decode and it is the whole promise.
      const back = await roundTrip(page, png);
      if (back.hash !== src.hash || back.w !== src.w || back.h !== src.h) {
        throw new Error(
          `${char}: the re-encoded sheet does not decode back to the same pixels. ` +
            `Refusing to write art that differs from what the studio produced.`,
        );
      }

      const files = [
        [`${char}.png`, png],
        [`${char}.atlas.json`, Buffer.from(JSON.stringify(src.atlas, null, 2) + "\n")],
        [`${char}.manifest.json`, Buffer.from(JSON.stringify(src.manifest, null, 2) + "\n")],
        ...(src.moves ? [[`${char}.moves.json`, Buffer.from(JSON.stringify(src.moves, null, 2) + "\n")]] : []),
      ];

      for (const [name, bytes] of files) {
        const path = join(OUT_DIR, name);
        total += bytes.length;
        if (check) {
          const have = existsSync(path) ? readFileSync(path) : Buffer.alloc(0);
          const same = comparable(name, have).equals(comparable(name, bytes));
          if (!same) differ++;
          rows.push(`  ${same ? "same" : "DIFF"}  ${name.padEnd(26)} ${String(bytes.length).padStart(8)} B`);
        } else {
          writeFileSync(path, bytes);
          rows.push(`  wrote ${name.padEnd(26)} ${String(bytes.length).padStart(8)} B`);
        }
      }

      rows.push(
        `        ${char} ${src.w}x${src.h}, ${src.pal.length} colours, ${src.frames} clips, round trip identical`,
      );
    }
  } finally {
    await browser.close();
  }

  console.log(
    `population: ${CAST.length} characters at ${STYLE} scale ${SCALE}, into src/games/${GAME}/sprites/\n`,
  );
  for (const r of rows) console.log(r);

  if (errors.length) {
    console.error(`\nFAIL  the studio runner reported ${errors.length} error(s):`);
    for (const e of errors.slice(0, 5)) console.error(`      ${e}`);
    process.exit(1);
  }

  console.log(`\n  ${total.toLocaleString()} B for the whole cast`);

  if (check) {
    if (differ) {
      console.error(
        `\nFAIL  ${differ} file(s) differ from what this generator produces.\n` +
          `      Either the studio art moved and these need regenerating, or something\n` +
          `      edited a committed sheet by hand. Run without --check to regenerate.`,
      );
      process.exit(1);
    }
    console.log("\nOK  every committed sprite file matches the generator.");
  } else {
    console.log("\nOK  written. Commit these, and prove them with --check.");
  }
}

main().catch((e) => {
  console.error(`FAIL  ${e.stack ?? e}`);
  process.exit(1);
});
