// The manifest and atlas types as an ADAPTER sees them: plain JSON read from
// dist-export/. Deliberately re-declared here rather than imported from
// export/pack.ts, because an adapter is copied into a game beside its
// engine and must not drag the studio's build code with it. The schema in
// export/manifest.schema.json is the contract both sides answer to.

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
