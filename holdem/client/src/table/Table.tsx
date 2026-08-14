import { useCallback, useState } from "react";
import { CardFace } from "./CardFace";
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
  const { view, you, chats } = useApp();
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
            background: "radial-gradient(ellipse at 50% 38%, var(--felt-hi) 0%, var(--felt) 55%, var(--felt-edge) 100%)",
            border: `${Math.max(6, u(10))}px solid var(--rail)`,
            boxShadow: "inset 0 0 60px rgba(0,0,0,.5), 0 8px 30px rgba(0,0,0,.5)",
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
            <>
              <div
                id="pot-chip"
                style={{
                  background: "var(--pot-bg)",
                  border: `1px solid var(--gold)`,
                  borderRadius: "var(--radius-pill)",
                  padding: `${u(4)}px ${u(16)}px`,
                  fontSize: u(17),
                  fontWeight: 900,
                  color: "var(--gold)",
                  whiteSpace: "nowrap",
                  letterSpacing: 0.3,
                }}
              >
                {t("pot")} {hand.potTotal}
              </div>
              <div style={{ display: "flex", gap: u(5), minHeight: u(62) }}>
                {hand.board.map((c, i) => (
                  <CardFace key={`${hand.handNo}-${i}`} card={c} size={u(42)} delay={i * 90} />
                ))}
              </div>
            </>
          ) : view.phase === "waiting" ? (
            <div style={{ color: "var(--ink-dim)", fontSize: u(15), fontWeight: 600 }}>{t("waitingForPlayers")}</div>
          ) : null}
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
          <div style={{ position: "absolute", bottom: wide ? 10 : 90, insetInlineEnd: 10, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, zIndex: 20 }}>
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
