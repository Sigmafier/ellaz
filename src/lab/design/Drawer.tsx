import { useEffect, useRef, useState } from "react";
import { GAMES as ROSTER } from "../../portal/games";
import {
  applySpec,
  clearPick,
  clearSpec,
  readPick,
  savePick,
  SHIPPED,
  VARIANTS,
  type ChromeSpec,
} from "./spec";

/**
 * The Design Bench drawer.
 *
 * It draws over a REAL game page - the emitted header, the real `GameChrome`,
 * the real board - and turns the tokens those already read. Nothing here draws
 * a picture of the chrome, which is the whole difference between this and the
 * static mocks in `mockups/`: a drawing can disagree with the app and a token
 * cannot.
 *
 * Reached only at `?design`. `PageApp` does not import this module without the
 * param, so a child's device never fetches a byte of it, and the stored pick is
 * only ever applied under the param either - two independent gates, because
 * one of them is a query string anybody can type.
 */

type Knob = {
  key: keyof ChromeSpec;
  label: string;
  min: number;
  max: number;
  /** What the number means on screen, so a slider is not just a number. */
  note: string;
};

/**
 * The bar heights have TWO arms and the viewport decides which one renders, so
 * a knob bound to the wide one does nothing on a phone - it moves a number the
 * page is not reading, which is indistinguishable from a broken knob. These
 * follow the arm, and say which one they are on.
 */
const ARMED: Partial<Record<string, keyof ChromeSpec>> = { hh: "hhNarrow", uh: "uhNarrow" };

const KNOBS: Knob[] = [
  { key: "hh", label: "Platform bar", min: 44, max: 96, note: "the one bar on every screen" },
  { key: "uh", label: "Utility row", min: 36, max: 80, note: "breadcrumb + restart / pause" },
  { key: "headerTap", label: "Header button", min: 32, max: 72, note: "home, sound, full screen" },
  { key: "panelTap", label: "Game cell", min: 40, max: 88, note: "level toggle + stat cards" },
  { key: "panelGap", label: "Panel gap", min: 0, max: 24, note: "between the cells of that row" },
  { key: "statMinWidth", label: "Stat floor", min: 56, max: 180, note: "below this a record ellipsises" },
];

const CHOICES: Array<{ key: keyof ChromeSpec; label: string; options: string[] }> = [
  { key: "statShape", label: "Score + Best", options: ["merged", "split"] },
  { key: "restartAt", label: "Restart", options: ["urow", "panel"] },
  { key: "pauseAt", label: "Pause", options: ["urow", "panel"] },
  { key: "breadcrumb", label: "Breadcrumb", options: ["pill", "plain"] },
];

const NARROW = 719;

/**
 * The bench's own rules for the choices CSS can express.
 *
 * It lives here, not in `DOCUMENT_CSS`, because `DOCUMENT_CSS` is served on
 * every one of the emitted pages and a preview of a proposal has no business
 * costing a child bytes. When a choice is PICKED it moves into the real
 * stylesheet; until then the bench pays for showing it.
 */
const BENCH_CSS = `
:root[data-design-crumb="plain"] .urow .bc{
  background:none;color:var(--doc-soft);padding:0;border-radius:0;font-weight:600}
:root[data-design-crumb="plain"] .urow .bc a{text-decoration:none;color:var(--doc-link,inherit)}
`;

/**
 * The choices the bench can actually SHOW, versus the ones it can only record.
 *
 * A knob that writes an attribute nothing reads is worse than an absent knob:
 * it answers "yes, previewed" to everyone who turns it. `restartAt`, `pauseAt`
 * and `statShape` all need the component to render differently, not the page
 * to style differently, so they are marked rather than faked - and the mark is
 * what makes the gap visible instead of invisible.
 * See .claude/rules/an-armed-lever-with-no-caller-reads-as-yes.md (machine).
 */
const PREVIEWABLE = new Set<string>(["breadcrumb"]);

export function Drawer() {
  const params = new URLSearchParams(location.search);
  const wanted = params.get("variant") ?? "";
  const [spec, setSpec] = useState<ChromeSpec>(
    () => VARIANTS[wanted] ?? readPick() ?? SHIPPED,
  );
  const [open, setOpen] = useState(!params.has("shut"));
  const [saved, setSaved] = useState(false);
  const [narrow, setNarrow] = useState(() => window.innerWidth <= NARROW);
  const [vw, setVw] = useState(() => window.innerWidth);
  const root = useRef<HTMLElement>(document.documentElement);
  const gameId = /\/games\/([^/]+)\//.exec(location.pathname)?.[1] ?? "";

  useEffect(() => {
    const on = () => {
      setNarrow(window.innerWidth <= NARROW);
      setVw(window.innerWidth);
    };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  useEffect(() => {
    const el = document.createElement("style");
    el.dataset.designCss = "";
    el.textContent = BENCH_CSS;
    document.head.append(el);
    return () => el.remove();
  }, []);

  // The tokens follow the spec, and the ARM follows the viewport - a custom
  // property set on the root beats the 719px media query, so writing the wide
  // values on a phone would silently show the desktop chrome and read as a bug
  // in the chrome rather than in the bench.
  useEffect(() => {
    const el = root.current;
    const paint = () => applySpec(spec, el, window.innerWidth <= NARROW);
    paint();
    window.addEventListener("resize", paint);
    // eslint-disable-next-line no-console
    console.info("[design]", JSON.stringify(spec));
    return () => {
      window.removeEventListener("resize", paint);
      clearSpec(el);
    };
  }, [spec]);

  const set = (key: keyof ChromeSpec, value: number | string) => {
    setSaved(false);
    setSpec((s) => ({ ...s, [key]: value }) as ChromeSpec);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={narrow ? { ...TAB, insetBlockStart: "auto", insetBlockEnd: 0, insetInlineEnd: 0 } : { ...TAB, insetInlineEnd: 0 }}
      >
        design
      </button>
    );
  }

  return (
    <aside data-design-drawer style={narrow ? SHEET : PANEL} dir="ltr">
      <header style={HEAD}>
        <b style={{ fontSize: 13 }}>Design bench</b>
        <button type="button" onClick={() => setOpen(false)} style={GHOST}>
          hide
        </button>
      </header>

      {/*
        Any game, and the CURRENT width beside it.

        The chrome branches at 719px, so a decision taken on a desktop says
        nothing about a phone. This drawer draws over the real page, so the
        viewport IS the browser window - it cannot fake a phone, and faking
        one with a width on `<html>` would leave every `position:fixed` bar
        tracking the real window while the number said 390. So it REPORTS the
        arm instead, and `#/lab/design` is where a real 390px viewport lives,
        because an iframe is one.
      */}
      <div style={{ ...ROW, marginBottom: 10 }}>
        <select
          data-design-game
          value={gameId}
          onChange={(e) => {
            const q = new URLSearchParams(location.search);
            location.href = `/games/${e.currentTarget.value}/?${q.toString()}`;
          }}
          style={SELECT}
        >
          {ROSTER.map((g) => (
            <option key={g.id} value={g.id}>
              {g.id}
            </option>
          ))}
        </select>
        <span style={{ ...NOTE, alignSelf: "center" }}>
          {vw}px · {narrow ? "phone arm" : "desktop arm"}
        </span>
      </div>

      <div style={ROW}>
        {Object.keys(VARIANTS).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              setSaved(false);
              setSpec(VARIANTS[name]);
            }}
            style={{
              ...PILL,
              background: same(spec, VARIANTS[name]) ? "#2563eb" : "#1e293b",
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {KNOBS.map((k) => {
        const key = (narrow && ARMED[k.key] ? ARMED[k.key] : k.key) as keyof ChromeSpec;
        return (
          <label key={k.key} style={{ display: "block", marginBottom: 10 }}>
            <span style={LBL}>
              {k.label}
              {key === k.key ? null : (
                <em style={{ fontStyle: "normal", fontSize: 10, color: "#38bdf8" }}>phone</em>
              )}
              <b style={{ color: "#e2e8f0" }}>{spec[key] as number}px</b>
            </span>
            <input
              type="range"
              min={k.min}
              max={k.max}
              value={spec[key] as number}
              onChange={(e) => set(key, Number(e.currentTarget.value))}
              style={{ width: "100%", accentColor: "#2563eb" }}
            />
            <span style={NOTE}>{k.note}</span>
          </label>
        );
      })}

      {CHOICES.map((c) => (
        <div key={c.key} style={{ marginBottom: 8 }}>
          <span style={LBL}>
            {c.label}
            {PREVIEWABLE.has(c.key) ? null : (
              <em style={{ color: "#f59e0b", fontStyle: "normal", fontSize: 10 }}>
                records only
              </em>
            )}
          </span>
          <div style={ROW}>
            {c.options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => set(c.key, o)}
                style={{ ...PILL, background: spec[c.key] === o ? "#2563eb" : "#1e293b" }}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ ...ROW, marginTop: 12 }}>
        <button
          type="button"
          onClick={() => {
            savePick(spec);
            setSaved(true);
          }}
          style={{ ...PILL, background: "#16a34a", flex: 1 }}
        >
          {saved ? "picked ✓" : "PICK"}
        </button>
        <button
          type="button"
          onClick={() => {
            clearPick();
            setSaved(false);
            setSpec(SHIPPED);
          }}
          style={GHOST}
        >
          reset
        </button>
      </div>

      {/* The numbers, as text, so a screenshot of the bench carries the spec
          rather than only a picture of it. A pick nobody can read back is the
          prose we are replacing. */}
      <pre data-design-spec style={PRE}>
        {JSON.stringify(spec, null, 1)}
      </pre>
    </aside>
  );
}

const same = (a: ChromeSpec, b: ChromeSpec) => JSON.stringify(a) === JSON.stringify(b);

const PANEL: React.CSSProperties = {
  position: "fixed",
  insetBlockStart: 0,
  insetInlineEnd: 0,
  zIndex: 9999,
  width: 268,
  maxHeight: "100dvh",
  overflow: "auto",
  padding: "12px 14px 16px",
  background: "#0f172a",
  color: "#cbd5e1",
  font: "500 12px/1.35 ui-sans-serif,system-ui,sans-serif",
  boxShadow: "0 0 0 1px #1e293b, 0 18px 40px rgba(0,0,0,.5)",
};
const HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
  color: "#f8fafc",
};
/**
 * On a phone the drawer is a bottom SHEET, not a side panel. At 268px of a
 * 390px screen the panel covers the board, and a bench you cannot see the game
 * through is a bench that cannot be used for the one thing it is for.
 */
const SHEET: React.CSSProperties = {
  position: "fixed",
  insetInline: 0,
  insetBlockEnd: 0,
  zIndex: 9999,
  width: "auto",
  maxHeight: "52dvh",
  overflow: "auto",
  padding: "10px 14px 16px",
  background: "#0f172ae6",
  backdropFilter: "blur(6px)",
  color: "#cbd5e1",
  font: "500 12px/1.35 ui-sans-serif,system-ui,sans-serif",
  boxShadow: "0 -1px 0 #1e293b, 0 -18px 40px rgba(0,0,0,.5)",
};

const ROW: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };
const PILL: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  color: "#f8fafc",
  font: "inherit",
  cursor: "pointer",
};
const GHOST: React.CSSProperties = { ...PILL, background: "transparent", color: "#94a3b8" };
const LBL: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 2,
  color: "#94a3b8",
};
const NOTE: React.CSSProperties = { display: "block", fontSize: 10, color: "#64748b" };
const TAB: React.CSSProperties = {
  ...PILL,
  position: "fixed",
  insetBlockStart: 0,
  zIndex: 9999,
  background: "#0f172a",
};
const PRE: React.CSSProperties = {
  margin: "12px 0 0",
  padding: 8,
  background: "#020617",
  borderRadius: 8,
  fontSize: 10,
  lineHeight: 1.3,
  color: "#7dd3fc",
  whiteSpace: "pre-wrap",
};

const SELECT: React.CSSProperties = {
  background: "#1e293b",
  color: "#e2e8f0",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: "5px 8px",
  fontSize: 12,
};
