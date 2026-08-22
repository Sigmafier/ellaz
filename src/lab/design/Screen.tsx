import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Preview } from "./Preview";
import { useLiveApply } from "./useLiveApply";
import { CHROME_TOKENS, GAMES, readChrome, shippedFor, type TokenSpec } from "./Buttons";
import { PANEL_STYLES, PANEL_TOKENS, STYLE_BY_ID, type PanelToken } from "./panelStyles";
import { readPanel, STYLE_TAG, tokensOf } from "./panelRead";

/**
 * The bench: a real game page, and every part of it is a thing you point at.
 *
 * Chosen out of three proposals on 2026-08-22 - "A, build the tap one" - and
 * the two that lost were deleted with the screen that offered them. What it
 * replaces is two tabs of sliders named after CSS custom properties ("page row
 * height", "title size"), which asked you to already know which stripe each
 * one moved. Here the stripe IS the handle and the numbers hang off it.
 *
 * Nothing here draws its own version of the chrome. A knob writes the same
 * custom property `layout.ts` and `GameChrome.tsx` already read, onto the BODY
 * of a real page in an iframe, so what you look at is the shipped rendering
 * path with different numbers in it. A shape that no number can express - a
 * label under its value, a glyph dropped - is a real stylesheet injected into
 * that page, never a drawing beside it.
 *
 * On a phone it is one fixed screen: a bar, the picture, and a sheet of knobs
 * that is the only thing on it that scrolls. See `SHELL`.
 */

/* ------------------------------------------------------------------ parts */

/**
 * The tunable PARTS of a game screen, each one a thing you can point at.
 *
 * This is the primitive the current bench does not have, and its absence is
 * the whole complaint. Today a knob is called "page row height" and you have
 * to already know which stripe that is; here the stripe is the handle and the
 * knobs hang off it.
 *
 * `sel` is read against the frame's own document, so a part that stops being
 * drawn simply disappears from the inspector rather than offering knobs for
 * something that is not on screen. `coloring` has no stat row, and that is a
 * real answer rather than a gap.
 */
export type Part = {
  id: string;
  /** What a person would call it, pointing at the screen. */
  label: string;
  /** One line: what moving these numbers actually changes. */
  what: string;
  sel: string;
  chrome: string[];
  panel: string[];
  /** Offer the SHAPE switches with this part. Only the game row has any. */
  styles?: true;
  /** Which live readout belongs beside this part's knobs. */
  reads?: "glyphs" | "row";
};

export const PARTS: Part[] = [
  {
    id: "bar",
    label: "the purple bar",
    what: "the game's name, the way home, sound and the wallet",
    sel: ".top",
    chrome: ["--hh", "--hbrand", "--hicon", "--hgap", "--hpad", "--tap", "--hrad"],
    panel: [],
    reads: "glyphs",
  },
  {
    id: "row",
    label: "the page row",
    what: "the breadcrumb, restart, pause and full screen",
    sel: ".urow",
    chrome: ["--uh", "--hpad", "--tap", "--urad", "--hicon"],
    panel: [],
  },
  {
    id: "crumb",
    label: "the breadcrumb pill",
    what: "Home > Classics > Sudoku, and how much room it gets",
    sel: ".urow .bc",
    chrome: ["--uh", "--hpad"],
    panel: [],
  },
  {
    id: "panel",
    label: "the game row",
    what: "difficulty, the live number and the record",
    sel: ".ellaz-game-panel .gc-row",
    styles: true,
    reads: "row",
    chrome: [],
    panel: [
      "--gc-tap",
      "--gc-gap",
      "--gc-cell-radius",
      "--gc-value",
      "--gc-label",
      "--gc-record",
      "--gc-stat-icon",
      "--gc-level-value",
      "--gc-head-gap",
    ],
  },
  {
    id: "stage",
    label: "the board",
    what: "what is left for the game once the chrome has been paid for",
    sel: ".stage .box",
    chrome: ["--hh", "--uh"],
    panel: ["--gc-head-gap"],
  },
];

/** Every knob a part owns, chrome and panel together, in the order listed. */
function knobsOf(part: Part, wide: boolean): Knob[] {
  const c = part.chrome
    .map((n) => CHROME_TOKENS.find((t) => t.name === n))
    .filter((t): t is TokenSpec => Boolean(t))
    .map((t) => ({ name: t.name, label: t.label, what: t.what, min: t.min, max: t.max, shipped: shippedFor(t, wide) }));
  const p = part.panel
    .map((n) => PANEL_TOKENS.find((t) => t.name === n))
    .filter((t): t is PanelToken => Boolean(t))
    .map((t) => ({ name: t.name, label: t.label, what: t.what, min: t.min, max: t.max, shipped: t.shipped }));
  return [...c, ...p];
}

type Knob = {
  name: string;
  label: string;
  what: string;
  min: number;
  max: number;
  shipped: number;
};

/** A part's rect inside the frame, or null when this game does not draw it. */
type Hit = { part: Part; top: number; left: number; width: number; height: number };

function measure(doc: Document): Hit[] {
  const out: Hit[] = [];
  for (const part of PARTS) {
    const el = doc.querySelector(part.sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    // A part scrolled out of the frame, or collapsed to nothing, is not
    // something you can point at - and an outline drawn at 0x0 in the corner
    // reads as a bug rather than as an absence.
    if (r.width < 4 || r.height < 4) continue;
    out.push({ part, top: r.top, left: r.left, width: r.width, height: r.height });
  }
  return out;
}

/* ------------------------------------------------------------------ shell */

const src = (game: string) => `${import.meta.env.BASE_URL}games/${game}/`;

/**
 * Is this a screen the fixed shell should own?
 *
 * WIDTH OR HEIGHT, and the height half is the one that is easy to miss: a
 * phone turned sideways is 844x390, which is wide enough for the two-column
 * desktop layout and 390px too short to hold it - measured, that arm scrolled
 * 460px, which is the same defect this shell exists to remove, arriving
 * through the one branch that was keyed on width alone. 720 is the app's own
 * chrome breakpoint; 620 is a landscape phone plus room.
 */
const isSmall = () => innerWidth < 720 || innerHeight < 620;

function useNarrow(): boolean {
  const [n, setN] = useState(() => (typeof window === "undefined" ? false : isSmall()));
  useEffect(() => {
    const read = () => setN(isSmall());
    addEventListener("resize", read);
    addEventListener("orientationchange", read);
    return () => {
      removeEventListener("resize", read);
      removeEventListener("orientationchange", read);
    };
  }, []);
  return n;
}

/**
 * How the phone splits between the picture and the knobs.
 *
 * Three named stops rather than a drag handle: a drag handle on a screen whose
 * whole subject is a preview competing with its controls is one more thing to
 * get wrong with a thumb, and three taps cover every real intent.
 */
const SPLITS = [
  { id: "look", name: "look", preview: 0.62 },
  { id: "both", name: "both", preview: 0.4 },
  { id: "tune", name: "tune", preview: 0.16 },
] as const;
type Split = (typeof SPLITS)[number]["id"];

export function Screen() {
  const [split, setSplit] = useState<Split>("both");
  const [game, setGame] = useState("sudoku");
  const [wide, setWide] = useState(false);
  const [sel, setSel] = useState<string>("row");
  const [styleId, setStyleId] = useState("shipped");
  const [vals, setVals] = useState<Record<string, number | undefined>>({});
  const [hits, setHits] = useState<Hit[]>([]);
  const [glyphs, setGlyphs] = useState<ReturnType<typeof readChrome>>([]);
  const [row, setRow] = useState<ReturnType<typeof readPanel>>({ cells: [], lines: 0 });
  const frame = useRef<HTMLIFrameElement>(null);

  // Written on the BODY, never on documentElement: the tokens are declared by
  // `body.screen{...}` and a declaration ON an element beats one inherited
  // from its parent, so setting them on <html> moves nothing while the panel
  // reports a change. The shipped bench learned this the hard way and this
  // arm is not going to relearn it.
  const style = STYLE_BY_ID(styleId);

  const apply = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.querySelector(".urow")) return false;
    // The SHAPE first, then the numbers. A style writes `:root` and the knobs
    // write the BODY, which is the closer ancestor - so a knob always wins
    // over the style it is dialling, which is the order a person expects.
    let tag = doc.getElementById(STYLE_TAG);
    if (!tag) {
      tag = doc.createElement("style");
      tag.id = STYLE_TAG;
      doc.head.appendChild(tag);
    }
    tag.textContent = style.css;
    for (const t of [...CHROME_TOKENS, ...PANEL_TOKENS]) {
      const v = vals[t.name];
      if (v === undefined) doc.body.style.removeProperty(t.name);
      else doc.body.style.setProperty(t.name, `${v}px`);
    }
    setHits(measure(doc));
    setGlyphs(readChrome(doc));
    setRow(readPanel(doc));
    return true;
  }, [vals, style]);

  useLiveApply(apply, `${game}-${wide}`);

  // The outlines have to move when the page does - a game mounting, a board
  // settling, an image arriving - and none of those are a knob change.
  useEffect(() => {
    const t = setInterval(() => {
      const doc = frame.current?.contentDocument;
      if (doc?.querySelector(".urow")) setHits(measure(doc));
    }, 700);
    return () => clearInterval(t);
  }, [game, wide]);

  const part = PARTS.find((p) => p.id === sel) ?? PARTS[0];
  const knobs = knobsOf(part, wide);
  // What a knob would be with nothing dialled: the STYLE's value where it sets
  // one, otherwise what ships. Comparing against the shipped literal while a
  // style is applied reports "changed" for every number the style itself moved.
  const fromStyle = tokensOf(style.css);
  const baseOf = (k: Knob) => fromStyle[k.name] ?? k.shipped;
  const set = (name: string, v: number) => setVals((p) => ({ ...p, [name]: v }));
  const clear = (name: string) => setVals((p) => ({ ...p, [name]: undefined }));
  const dirty = [...CHROME_TOKENS, ...PANEL_TOKENS].filter(
    (t) => vals[t.name] !== undefined && vals[t.name] !== (fromStyle[t.name] ?? undefined),
  );
  const css = dirty.map((t) => `${t.name}:${vals[t.name]}px`).join(";");
  const w = wide ? 1100 : 390;

  const narrow = useNarrow();
  const vh = typeof window === "undefined" ? 844 : window.innerHeight;
  const boxH = Math.round(vh * (SPLITS.find((x) => x.id === split)?.preview ?? 0.4));
  // Wide enough for two columns, too short for the scrolling one: a phone on
  // its side. The picture goes beside the knobs rather than above them, and
  // the split control has nothing left to do.
  const side = narrow && typeof window !== "undefined" && window.innerWidth >= 720;

  const controls = (
    <>
      <div style={ROW}>
        {hits.map((h) => (
          <button
            key={h.part.id}
            type="button"
            style={{ ...BTN, ...(h.part.id === sel ? ON : null) }}
            onClick={() => setSel(h.part.id)}
          >
            {h.part.label}
          </button>
        ))}
      </div>

      <h2 style={{ fontSize: 14, margin: "10px 0 2px" }}>{part.label}</h2>
      <p style={{ ...NOTE, margin: "0 0 10px" }}>{part.what}</p>

      {/* A SHAPE, not a number. A label under its value, three cards collapsed
          into one, a glyph dropped - no token can say any of those, so a
          candidate is a stylesheet injected into the real page. Only the game
          row has them today, which is why they are shown with it rather than
          on every part. */}
      {part.styles ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...NOTE, marginBottom: 4 }}>shape</div>
          <div style={ROW}>
            {PANEL_STYLES.map((st) => (
              <button
                key={st.id}
                type="button"
                title={st.what}
                style={{ ...BTN, ...(styleId === st.id ? ON : null) }}
                onClick={() => setStyleId(st.id)}
              >
                {st.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {knobs.map((k) => (
          <Slider
            key={k.name}
            knob={k}
            value={vals[k.name] ?? baseOf(k)}
            moved={vals[k.name] !== undefined && vals[k.name] !== baseOf(k)}
            onChange={(v) => set(k.name, v)}
            onClear={() => clear(k.name)}
          />
        ))}
      </div>

      {/* What the page ACTUALLY draws, read off the live document rather than
          typed. The two rows that matter are a glyph with no `.gl` wrapper -
          drawn by the runtime, so unreachable from every rule the header
          writes - and a card whose text is ellipsised INSIDE itself while
          every overflow check reads clean. */}
      {part.reads === "glyphs" && glyphs.length ? (
        <Readout
          title={`${new Set(glyphs.filter((g) => g.stroke !== "-").map((g) => g.size)).size} glyph size · ${new Set(glyphs.filter((g) => g.stroke !== "-").map((g) => g.stroke)).size} stroke weight`}
          rows={glyphs.map((g) => [g.label, `${g.size} · ${g.stroke}`, g.by])}
        />
      ) : null}
      {part.reads === "row" && row.cells.length ? (
        <Readout
          title={`${row.lines} line${row.lines === 1 ? "" : "s"} · ${row.cells.length} cells`}
          rows={row.cells.map((c) => [
            c.what,
            `${c.w}x${c.h}`,
            c.clipped.length ? `clipped: ${c.clipped.join(", ")}` : "",
          ])}
        />
      ) : null}

      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          style={BTN}
          onClick={() => {
            setVals({});
            setStyleId("shipped");
          }}
        >
          back to shipped
        </button>
        <p style={{ ...NOTE, marginTop: 8 }}>
          {dirty.length === 0 && styleId === "shipped"
            ? "nothing moved - this is exactly what ships"
            : `${dirty.length} changed${styleId === "shipped" ? "" : ` · shape: ${styleId}`}`}
        </p>
        {css ? <pre style={PRE}>{`body.screen{${css}}`}</pre> : null}
      </div>
    </>
  );

  const preview = (fixedH?: number, bare = false) => (
    <Preview
      frameRef={frame}
      frameKey={`${game}-${wide}`}
      title="the screen"
      src={src(game)}
      w={w}
      h={wide ? 620 : 560}
      boxH={fixedH}
      controls={
        bare ? undefined : (
          <div style={{ ...ROW, marginBottom: 6 }}>
            <select value={game} onChange={(e) => setGame(e.currentTarget.value)} style={BTN}>
              {GAMES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <button type="button" style={{ ...BTN, ...(wide ? null : ON) }} onClick={() => setWide(false)}>
              phone 390
            </button>
            <button type="button" style={{ ...BTN, ...(wide ? ON : null) }} onClick={() => setWide(true)}>
              desktop 1100
            </button>
          </div>
        )
      }
      overlay={(scale) => (
        <span data-overlay="parts">
          <Outlines hits={hits} scale={scale} sel={sel} onPick={setSel} />
        </span>
      )}
    />
  );

  /**
   * THE PHONE. A fixed 100dvh column, and nothing in it scrolls the page.
   *
   * Measured on the live bench at 390x844 before this existed: 275px of
   * heading and prose above the preview, a 520px preview under it, and the
   * first slider at y=1094 - 290px BELOW the fold, on a screen whose whole
   * job is to let you move a number and watch it. Every word above the
   * picture was costing the thing the picture is for.
   *
   * So the prose is gone on a phone, the picture is CROPPED to the part of the
   * page the knobs reach, and the knobs get the rest with their own scroller.
   * The split is three taps rather than a drag, and `look` exists because
   * sometimes you do want the whole board back.
   */
  if (narrow) {
    return (
      <section style={SHELL}>
        <div style={BAR}>
          <select
            value={game}
            onChange={(e) => setGame(e.currentTarget.value)}
            style={{ ...BTN, flex: "1 1 90px", minWidth: 0 }}
          >
            {GAMES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <span style={{ ...NOTE, marginInlineStart: "auto" }}>tap a part</span>
        </div>

        <div style={side ? SIDE_WRAP : { display: "contents" }}>
          <div
            style={
              side
                ? { flex: "0 0 auto", paddingInline: 8, overflow: "hidden" }
                : { flex: "0 0 auto", paddingInline: 8 }
            }
          >
            {preview(side ? undefined : boxH, true)}
          </div>

          <div style={side ? { ...SHEET, borderTop: "none", borderInlineStart: "1px solid #1e293b" } : SHEET}>
            <div style={{ ...ROW, gap: 6, marginBottom: 8 }}>
              {side ? null : SPLITS.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setSplit(sp.id)}
                  style={{ ...BTN, ...(split === sp.id ? ON : null) }}
                >
                  {sp.name}
                </button>
              ))}
              <button
                type="button"
                style={{ ...BTN, ...(wide ? null : ON) }}
                onClick={() => setWide(false)}
              >
                390
              </button>
              <button
                type="button"
                style={{ ...BTN, ...(wide ? ON : null) }}
                onClick={() => setWide(true)}
              >
                1100
              </button>
            </div>
            {controls}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={PAGE}>
      <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>the screen</h1>
      <p style={{ ...NOTE, margin: "0 0 12px", maxWidth: 640 }}>
        Tap a part of the real page. Only its own numbers come up, and every one of them is a
        custom property the shipped stylesheet already reads - so what you are looking at is
        the real rendering path, not a drawing of it. The per-game footers are at{" "}
        <a href="#/lab/footers" style={{ color: "#818cf8" }}>
          #/lab/footers
        </a>
        .
      </p>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {preview()}
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>{controls}</div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- outlines */

/**
 * A labelled outline per part, drawn over the frame in the frame's own
 * coordinates multiplied by the preview's scale.
 *
 * The multiply is the whole trick and it is easy to get silently wrong: a rect
 * read inside a transformed iframe is in the FRAME's space, so an unscaled
 * outline lands near the right place at 93% and visibly wrong at 60%. Near is
 * the dangerous one - it reads as a rounding error rather than as a bug.
 */
function Outlines({
  hits,
  scale,
  sel,
  onPick,
}: {
  hits: Hit[];
  scale: number;
  sel: string;
  onPick: (id: string) => void;
}) {
  return (
    <>
      {hits.map((h) => {
        const on = h.part.id === sel;
        return (
          <button
            key={h.part.id}
            type="button"
            onClick={() => onPick(h.part.id)}
            aria-label={h.part.label}
            style={{
              position: "absolute",
              top: h.top * scale,
              left: h.left * scale,
              width: h.width * scale,
              height: h.height * scale,
              border: `2px solid ${on ? "#818cf8" : "rgba(129,140,248,.35)"}`,
              borderRadius: 6,
              background: on ? "rgba(129,140,248,.14)" : "transparent",
              padding: 0,
              cursor: "pointer",
              font: "inherit",
            }}
          >
            {on ? (
              <span
                style={{
                  // ONE label at a time, on the selected part, INSIDE its box.
                  //
                  // Both halves are measured rather than chosen. Above the box
                  // and every label lands on its neighbour's, because the bar,
                  // the row and the pill are stacked bands a few pixels apart.
                  // Inside the box and all five at once still collide, because
                  // three of the five NEST - the pill is in the row and the
                  // game row is in the board, so they share a top-left corner
                  // and the child's label covers the parent. Labelling only
                  // the selection removes the collision instead of arranging
                  // it, and the outlines still say what is tappable.
                  position: "absolute",
                  top: 2,
                  insetInlineStart: 2,
                  fontSize: 10,
                  lineHeight: "14px",
                  padding: "0 5px",
                  whiteSpace: "nowrap",
                  borderRadius: 4,
                  background: "#818cf8",
                  color: "#0b1020",
                  fontWeight: 700,
                }}
              >
                {h.part.label}
              </span>
            ) : null}
          </button>
        );
      })}
    </>
  );
}

/* ---------------------------------------------------------------- readout */

/**
 * What the page ACTUALLY draws, read off the live document rather than typed.
 *
 * It is the deliverable and the picture is the argument: a drawing of this row
 * can be made to look like anything, and the question worth asking is whether
 * a six-figure score still fits.
 */
function Readout({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...NOTE, marginBottom: 4 }}>{title}</div>
      <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "3px 8px 3px 0",
                    borderBottom: "1px solid #1e293b",
                    color: /clipped/.test(cell) ? "#f87171" : j === 0 ? "#e2e8f0" : "#94a3b8",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Slider({
  knob,
  value,
  moved,
  onChange,
  onClear,
}: {
  knob: Knob;
  value: number;
  moved: boolean;
  onChange: (v: number) => void;
  onClear: () => void;
}) {
  return (
    <label style={{ display: "grid", gap: 3 }}>
      <span style={{ fontSize: 12, color: "#e2e8f0" }}>
        {knob.label} <b>{value}</b>{" "}
        {moved ? (
          <button type="button" style={{ ...BTN, padding: "1px 6px", fontSize: 10 }} onClick={onClear}>
            was {knob.shipped}
          </button>
        ) : (
          <span style={NOTE}>· {knob.what}</span>
        )}
      </span>
      <input
        type="range"
        min={knob.min}
        max={knob.max}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}

/**
 * ITS OWN SCROLLER, explicitly.
 *
 * `body.app-shell{overflow:hidden;height:100%}` is correct for an application
 * that manages its own scroll regions, and it means a lab screen that does not
 * declare one is simply CLIPPED - measured here at 390x844 the first time this
 * file ran: 1403px of content, 844px of box, `scrollY` stuck at 0 and no
 * scroller anywhere in the chain. That is "the lab does not do anything"
 * again, on the screen proposing the fix for it.
 *
 * The other lab screens scroll by ACCIDENT: they set `overflowX: hidden` to
 * stop a 390px preview pushing the page sideways, and a block with a clipped
 * x-axis computes `overflow-y` to `auto` whether or not anybody wanted it. An
 * accident is not a thing to copy, so both axes are written out here.
 */
/**
 * The phone shell: exactly one viewport tall, and the page never scrolls.
 *
 * `overflow: hidden` here is the whole point - the only scroller in this
 * layout is the sheet, so a swipe on the picture cannot move the page and a
 * knob is never below a fold, because there is no fold.
 */
const SHELL: CSSProperties = {
  height: "100dvh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  background: "#020617",
  color: "#e2e8f0",
  font: "14px/1.5 Inter,system-ui,sans-serif",
};
/** One row, 44px, everything that was a heading and three paragraphs. */
const BAR: CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  gap: 6,
  alignItems: "center",
  padding: "6px 8px",
  borderBottom: "1px solid #1e293b",
};
/** Landscape: the picture beside the knobs, both inside the fixed height. */
const SIDE_WRAP: CSSProperties = { flex: "1 1 auto", minHeight: 0, display: "flex", gap: 8 };
/** The knobs, with the only scrollbar on the screen. */
const SHEET: CSSProperties = {
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  padding: "10px 12px 40px",
  borderTop: "1px solid #1e293b",
};
const PAGE: CSSProperties = {
  height: "100dvh",
  overflowY: "auto",
  overflowX: "hidden",
  background: "#020617",
  color: "#e2e8f0",
  font: "14px/1.5 Inter,system-ui,sans-serif",
  // A SMALL tail, deliberately. The obvious repair for "a knob under the
  // pinned preview" is to pad the bottom so it can scroll clear, and it does
  // the opposite: the padding is inside the scrolled content, so at the end of
  // the scroll the last knob sits where the padding pushed it - high up, under
  // the preview - and is unreachable at every offset the page can reach.
  // Measured at 390x844, 70dvh of tail put every size card in arm C there.
  padding: "14px 14px 60px",
};
const ROW: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
const BTN: CSSProperties = {
  font: "inherit",
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#e2e8f0",
  cursor: "pointer",
};
const ON: CSSProperties = { background: "#6366f1", borderColor: "#6366f1", color: "#0b1020", fontWeight: 700 };
const NOTE: CSSProperties = { fontSize: 11, color: "#94a3b8" };
const PRE: CSSProperties = {
  margin: "8px 0 0",
  padding: 8,
  borderRadius: 8,
  background: "#0f172a",
  border: "1px solid #1e293b",
  fontSize: 11,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
};
