import { useEffect, useState } from "react";
import type { Card } from "@shared/engine/cards";
import { Animal } from "../ui/animals";
import { useApp } from "../state/store";
import { handName } from "./handName";
import type { SeatPos } from "./layout";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";

/**
 * What a hand ending looks like.
 *
 * Before this, the ENTIRE indication that somebody had won was one line in
 * Seat.tsx — `border: won ? "2px solid gold" : "1px solid line"`, a single
 * pixel of border width on a 76px nameplate. The string `t("winner")` was
 * authored in both dictionaries and rendered nowhere on the table.
 *
 * The four-second gap this fills already existed: the server has always waited
 * `INTER_HAND_MS = 4_000` before dealing again. Nothing was drawn in it, which
 * is why the pause read as the game having stalled rather than as a result.
 */
export function WinMoment({
  locale,
  scale,
  seatPos,
}: {
  locale: Locale;
  scale: number;
  /** Where a seat sits, in percent of the felt. Table owns the geometry. */
  seatPos: (seat: number) => SeatPos;
}) {
  const { lastPot, reveals, view, seatNames } = useApp();
  const t = makeT(locale);
  // Two frames: the chips start on the pot and are then told to move, so the
  // browser has a "from" to transition out of. Mounting them already at the
  // destination transitions from nothing and they simply appear there.
  const [flown, setFlown] = useState(false);

  useEffect(() => {
    if (!lastPot) {
      setFlown(false);
      return;
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFlown(true)));
    return () => cancelAnimationFrame(id);
  }, [lastPot?.at]);

  if (!lastPot || !view) return null;

  const u = (n: number) => Math.round(n * scale);
  const split = lastPot.winners.length > 1;
  const each = Math.round(lastPot.amount / Math.max(1, lastPot.winners.length));

  /**
   * One winner, as an element rather than a string.
   *
   * The animal used to be prefixed onto the name inside a template literal,
   * which only worked while it was a character. A drawn one has to be a node,
   * so the separator between winners moves out here too.
   */
  const label = (seat: number, i: number) => {
    const s = view.seats[seat];
    return (
      <span key={seat} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        {i > 0 ? <span style={{ opacity: 0.6, marginInlineEnd: 5 }}>·</span> : null}
        <Animal id={seatNames[seat]?.noun} size={Math.max(14, u(18))} />
        <bdi>{s?.name ?? `#${seat}`}</bdi>
      </span>
    );
  };

  /**
   * The hand they showed — or nothing at all.
   *
   * A fold-out has no showdown and no revealed cards, so there is no hand to
   * name and the banner says so instead. Naming a hand nobody turned over
   * would be inventing the one fact players argue about.
   */
  const shown = lastPot.winners
    .map((seat) => {
      const r = reveals[seat];
      if (!r || r === "muck") return null;
      return handName([...(r as readonly [Card, Card]), ...lastPot.board], locale);
    })
    .find((v): v is string => Boolean(v));

  return (
    <>
      {/* the chips, one per winner, riding from the pot to their seat */}
      {lastPot.winners.map((seat) => {
        const p = seatPos(seat);
        return (
          <div
            key={`fly-${seat}-${lastPot.at}`}
            aria-hidden
            style={{
              position: "absolute",
              left: flown ? `${p.x}%` : "50%",
              top: flown ? `${p.y}%` : "44%",
              transform: "translate(-50%, -50%)",
              transition: "left 620ms var(--ease) 260ms, top 620ms var(--ease) 260ms, opacity 200ms linear 820ms",
              opacity: flown ? 0 : 1,
              background: "var(--gold)",
              color: "var(--gold-ink)",
              borderRadius: "var(--radius-pill)",
              padding: `${u(4)}px ${u(13)}px`,
              fontSize: u(15),
              fontWeight: 900,
              boxShadow: "0 4px 14px rgba(0,0,0,.5)",
              zIndex: 24,
              pointerEvents: "none",
            }}
          >
            +{each}
          </div>
        );
      })}

      {/* The banner, in TWO elements, and the split is a bug fix rather than
          structure for its own sake.

          `holdem-pop` animates `transform`, and an animated transform REPLACES
          an inline one outright — so putting the pop on the same element as
          the `translate(-50%, -50%)` that centres it silently drops the
          centring and leaves the banner hanging down and to the right of where
          it belongs. It still looked deliberate, which is why it took a
          measurement rather than a glance: `left` and `top` read 364px/167.5px,
          exactly right, while the computed transform read `matrix(1.0059, …)`
          — a scale, with the translate gone.
          Outer element positions. Inner element animates. */}
      {/* ABOVE the board, never on it.
          At `top: 50%` this banner sat exactly where the community cards are —
          so the one moment a player most wants to see the board is the moment
          it was covered by a box telling them about it. The board block is
          centred at 44% (tall) / 50% (wide) and the cards hang below that, so
          26% clears them in both shapes while staying inside the felt. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "26%",
          transform: "translate(-50%, -50%)",
          maxWidth: "86%",
          zIndex: 25,
          pointerEvents: "none",
        }}
      >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: u(3),
          background: "var(--banner-bg)",
          border: `${Math.max(2, u(2))}px solid var(--gold)`,
          borderRadius: "var(--radius-2)",
          padding: `${u(10)}px ${u(20)}px`,
          textAlign: "center",
          animation: "holdem-pop 260ms var(--ease) both",
        }}
      >
        <div
          style={{
            fontSize: u(19),
            fontWeight: 900,
            color: "var(--ink)",
            lineHeight: 1.15,
            // Names are drawn from a pool and can be long ("Cheerful Elephant"
            // is 17 characters); wrapping is correct here rather than an
            // ellipsis, because the whole job of this line is to be read.
            overflowWrap: "anywhere",
          }}
        >
          <span style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", gap: 4 }}>
            {lastPot.winners.map(label)}
          </span>
        </div>
        <div style={{ fontSize: u(16), fontWeight: 800, color: "var(--gold)" }}>
          {split ? `${t("splitPot")} — ${each} ${t("each")}` : `${t("wins")} ${lastPot.amount}`}
        </div>
        {shown ? (
          <div style={{ fontSize: u(13), color: "var(--ink-dim)", fontWeight: 700 }}>{shown}</div>
        ) : (
          <div style={{ fontSize: u(13), color: "var(--ink-dim)" }}>{t("winsUncontested")}</div>
        )}

        {/* No cards here, deliberately.
            This banner used to carry its own copy of the board, because
            `view.hand` went null the moment the hand ended and the felt's
            board disappeared with it — so the copy was the only way to see
            what the pot was won on. That was a workaround for a bug that is
            now fixed at the source: `shownBoard` outlives the hand and the
            real board stays on the cloth, where the pot and the players'
            revealed hands are. Keeping the copy meant two nearly identical
            rows of five cards stacked on top of each other, and the one that
            mattered was the one nobody was looking at.
            `lastPot.board` is still the right thing to NAME the hand from —
            see `shown` above — it just is not drawn twice. */}
      </div>
      </div>
    </>
  );
}
