/**
 * The post bodies, read out of the drafts so the board can be the thing you act FROM.
 *
 * WHY THIS EXISTS. Every surface in `ledger.md` marked YOU is blocked on one act -
 * a person pasting text into a room this repository cannot reach. The board already
 * says WHICH; the distance left is opening GitHub on a phone, finding the right
 * markdown section, and select-dragging a Hebrew blockquote past its `> ` prefixes.
 * That distance is the whole reason a drafted post stays drafted, so the board
 * carries the text and a copy button.
 *
 * TWO CONVENTIONS, BOTH REAL, AND NEITHER IS WRONG. `hebrew.md` writes a post as a
 * `> ` blockquote; `reddit.md` writes **Title** and **Body** as fenced blocks. Both
 * are the ordinary markdown for "this is the exact text", they were written months
 * apart by the same discipline, and normalising one to the other would be a rewrite
 * of eight drafts to please a parser. So the parser reads both.
 *
 * A HEADING WITH NO BODY IS REPORTED, NEVER SKIPPED. `declared` counts `## Post`
 * headings and `posts` counts the ones a body was found for; the caller prints the
 * gap. Skipped silently, a draft whose format drifts renders as a file with no posts
 * in it - which is indistinguishable from a file that never had any, and reads as
 * "there is nothing to send". Same shape as every other blind matcher this repo has
 * paid for: `.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HEAD = /^## Post\b/;

/** The `> ` form: one contiguous run of quoted lines, prefixes stripped. */
function blockquote(lines) {
  const out = [];
  let started = false;
  for (const l of lines) {
    if (l.startsWith(">")) { started = true; out.push(l.replace(/^>\s?/, "")); continue; }
    // A blank line ENDS a blockquote, which is markdown's own rule and also ours:
    // an internal blank is written as a bare `>` and is caught above. A branch that
    // swallowed real blank lines was here and is deleted - it survived its mutation
    // because it was dead on the whole corpus (7 posts, byte-identical hash either
    // way, measured 2026-08-23), and it would have let two separate quotes in one
    // section merge into one post. A surviving mutation is not always a missing
    // test; sometimes it is code that should not exist.
    if (started) break;
  }
  return out.join("\n").trim();
}

/** The fenced form: ```blocks```, labelled by the **Bold**: line above each. */
function fenced(lines) {
  const found = {};
  let label = "";
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\*\*([A-Za-z ]+)\*\*:\s*$/);
    if (m) { label = m[1].toLowerCase().trim(); continue; }
    if (!lines[i].startsWith("```")) continue;
    const body = [];
    while (++i < lines.length && !lines[i].startsWith("```")) body.push(lines[i]);
    if (label && !found[label]) found[label] = body.join("\n").trim();
    label = "";
  }
  return found;
}

/** Every post in one draft, plus how many were DECLARED but not readable. */
export function parsePosts(md, file) {
  const lines = md.split("\n");
  const starts = lines.map((l, i) => (HEAD.test(l) ? i : -1)).filter((i) => i >= 0);
  const posts = [];
  for (let s = 0; s < starts.length; s++) {
    const body = lines.slice(starts[s] + 1, starts[s + 1] ?? lines.length);
    const heading = lines[starts[s]].replace(/^##\s*/, "").trim();
    const label = (name) => (body.find((l) => new RegExp(`^\\*\\*${name}\\*\\*:`).test(l)) ?? "")
      .replace(new RegExp(`^\\*\\*${name}\\*\\*:\\s*`), "").replace(/\*\*Tone\*\*.*$/, "").replace(/[*`]/g, "").trim();
    const where = label("Where");
    // `Go` is a full URL or an honest sentence saying there is no checked room. It
    // is never a group NAME: the board is read on a phone, and a name is something
    // to search for while a URL is something to open. `Do` is one imperative line.
    const go = label("Go"), doing = label("Do");
    const quoted = blockquote(body);
    const f = quoted ? {} : fenced(body);
    const text = quoted || f.body || "";
    if (text) posts.push({ file, heading, where, go, do: doing, title: quoted ? "" : (f.title ?? ""), body: text });
  }
  return { file, declared: starts.length, posts };
}

/** Every draft that carries at least one post, in the order the caller gives. */
export function loadPosts(repo, files) {
  const dir = join(repo, "docs/outreach");
  const out = [];
  for (const f of files) {
    const p = join(dir, f);
    if (!existsSync(p)) continue;
    const r = parsePosts(readFileSync(p, "utf8"), f);
    if (r.declared) out.push(r);
  }
  return out;
}

export { readdirSync };
