// Read dist-export/index.json and hand back every sprite set with its
// three files loaded. Refuses loudly when the export is missing or names a
// file that is not there - a gate over zero sprite sets is not a pass.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const STUDIO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DEFAULT_EXPORT = join(STUDIO, "dist-export");

/** { root, built, sets: [{ character, style, dir, sheet, atlasFile, manifestFile, atlas, manifest }] } */
export function readExport(root = process.env.EXPORT_DIR ?? DEFAULT_EXPORT) {
  const indexFile = join(root, "index.json");
  if (!existsSync(indexFile)) throw new Error(`no export at ${root} (missing index.json) - run \`npm run export\` first`);
  const index = JSON.parse(readFileSync(indexFile, "utf8"));
  if (!Array.isArray(index.sprites) || index.sprites.length === 0) throw new Error(`${indexFile} lists zero sprite sets - a gate over nothing is not a pass`);
  const sets = index.sprites.map((s) => {
    for (const f of [s.sheet, s.atlas, s.manifest]) if (!existsSync(join(root, f))) throw new Error(`${indexFile} names ${f}, which does not exist`);
    return {
      character: s.character,
      style: s.style,
      dir: dirname(join(root, s.sheet)),
      sheet: join(root, s.sheet),
      atlasFile: join(root, s.atlas),
      manifestFile: join(root, s.manifest),
      atlas: JSON.parse(readFileSync(join(root, s.atlas), "utf8")),
      manifest: JSON.parse(readFileSync(join(root, s.manifest), "utf8")),
    };
  });
  return { root, built: index.built, sets };
}

/** Width and height from a PNG's IHDR chunk - no decoder needed. */
export function pngSize(file) {
  const b = readFileSync(file);
  if (b.length < 24 || b.toString("ascii", 1, 4) !== "PNG") throw new Error(`${file} is not a PNG`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
