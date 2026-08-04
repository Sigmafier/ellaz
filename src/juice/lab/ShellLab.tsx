// Tier 1 shell juice, judged on the REAL Home screen.
//
// Not a mock. This renders `src/portal/Home.tsx` itself - real catalog, real
// cards, real stars, real wallet chip, real styles - and attaches the effects
// from outside by delegation. So what is being eyeballed is the actual screen
// with the actual effects, and the mechanism under test is the same one that
// would ship: one call in the portal shell, no component edited.
//
// The toggle remounts Home (via `key`), which replays the entrance cascade -
// otherwise the single most visible effect could only ever be seen once.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@i18n/index";
import { PALETTE, type Character } from "./palette";
import { realtimeEngine, unlockLab } from "./engines";
import { attachShellJuice, floatNumber, staggerIn, startIdleAttract } from "./shell";
import { flyToRich } from "./visuals";
import { Home } from "../../portal/Home";
import { getWalletAnchor } from "../../portal/WalletChip";

/** The operator's blind picks from the palette round, by id. The shell demo
 *  plays the WINNERS, not the currently shipped sounds - hearing the new tap in
 *  context is the entire point of this pane. */
const WINNERS = {
  // Changed from "tap-click" on the operator's second listen, 2026-08-02.
  tap: "tap-shutter",
  coin: "coin-current",
  star: "star-crystal",
} as const;

function findVoice(event: keyof typeof WINNERS): Character | undefined {
  return PALETTE[event].find((c) => c.id === WINNERS[event]);
}

function playWinner(event: keyof typeof WINNERS): void {
  const c = findVoice(event);
  if (c) realtimeEngine.play(c.spec);
}

export function ShellLab({ locale }: { locale: Locale }) {
  const [on, setOn] = useState(true);
  const [attract, setAttract] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  // Home's callbacks report WHICH card, never WHERE it was. The float number
  // needs a point on screen, so the last pointer position is the only honest
  // source for it.
  const lastPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !on) return;
    unlockLab();
    const detachJuice = attachShellJuice(el, { playTap: () => playWinner("tap") });
    staggerIn(el);
    // 4s rather than the real 15s: nobody is going to sit still for fifteen
    // seconds in front of a lab pane to find out whether the nudge works.
    const stopAttract = attract ? startIdleAttract(el, { afterMs: 4000, everyMs: 4000 }) : null;
    return () => {
      detachJuice();
      stopAttract?.();
    };
  }, [on, attract]);

  // A tap on a card in the lab must NOT open the game - it fires the reward
  // moment instead, which is the thing being judged.
  //
  // Since the cards became real <a> links, "must not open the game" also means
  // "must not navigate". Capture phase, preventDefault, then the reward: the
  // pane keeps working exactly as it did, and this file is the only one that
  // has to know the cards are links now.
  const reward = useCallback(
    (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      if (!on) return;
      const { x, y } = lastPoint.current;
      floatNumber(x, y, "+3");
      playWinner("coin");
      flyToRich({ x, y }, getWalletAnchor(), { count: 3, trail: true });
    },
    [on],
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: "var(--space-3)",
        }}
      >
        <button onClick={() => setOn((v) => !v)} style={toggleBtn(on)}>
          {on ? "✅ " : "⬜ "}
          {locale === "he" ? "אפקטים דלוקים" : "Effects ON"}
        </button>
        <button onClick={() => setAttract((v) => !v)} style={toggleBtn(attract)}>
          {attract ? "✅ " : "⬜ "}
          {locale === "he" ? "נדנוד אחרי 4 שניות" : "Idle nudge (4s)"}
        </button>
        <button
          onClick={() => {
            const box = getWalletAnchor()?.getBoundingClientRect();
            const x = box ? box.left + box.width / 2 : window.innerWidth / 2;
            floatNumber(x, (box?.bottom ?? 120) + 40, "⭐ +1", { size: 34 });
            playWinner("star");
          }}
          style={toggleBtn(false)}
        >
          {locale === "he" ? "כוכב" : "Star moment"}
        </button>
      </div>

      <p style={{ color: "var(--text-dim)", fontSize: 13.5, margin: "0 0 var(--space-3)" }}>
        {locale === "he"
          ? "זה מסך הבית האמיתי. תלחצי על משחק - הוא לא ייפתח, הוא ישלם. כבי את האפקטים כדי לשמוע ולראות את ההבדל."
          : "This is the real Home screen. Tap a game - it will not open, it will pay you. Switch the effects off to feel the difference."}
      </p>

      <div
        ref={hostRef}
        onPointerDown={(e) => {
          lastPoint.current = { x: e.clientX, y: e.clientY };
        }}
        style={{
          border: "1px solid var(--surface-2)",
          borderRadius: "var(--radius-3)",
          overflow: "hidden",
          // The real screen is a flex column that fills the viewport; give it a
          // bounded window here so the lab's own controls stay reachable.
          height: "min(78vh, 760px)",
          display: "flex",
        }}
      >
        <div onClickCapture={reward} style={{ display: "contents" }}>
          <Home
            // Remounting on every toggle is what replays the cascade.
            key={`${on}`}
            locale={locale}
            onToggleLocale={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

function toggleBtn(active: boolean): React.CSSProperties {
  return {
    minHeight: 40,
    padding: "0 14px",
    borderRadius: "var(--radius-pill)",
    border: "none",
    background: active ? "var(--brand)" : "var(--surface-2)",
    color: "var(--text)",
    fontWeight: 800,
    fontSize: 14,
  };
}
