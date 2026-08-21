import { useCallback, useEffect, useRef, useState } from "react";
import { GAMES as ROSTER } from "../../portal/games";
import { Panel } from "./Panel";

/**
 * The games-buttons bench, at `#/lab/buttons`.
 *
 * Two screens, and the operator picks between them by using both rather than
 * by reading a description of them:
 *
 *   A - ONE GAME, knobs beside it. The real game, at real phone width, with a
 *       candidate standard switched on and off over it. What a standard FEELS
 *       like on a board you can actually play.
 *   C - THE WALL. Every game's footer, measured, side by side, so the spread
 *       is a picture rather than a claim.
 *
 * NOTHING HERE IS TYPED. Every number on both screens is read out of a real
 * page with `getBoundingClientRect` - the wall walks all 33 games through one
 * hidden iframe and harvests what it finds. A hand-written table of sizes
 * would have been quicker and would go stale on the next game, which is the
 * failure this whole bench exists to end.
 *
 * The standard is applied as an injected STYLESHEET over the real document,
 * not by editing any game. That is the point: a game's footer buttons carry
 * hand-authored inline sizes today, so the only honest preview of "what if
 * they all obeyed one rule" is to really override them and really look.
 */

/** Exported ONLY so `the-bench-sees-every-game.test.ts` can count it. */
export const GAMES = ROSTER.map((g) => g.id);

/** The floor a tap target may not go under. Same number `--tap-kids` pins. */
const TAP_FLOOR = 44;

export type Standard = {
  size: number;
  radius: number;
  gap: number;
  icon: number;
  minWidth: number;
};

/**
 * The candidate standard, and the defaults are ARGUED rather than picked.
 *
 * `size` 48 clears the 44px floor with four pixels to spare, and 44 exactly
 * is the wrong default for a floor - a floor you sit exactly on has no room
 * for a border. `minWidth` 48 keeps a square button square and lets a wide
 * one (a word, a colour swatch) grow. `gap` 8 is the utility row's gap, so a
 * footer reads as the same family as the row above it.
 */
export const DEFAULT_STANDARD: Standard = {
  size: 48,
  radius: 14,
  gap: 8,
  icon: 22,
  minWidth: 48,
};

/** The stylesheet that IS the standard, as a game would really receive it. */
export function standardCss(s: Standard): string {
  return `.ellaz-game-footer{display:flex;flex-wrap:wrap;gap:${s.gap}px !important}
.ellaz-game-footer button{
  min-width:${s.minWidth}px !important;
  min-height:${s.size}px !important;
  height:${s.size}px !important;
  border-radius:${s.radius}px !important;
  padding:0 10px !important;
  font-size:${Math.round(s.icon * 0.8)}px !important;
}
.ellaz-game-footer svg{width:${s.icon}px !important;height:${s.icon}px !important}`;
}

/**
 * THE SHARED CHROME - the buttons every screen has, rather than the ones a
 * game invents.
 *
 * Measured 2026-08-21 across 5 screens and 3 games: the BOXES already agree
 * everywhere (72x44 home, 44x44 sound, 90x44 wallet, 44x44 row buttons). The
 * GLYPHS inside them do not, and the reason is structural rather than
 * cosmetic - TWO renderers draw them:
 *
 *   `icon()`      build-time, wraps the svg in `.gl`, sized off `--hfont`
 *   `iconNode()`  runtime,    bare svg, `width="1em"`, NO wrapper
 *
 * So `.hbtn .gl svg{...}` - every icon rule the header has - misses the sound
 * and coin glyphs entirely, and they keep their own 16px and their attribute
 * stroke of 2.1 while everything beside them is 17.4 or 22 at 2.2. A rule
 * written against `.gl` cannot reach the two icons that are wrong, which is
 * why this went unseen: the CSS reads correct.
 *
 * FIXED on 2026-08-21: the header's icon rule dropped `.gl` from its selector,
 * so it reaches both renderers, and `--hicon` puts one number behind every
 * glyph. The breadcrumb links were the other half - 20px tall against a 44px
 * floor on every screen - and the trap there is that padding the `.bc` PILL
 * does not grow the `<a>`, so the picture changes while the tap target does
 * not. The panel below reads all of it back off the real page rather than
 * asserting it, because that is the only way to notice it coming undone.
 */
/**
 * THE SHARED STANDARD - one row per number the chrome is laid out from.
 *
 * Every one of these is a REAL custom property on `body.screen`, so a knob
 * here changes the same thing a stylesheet edit would, on the game, the room
 * and the boards alike. That is the difference between this panel and a mock:
 * nothing is redrawn by hand, the real CSS reads the value. If a knob moves
 * nothing, the token is not what lays that thing out - which is a finding,
 * not a bug in the panel.
 *
 * `shipped` is what `layout.ts` sets today, shown beside the knob so a changed
 * value reads as a CHANGE rather than as a number.
 */
export type TokenSpec = {
  name: string;
  label: string;
  /** What layout.ts sets, PER ARM - the chrome branches at 719px. */
  shipped: { wide: number; narrow: number };
  min: number;
  max: number;
  what: string;
};

const same = (n: number) => ({ wide: n, narrow: n });

export const CHROME_TOKENS: TokenSpec[] = [
  { name: "--hh", label: "header height", shipped: { wide: 60, narrow: 58 }, min: 44, max: 88, what: "the tinted bar" },
  { name: "--uh", label: "page row height", shipped: { wide: 52, narrow: 46 }, min: 40, max: 80, what: "the G1 line" },
  { name: "--tap", label: "button size", shipped: same(44), min: 36, max: 72, what: "every round button, both rows" },
  { name: "--hicon", label: "icon size", shipped: same(22), min: 12, max: 34, what: "every glyph on every screen" },
  { name: "--hgap", label: "header gap", shipped: { wide: 12, narrow: 8 }, min: 0, max: 28, what: "space between the bar's items" },
  { name: "--hpad", label: "side padding", shipped: { wide: 20, narrow: 12 }, min: 0, max: 40, what: "the screen edge, both rows" },
  { name: "--hbrand", label: "title size", shipped: { wide: 22, narrow: 20 }, min: 14, max: 32, what: "the game's name in the bar" },
  { name: "--hrad", label: "bar button radius", shipped: same(99), min: 0, max: 99, what: "99 is a pill" },
  { name: "--urad", label: "row button radius", shipped: same(14), min: 0, max: 99, what: "99 is a pill" },
];

/** The shipped value for the arm currently on screen. */
export const shippedFor = (t: TokenSpec, wide: boolean) =>
  wide ? t.shipped.wide : t.shipped.narrow;

/** The tap floor. A knob may go under it; the panel says so in red. */
export const CHROME_FLOOR = 44;

/** The five glyphs the shared chrome draws, read off a live document. */
export function readChrome(doc: Document): { label: string; size: string; stroke: string; by: string }[] {
  const win = doc.defaultView;
  if (!win) return [];
  const out: { label: string; size: string; stroke: string; by: string }[] = [];
  const add = (label: string, svg: SVGElement | null) => {
    if (!svg) return;
    const cs = win.getComputedStyle(svg);
    out.push({
      label,
      size: cs.width,
      stroke: cs.strokeWidth,
      // The tell, and the whole finding in one column: a glyph with no `.gl`
      // wrapper was drawn by the runtime and is unreachable from every rule
      // the header writes.
      by: svg.parentElement?.classList.contains("gl") ? "build" : "runtime",
    });
  };
  add("header back+home", doc.querySelector(".hbtn.home svg"));
  const snd = [...doc.querySelectorAll<HTMLElement>(".hbtn.ico")].find(
    (e) => e.getBoundingClientRect().width > 0,
  );
  add("header sound", snd?.querySelector("svg") ?? null);
  add("header wallet coin", doc.querySelector("#wallet-slot svg"));
  [...doc.querySelectorAll<HTMLElement>(".urow .ubtn")]
    .filter((e) => e.getBoundingClientRect().width > 0)
    .forEach((e) =>
      add(
        "g1line " + (e.dataset.restart !== undefined ? "restart" : "full screen"),
        e.querySelector("svg"),
      ),
    );
  const link = [...doc.querySelectorAll<HTMLElement>(".urow .bc a")].find(
    (e) => e.getBoundingClientRect().width > 0,
  );
  if (link) {
    const r = link.getBoundingClientRect();
    out.push({
      label: "g1line breadcrumb link",
      size: `${Math.round(r.width)}x${Math.round(r.height)}`,
      stroke: "-",
      by: "tap target",
    });
  }
  return out;
}

type Btn = { w: number; h: number; label: string };
type Row = { id: string; buttons: Btn[]; note?: string };

/** Everything a game's footer holds, measured off a live document. */
function readFooter(doc: Document): Btn[] {
  const footer = doc.querySelector(".ellaz-game-footer");
  if (!footer) return [];
  return [...footer.querySelectorAll("button")].map((b) => {
    const r = b.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      label: (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 12),
    };
  });
}

/** `w x h`, the key the wall counts distinct sizes by. */
const sizeKey = (b: Btn) => `${b.w}x${b.h}`;
const under = (b: Btn) => b.w < TAP_FLOOR || b.h < TAP_FLOOR;

export function Buttons() {
  const [mode, setMode] = useState<"chrome" | "panel" | "one" | "wall">("chrome");
  const [std, setStd] = useState<Standard>(DEFAULT_STANDARD);
  const [on, setOn] = useState(false);

  return (
    <section
      dir="ltr"
      /* Paints its own ground. This renders over the app, whose theme is a
         cream one, and slate text on cream is invisible - which is exactly
         what the first screenshot of this screen showed: a heading nobody
         could read sitting above a wall that was fine. */
      style={{ padding: 12, color: "#e2e8f0", minHeight: "100vh", background: "#020617" }}
    >
      <div style={ROW}>
        <b style={{ fontSize: 15 }}>games buttons</b>
        <Seg
          value={mode}
          options={[
            ["chrome", "SHARED · the bar"],
            ["panel", "SHARED · the game row"],
            ["one", "PER GAME · one footer"],
            ["wall", "PER GAME · all 33 footers"],
          ]}
          onPick={(m) => setMode(m as "chrome" | "panel" | "one" | "wall")}
        />
        {mode === "one" || mode === "wall" ? (
          <label style={{ ...NOTE, display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={on} onChange={(e) => setOn(e.currentTarget.checked)} />
            apply the standard
          </label>
        ) : null}
      </div>

      {/* The knobs belong to the FOOTER standard. Leaving them on screen
          during the chrome screen would offer five controls that do nothing,
          which is the defect this bench caught in its own first hour. */}
      {mode === "one" || mode === "wall" ? <Knobs std={std} setStd={setStd} disabled={!on} /> : null}

      {mode === "chrome" ? <Chrome /> : mode === "panel" ? <Panel /> : mode === "one" ? (
        <OneGame std={std} on={on} />
      ) : (
        <Wall std={std} on={on} />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ knobs */

function Knobs({
  std,
  setStd,
  disabled,
}: {
  std: Standard;
  setStd: (s: Standard) => void;
  disabled: boolean;
}) {
  const set = (k: keyof Standard) => (v: number) => setStd({ ...std, [k]: v });
  return (
    <div style={{ ...ROW, opacity: disabled ? 0.4 : 1, marginBottom: 12 }}>
      <Knob label="size" value={std.size} min={32} max={72} onChange={set("size")} floor={TAP_FLOOR} />
      <Knob label="min width" value={std.minWidth} min={32} max={140} onChange={set("minWidth")} floor={TAP_FLOOR} />
      <Knob label="radius" value={std.radius} min={0} max={30} onChange={set("radius")} />
      <Knob label="gap" value={std.gap} min={0} max={20} onChange={set("gap")} />
      <Knob label="icon" value={std.icon} min={12} max={34} onChange={set("icon")} />
      <button type="button" style={BTN} onClick={() => setStd(DEFAULT_STANDARD)}>
        reset
      </button>
    </div>
  );
}

function Knob({
  label,
  value,
  min,
  max,
  onChange,
  floor,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  floor?: number;
}) {
  // A knob that can be dragged UNDER the tap floor, and says so in red when it
  // is. Refusing the value would hide the reason the floor exists; showing the
  // consequence is the whole job of a bench.
  const bad = floor !== undefined && value < floor;
  return (
    <label style={{ display: "grid", gap: 2, fontSize: 11, color: "#94a3b8" }}>
      <span>
        {label} <b style={{ color: bad ? "#f87171" : "#e2e8f0" }}>{value}</b>
        {bad ? <span style={{ color: "#f87171" }}> under {floor}</span> : null}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        style={{ width: 120 }}
      />
    </label>
  );
}

/* ------------------------------------------------- the app's own buttons */

function Chrome() {
  const [game, setGame] = useState("sudoku");
  // UNSET means "whatever ships". Seeding this with the shipped numbers and
  // writing all nine every time looks identical and is not: it pins the phone
  // arm to the desktop values, so the panel showed a 60px header over a page
  // that really draws 58. Only a token the operator has actually moved is
  // written; the rest are removed, and the media query governs them.
  const [vals, setVals] = useState<Record<string, number | undefined>>({});
  const [wide, setWide] = useState(false);
  const [rows, setRows] = useState<ReturnType<typeof readChrome>>([]);
  const frame = useRef<HTMLIFrameElement>(null);

  const valueOf = (t: TokenSpec) => vals[t.name] ?? shippedFor(t, wide);
  const dirty = CHROME_TOKENS.filter(
    (t) => vals[t.name] !== undefined && vals[t.name] !== shippedFor(t, wide),
  );

  // On the BODY, not documentElement. The tokens are declared by
  // `body.screen{...}`, and a declaration ON an element beats one inherited
  // from its parent - so setting them on <html> is inherited straight past by
  // the very rule that defines them, and every knob moves nothing while the
  // panel cheerfully reports "2 changed".
  //
  // Measured, not reasoned: the first version did exactly that, said 2
  // changed, emitted the CSS, and the iframe's header stayed 58px with its
  // glyphs at 22px. An inline style on the body wins over the stylesheet in
  // both viewport arms, which is what makes the knobs real.
  //
  // No `!important` anywhere: if a knob still moved nothing, that would mean
  // the token is not what lays that thing out, and finding that out is the
  // point of the panel.
  const apply = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.querySelector(".urow")) return;
    CHROME_TOKENS.forEach((t) => {
      const v = vals[t.name];
      if (v === undefined) doc.body.style.removeProperty(t.name);
      else doc.body.style.setProperty(t.name, `${v}px`);
    });
    setRows(readChrome(doc));
  }, [vals]);

  useEffect(() => {
    const t = setInterval(apply, 600);
    return () => clearInterval(t);
  }, [apply]);

  const set = (name: string, v: number) => setVals((p) => ({ ...p, [name]: v }));
  const reset = () => setVals({});

  const sizes = new Set(rows.filter((r) => r.stroke !== "-").map((r) => r.size));
  const strokes = new Set(rows.filter((r) => r.stroke !== "-").map((r) => r.stroke));
  const css = dirty.map((t) => `${t.name}:${vals[t.name]}px`).join(";");
  const arm = wide ? "desktop" : "phone";

  return (
    <div>
      <p style={{ ...NOTE, maxWidth: 760, marginTop: 0 }}>
        Everything on this screen applies to <b style={{ color: "#e2e8f0" }}>every game</b>, the
        room and the boards, because every knob is a custom property on{" "}
        <code>body.screen</code> that the real stylesheet reads. The other two tabs are{" "}
        <b style={{ color: "#e2e8f0" }}>per game</b> - what each game draws in its own footer, which
        no shared rule governs today.
      </p>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ ...ROW, marginBottom: 6 }}>
            <select value={game} onChange={(e) => setGame(e.currentTarget.value)} style={BTN}>
              {GAMES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {/* The chrome branches at 719px, so a value dialled on one arm says
                nothing about the other - which is how a key ends up hanging off
                the side of a phone nobody in the room was looking at. */}
            <Seg
              value={wide ? "wide" : "phone"}
              options={[
                ["phone", "phone 390"],
                ["wide", "desktop 1100"],
              ]}
              onPick={(v) => setWide(v === "wide")}
            />
          </div>
          <iframe
            ref={frame}
            key={game}
            title="the screen"
            src={`/games/${game}/`}
            style={{
              width: wide ? 1100 : 390,
              height: 560,
              border: "1px solid #334155",
              borderRadius: 10,
            }}
          />
        </div>

        <div style={{ minWidth: 320 }}>
          <h3 style={H3}>the standard - every game</h3>
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {CHROME_TOKENS.map((t) => (
              <TokenKnob
                key={t.name}
                spec={t}
                value={valueOf(t)}
                shipped={shippedFor(t, wide)}
                onChange={set}
              />
            ))}
          </div>
          <div style={ROW}>
            <button type="button" style={BTN} onClick={reset} disabled={!dirty.length}>
              back to shipped
            </button>
            <span style={NOTE}>
              {dirty.length ? `${dirty.length} changed on the ${arm} arm` : `matches what ships on the ${arm} arm`}
            </span>
          </div>
          {dirty.length ? (
            <pre
              style={{
                ...NOTE,
                background: "#0f172a",
                padding: 8,
                borderRadius: 6,
                whiteSpace: "pre-wrap",
                maxWidth: 320,
              }}
            >
              body.screen{"{"}
              {css}
              {"}"}
            </pre>
          ) : null}
        </div>

        <div style={{ minWidth: 340 }}>
          <h3 style={H3}>what the page actually draws</h3>
          <p style={{ ...NOTE, margin: "0 0 8px" }}>
            <b style={{ color: sizes.size === 1 ? "#4ade80" : "#f87171" }}>{sizes.size}</b> glyph
            size{sizes.size === 1 ? "" : "s"} ·{" "}
            <b style={{ color: strokes.size === 1 ? "#4ade80" : "#f87171" }}>{strokes.size}</b>{" "}
            stroke weight{strokes.size === 1 ? "" : "s"}
          </p>
          <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["", "size", "stroke", "drawn by"].map((h) => (
                  <th key={h} style={{ ...TD2, color: "#94a3b8", textAlign: "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td style={TD2}>{r.label}</td>
                  <td style={{ ...TD2, fontWeight: 700 }}>{r.size}</td>
                  <td style={TD2}>{r.stroke}</td>
                  <td style={TD2}>{r.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ ...NOTE, maxWidth: 340, marginTop: 10 }}>
            Read out of the real document every 600ms, never typed. The two rows
            marked <b>runtime</b> are appended as a bare svg with no wrapper - the
            header&apos;s icon rule drops <code>.gl</code> from its selector so it
            reaches them anyway, which is what makes one number here possible at
            all.
          </p>
        </div>
      </div>
    </div>
  );
}

function TokenKnob({
  spec,
  value,
  shipped,
  onChange,
}: {
  spec: TokenSpec;
  value: number;
  shipped: number;
  onChange: (name: string, v: number) => void;
}) {
  const changed = value !== shipped;
  // Only the tap-target token has a floor. Flagging a header height as "under
  // 44" would be noise, and a knob that cries wolf is one nobody reads.
  const under = spec.name === "--tap" && value < CHROME_FLOOR;
  return (
    <label style={{ display: "grid", gap: 2, fontSize: 11, color: "#94a3b8" }}>
      <span>
        {spec.label}{" "}
        <b style={{ color: under ? "#f87171" : changed ? "#facc15" : "#e2e8f0" }}>{value}</b>
        {changed ? <span style={{ color: "#facc15" }}> was {shipped}</span> : null}
        {under ? <span style={{ color: "#f87171" }}> under {CHROME_FLOOR}</span> : null}
        <span style={{ opacity: 0.6 }}> · {spec.what}</span>
      </span>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        value={value}
        onChange={(e) => onChange(spec.name, Number(e.currentTarget.value))}
        style={{ width: 300 }}
      />
    </label>
  );
}

/* --------------------------------------------------------------- A: one game */

function OneGame({ std, on }: { std: Standard; on: boolean }) {
  const [game, setGame] = useState("sudoku");
  const [btns, setBtns] = useState<Btn[]>([]);
  const [err, setErr] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);

  // Apply, then MEASURE what the browser did with it - never assume the CSS
  // landed. An injected sheet racing a game's own mount is exactly the window
  // where a preview shows the old sizes and reads as "the standard does
  // nothing".
  const apply = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.querySelector(".ellaz-game-footer")) {
      setBtns([]);
      setErr("this game has no footer, or it has not mounted yet");
      return;
    }
    setErr("");
    let tag = doc.getElementById("fk-standard") as HTMLStyleElement | null;
    if (!tag) {
      tag = doc.createElement("style");
      tag.id = "fk-standard";
      doc.head.appendChild(tag);
    }
    tag.textContent = on ? standardCss(std) : "";
    setBtns(readFooter(doc));
  }, [std, on]);

  useEffect(() => {
    const t = setInterval(apply, 700);
    return () => clearInterval(t);
  }, [apply]);

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div>
        <div style={{ ...ROW, marginBottom: 6 }}>
          <select value={game} onChange={(e) => setGame(e.currentTarget.value)} style={BTN}>
            {GAMES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <span style={NOTE}>390 x 844, the real page</span>
        </div>
        <iframe
          ref={frame}
          key={game}
          title="the game"
          src={`/games/${game}/`}
          style={{ width: 390, height: 844, border: "1px solid #334155", borderRadius: 10 }}
        />
      </div>

      <div style={{ minWidth: 280 }}>
        <h3 style={H3}>this game&apos;s footer, measured</h3>
        {err ? <p style={{ color: "#f59e0b", fontSize: 12 }}>{err}</p> : null}
        {btns.length === 0 && !err ? <p style={NOTE}>measuring…</p> : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
          {btns.map((b, i) => (
            <li key={i} style={{ ...NOTE, display: "flex", gap: 8, alignItems: "center" }}>
              <span
                style={{
                  display: "inline-block",
                  width: Math.min(b.w, 90),
                  height: Math.min(b.h, 40),
                  background: under(b) ? "#7f1d1d" : "#1e3a8a",
                  borderRadius: 4,
                  flex: "0 0 auto",
                }}
              />
              <b style={{ color: under(b) ? "#f87171" : "#e2e8f0" }}>{sizeKey(b)}</b>
              <span>{b.label || "—"}</span>
              {under(b) ? <span style={{ color: "#f87171" }}>under {TAP_FLOOR}</span> : null}
            </li>
          ))}
        </ul>
        <p style={{ ...NOTE, maxWidth: 300, marginTop: 10 }}>
          The bars are the real measured rectangles, not drawings of them. Tick
          &ldquo;apply the standard&rdquo; and they move, because the sheet is
          injected into the real page.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ C: wall */

function Wall({ std, on }: { std: Standard; on: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [at, setAt] = useState(-1);
  const frame = useRef<HTMLIFrameElement>(null);

  // ONE hidden iframe walked through every game, rather than 33 live ones.
  // 33 iframes is 33 game bundles and a browser that stops responding; this
  // is slower to watch and it actually finishes.
  useEffect(() => {
    if (at < 0 || at >= GAMES.length) return;
    const id = GAMES[at];
    const f = frame.current;
    if (!f) return;
    let done = false;
    const tick = () => {
      if (done) return;
      const doc = f.contentDocument;
      if (doc?.querySelector(".ellaz-game-footer")) {
        if (on) {
          const tag = doc.createElement("style");
          tag.textContent = standardCss(std);
          doc.head.appendChild(tag);
        }
        // One more frame, so the injected sheet has been laid out before the
        // rectangles are read. Measuring in the same tick returns the old
        // ones, which reads as "the standard changed nothing".
        requestAnimationFrame(() => {
          done = true;
          setRows((r) => [...r, { id, buttons: readFooter(doc) }]);
          setAt(at + 1);
        });
        return;
      }
      if (doc && doc.readyState === "complete" && !doc.querySelector(".ellaz-game-panel")) return;
    };
    const iv = setInterval(tick, 250);
    // A game with no footer at all is a RESULT, not a hang - 11 of them have
    // none, and a scan that stalled on those would look broken.
    const bail = setTimeout(() => {
      if (done) return;
      done = true;
      setRows((r) => [...r, { id, buttons: [], note: "no footer" }]);
      setAt(at + 1);
    }, 4000);
    f.src = `/games/${id}/`;
    return () => {
      clearInterval(iv);
      clearTimeout(bail);
    };
  }, [at, on, std]);

  const scan = () => {
    setRows([]);
    setAt(0);
  };

  const all = rows.flatMap((r) => r.buttons);
  const sizes = new Set(all.map(sizeKey));
  const small = all.filter(under);
  // Two different numbers, and quoting only one of them misleads in opposite
  // directions: distinct SIZES is how many decisions are wrong, INSTANCES is
  // how many targets a child actually misses. They differ by roughly 8x here,
  // because one game draws 48 keys.
  const smallSizes = new Set(small.map(sizeKey));
  const withFooter = rows.filter((r) => r.buttons.length > 0);
  const running = at >= 0 && at < GAMES.length;

  return (
    <div>
      <div style={{ ...ROW, marginBottom: 10 }}>
        <button type="button" style={BTN} onClick={scan} disabled={running}>
          {running ? `scanning ${at + 1}/${GAMES.length}…` : `scan all ${GAMES.length} games`}
        </button>
        {rows.length ? (
          <span style={NOTE}>
            <b style={{ color: "#e2e8f0" }}>{withFooter.length}</b> games with a footer ·{" "}
            <b style={{ color: sizes.size > 3 ? "#f59e0b" : "#4ade80" }}>{sizes.size}</b> distinct
            sizes ·{" "}
            <b style={{ color: small.length ? "#f87171" : "#4ade80" }}>{smallSizes.size}</b> of them
            under {TAP_FLOOR}px, which is{" "}
            <b style={{ color: small.length ? "#f87171" : "#4ade80" }}>{small.length}</b> real
            buttons
          </span>
        ) : (
          <span style={NOTE}>nothing is measured until you press scan</span>
        )}
      </div>

      <iframe
        ref={frame}
        title="scanner"
        style={{ width: 390, height: 844, position: "absolute", left: -9999, top: 0 }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
          gap: 10,
        }}
      >
        {rows.map((r) => (
          <div key={r.id} style={CARD}>
            <b style={{ fontSize: 12 }}>{r.id}</b>
            {r.buttons.length === 0 ? (
              <span style={NOTE}>{r.note ?? "no footer"}</span>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "flex-end" }}>
                  {/* OFFENDERS FIRST, then the rest. A plain `slice(0, 14)`
                      put coloring's 37x37 keys in the hidden tail and drew
                      that card entirely blue - the wall silently omitting the
                      one thing it exists to show. Sorting by the floor makes
                      the truncation harmless whichever way a game orders its
                      own footer. */}
                  {[...r.buttons]
                    .sort((a, c) => Number(under(c)) - Number(under(a)))
                    .slice(0, 14)
                    .map((b, i) => (
                    <span
                      key={i}
                      title={`${sizeKey(b)} ${b.label}`}
                      style={{
                        width: Math.max(4, Math.min(b.w, 60)),
                        height: Math.max(4, Math.min(b.h, 44)),
                        background: under(b) ? "#7f1d1d" : "#1e3a8a",
                        border: `1px solid ${under(b) ? "#f87171" : "#3b82f6"}`,
                        borderRadius: 3,
                      }}
                    />
                  ))}
                  {r.buttons.length > 14 ? (
                    <span style={NOTE}>+{r.buttons.length - 14}</span>
                  ) : null}
                </div>
                <span style={NOTE}>
                  {r.buttons.length} button{r.buttons.length === 1 ? "" : "s"} ·{" "}
                  {[...new Set(r.buttons.map(sizeKey))].slice(0, 3).join(", ")}
                  {r.buttons.some(under) ? (
                    <b style={{ color: "#f87171" }}>
                      {" "}
                      · {r.buttons.filter(under).length} under {TAP_FLOOR}
                    </b>
                  ) : null}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- chrome */

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
    <span style={{ display: "flex", gap: 4 }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          style={{ ...BTN, background: v === value ? "#2563eb" : "#1e293b" }}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

const ROW: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 10,
};
const BTN: React.CSSProperties = {
  font: "inherit",
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#e2e8f0",
  cursor: "pointer",
};
const NOTE: React.CSSProperties = { fontSize: 11, color: "#94a3b8" };
const H3: React.CSSProperties = { fontSize: 13, margin: "0 0 6px" };
const TD2: React.CSSProperties = {
  padding: "3px 14px 3px 0",
  borderBottom: "1px solid #1e293b",
  whiteSpace: "nowrap",
};
const CARD: React.CSSProperties = {
  display: "grid",
  gap: 6,
  padding: 8,
  border: "1px solid #1e293b",
  borderRadius: 8,
  background: "#0f172a",
};
