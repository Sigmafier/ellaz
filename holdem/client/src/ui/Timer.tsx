// The action clock.
//
// Driven from requestAnimationFrame against wall-clock elapsed, never a frame
// COUNT — ellaz has a whole rule about a fixed 60 Hz assumption freezing every
// other frame on a 120 Hz display. Deriving the width from the real deadline
// each frame is immune to refresh rate by construction.
//
// It reads state.clockOffsetMs, so a phone with a wrong clock still sees the
// truth. See the tests in net/state.test.ts.

import { useEffect, useRef } from "react";

import { type ClientState, msLeft } from "../net/state";

export function Timer({ state }: { state: ClientState }) {
  const fillRef = useRef<HTMLDivElement>(null);
  const total = state.view?.config.actionTimeMs ?? 20_000;
  const deadline = state.timer?.deadlineEpochMs ?? 0;
  const bank = state.timer?.timeBank ?? false;

  useEffect(() => {
    if (!deadline) return;
    let raf = 0;

    const tick = () => {
      const el = fillRef.current;
      if (el) {
        const left = msLeft(state, Date.now());
        const span = bank ? total + (state.view?.config.timeBankMs ?? 0) : total;
        const pct = Math.max(0, Math.min(100, (left / span) * 100));
        el.style.width = `${pct}%`;
        el.classList.toggle("urgent", left < 5_000);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `state` is read inside the loop rather than captured per render, so the
    // dependency list only needs what changes the SHAPE of the countdown.
  }, [deadline, bank, total, state]);

  if (!deadline) return null;
  return (
    <div className="timer-track" aria-hidden="true">
      <div className="timer-fill" ref={fillRef} style={{ width: "100%" }} />
    </div>
  );
}
