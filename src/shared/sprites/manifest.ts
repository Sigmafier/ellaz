// The manifest and atlas types as an ADAPTER sees them: plain JSON read from
// the sheets committed beside a game.
//
// A COPY of `studio/adapters/manifest.ts`, and copying is the point rather than
// a shortcut. `studio/` is a third independent workspace and
// `studio/scripts/assert-boundary.mjs` is armed against both directions, so
// `src/` may never import from it - the studio would otherwise land in the
// ellaz first visit, every renderer and every character, downloaded by a child
// before they had chosen a game. The studio's adapters were written to be
// copied for exactly this: they re-declare these types rather than importing
// the studio's own `export/pack.ts`, so an adapter travels beside its engine
// with nothing behind it.
//
// `studio/export/manifest.schema.json` is the contract both sides answer to,
// and `scripts/sprites/sync-sprites.mjs` is what writes the JSON these describe.
// Keep this file byte-equal to the studio's apart from this header: it is a
// copy, not a fork, and a divergence here is a game reading a shape the
// exporter does not write.

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export interface Manifest {
  character: string;
  style: string;
  scale: number;
  frameSize: { w: number; h: number };
  pivot: Point;
  animations: Record<string, { fps: number; loop: boolean; frames: string[] }>;
  sockets: Record<string, Record<string, Point>>;
  hitbox: Rect;
  atlas: string;
  built: { commit: string; dirty: boolean; at: string };
}

export interface Atlas {
  frames: Record<string, { frame: Rect; rotated: boolean; trimmed: boolean; spriteSourceSize: Rect; sourceSize: { w: number; h: number }; pivot: Point }>;
  meta: { image: string; size: { w: number; h: number }; scale: string };
}

/** Parse a frame name back into its parts; null when it is not one of ours. */
export function parseFrameName(name: string): { character: string; clip: string; index: number } | null {
  const m = /^([a-z0-9]+)_([a-z]+)_(\d{4})$/.exec(name);
  return m ? { character: m[1], clip: m[2], index: Number(m[3]) } : null;
}
