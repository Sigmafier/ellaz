import { useCallback, useEffect, useRef, useState } from "react";
import { GAMES as ROSTER } from "../../portal/games";
import { PANEL_STYLES, PANEL_TOKENS, STYLE_BY_ID, type PanelToken } from "./panelStyles";

/**
 * The game panel bench - difficulty, the score and the stage, over a real game.
 *
 * A candidate is a STYLESHEET injected into a real page, never a mock beside
 * it: a drawing of this row can be made to look like anything, and the one
 * question worth asking is whether a six-figure score still fits.
 *
 * So the measurement below is the deliverable and the picture is the argument.
 * It reads the row out of the live document and reports the two things that
 * have broken this component before - a row that WRAPPED onto two lines, and a
 * card whose text is ELLIPSISED inside it while no element is wider than its
 * frame and every overflow check reads clean.
 */

/** Exported ONLY so `the-bench-sees-every-game.test.ts` can count it. */
export const PANEL_GAMES = ROSTER.map((g) => g.id);

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

const STYLE_TAG = "ellaz-panel-bench";

export function Panel() {
  const [game, setGame] = useState("sudoku");
  const [styleId, setStyleId] = useState("shipped");
  const [wide, setWide] = useState(false);
  const [vals, setVals] = useState<Record<string, number | undefined>>({});
  const [read, setRead] = useState<Read>({ cells: [], lines: 0 });
  const frame = useRef<HTMLIFrameElement>(null);

  const style = STYLE_BY_ID(styleId);
  const fromStyle = tokensOf(style.css);
  // What this knob would be with nothing dialled: the STYLE's value if it sets
  // one, otherwise the component's own fallback. Comparing a knob against the
  // shipped literal while a style is applied would report "changed" for every
  // number the style itself moved.
  const baseOf = (t: PanelToken) => fromStyle[t.name] ?? t.shipped;
  const valueOf = (t: PanelToken) => vals[t.name] ?? baseOf(t);
  const dirty = PANEL_TOKENS.filter(
    (t) => vals[t.name] !== undefined && vals[t.name] !== baseOf(t),
  );

  const apply = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.querySelector(".gc-row")) return;
    let tag = doc.getElementById(STYLE_TAG);
    if (!tag) {
      tag = doc.createElement("style");
      tag.id = STYLE_TAG;
      doc.head.appendChild(tag);
    }
    tag.textContent = style.css;
    // On the BODY. A style writes `:root`, and body is the closer ancestor, so
    // a knob the operator actually turned wins over the style it is turning -
    // which is the whole point of having both. An UNSET knob is REMOVED rather
    // than written, or the panel would pin every number and the style's own
    // values would never show.
    PANEL_TOKENS.forEach((t) => {
      const v = vals[t.name];
      if (v === undefined) doc.body.style.removeProperty(t.name);
      else doc.body.style.setProperty(t.name, `${v}px`);
    });
    setRead(readPanel(doc));
  }, [style, vals]);

  // Poll rather than guess one delay: the page is a real document booting a
  // real game, and a measurement taken before it paints is a table of zeros
  // that looks exactly like a table of measurements.
  useEffect(() => {
    setRead({ cells: [], lines: 0 });
    let n = 0;
    const t = setInterval(() => {
      apply();
      if (frame.current?.contentDocument?.querySelector(".gc-row") || ++n > 12) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [game, wide, apply]);

  const clipped = read.cells.flatMap((c) => c.clipped);
  const css = [
    ...(style.css ? [style.css.trim()] : []),
    ...(dirty.length
      ? [`:root{${dirty.map((t) => `${t.name}:${vals[t.name]}px`).join(";")}}`]
      : []),
  ].join("\n");

  return (
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
      {/* The preview stays a REAL 390px viewport even on a 390px phone, so it
          scrolls inside its own box rather than making the whole page scroll
          sideways. Narrowing it instead would be worse than useless: the thing
          being previewed is what a 390px screen does, and a 366px preview
          answers a question nobody asked. */}
      <div style={{ maxWidth: "100%", minWidth: 0 }}>
        <div style={{ ...ROW, marginBottom: 6 }}>
          <select value={game} onChange={(e) => setGame(e.currentTarget.value)} style={BTN}>
            {PANEL_GAMES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <Seg
            value={wide ? "wide" : "phone"}
            options={[
              ["phone", "phone 390"],
              ["wide", "desktop 1100"],
            ]}
            onPick={(v) => setWide(v === "wide")}
          />
          <button type="button" style={BTN} onClick={apply}>
            measure
          </button>
        </div>
        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
          <iframe
            ref={frame}
            key={`${game}-${wide}`}
            title="the game"
            src={`/games/${game}/`}
            style={{
              width: wide ? 1100 : 390,
              height: 560,
              border: "1px solid #334155",
              borderRadius: 10,
              display: "block",
            }}
          />
        </div>
      </div>

      <div style={{ minWidth: 260, flex: "1 1 260px" }}>
        <h3 style={H3}>the style</h3>
        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
          {PANEL_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyleId(s.id)}
              style={{
                ...BTN,
                textAlign: "left",
                borderColor: s.id === styleId ? "#818cf8" : "#334155",
                background: s.id === styleId ? "#1e1b4b" : "#1e293b",
              }}
            >
              <b>{s.name}</b>
              <span style={{ ...NOTE, display: "block" }}>{s.what}</span>
            </button>
          ))}
        </div>

        <h3 style={H3}>the numbers</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {PANEL_TOKENS.map((t) => (
            <Knob
              key={t.name}
              spec={t}
              value={valueOf(t)}
              base={baseOf(t)}
              onChange={(v) => setVals((p) => ({ ...p, [t.name]: v }))}
            />
          ))}
        </div>
        <div style={{ ...ROW, marginTop: 10 }}>
          <button type="button" style={BTN} onClick={() => setVals({})} disabled={!dirty.length}>
            back to the style
          </button>
          <span style={NOTE}>
            {dirty.length ? `${dirty.length} dialled` : "nothing dialled"}
          </span>
        </div>
        {css ? (
          <pre style={PRE}>{css}</pre>
        ) : (
          <p style={NOTE}>A · today is the control and carries no CSS at all.</p>
        )}
      </div>

      <div style={{ minWidth: 260, flex: "1 1 260px" }}>
        <h3 style={H3}>what the row actually does</h3>
        {read.err ? <p style={{ color: "#f59e0b" }}>{read.err}</p> : null}
        <p style={{ ...NOTE, margin: "0 0 8px" }}>
          <b style={{ color: read.lines === 1 ? "#4ade80" : "#f87171" }}>
            {read.lines || "-"} line{read.lines === 1 ? "" : "s"}
          </b>{" "}
          ·{" "}
          <b style={{ color: clipped.length ? "#f87171" : "#4ade80" }}>
            {clipped.length} clipped
          </b>
          {clipped.length ? ` - ${clipped.join(", ")}` : ""}
        </p>
        <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {read.cells.map((c, k) => (
              <tr key={`${c.what}-${k}`}>
                <td style={TD}>{c.what}</td>
                <td style={TD}>
                  {c.w}x{c.h}
                </td>
                <td style={{ ...TD, color: c.clipped.length ? "#f87171" : "#94a3b8" }}>
                  {c.clipped.length ? "clipped" : "fits"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ ...NOTE, maxWidth: "100%", marginTop: 10 }}>
          Two lines means the row wrapped. &quot;clipped&quot; means the text is
          ellipsised inside its own card - nothing overflows, nothing is wider
          than its frame, and the player simply cannot read it.
        </p>
      </div>
    </div>
  );
}

function Knob({
  spec,
  value,
  base,
  onChange,
}: {
  spec: PanelToken;
  value: number;
  base: number;
  onChange: (v: number) => void;
}) {
  const moved = value !== base;
  return (
    <label style={{ display: "grid", gap: 2, fontSize: 12 }}>
      <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ color: moved ? "#e2e8f0" : "#94a3b8" }}>
          {spec.label} <span style={{ color: "#64748b" }}>{spec.what}</span>
        </span>
        <b style={{ color: moved ? "#818cf8" : "#94a3b8" }}>
          {value}
          {moved ? ` (was ${base})` : ""}
        </b>
      </span>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.name === "--gc-record" ? 0.5 : 1}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
    </label>
  );
}

function Seg({
  value,
  options,
  onPick,
}: {
  value: string;
  options: [string, string][];
  onPick: (v: string) => void;
}) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          style={{ ...BTN, background: v === value ? "#334155" : "#1e293b" }}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

const ROW: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };
const BTN: React.CSSProperties = {
  font: "inherit",
  fontSize: 13,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#e2e8f0",
  cursor: "pointer",
};
const H3: React.CSSProperties = { fontSize: 13, margin: "0 0 8px", color: "#94a3b8" };
const NOTE: React.CSSProperties = { fontSize: 12, color: "#94a3b8" };
const TD: React.CSSProperties = { padding: "3px 12px 3px 0", borderBottom: "1px solid #1e293b" };
const PRE: React.CSSProperties = {
  ...NOTE,
  background: "#0f172a",
  padding: 8,
  borderRadius: 6,
  whiteSpace: "pre-wrap",
  maxWidth: "100%",
  marginTop: 10,
};
