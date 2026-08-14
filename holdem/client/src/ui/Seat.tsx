import type { Card as CardId } from "@shared/engine/cards";
import type { PublicSeatView } from "@shared/engine/view";
import { nameEmoji, type PlayerName } from "@shared/names";

import { Card, CardBack } from "./Card";

export interface SeatProps {
  seat: PublicSeatView;
  name: string;
  ids: PlayerName | undefined;
  acting: boolean;
  isButton: boolean;
  isMe: boolean;
  /** Shown face-up only at showdown, or for your own seat. */
  reveal?: readonly CardId[];
  onSit?: () => void;
}

export function Seat({ seat, name, ids, acting, isButton, isMe, reveal, onSit }: SeatProps) {
  if (!seat.playerId) {
    return (
      <button className="seat empty" onClick={onSit} disabled={!onSit}>
        <span className="tiny dim">seat {seat.seat + 1}</span>
        <span className="tiny">{onSit ? "sit here" : "empty"}</span>
      </button>
    );
  }

  const classes = ["seat"];
  if (acting) classes.push("acting");
  if (seat.folded) classes.push("folded");

  return (
    <div className={classes.join(" ")}>
      <div className="seat-name">
        <span aria-hidden="true">{nameEmoji(ids) ?? "\u{1F0A0}"}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
          {isMe ? " (you)" : ""}
        </span>
      </div>

      <div className="row" style={{ gap: 4 }}>
        <span className="seat-stack">{seat.stack}</span>
        {isButton && <span className="chip">D</span>}
        {seat.allIn && <span className="chip">all in</span>}
        {seat.sittingOut && <span className="chip">out</span>}
      </div>

      {seat.committed > 0 && <span className="tiny dim">bet {seat.committed}</span>}

      {reveal && reveal.length > 0 ? (
        <div className="cards" style={{ justifyContent: "flex-start", marginTop: 4 }}>
          {reveal.map((c) => (
            <Card key={c} card={c} />
          ))}
        </div>
      ) : seat.inHand && !seat.folded && !isMe ? (
        // Never on my OWN seat: my cards are already shown face-up and larger
        // at the bottom of the felt, so a pair of backs here reads as a second,
        // different hand. Looked wrong the moment it was rendered, and no
        // assertion would ever have caught it.
        <div className="cards" style={{ justifyContent: "flex-start", marginTop: 4 }}>
          <CardBack />
          <CardBack />
        </div>
      ) : null}
    </div>
  );
}
