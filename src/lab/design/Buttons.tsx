import { useCallback, useEffect, useRef, useState } from "react";
import { GAMES as ROSTER } from "../../portal/games";

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

const GAMES = ROSTER.map((g) => g.id);

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
  const [mode, setMode] = useState<"one" | "wall">("one");
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
            ["one", "A · one game, knobs beside it"],
            ["wall", "C · the wall"],
          ]}
          onPick={(m) => setMode(m as "one" | "wall")}
        />
        <label style={{ ...NOTE, display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.currentTarget.checked)} />
          apply the standard
        </label>
      </div>

      <Knobs std={std} setStd={setStd} disabled={!on} />

      {mode === "one" ? <OneGame std={std} on={on} /> : <Wall std={std} on={on} />}
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
const CARD: React.CSSProperties = {
  display: "grid",
  gap: 6,
  padding: 8,
  border: "1px solid #1e293b",
  borderRadius: 8,
  background: "#0f172a",
};
