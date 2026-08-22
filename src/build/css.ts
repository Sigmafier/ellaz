/**
 * Strip CSS comments on the way to the document.
 *
 * `DOCUMENT_CSS` is a template literal emitted straight into the head of all
 * 164 pages. Vite never sees it, so nothing minifies it - unlike `global.css`,
 * which is a real stylesheet and whose comments cost a reader nothing. Measured
 * 2026-08-22: **30 comment blocks, 17,538 of 27,900 raw bytes (62.9%), and
 * 7,519 B gz per page.**
 *
 * The source keeps every word. The reasoning in `layout.ts` is why the next
 * person does not undo a measurement, and it is worth far more there than the
 * bytes are on the wire - which is the whole point of stripping at EMIT time
 * rather than writing terser comments.
 *
 * NOT a regex, and that is the entire design.
 * `/\/\*[\s\S]*?\*\//g` is correct for today's stylesheet and wrong the day
 * somebody writes `content:"/*"` or a `url()` carrying one - it would eat from
 * inside the string to the next `*​/` and take real declarations with it. The
 * failure is silent: the page still renders, just missing rules, which is the
 * shape this repo keeps paying for. A scanner that knows it is inside a string
 * cannot be wrong about it.
 *
 * Comments are removed rather than replaced with a space, which is what the CSS
 * tokenizer itself does: a comment is not a token separator, so `a/*x*​/b` is
 * `ab`. Replacing with a space would silently turn `.a/*x*​/.b` into a
 * descendant selector.
 */
export function stripCssComments(css: string): string {
  let out = "";
  let i = 0;
  let quote: string | null = null;

  while (i < css.length) {
    const c = css[i];

    if (quote) {
      // Inside a string. `\` escapes the next character, so an escaped quote
      // does not end it - and a `/*` in here is CONTENT, not a comment.
      if (c === "\\" && i + 1 < css.length) {
        out += c + css[i + 1];
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      out += c;
      i += 1;
      continue;
    }

    if (c === '"' || c === "'") {
      quote = c;
      out += c;
      i += 1;
      continue;
    }

    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      // An UNTERMINATED comment would otherwise swallow the rest of the
      // stylesheet in silence. Throw: it is a typo in our own source, and a
      // page missing half its rules renders perfectly and looks like a design
      // regression rather than a build one.
      if (end === -1) {
        throw new Error(
          `stripCssComments: unterminated comment at offset ${i}; the rest of the stylesheet would be swallowed`,
        );
      }
      i = end + 2;
      continue;
    }

    out += c;
    i += 1;
  }

  if (quote) {
    throw new Error(`stripCssComments: unterminated ${quote} string; the scanner cannot tell code from content`);
  }

  // The blank lines the comments left behind. Only lines that are now entirely
  // whitespace, and only the newline - no other whitespace is touched, so this
  // cannot join two tokens.
  return out.replace(/\n[ \t]*(?=\n)/g, "").replace(/\n{2,}/g, "\n").trim();
}
