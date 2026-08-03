/**
 * The escaping tagged template every emitted page is built from.
 *
 * `src/build/**` is BUILD-TIME ONLY. It runs in Node, inside a Vite plugin. It
 * has no DOM, no React, and no filesystem - it turns data into strings and
 * nothing else. Nothing in the app may import it (`no-app-imports.test.ts`
 * guards the direction).
 *
 * WHY A TAGGED TEMPLATE RATHER THAN PLAIN CONCATENATION
 * Every value interpolated into a page is prose written by a human, and prose
 * contains `&`, `<`, `"` and apostrophes. Escaping at the concatenation site
 * means remembering to escape at 400 concatenation sites. Escaping in the
 * template means the DEFAULT is safe and the exception has to be spelled out
 * with `raw()`, which greps.
 */

/** A string that has already been escaped, or is markup we authored ourselves. */
export interface RawHtml {
  readonly __raw: string;
}

/** Mark a string as pre-escaped markup. The only way past the escaper. */
export function raw(value: string): RawHtml {
  return { __raw: value };
}

function isRaw(value: unknown): value is RawHtml {
  return typeof value === "object" && value !== null && "__raw" in value;
}

/**
 * Escape for both element text and double-quoted attribute values.
 *
 * `'` is escaped too even though a double-quoted attribute does not need it:
 * the same helper is used inside JSON-LD-adjacent contexts and inside `<title>`,
 * and a rule with one behaviour is easier to keep true than one with three.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * `html\`<p>${text}</p>\`` - interpolations are escaped unless wrapped in
 * `raw()`. Arrays are joined with no separator, so a list of children composes
 * without a `.join("")` at every call site.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): RawHtml {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += render(values[i]) + strings[i + 1];
  }
  return raw(out);
}

function render(value: unknown): string {
  if (value === null || value === undefined || value === false) return "";
  if (isRaw(value)) return value.__raw;
  if (Array.isArray(value)) return value.map(render).join("");
  return escapeHtml(String(value));
}

/** Unwrap to the finished string. The only place `__raw` is read outside here. */
export function toHtml(value: RawHtml): string {
  return value.__raw;
}

/**
 * Serialise a JSON-LD graph for embedding in a `<script type="application/ld+json">`.
 *
 * `</script>` inside a JSON string value would close the block early and dump
 * the rest of the graph into the document as text. HTML escaping is NOT
 * available here - the content type is JSON, so `&lt;` would land in the data -
 * which is why this is its own function rather than a call to `escapeHtml`.
 * Escaping `<` as `\u003c` is valid JSON and inert to the HTML parser.
 */
export function jsonLd(graph: unknown): RawHtml {
  return raw(JSON.stringify(graph, null, 2).replace(/</g, "\\u003c").replace(/>/g, "\\u003e"));
}
