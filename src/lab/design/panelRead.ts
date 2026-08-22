
/**
 * Reading the game panel out of a live document.
 *
 * This was a bench SCREEN until 2026-08-22 - one of the two tabs of sliders
 * that `Screen.tsx` replaced when the operator picked the tap inspector. The
 * screen is gone; what it knew is not, because the knowing was never the
 * sliders. It is `readPanel`, which reports the two things that have broken
 * this component before: a row that WRAPPED onto two lines, and a card whose
 * text is ELLIPSISED inside it while no element is wider than its frame and
 * every overflow check reads clean.
 *
 * A drawing of this row can be made to look like anything, so the measurement
 * is the deliverable and the picture is the argument.
 */

type Cell = { what: string; w: number; h: number; top: number; clipped: string[] };
type Read = { cells: Cell[]; lines: number; err?: string };

/** Everything worth knowing about the row, read off one live document. */
export function readPanel(doc: Document): Read {
  const row = doc.querySelector(".gc-row");
  if (!row) return { cells: [], lines: 0, err: "no panel on this page yet" };
  const cells = [...row.querySelectorAll<HTMLElement>(".gc-cell")].map((el) => {
    const r = el.getBoundingClientRect();
    // scrollWidth vs clientWidth, per TEXT node rather than per card. A card
    // squeezed under its floor does not overflow and does not wrap - it
    // ellipsises INSIDE itself, so the card measures perfectly while the
    // player is looking at "Be..." where a record should be.
    const clipped = [...el.querySelectorAll<HTMLElement>(".gc-value,.gc-label,.gc-record")]
      .filter((t) => t.scrollWidth > t.clientWidth + 1)
      .map((t) => t.textContent?.trim() ?? "?");
    return {
      what: el.classList.contains("gc-level")
        ? "difficulty"
        : (el.querySelector(".gc-label")?.textContent ?? "card"),
      w: Math.round(r.width),
      h: Math.round(r.height),
      top: Math.round(r.top),
      clipped,
    };
  });
  return { cells, lines: new Set(cells.map((c) => c.top)).size };
}

/** A style may set its own token values. Read them so a knob can show them. */
export function tokensOf(css: string): Record<string, number> {
  const out: Record<string, number> = {};
  const root = /:root\{([^}]*)\}/.exec(css);
  if (!root) return out;
  for (const decl of root[1].split(";")) {
    const [k, v] = decl.split(":").map((s) => s.trim());
    if (k?.startsWith("--gc-") && v) out[k] = parseFloat(v);
  }
  return out;
}

/** The id of the <style> the bench injects into a previewed page. */
export const STYLE_TAG = "ellaz-panel-bench";

