// The look lab.
//
// One strip per art decision on the table, over a table that is dealing a real
// hand. TAPPING AN ARM APPLIES IT TO THE FELT ABOVE, IMMEDIATELY — the same
// rule the sound lab follows: the thing you are judging has to be the thing
// that ships, or the lab is a demo of itself.
//
// The felt above is not a picture and not a mock. It is `<Table>`, the
// component the real room renders, fed by the real store, which is fed by the
// real pacer, which is fed by real engine events (see demoHand.ts). So the
// moving axes — dealing, folding, winning, speed — are judgeable at all, which
// a screenshot could never make them.
//
// Picks persist per device and paint on the first frame of every future visit
// (lookStore.ts), so choosing here changes the table you actually play on.

import { useEffect, useState } from "react";
import { Table } from "../table/Table";
import type { Locale } from "../i18n";
import { ARM_COUNT, AXES, type Arm } from "./axes";
import { runDemo } from "./demoHand";
import { clearLook, loadLook, type LookKey, type LookPicks, setLook } from "./lookStore";
import { unlock } from "../audio/audio";
import { attachJuice } from "../juice/moments";

/** Axes whose whole point is motion — worth a nudge to press Deal. */
const MOVING = new Set<LookKey>(["deal", "fold", "award", "pace", "turn"]);

export function LookLab({ locale }: { locale: Locale }) {
  const [picks, setPicks] = useState<LookPicks>({});
  const [dealKey, setDealKey] = useState(0);

  useEffect(() => setPicks(loadLook()), []);

  // The juice layer, attached exactly as RoomScreen attaches it — so the
  // demo's chips fly, its felt shakes on an all-in and its sounds play. A lab
  // that showed the motion silently would be judging half the moment.
  useEffect(() => attachJuice(), []);

  // Re-running on dealKey is what the Deal button does: stop the hand in
  // flight, drop the pacer queue, and start again from a fresh shuffle.
  useEffect(() => runDemo({ seed: `lab${dealKey}` }), [dealKey]);

  const choose = (key: LookKey, arm: Arm) => {
    // Inside the tap: on iOS this may be the gesture that unlocks audio, and
    // the demo hand is playing sounds the whole time it deals.
    unlock();
    setPicks(setLook(key, arm.current ? null : arm.id));
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* The felt. Fixed share of the screen rather than a share of the
          content, so it does not shrink as the strips below it scroll. */}
      <div
        style={{
          height: "44vh",
          minHeight: 240,
          display: "flex",
          flexDirection: "column",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Table locale={locale} spectator />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "12px 14px calc(28px + env(safe-area-inset-bottom))",
        }}
      >
        {/* Sticky, because there are fourteen strips below it and Deal is the
            control you want most while you are near the bottom of them — the
            axes at the end of the list (folding, winning, speed) are exactly
            the ones that need a fresh hand to judge. */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "var(--bg)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 0 8px",
          }}
        >
          <button
            className="btn ghost"
            style={{ minHeight: 40, padding: "0 12px" }}
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else location.hash = "";
            }}
          >
            ‹
          </button>
          <strong style={{ fontSize: 18 }}>Look</strong>
          <span style={{ flex: 1 }} />
          <button className="btn ghost" style={{ minHeight: 40 }} onClick={() => setDealKey((k) => k + 1)}>
            Deal
          </button>
          <button
            className="btn ghost"
            style={{ minHeight: 40 }}
            onClick={() => {
              clearLook();
              setPicks({});
            }}
          >
            Reset
          </button>
        </header>

        <p style={{ color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.5, margin: "0 0 14px" }}>
          {AXES.length} decisions, {ARM_COUNT} options, over a real hand. Tap
          anything to change the table above and keep it — this is the table you
          will play on. <strong>Deal</strong> starts a fresh hand, which is how
          you judge dealing, folding and speed.
        </p>

        {AXES.map((axis) => {
          const chosen = picks[axis.key] ?? axis.arms.find((a) => a.current)?.id;
          return (
            <section key={axis.key} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 15 }}>{axis.label}</strong>
                <span style={{ color: "var(--ink-dim)", fontSize: 12 }}>
                  {axis.when}
                  {MOVING.has(axis.key) ? " · press Deal" : ""}
                </span>
              </div>
              {/* The strip WRAPS. A row whose length is the number of options
                  is the exact shape that clipped fifteen of twenty games off
                  the ellaz leaderboards. */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {axis.arms.map((arm) => {
                  const on = arm.id === chosen;
                  return (
                    <button
                      key={arm.id}
                      className={on ? "btn primary" : "btn ghost"}
                      style={{
                        minHeight: 52,
                        flex: "1 1 150px",
                        maxWidth: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 2,
                        padding: "8px 12px",
                        textAlign: "start",
                      }}
                      onClick={() => choose(axis.key, arm)}
                    >
                      <span style={{ fontWeight: 800, fontSize: 13.5 }}>
                        {arm.name}
                        {arm.current && <span style={{ opacity: 0.65, fontWeight: 600 }}> · now</span>}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          opacity: 0.75,
                          fontWeight: 500,
                          lineHeight: 1.35,
                          whiteSpace: "normal",
                        }}
                      >
                        {arm.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        <p style={{ color: "var(--ink-dim)", fontSize: 12, lineHeight: 1.5, marginTop: 20 }}>
          Picks live on this device only, nothing is uploaded, and{" "}
          <strong>Reset</strong> puts every axis back to what ships. The colours
          themselves — cloth green, gold, card white — are a separate question
          and are not on this screen.
        </p>
      </div>
    </div>
  );
}
