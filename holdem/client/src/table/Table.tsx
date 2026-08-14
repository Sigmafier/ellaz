import { useCallback, useState } from "react";
import { CardFace } from "./CardFace";
import { ChipStack } from "./ChipStack";
import { Seat } from "./Seat";
import { ActionBar } from "./ActionBar";
import { WinMoment } from "./WinMoment";
import { seatPosition } from "./layout";
import { seatRadius } from "./scale";
import { useTableScale } from "./useTableScale";
import { socket } from "../net/socket";
import { useApp } from "../state/store";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";
import { EMOTES, type EmoteId } from "@shared/protocol";

const EMOTE_GLYPHS: Record<EmoteId, string> = {
  laugh: "😂",
  cry: "😭",
  nice: "👏",
  yalla: "🚀",
  bluff: "🤥",
  chicken: "🐔",
  bomb: "💣",
  clap: "🔥",
};

/** The felt: seats on an ellipse, board and pot in the middle. Pinned LTR. */
export function Table({ locale, spectator = false }: { locale: Locale; spectator?: boolean }) {
  const { view, you, chats, shownBoard } = useApp();
  const t = makeT(locale);
  const [buyInFor, setBuyInFor] = useState<number | null>(null);
  const [emotesOpen, setEmotesOpen] = useState(false);

  // The WRAPPER is measured, not the felt — see the note at the top of
  // scale.ts. Measuring the felt would let the side rail decide whether the
  // side rail exists.
  const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
  const { scale, shape } = useTableScale(wrapEl);
  const wide = shape === "wide";
  const u = useCallback((n: number) => Math.round(n * scale), [scale]);

  const n = view?.seats.length ?? 0;
  const mySeat = you?.seatIdx ?? -1;
  const radii = seatRadius(shape);
  const posOf = useCallback(
    (seat: number) => seatPosition(seat, Math.max(1, n), mySeat, radii),
    [n, mySeat, radii.rx, radii.ry],
  );

  if (!view) return null;
  const hand = view.hand;
  const seated = mySeat >= 0;
  const defaultBuyIn = Math.min(view.config.maxBuyIn, Math.max(view.config.minBuyIn, view.config.startingStack));

  return (
    <div
      ref={setWrapEl}
      dir="ltr"
      className="no-touch-drift"
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        // Wide puts the controls in a column beside the felt. This is a real
        // flex row rather than a fixed-position overlay, so the felt genuinely
        // gets the remaining width instead of being covered by the rail.
        flexDirection: wide ? "row" : "column",
      }}
    >
      <div style={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden" }}>
        {/* the felt. The insets here MUST match INSET_X / INSET_Y in scale.ts,
            which is how the scale arithmetic knows the felt's real box. */}
        <div
          id="felt"
          style={{
            position: "absolute",
            inset: wide ? "7% 4%" : "7% 4% 12% 4%",
            borderRadius: "48% / 40%",
            // Cloth, then light. Two 45-degree hatches at a 3px period read as
            // a weave at any size and cost nothing — where a texture IMAGE
            // would be an external request, which a game may not make, and a
            // data URI would be more bytes than the rest of this file.
            // Listed first so it sits ON TOP of the lighting gradient.
            background: [
              "repeating-linear-gradient(45deg, var(--cloth) 0 1px, transparent 1px 3px)",
              "repeating-linear-gradient(-45deg, var(--cloth) 0 1px, transparent 1px 3px)",
              "radial-gradient(ellipse at 50% 38%, var(--felt-hi) 0%, var(--felt) 55%, var(--felt-edge) 100%)",
            ].join(", "),
            border: `${Math.max(6, u(10))}px solid var(--rail)`,
            // Four layers make the rail read as padded rather than as a line:
            // the vignette, a dark ring just inside it, a lit ring just
            // outside it, and the table's own drop shadow.
            boxShadow: [
              "inset 0 0 60px rgba(0,0,0,.5)",
              "inset 0 0 0 2px var(--rail-lo)",
              "0 0 0 2px var(--rail-hi)",
              "0 8px 30px rgba(0,0,0,.5)",
            ].join(", "),
          }}
        />

        {/* board + pot */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            // Dead centre when wide, where the vertical budget is tight and
            // the block has seats above AND below it. 44% is the established
            // tall look, where there is room to sit high of centre.
            top: wide ? "50%" : "44%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: u(8),
          }}
        >
          {hand ? (
            /* The pot is CHIPS ON THE TABLE, not a badge.
               It was a pill with the pile squeezed inside it, and a pill
               has a fixed height — so a five-chip column overflowed it and
               read as a coloured bar. Chips sit on the cloth; the label
               goes beside them with a shadow to lift it off the felt. */
            <div
              id="pot-chip"
              style={{ display: "flex", alignItems: "flex-end", gap: u(9), filter: "drop-shadow(0 3px 4px rgba(0,0,0,.55))" }}
            >
              <ChipStack amount={hand.potTotal} scale={scale} size={20} maxColumns={4} maxPerColumn={4} showNumber={false} />
              <span
                style={{
                  fontSize: u(17),
                  fontWeight: 900,
                  color: "var(--gold)",
                  letterSpacing: 0.3,
                  whiteSpace: "nowrap",
                  textShadow: "0 2px 4px rgba(0,0,0,.75)",
                  lineHeight: 1.1,
                }}
              >
                {t("pot")} {hand.potTotal}
              </span>
            </div>
          ) : view.phase === "waiting" && shownBoard.length === 0 ? (
            <div style={{ color: "var(--ink-dim)", fontSize: u(15), fontWeight: 600 }}>{t("waitingForPlayers")}</div>
          ) : null}

          {/* The BOARD, outside the `hand` branch on purpose.
              `view.hand` goes null the instant the hand ends, so a board
              rendered inside that branch disappeared at exactly the moment
              everyone wanted to look at it — the winner was announced over
              bare cloth. `shownBoard` is the paced copy and outlives the
              hand; it is cleared by the next HandStarted. */}
          {(hand || shownBoard.length > 0) && (
            <div id="board" style={{ display: "flex", gap: u(5), minHeight: u(62) }}>
              {shownBoard.map((c, i) => (
                <CardFace
                  key={`${view.hand?.handNo ?? "end"}-${i}-${c}`}
                  card={c}
                  size={u(42)}
                  // Only the flop is a group, so only the flop staggers. The
                  // turn and the river are single cards arriving on their own
                  // beat — giving them index*90 would delay them behind a
                  // stagger that has nothing to stagger against.
                  delay={i < 3 ? i * 90 : 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* seats */}
        {view.seats.map((s) => {
          const pos = posOf(s.seat);
          return (
            <Seat
              key={s.seat}
              seat={s}
              x={pos.x}
              y={pos.y}
              isMe={s.seat === mySeat}
              locale={locale}
              scale={scale}
              shape={shape}
              onSitHere={!spectator && !seated && s.status === "empty" ? () => setBuyInFor(s.seat) : null}
            />
          );
        })}

        {/* who won — the banner, the hand they showed, and the pot flying home */}
        <WinMoment locale={locale} scale={scale} seatPos={posOf} />

        {/* floating emotes */}
        <div style={{ position: "absolute", top: u(8), left: "50%", transform: "translateX(-50%)", display: "flex", gap: u(6), pointerEvents: "none", zIndex: 22 }}>
          {chats.slice(-3).map((c) => (
            <div
              key={c.key}
              style={{
                background: "rgba(0,0,0,.55)",
                borderRadius: "var(--radius-pill)",
                padding: `${u(4)}px ${u(12)}px`,
                fontSize: u(15),
                animation: "holdem-pop 240ms var(--ease) both",
              }}
            >
              <bdi>{c.name}</bdi> {EMOTE_GLYPHS[c.emote as EmoteId] ?? c.emote}
            </div>
          ))}
        </div>

        {/* buy-in sheet */}
        {buyInFor !== null && (
          <BuyInSheet
            locale={locale}
            min={view.config.minBuyIn}
            max={view.config.maxBuyIn}
            initial={defaultBuyIn}
            league={view.config.chipsMode === "league"}
            onCancel={() => setBuyInFor(null)}
            onConfirm={(amount) => {
              socket.takeSeat(buyInFor, amount);
              setBuyInFor(null);
            }}
          />
        )}

        {/* emote tray toggle (seated only) */}
        {seated && (
          /* THE ONE PLACE EMOJI STAY, and it is marked so a sweep can say so.
             Everything else in this app is drawn (see ui/icons.tsx), because a
             glyph the phone chooses is not a picture we ship. An emote is the
             exception on purpose: the player is throwing a face across the
             table, their platform's own set is the one they recognise, and
             looking native to their phone is the point rather than a defect.
             The toggle wears the same mark — a smiley is what says "emoji
             live behind this button". */
          <div
            data-emote-tray
            style={{ position: "absolute", bottom: wide ? 10 : 90, insetInlineEnd: 10, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, zIndex: 20 }}
          >
            {emotesOpen && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, background: "var(--surface)", padding: 8, borderRadius: "var(--radius-2)", border: "1px solid var(--line)" }}>
                {EMOTES.map((e) => (
                  <button
                    key={e}
                    className="btn ghost"
                    style={{ minHeight: 40, fontSize: 19, padding: 0 }}
                    onClick={() => {
                      socket.chat(e);
                      setEmotesOpen(false);
                    }}
                  >
                    {EMOTE_GLYPHS[e]}
                  </button>
                ))}
              </div>
            )}
            <button className="btn ghost" style={{ minHeight: 40, fontSize: 17 }} onClick={() => setEmotesOpen((v) => !v)}>
              😄
            </button>
          </div>
        )}
      </div>

      <ActionBar locale={locale} scale={scale} shape={shape} />
    </div>
  );
}

function BuyInSheet({
  locale,
  min,
  max,
  initial,
  league,
  onCancel,
  onConfirm,
}: {
  locale: Locale;
  min: number;
  max: number;
  initial: number;
  league: boolean;
  onCancel: () => void;
  onConfirm: (amount: number) => void;
}) {
  const t = makeT(locale);
  const [amount, setAmount] = useState(initial);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
      }}
      onClick={onCancel}
    >
      <div
        dir={locale === "he" ? "rtl" : "ltr"}
        style={{ background: "var(--surface)", borderRadius: "var(--radius-2)", padding: 20, minWidth: 260, display: "flex", flexDirection: "column", gap: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <strong>{t("buyIn")}</strong>
        {league ? (
          <span style={{ color: "var(--ink-dim)", fontSize: 14 }}>{t("chipsLeague")}</span>
        ) : (
          <>
            <input
              dir="ltr"
              className="field"
              type="number"
              min={min}
              max={max}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <input
              dir="ltr"
              type="range"
              min={min}
              max={max}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{ accentColor: "var(--gold)" }}
            />
          </>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={onCancel}>
            {t("back")}
          </button>
          <button className="btn primary" style={{ flex: 1 }} onClick={() => onConfirm(amount)}>
            {t("sit")}
          </button>
        </div>
      </div>
    </div>
  );
}
