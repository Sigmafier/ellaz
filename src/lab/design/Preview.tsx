import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

/**
 * A real page, previewed at its real width, on a screen narrower than it.
 *
 * This owns the whole PREVIEW COLUMN - its controls, the frame, the note under
 * it - because two of the three things below only work if one element owns all
 * three.
 *
 * SCALE, NEVER NARROW. The frame stays `w` CSS pixels wide whatever the screen
 * is, so the document inside still lays out as a `w`-wide viewport - media
 * queries and `position:fixed` both read it - and every number measured off it
 * is the number a real phone produces. The transform is paint, not layout: a
 * `getBoundingClientRect` inside the frame is in the FRAME's coordinate space
 * and a transform out here cannot reach it. Narrowing the frame instead would
 * answer a question nobody asked, which is what a 366px preview of a 390px
 * screen is.
 *
 * THE SHIELD is the one that made the bench unusable. An iframe is a separate
 * document, so a swipe that lands on it scrolls THAT page - and a game page is
 * `body{overflow:hidden}`, so it scrolls nothing and the gesture is simply
 * eaten. Measured on ellaz.fun at 390x844: the preview spanned y=182..742, two
 * thirds of the screen, and a wheel over it moved the lab by 0px while the
 * same wheel 40px lower moved it by 1146. That is the whole of "the lab does
 * not do anything" - the knobs were below the fold behind a dead zone.
 *
 * So a transparent sheet sits over the frame and the gesture reaches the page
 * again. Poking the game is then a deliberate act, which is the right default
 * for a surface whose job is to be LOOKED at.
 *
 * THE PIN keeps the preview on screen while the knobs are dialled underneath
 * it, because on a phone the columns stack and a knob you cannot see the
 * effect of is barely better than one that does nothing.
 */
export function Preview({
  frameRef,
  frameKey,
  title,
  src,
  w,
  h,
  controls,
}: {
  frameRef: RefObject<HTMLIFrameElement>;
  /** Forces a reload when the previewed thing changes (the game, the arm). */
  frameKey?: string;
  title: string;
  src?: string;
  w: number;
  h: number;
  /** The picker row for this preview. It rides INSIDE the pinned column. */
  controls?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);
  const [live, setLive] = useState(false);
  const [screen, setScreen] = useState(() =>
    typeof window === "undefined" ? { w: 1200, h: 900 } : { w: innerWidth, h: innerHeight },
  );

  useEffect(() => {
    const read = () => setScreen({ w: innerWidth, h: innerHeight });
    addEventListener("resize", read);
    return () => removeEventListener("resize", read);
  }, []);

  // The observed element is `width:100%` and its height comes from its child,
  // so watching its WIDTH cannot feed back into the scale that sizes the child.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setAvail(el.getBoundingClientRect().width);
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 720 is the app's own chrome breakpoint, the line `layout.ts` and
  // `GameChrome` already branch at, rather than a number picked here.
  const stacked = screen.w < 720;
  const fit = avail > 0 ? Math.min(1, avail / w) : 1;
  const capped = Math.min(fit, (screen.h * 0.62) / h);
  // Pin it only if it can still be READ. Giving up more than a quarter of the
  // picture to keep it on screen is the wrong trade for a bench whose job is
  // judging whether a row wraps by one pixel - measured, an 844-tall frame
  // pinned on an 844 screen came out 195px wide, which is a thumbnail. So the
  // tall arm scrolls and the short ones pin.
  const pin = stacked && capped >= fit * 0.75;
  const scale = pin ? capped : fit;

  return (
    /**
     * `position: sticky` HAS to be on this element - the flex ITEM - and not
     * on anything inside it. A sticky box is clamped to its containing block,
     * so a sticky div inside a column that is exactly as tall as the preview
     * has nowhere to travel; it scrolls away looking exactly like a browser
     * that does not support sticky.
     *
     * Measured, two arms and one variable: with `sticky` on an inner box the
     * frame ended at top -594 after a 700px scroll, and with it on the flex
     * item at top 0.
     */
    <div
      ref={box}
      style={{
        flex: "1 1 320px",
        minWidth: 0,
        maxWidth: "100%",
        ...(pin
          ? { position: "sticky", top: 0, zIndex: 3, background: "#020617", paddingBottom: 6 }
          : null),
      }}
    >
      {controls}
      <div style={{ position: "relative", width: w * scale, height: h * scale }}>
        <iframe
          key={frameKey}
          ref={frameRef}
          title={title}
          src={src}
          style={{
            width: w,
            height: h,
            display: "block",
            // A RING, not a border. `* { box-sizing: border-box }` is in the
            // app's own reset, so a 1px border on a `width: 390` frame makes
            // the document inside 388 CSS pixels wide - and this bench spends
            // its time on rows that fit or wrap by ONE pixel. Measured: 388
            // with a border, 390 with a shadow. A box-shadow paints and does
            // not lay out.
            border: "none",
            boxShadow: `0 0 0 1px ${live ? "#818cf8" : "#334155"}`,
            borderRadius: 10,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
        {live ? null : <div style={SHIELD} aria-hidden="true" />}
      </div>
      <div style={FOOT}>
        <button type="button" style={BTN} onClick={() => setLive((v) => !v)}>
          {live ? "stop playing" : "tap to play"}
        </button>
        <span style={NOTE}>
          {live
            ? "the preview is taking your taps - swiping over it will not scroll"
            : `${Math.round(scale * 100)}% of a real ${w}px screen · swipe anywhere to scroll`}
        </span>
      </div>
    </div>
  );
}

const SHIELD: CSSProperties = { position: "absolute", inset: 0, borderRadius: 10 };
const FOOT: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  margin: "6px 0 0",
};
const BTN: CSSProperties = {
  font: "inherit",
  fontSize: 12,
  padding: "4px 8px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#e2e8f0",
  cursor: "pointer",
};
const NOTE: CSSProperties = { fontSize: 11, color: "#64748b" };
