import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Preview } from "./Preview";
import { useLiveApply } from "./useLiveApply";
import { CHROME_TOKENS, GAMES, shippedFor, type TokenSpec } from "./Buttons";
import { PANEL_TOKENS, type PanelToken } from "./panelStyles";

/**
 * Three ways this bench could work, over the same real page, at `#/lab/mock`.
 *
 * The operator's ask, verbatim: "i want the entire lab to be more UX UI fun,
 * more visual so i can shooe elements and choose their properties. suggest
 * mocks and options how to show this lab".
 *
 * So this is a PROPOSAL, and the thing being proposed is an INTERACTION - not
 * a colour scheme and not a drawing. A drawing of an inspector cannot be
 * judged, because the only question about an inspector is whether pointing at
 * a thing gets you that thing. All three arms therefore drive the same real
 * tokens on the same real game page: what differs between them is how you
 * reach a number, never whether the number is real.
 *
 * ONE AT A TIME, large, with a labelled switcher. Three arms side by side is a
 * comparison exercise rather than an eyeball, and this bench is already the
 * place where that lesson is written down.
 *
 * It is a mock in exactly one sense: whichever arm wins gets built as the real
 * lab and the other two are deleted with this file. Nothing here is a second
 * implementation of anything - the token lists, the preview and the apply loop
 * are the shipped ones, imported.
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
type Part = {
  id: string;
  /** What a person would call it, pointing at the screen. */
  label: string;
  /** One line: what moving these numbers actually changes. */
  what: string;
  sel: string;
  chrome: string[];
  panel: string[];
};

export const PARTS: Part[] = [
  {
    id: "bar",
    label: "the purple bar",
    what: "the game's name, the way home, sound and the wallet",
    sel: ".top",
    chrome: ["--hh", "--hbrand", "--hicon", "--hgap", "--hpad", "--tap", "--hrad"],
    panel: [],
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

type Arm = "tap" | "stack" | "sizes";

const ARMS: { id: Arm; name: string; one: string; short: string }[] = [
  {
    id: "tap",
    name: "A · tap the thing",
    one: "Tap a part of the screen. Only its own numbers come up, in a sheet over the bottom.",
    // Written short rather than sliced. A sentence cut at a character count
    // ends mid-word and reads as a rendering bug, which is the one thing a
    // screen proposing a design must not look like.
    short: "tap a part, get its numbers",
  },
  {
    id: "stack",
    name: "B · the stack",
    one: "The page as bands with their real heights, and the arithmetic that has to add up.",
    short: "bands at their real heights",
  },
  {
    id: "sizes",
    name: "C · pick a size",
    one: "No sliders. Three real sizes per number, drawn at scale - tap the one that looks right.",
    short: "no sliders - pick a size",
  },
];

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

export function Mocks() {
  const [arm, setArm] = useState<Arm>("tap");
  const [split, setSplit] = useState<Split>("both");
  const [game, setGame] = useState("sudoku");
  const [wide, setWide] = useState(false);
  const [sel, setSel] = useState<string>("row");
  const [vals, setVals] = useState<Record<string, number | undefined>>({});
  const [hits, setHits] = useState<Hit[]>([]);
  const frame = useRef<HTMLIFrameElement>(null);

  // Written on the BODY, never on documentElement: the tokens are declared by
  // `body.screen{...}` and a declaration ON an element beats one inherited
  // from its parent, so setting them on <html> moves nothing while the panel
  // reports a change. The shipped bench learned this the hard way and this
  // arm is not going to relearn it.
  const apply = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.querySelector(".urow")) return false;
    for (const t of [...CHROME_TOKENS, ...PANEL_TOKENS]) {
      const v = vals[t.name];
      if (v === undefined) doc.body.style.removeProperty(t.name);
      else doc.body.style.setProperty(t.name, `${v}px`);
    }
    setHits(measure(doc));
    return true;
  }, [vals]);

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
  const set = (name: string, v: number) => setVals((p) => ({ ...p, [name]: v }));
  const clear = (name: string) => setVals((p) => ({ ...p, [name]: undefined }));
  const dirty = [...CHROME_TOKENS, ...PANEL_TOKENS].filter((t) => vals[t.name] !== undefined);
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
      {arm === "stack" ? <Stack hits={hits} sel={sel} onPick={setSel} h={wide ? 620 : 560} /> : null}
      {arm === "tap" ? (
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
      ) : null}

      <h2 style={{ fontSize: 14, margin: "10px 0 2px" }}>{part.label}</h2>
      <p style={{ ...NOTE, margin: "0 0 10px" }}>{part.what}</p>

      {arm === "sizes" ? (
        <Sizes knobs={knobs} vals={vals} onPick={set} onClear={clear} />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {knobs.map((k) => (
            <Slider
              key={k.name}
              knob={k}
              value={vals[k.name] ?? k.shipped}
              moved={vals[k.name] !== undefined}
              onChange={(v) => set(k.name, v)}
              onClear={() => clear(k.name)}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <button type="button" style={BTN} onClick={() => setVals({})}>
          back to shipped
        </button>
        <p style={{ ...NOTE, marginTop: 8 }}>
          {dirty.length === 0 ? "nothing moved - this is exactly what ships" : `${dirty.length} changed`}
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
      overlay={
        arm === "tap"
          ? (scale) => (
              <span data-overlay="parts">
                <Outlines hits={hits} scale={scale} sel={sel} onPick={setSel} />
              </span>
            )
          : undefined
      }
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
          {ARMS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setArm(a.id)}
              style={{ ...BTN, ...(arm === a.id ? ON : null), padding: "6px 9px" }}
              aria-label={a.name}
            >
              {a.name.slice(0, 1)}
            </button>
          ))}
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
              <span style={NOTE}>{ARMS.find((a) => a.id === arm)?.short}</span>
            </div>
            {controls}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={PAGE}>
      <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>three labs, one page</h1>
      <p style={{ ...NOTE, margin: "0 0 10px", maxWidth: 640 }}>
        Same real game, same real numbers, three ways of reaching them. Flip between them and
        say which one you want built - the other two get deleted with this screen.
      </p>

      <div style={{ ...ROW, marginBottom: 4 }}>
        {ARMS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setArm(a.id)}
            style={{ ...BTN, ...(arm === a.id ? ON : null), fontSize: 13, padding: "8px 12px" }}
          >
            {a.name}
          </button>
        ))}
      </div>
      <p style={{ ...NOTE, margin: "0 0 12px", color: "#cbd5e1" }}>
        {ARMS.find((a) => a.id === arm)?.one}
      </p>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {preview()}
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>{controls}</div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- A · tap the thing */

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

/* ------------------------------------------------------------ B · the stack */

/**
 * The page as bands, with their MEASURED heights and the sum.
 *
 * This arm exists because the utility row's own defect was an arithmetic one -
 * 44px of button inside a 46px row - and no screen anywhere in this repo shows
 * that the chrome and the game are drawing on one budget. A band you can see
 * being 46 tall around a 44 tall button is the bug, drawn.
 */
function Stack({
  hits,
  sel,
  onPick,
  h,
}: {
  hits: Hit[];
  sel: string;
  onPick: (id: string) => void;
  h: number;
}) {
  const bands = hits.filter((x) => x.part.id !== "crumb");
  const total = bands.reduce((n, b) => n + b.height, 0);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "grid", gap: 3 }}>
        {bands.map((b) => (
          <button
            key={b.part.id}
            type="button"
            onClick={() => onPick(b.part.id)}
            style={{
              ...BTN,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              // Proportional to the real band, floored so a 46px row is still
              // tappable. A bar chart nobody can hit is a picture.
              height: Math.max(30, Math.round((b.height / h) * 190)),
              ...(b.part.id === sel ? ON : null),
            }}
          >
            <span>{b.part.label}</span>
            <b style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(b.height)}px</b>
          </button>
        ))}
      </div>
      <p style={{ ...NOTE, marginTop: 6 }}>
        {bands.map((b) => Math.round(b.height)).join(" + ")} = {Math.round(total)}px. Every pixel
        the chrome takes is a pixel the board does not get.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------- C · pick a size */

/**
 * Three real sizes per number, drawn at scale, no digits required.
 *
 * The bet: nobody has an opinion about whether a row is 46 or 56, and everyone
 * has one about whether it looks cramped. So the arm offers the shipped value
 * flanked by a tighter and an airier one, each rendered as a bar at its own
 * true proportion, and the number is a caption rather than the control.
 */
function Sizes({
  knobs,
  vals,
  onPick,
  onClear,
}: {
  knobs: Knob[];
  vals: Record<string, number | undefined>;
  onPick: (name: string, v: number) => void;
  onClear: (name: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {knobs.map((k) => {
        // Steps off the SHIPPED value rather than off the range, so the middle
        // card is always what ships and the two neighbours are a real choice
        // either side of it. A range-thirds version put "now" in odd places
        // and made the middle card mean nothing.
        const step = Math.max(1, Math.round((k.max - k.min) / 8));
        const opts = [
          { v: Math.max(k.min, k.shipped - step), name: "tighter" },
          { v: k.shipped, name: "now" },
          { v: Math.min(k.max, k.shipped + step), name: "airier" },
        ];
        const cur = vals[k.name] ?? k.shipped;
        // The bar is scaled ACROSS THE THREE, not drawn at the raw pixel size.
        // At true size and clamped to 44 the three cards for a 51/56/61 knob
        // are the same rectangle - measured, and the card exists precisely to
        // show a difference the number does not make you feel.
        const lo = Math.min(...opts.map((o) => o.v));
        const hi = Math.max(...opts.map((o) => o.v));
        const bar = (v: number) => 8 + (hi === lo ? 16 : ((v - lo) / (hi - lo)) * 30);
        return (
          <div key={k.name}>
            <div style={{ fontSize: 12, color: "#e2e8f0", marginBottom: 4 }}>
              {k.label} <span style={{ ...NOTE }}>· {k.what}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {opts.map((o) => (
                <button
                  key={o.name}
                  type="button"
                  onClick={() => (o.v === k.shipped ? onClear(k.name) : onPick(k.name, o.v))}
                  style={{
                    ...BTN,
                    flex: "1 1 0",
                    display: "grid",
                    gap: 4,
                    justifyItems: "center",
                    ...(cur === o.v ? ON : null),
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "block",
                      width: "100%",
                      height: Math.round(bar(o.v)),
                      borderRadius: 3,
                      background: cur === o.v ? "#0b1020" : "#475569",
                    }}
                  />
                  <span style={{ fontSize: 11 }}>
                    {o.name} {o.v}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
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
