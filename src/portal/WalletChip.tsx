import { useEffect, useRef, useState } from "react";
import { wallet } from "@sdk/index";
import { popEl, tween } from "@juice/index";
import { Icon } from "@ui/icons";

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

export interface WalletChipProps {
  /**
   * Draw the numbers only, with no pill of its own.
   *
   * A game page's header already draws the pill - one shared `--tap` height
   * for the wallet and both buttons, which is what finally put them on a line
   * after shipping at 48 beside 36. Passing this rather than fighting the
   * component from the stylesheet is deliberate: these styles are INLINE, so a
   * rule in the emitted CSS could only win with `!important`, and an
   * `!important` that exists to undo a prop is a bug waiting for someone to
   * add a third caller.
   */
  bare?: boolean;
}

export function WalletChip({ bare = false }: WalletChipProps = {}) {
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
        fontWeight: 800,
        whiteSpace: "nowrap",
        ...(bare
          ? { color: "inherit", fontSize: "inherit" }
          : {
              minHeight: "var(--tap)",
              padding: "0 var(--space-4)",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: 17,
              boxShadow: "var(--shadow-1)",
            }),
      }}
    >
      {/* Both glyphs are SVG on purpose. As emoji they were a DIFFERENT PICTURE
          on every device - gold on one phone, brown on another, flat on a third
          - so the currency this whole economy is denominated in had no fixed
          appearance at all. They also cannot take a theme colour, and they
          carry no accessible name (the chip's aria-label above does that job).
          The coin is `--orange-ink` and the star `--yellow`, which is where the
          emoji's own colours land once a theme can reach them.

          On the game header (`bare`) both take the bar's ink instead. That bar
          is already a deep tone of the game's own ground, so an orange coin
          and a yellow star on top of it are two more accents competing with
          the one colour the bar exists to show - and `--orange-ink` is tuned
          for the cream shell, not for a saturated dark surface. */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
          color: bare ? "inherit" : "var(--orange-ink)",
        }}
      >
        <Icon name="coin" />
        {coins}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
          color: bare ? "inherit" : "var(--yellow)",
        }}
      >
        <Icon name="star" filled />
        {stars}
      </span>
    </div>
  );
}
