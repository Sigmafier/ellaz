import { useCallback, useEffect, useRef, useState } from "react";
import { VARIANTS } from "./spec";

/**
 * Live versus a named variant, side by side, at phone width.
 *
 * Both arms are the SAME local build of the SAME page, same origin, differing
 * only in the tokens the bench writes - so what is measured below is the
 * difference the variant makes and nothing else. Two different builds, or a
 * screenshot against a live site, would each fold in every unrelated change
 * that landed in between, which is how a comparison starts agreeing with
 * whatever you already believed.
 *
 * The diff is READ from the two documents with `getBoundingClientRect`. It is
 * never typed, because a typed diff is a claim about a pair rather than the
 * pair - the exact thing the operator asked to stop reading.
 */

const GAMES = ["snake", "sudoku", "blocks", "memory", "2048", "coloring"];
const WIDTHS = [390, 430, 768];

type Row = { what: string; a: string; b: string; same: boolean };

/** Everything worth comparing, read off one document. */
function probe(doc: Document): Record<string, string> {
  const px = (el: Element | null) =>
    el ? `${Math.round(el.getBoundingClientRect().height)}px` : "absent";
  const wide = (el: Element | null) =>
    el ? `${Math.round(el.getBoundingClientRect().width)}px` : "absent";
  const bc = doc.querySelector(".urow .bc");
  const panel = doc.querySelector(".ellaz-game-panel");
  const cells = panel?.querySelectorAll(":scope > div:first-child > div > *") ?? [];
  const board = doc.querySelector(".ellaz-play-surface");
  return {
    "platform bar": px(doc.querySelector("header, .hdr")),
    "utility row": px(doc.querySelector(".urow")),
    // `doc.defaultView`, never the bare global. `getComputedStyle` belongs to a
    // WINDOW, and calling this window's on another document's element returns
    // initial values - which read as a real measurement and are not one. It
    // reported "99px" for an arm whose breadcrumb was measurably 0px, so the
    // table said the two arms agreed while they visibly differed.
    "breadcrumb shape": bc ? doc.defaultView?.getComputedStyle(bc).borderRadius ?? "?" : "absent",
    "breadcrumb fill": bc ? doc.defaultView?.getComputedStyle(bc).backgroundColor ?? "?" : "absent",
    "utility buttons": String(doc.querySelectorAll(".urow .ubtn:not([hidden])").length),
    "game row cells": String(cells.length),
    "game row lines": String(
      new Set([...cells].map((c) => Math.round(c.getBoundingClientRect().top))).size,
    ),
    "game cell height": px(cells[0] ?? null),
    "level toggle width": wide(cells[0] ?? null),
    "board width": wide(board),
    "board height": px(board),
  };
}

export function Compare() {
  const [game, setGame] = useState(GAMES[0]);
  const [variant, setVariant] = useState("g1");
  const [width, setWidth] = useState(WIDTHS[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");
  const left = useRef<HTMLIFrameElement>(null);
  const right = useRef<HTMLIFrameElement>(null);

  const url = (v?: string) =>
    `/games/${game}/${v ? `?design&shut&variant=${v}` : ""}`;

  const measure = useCallback(() => {
    const a = left.current?.contentDocument;
    const b = right.current?.contentDocument;
    if (!a || !b) return setErr("an arm has not loaded yet");
    // A frame that has not painted reports zeros for everything, and a table of
    // zeros looks exactly like a table of measurements.
    if (!a.querySelector(".ellaz-game-panel") || !b.querySelector(".ellaz-game-panel")) {
      return setErr("an arm has no game panel yet - give it a moment, then measure again");
    }
    setErr("");
    const pa = probe(a);
    const pb = probe(b);
    setRows(
      Object.keys(pa).map((what) => ({
        what,
        a: pa[what],
        b: pb[what],
        same: pa[what] === pb[what],
      })),
    );
  }, []);

  // Re-measure when the arms change, once they have had a chance to paint.
  useEffect(() => {
    setRows([]);
    const t = setTimeout(measure, 1400);
    return () => clearTimeout(t);
  }, [game, variant, width, measure]);

  return (
    <section dir="ltr" style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Pick label="game" value={game} options={GAMES} onPick={setGame} />
        <Pick
          label="variant"
          value={variant}
          options={Object.keys(VARIANTS)}
          onPick={setVariant}
        />
        <Pick
          label="width"
          value={String(width)}
          options={WIDTHS.map(String)}
          onPick={(v) => setWidth(Number(v))}
        />
        <button type="button" onClick={measure} style={BTN}>
          measure
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {(
          [
            ["live - what ships today", undefined, left],
            [`${variant} - the variant`, variant, right],
          ] as const
        ).map(([caption, v, ref]) => (
          <figure key={caption} style={{ margin: 0 }}>
            <figcaption style={CAP}>{caption}</figcaption>
            <iframe
              ref={ref}
              title={caption}
              src={url(v)}
              style={{ width, height: 780, border: "1px solid var(--line,#334155)", borderRadius: 10 }}
            />
          </figure>
        ))}
      </div>

      {err ? <p style={{ color: "#f59e0b" }}>{err}</p> : null}

      {rows.length ? (
        <table style={{ borderCollapse: "collapse", marginTop: 14, fontSize: 13 }}>
          <thead>
            <tr>
              {["", "live", variant].map((h) => (
                <th key={h} style={{ ...TD, textAlign: "left", color: "#94a3b8" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.what} style={{ opacity: r.same ? 0.45 : 1 }}>
                <td style={TD}>{r.what}</td>
                <td style={TD}>{r.a}</td>
                <td style={{ ...TD, fontWeight: r.same ? 400 : 800 }}>{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <p style={{ fontSize: 12, color: "#94a3b8", maxWidth: 620 }}>
        Bold rows are what the variant changes. Everything is read out of the two
        documents, so a row that says the same thing twice is a measurement and
        not an omission.
      </p>
    </section>
  );
}

function Pick({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: string;
  options: string[];
  onPick: (v: string) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <select value={value} onChange={(e) => onPick(e.currentTarget.value)} style={BTN}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

const BTN: React.CSSProperties = {
  font: "inherit",
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#e2e8f0",
};
const CAP: React.CSSProperties = { fontSize: 12, color: "#94a3b8", marginBottom: 4 };
const TD: React.CSSProperties = { padding: "3px 12px 3px 0", borderBottom: "1px solid #1e293b" };
