/**
 * The head tags that make a page an application, lifted verbatim off the
 * application's own `index.html`.
 *
 * WHY VERBATIM AND WHY FROM THE BUNDLE
 * The script and stylesheet names carry a content hash that changes on every
 * build. Anything that reconstructs them - a glob over `dist/assets`, a guess at
 * the entry name - is a second implementation of Rollup's naming, and it is
 * wrong the first time a chunk splits. Copying the tags Vite already wrote means
 * the content pages and the app can never load different code.
 *
 * If this finds no script, the emitter throws. A content page with prose and no
 * runtime is a game page you cannot play, which looks perfect in every check
 * that reads the HTML and fails for every human who taps the button.
 */

export interface HeadAssets {
  /** `<script type="module" src>` plus modulepreloads, stylesheets, the manifest. */
  tags: string[];
  /** Just the executable ones, for the gate's parity assertion. */
  scripts: string[];
}

const PATTERNS: RegExp[] = [
  /<script[^>]+type="module"[^>]*><\/script>/g,
  /<link[^>]+rel="modulepreload"[^>]*>/g,
  /<link[^>]+rel="stylesheet"[^>]*>/g,
  /<link[^>]+rel="manifest"[^>]*>/g,
];

export function extractHeadAssets(indexHtml: string): HeadAssets {
  const head = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(indexHtml)?.[1] ?? indexHtml;
  const tags: string[] = [];
  for (const re of PATTERNS) {
    for (const m of head.matchAll(re)) tags.push(m[0]);
  }
  const scripts = tags.filter((t) => t.startsWith("<script"));
  if (scripts.length === 0) {
    throw new Error(
      "page emitter: index.html carries no module script, so every emitted page would " +
        "render prose with no runtime and no way to play. Refusing to emit.",
    );
  }
  return { tags, scripts };
}

/**
 * Dev has no bundle: Vite serves the unbundled entry and injects its own client.
 * The one tag below is what `index.html` says in source, so the dev middleware
 * boots the same app through the same module.
 */
export const DEV_HEAD_ASSETS: HeadAssets = {
  tags: ['<script type="module" src="/src/main.tsx"></script>'],
  scripts: ['<script type="module" src="/src/main.tsx"></script>'],
};
