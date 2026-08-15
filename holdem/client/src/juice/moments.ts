// The juice layer: engine events and turn changes become sound, haptics and
// motion. Everything here is cosmetic and wrapped so a failure can never
// touch gameplay (the ellaz winMoment discipline, minus the economy).
//
// DOM contract: each seat renders id="seat-<idx>", the pot renders id="pot-chip".

import type { EngineEvent } from "@shared/engine/types";
import { play } from "../audio/audio";
import { haptic } from "./haptics";
import { celebrate, flyTo, shake } from "./effects";
import { getState, onEngineEvents } from "../state/store";

const seatCenter = (seat: number): { x: number; y: number } | null => {
  const el = document.getElementById(`seat-${seat}`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

const potEl = () => document.getElementById("pot-chip");

const chipNode = (): Node => {
  const d = document.createElement("div");
  d.style.cssText =
    "width:.9em;height:.9em;border-radius:50%;background:var(--chip);border:2px dashed rgba(0,0,0,.35)";
  return d;
};

function chipsToPot(seat: number, big: boolean): void {
  const from = seatCenter(seat);
  if (!from) return;
  flyTo(from, potEl(), { particle: chipNode, count: big ? 8 : 4 });
}

function potToSeat(seat: number): void {
  const pot = potEl();
  const to = document.getElementById(`seat-${seat}`);
  if (!pot || !to) return;
  const r = pot.getBoundingClientRect();
  flyTo({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, to, { particle: chipNode, count: 8 });
}

function handleEvents(events: EngineEvent[]): void {
  const state = getState();
  const mySeat = state.you?.seatIdx ?? -1;
  const bb = state.view?.config.bb ?? 2;

  for (const e of events) {
    switch (e.type) {
      case "HandStarted": {
        // The shuffle, THEN the deal. New on 2026-08-15: a hand used to begin
        // with cards already moving, which is the one moment at a real table
        // that has an unmistakable sound of its own.
        play("shuffle");
        e.dealtSeats.forEach((_, i) => {
          setTimeout(() => play("cardSlide", { semitones: (i % 3) - 1 }), 320 + i * 70);
        });
        break;
      }
      case "BlindPosted":
        play("chipClack", { gain: 0.5 });
        chipsToPot(e.seat, false);
        break;
      case "ActionTaken":
        if (e.kind === "check") {
          play("checkKnock");
        } else if (e.kind === "fold") {
          play("fold", { gain: e.seat === mySeat ? 1 : 0.5 });
        } else {
          // A raise sounds like more chips than a call, which is the whole
          // information a table gives you before you look at the number.
          const aggressive = e.kind === "raise" || e.kind === "bet";
          play(aggressive ? "chipRaise" : "chipClack");
          chipsToPot(e.seat, aggressive);
          if (e.seat === mySeat) haptic.tap();
        }
        if (e.allIn) {
          play("allIn");
          const felt = document.getElementById("felt");
          if (felt) shake(felt, 5, 220);
        }
        break;
      case "StreetDealt":
        e.cards.forEach((_, i) => {
          setTimeout(() => play("cardSlide", { semitones: i }), i * 110);
        });
        break;
      case "ShowdownReveal":
        // New on 2026-08-15. Turning a hand over was silent, which made the
        // one beat the pacer holds 1.2s open for the quietest thing on the
        // felt.
        play("reveal");
        break;
      case "PotAwarded": {
        const iWon = e.winners.includes(mySeat);
        setTimeout(() => {
          play("potSlide");
          for (const w of e.winners) potToSeat(w);
        }, 500);
        if (iWon) {
          setTimeout(() => {
            play("win");
            haptic.win();
            if (e.amount >= bb * 20) celebrate();
          }, 900);
        }
        break;
      }
      default:
        break;
    }
  }
}

let detach: (() => void) | null = null;
let lastTurnKey = "";

/** Idempotent — RoomScreen calls this on mount. */
export function attachJuice(): () => void {
  if (detach) return detach;
  const offEvents = onEngineEvents((events) => {
    try {
      handleEvents(events);
    } catch {
      /* cosmetic only */
    }
  });

  // Your-turn ding: watch the store for the action moving to my seat.
  const turnTimer = setInterval(() => {
    try {
      const s = getState();
      const hand = s.view?.hand;
      const mySeat = s.you?.seatIdx ?? -1;
      if (!hand || mySeat < 0) return;
      const key = `${hand.handNo}:${hand.actionSeq}`;
      if (hand.toAct === mySeat && s.you?.legal && key !== lastTurnKey) {
        lastTurnKey = key;
        play("yourTurn");
        haptic.success();
      }
    } catch {
      /* cosmetic only */
    }
  }, 300);

  detach = () => {
    offEvents();
    clearInterval(turnTimer);
    detach = null;
  };
  return detach;
}
