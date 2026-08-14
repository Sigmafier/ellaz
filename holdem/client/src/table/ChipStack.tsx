import { chipStack, chipVar, visibleColumns } from "./chips";

/**
 * A bet, drawn as chips.
 *
 * The NUMBER is always rendered beside the pile and is the authority. The
 * chips exist so a glance tells you roughly how big a bet is without reading
 * one — which is the whole reason a real table uses them.
 *
 * Every chip is CSS. No images, no SVG files, no fonts: a game may not make an
 * external network request (the rule that lets this SDK be listed on a portal
 * at all), and 24 chip PNGs would cost more than the entire client bundle.
 */
export function ChipStack({
  amount,
  scale,
  maxColumns = 4,
  maxPerColumn = 5,
  size = 12,
  showNumber = true,
}: {
  amount: number;
  scale: number;
  maxColumns?: number;
  maxPerColumn?: number;
  /** Chip diameter before scaling. */
  size?: number;
  showNumber?: boolean;
}) {
  const u = (n: number) => Math.round(n * scale);
  const cols = visibleColumns(chipStack(amount), maxColumns);
  const d = u(size);
  // A chip's drawn height. 0.32, not 0.42: at 0.42 a three-chip stack came out
  // 26x21 — very nearly SQUARE, which is not a shape a stack of chips has. The
  // flatter each chip is, the more the pile reads as a pile.
  const chipH = Math.max(4, Math.round(d * 0.32));

  // No chips is a real answer — a zero bet, or an amount this cannot honestly
  // represent (see chips.ts). Draw the number alone rather than nothing, so a
  // caller never has to decide whether it is safe to render.
  if (!cols.length) {
    return showNumber ? <Number amount={amount} d={d} /> : null;
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: Math.max(2, u(3)) }}>
      {cols.map((c) => (
        <div
          key={c.value}
          aria-hidden
          style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center" }}
        >
          {Array.from({ length: Math.min(c.count, maxPerColumn) }, (_, i) => (
            <div
              key={i}
              // A stable hook for tests and probes. Matching a chip by its
              // inline STYLE string does not work — the browser normalises
              // `rgba(255,255,255,.38)` to `rgba(255, 255, 255, 0.38)` and the
              // selector written from the source silently matches nothing,
              // which reads exactly like "no chips were drawn".
              data-chip={c.value}
              style={{
                width: d,
                // A chip is drawn as a FLATTENED ELLIPSE, not a circle.
                //
                // This is the whole difference between a stack that reads as
                // chips and one that reads as a coloured capsule, and the
                // circle version had to be seen to be believed: stack three
                // circles with a heavy overlap and you get a rounded vertical
                // bar, because that is exactly what the silhouette of
                // overlapping circles is. A real stack is seen from slightly
                // above the table edge, so each chip is an ellipse and only a
                // sliver of the ones below shows.
                height: chipH,
                borderRadius: "50%",
                background: [
                  // Lit on top, shadowed at the bottom. This ONE gradient is
                  // what makes it read as a solid object rather than a
                  // coloured oval, and it is all there is room for.
                  //
                  // The milled edge stripes that used to be here are gone: at
                  // an 8px chip height a 1px repeating pattern is not detail,
                  // it is noise, and three stacked chips came out looking like
                  // a square of red plaid. Detail below the size it is drawn
                  // at makes a thing look worse, not richer.
                  "linear-gradient(to bottom, rgba(255,255,255,.38) 0 44%, rgba(0,0,0,.28) 44% 100%)",
                  chipVar(c.value),
                ].join(", "),
                // The light ring is what separates one chip from the next in
                // a stack; without it the overlap fuses them into one shape.
                boxShadow: "0 1px 1px rgba(0,0,0,.55), inset 0 0 0 1px var(--chip-edge)",
                // Show a sliver of each chip below. Tuned against a render:
                // too much overlap and it is a bar again, too little and it is
                // a ladder of separate coins.
                marginBottom: i === 0 ? 0 : -Math.round(chipH * 0.45),
              }}
            />
          ))}
        </div>
      ))}
      {showNumber && <Number amount={amount} d={d} />}
    </div>
  );
}

function Number({ amount, d }: { amount: number; d: number }) {
  return (
    <span
      style={{
        fontSize: Math.max(10, Math.round(d * 0.95)),
        fontWeight: 800,
        color: "var(--chip)",
        lineHeight: 1,
        textShadow: "0 1px 2px rgba(0,0,0,.55)",
        whiteSpace: "nowrap",
      }}
    >
      {amount}
    </span>
  );
}
