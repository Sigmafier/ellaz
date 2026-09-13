// A PNG encoder on node's own zlib - no dependency for one emit. Paletted
// (colour type 3, with a tRNS chunk for transparency) when the image holds
// 256 colours or fewer, which every room here does; RGBA (colour type 6)
// otherwise. Filter type 0 on every row, deflate at level 9. The bytes are a
// function of the pixels and nothing else, which is what lets reproduce.sh
// diff an emit against the committed copy.

import { deflateSync } from "node:zlib";

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([len, typed, crc]);
}

/** the distinct RGBA colours of an image in first-appearance order, or null past 256 */
function palette(rgba) {
  const seen = new Map();
  const colours = [];
  for (let i = 0; i < rgba.length; i += 4) {
    const key = (rgba[i] << 24 | rgba[i + 1] << 16 | rgba[i + 2] << 8 | rgba[i + 3]) >>> 0;
    if (seen.has(key)) continue;
    if (colours.length === 256) return null;
    seen.set(key, colours.length);
    colours.push([rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]]);
  }
  return { seen, colours };
}

/**
 * Encode `rgba` (width * height * 4 bytes, row-major) as a PNG buffer.
 * A transparent pixel is any with alpha 0; its colour bytes are ignored in
 * the paletted path (they all map to one entry) and kept in the RGBA path.
 */
export function encodePng(width, height, rgba) {
  if (rgba.length !== width * height * 4) throw new Error(`encodePng: ${rgba.length} bytes for ${width}x${height} (expected ${width * height * 4})`);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  const pal = palette(rgba);
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
  if (pal) {
    ihdr[9] = 3; // paletted
    parts.push(chunk("IHDR", ihdr));
    const plte = Buffer.alloc(pal.colours.length * 3);
    const trns = Buffer.alloc(pal.colours.length);
    pal.colours.forEach(([r, g, b, a], i) => { plte[i * 3] = r; plte[i * 3 + 1] = g; plte[i * 3 + 2] = b; trns[i] = a; });
    parts.push(chunk("PLTE", plte));
    if (pal.colours.some((c) => c[3] !== 255)) parts.push(chunk("tRNS", trns));
    const raw = Buffer.alloc((width + 1) * height);
    for (let y = 0; y < height; y++) {
      raw[y * (width + 1)] = 0;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        raw[y * (width + 1) + 1 + x] = pal.seen.get((rgba[i] << 24 | rgba[i + 1] << 16 | rgba[i + 2] << 8 | rgba[i + 3]) >>> 0);
      }
    }
    parts.push(chunk("IDAT", deflateSync(raw, { level: 9 })));
  } else {
    ihdr[9] = 6; // RGBA
    parts.push(chunk("IHDR", ihdr));
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) {
      raw[y * (width * 4 + 1)] = 0;
      rgba.copy ? Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1)
        : raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
    }
    parts.push(chunk("IDAT", deflateSync(raw, { level: 9 })));
  }
  parts.push(chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}
