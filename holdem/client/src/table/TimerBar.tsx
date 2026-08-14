import { useEffect, useState } from "react";
import { useApp } from "../state/store";
import { msLeft, totalMs } from "../state/timer";

/**
 * Shrinking countdown for the acting seat, computed against the server's
 * clock: remaining = deadline - (serverNow + elapsed since we received it).
 * Never trusts the phone's absolute clock, only its ability to count.
 */
export function TimerBar({ seatIdx, width = 64 }: { seatIdx: number; width?: number }) {
  const { timer, view } = useApp();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(id);
  }, []);

  if (!timer || timer.seatIdx !== seatIdx) return null;
  const remaining = msLeft(timer);
  const total = totalMs(timer, view?.config.actionTimeMs ?? 25_000, view?.config.timeBankMs ?? 0);
  const frac = Math.min(1, remaining / total);
  const urgent = remaining < 6_000;
  return (
    <div style={{ width, height: 5, borderRadius: 3, background: "rgba(0,0,0,.45)", overflow: "hidden" }}>
      <div
        style={{
          width: `${frac * 100}%`,
          height: "100%",
          borderRadius: 3,
          background: urgent ? "var(--danger)" : timer.timeBank ? "#7ec3ef" : "var(--gold)",
          transition: "width 240ms linear",
        }}
      />
    </div>
  );
}
