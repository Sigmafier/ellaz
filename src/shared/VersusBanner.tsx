// Whose turn it is, said WITHOUT A WORD.
//
// This is the one screen in the app a pre-reader has to read, so it says the
// same thing four ways at once and none of them is text:
//
//   COLOUR   the active seat's card is tinted with that seat's colour and ringed
//            in the full accent — the same colour their pieces wear on the board.
//   SIZE     the active card is bigger, and so is the face on it.
//   MOTION   the active card pulses (`ellaz-pulse`, already in global.css).
//   A FACE   each player is an animal, from `sdk/names.ts`. A four-year-old who
//            cannot read "Swift Tiger" can absolutely tell a tiger from a frog.
//
// WHAT IS NOT HERE: the waiting card is NOT dimmed. Four signals already say
// whose turn it is, and a fifth that fades the other player is the only one that
// reads as a penalty rather than as a pointer — on a screen whose whole job is
// that losing does not feel like losing. Dropping it also removes a contrast
// problem it had quietly created: `--text-dim` behind 62% opacity falls under
// the 4.5:1 floor, and the pairing on a plain surface is already measured.
//
// The words that ARE here are for the adult in the room and for a screen
// reader: an `aria-label` on the banner saying whose turn it is, and a label on
// the mode button. Nothing a child needs is spelled.
//
// It lives in `src/shared/` and not in `src/ui/` on purpose. `src/ui/` is
// pinned to the SHELL chunk (see the `manualChunks` comments in vite.config.ts),
// so a component there is downloaded by every child on their first visit —
// before they have chosen a game, let alone invited a sibling. `src/shared/` is
// the `page-*` chunk, which is exactly the right lifetime for this.
import type { Locale } from "@i18n/index";
import { nameEmoji, renderName } from "@sdk/names";
import { seatTint, versusWords, type Seat, type VersusState } from "./versus";

/** How big the tap target on the mode button is. Comfortably past the 44px floor. */
const TAP = 56;

function seatText(v: VersusState, seat: Seat, locale: Locale): string {
  return renderName(v.players[seat].name, locale) ?? "";
}

export interface VersusBannerProps {
  v: VersusState;
  locale: Locale;
  /**
   * The number under each face. The game chooses what it means: memory shows the
   * pile taken THIS match, tictactoe shows matches won this sitting — because
   * that is the number each of those games actually gives a child to watch.
   */
  counts: readonly [number, number];
  /**
   * Set once a match is decided, cleared when the next one is dealt. It swaps
   * the "whose turn" emphasis for a "who won" one, and on a draw lights neither.
   */
  result?: Seat | "draw";
}

/**
 * The banner. Sits in `GameChrome`'s `footer`, which is the region that exists
 * for exactly this — its own header comment says a game with nothing to put
 * there should say "whose turn it is" instead.
 */
export function VersusBanner({ v, locale, counts, result }: VersusBannerProps) {
  const w = versusWords(locale);
  const winner = result === undefined || result === "draw" ? undefined : result;
  const active: Seat | undefined = winner ?? (result === "draw" ? undefined : v.turn);
  const label =
    winner !== undefined
      ? w.wonBy(seatText(v, winner, locale))
      : result === "draw"
        ? w.tie
        : w.turnOf(seatText(v, v.turn, locale));

  return (
    <div
      // The banner is a live region so a screen reader announces the handover.
      // Sighted children get the colour; this is the same fact for everyone else.
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "stretch",
        // No `dir` pin. Two seats have no spatial meaning — nothing is swiped,
        // nothing is aimed — so the row is allowed to read in the document's own
        // direction, and player one sits where the reader starts.
        gap: 8,
        minHeight: 98,
      }}
    >
      {([0, 1] as const).map((seat) => {
        const on = active === seat;
        return (
          <div
            key={seat}
            className={on && winner === undefined ? "ellaz-pulse" : undefined}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: "9px 6px",
              borderRadius: "var(--radius-2)",
              // Filled with their own colour when it is theirs; a plain card
              // otherwise. Never grey, never crossed out — the seat that is
              // waiting is waiting, not losing.
              background: on ? seatTint(v.players[seat].color) : "var(--surface)",
              // The ring is the FULL accent, and it is an outline rather than a
              // box-shadow because `ellaz-pulse` animates box-shadow and would
              // wipe it out on exactly the card that most needs it.
              outline: on ? `3px solid ${v.players[seat].color}` : undefined,
              outlineOffset: -3,
              boxShadow: "var(--shadow-1)",
              transform: on ? "scale(1.03)" : "scale(1)",
              transition: "transform 0.18s ease, background 0.18s ease",
            }}
          >
            <span
              aria-hidden="true"
              style={{ fontSize: on ? 34 : 28, lineHeight: 1, transition: "font-size 0.18s ease" }}
            >
              {nameEmoji(v.players[seat].name) ?? "🙂"}
            </span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 800,
                lineHeight: 1.1,
                fontFamily: "Fredoka, inherit",
                color: "var(--text)",
              }}
            >
              {counts[seat]}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                // `--text-dim` measures under the 4.5:1 floor on the tinted
                // card (3.89 at worst), so the ACTIVE card never uses it. See
                // SEAT_TINT_PERCENT for the full measurement.
                color: on ? "var(--text)" : "var(--text-dim)",
              }}
            >
              {seatText(v, seat, locale)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The one control that starts and ends a game with someone else.
 *
 * It shows WHAT TAPPING IT GIVES YOU, rather than what mode you are in — the
 * same precedent memory's "new set" button set, which shows the faces it is
 * about to deal. So in one-player mode it reads "two players" and draws two
 * faces; in two-player mode it reads "one player" and draws one.
 */
export function VersusToggle({
  on,
  locale,
  onToggle,
}: {
  on: boolean;
  locale: Locale;
  onToggle: () => void;
}) {
  const w = versusWords(locale);
  const text = on ? w.one : w.two;
  return (
    <button
      type="button"
      aria-label={text}
      aria-pressed={on}
      onClick={onToggle}
      style={{
        width: "100%",
        minHeight: TAP,
        border: "none",
        borderRadius: "var(--radius-2)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
        color: "var(--text)",
        fontFamily: "inherit",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 800 }}>{text}</span>
      <span aria-hidden="true" style={{ fontSize: 24, lineHeight: 1, letterSpacing: 1 }}>
        {on ? "🧍" : "🧑‍🤝‍🧑"}
      </span>
    </button>
  );
}
