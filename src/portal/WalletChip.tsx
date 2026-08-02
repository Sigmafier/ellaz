import { useEffect, useRef, useState } from "react";
import { wallet } from "@sdk/index";
import { popEl, tween } from "@juice/index";

// The wallet readout, and the target the reward coins fly to.
//
// The anchor registry below is a module-level ref, deliberately tiny: it lets
// winMoment() find the chip without a game (or the SDK) knowing that a portal
// chrome element exists. Games still only ever talk to GameContext.

let anchor: HTMLElement | null = null;

/** Called by the chip on mount; pass null to clear (on unmount). */
export function registerWalletAnchor(el: HTMLElement | null): void {
  anchor = el;
}

/** The live chip element, or null when nothing is mounted to fly to. */
export function getWalletAnchor(): HTMLElement | null {
  return anchor && anchor.isConnected ? anchor : null;
}

/** How long the counter takes to roll up to a new balance. */
const COUNT_MS = 520;

export function WalletChip() {
  const ref = useRef<HTMLDivElement>(null);
  const [coins, setCoins] = useState(() => wallet.coins);
  const [stars, setStars] = useState(() => wallet.stars);
  // The value currently PAINTED, so a second grant mid-roll continues from
  // where the counter actually is rather than snapping back.
  const shown = useRef(wallet.coins);
  const cancel = useRef<(() => void) | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    registerWalletAnchor(el);

    const stop = () => {
      cancel.current?.();
      cancel.current = null;
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };

    const off = wallet.subscribe((p) => {
      setStars(p.stars);
      const from = shown.current;
      const to = p.coins;
      stop();
      // Only earning counts up. A purchase just settles — watching coins tick
      // DOWN reads as losing something, which is not the feeling we want.
      if (to <= from) {
        shown.current = to;
        setCoins(to);
        return;
      }
      cancel.current = tween(from, to, COUNT_MS, (v) => {
        const n = Math.round(v);
        shown.current = n;
        setCoins(n);
      });
      // The tween is rAF-driven, so a backgrounded tab can freeze it mid-roll.
      // This lands the exact value regardless, and pops on arrival.
      timer.current = window.setTimeout(() => {
        timer.current = null;
        shown.current = to;
        setCoins(to);
        const node = ref.current;
        if (node) popEl(node, "ellaz-pop");
      }, COUNT_MS);
    });

    return () => {
      off();
      stop();
      // Only clear if we are still the registered anchor — a replacement chip
      // may already have claimed it during a route change.
      if (anchor === el) registerWalletAnchor(null);
    };
  }, []);

  return (
    <div
      ref={ref}
      // Numbers read left-to-right even in the Hebrew RTL shell.
      dir="ltr"
      aria-label={`${coins} coins, ${stars} stars`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-3)",
        minHeight: "var(--tap)",
        padding: "0 var(--space-4)",
        borderRadius: "var(--radius-pill)",
        background: "var(--surface-2)",
        color: "var(--text)",
        fontWeight: 800,
        fontSize: 17,
        boxShadow: "var(--shadow-1)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
        <span aria-hidden="true">🪙</span>
        {coins}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
          color: "var(--yellow)",
        }}
      >
        <span aria-hidden="true">⭐</span>
        {stars}
      </span>
    </div>
  );
}
