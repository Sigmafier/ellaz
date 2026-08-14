// The sound lab.
//
// One strip per sound the table plays. TAPPING A CANDIDATE PICKS IT AND PLAYS
// IT THROUGH THE REAL AUDIO PORT - not through a preview path that could
// disagree with what a hand will actually sound like. That is the single design
// rule here: the thing you are judging has to be the thing that ships, or the
// lab is a demo of itself.
//
// The pick persists as a whole VoiceSpec (see audio/voiceOverride.ts), so a
// sound chosen on a phone still plays on a laptop that has never opened this
// screen and never downloaded this chunk.

import { useEffect, useState } from "react";
import { isMuted, play, setMuted, unlock } from "../audio/audio";
import type { SfxName } from "../audio/pokerVoices";
import { clearOverrides, loadOverrides, setOverride } from "../audio/voiceOverride";
import { type Candidate, STRIPS } from "./candidates";

/** Which arm is picked for each sound, by id. The built-in shows as `current`. */
function pickedIds(): Partial<Record<SfxName, string>> {
  const saved = loadOverrides();
  const out: Partial<Record<SfxName, string>> = {};
  for (const strip of STRIPS) {
    const spec = saved[strip.name];
    if (!spec) continue;
    // Matched by VALUE, not by identity: the stored spec came back through
    // JSON, so it is a different object from every candidate here and an
    // identity check would show nothing as picked on every reload.
    const hit = strip.arms.find((a) => JSON.stringify(a.spec) === JSON.stringify(spec));
    if (hit) out[strip.name] = hit.id;
  }
  return out;
}

export function SoundLab() {
  const [picked, setPicked] = useState<Partial<Record<SfxName, string>>>({});
  const [muted, setMutedUi] = useState(true);
  const [last, setLast] = useState<string>("");

  useEffect(() => {
    setPicked(pickedIds());
    setMutedUi(isMuted());
  }, []);

  const choose = (name: SfxName, arm: Candidate) => {
    // Inside the tap, because on iOS this may be the gesture that unlocks
    // audio at all - and the first sound of a session is the one somebody
    // judges the whole palette by.
    unlock();
    if (muted) {
      setMuted(false);
      setMutedUi(false);
    }
    setOverride(name, arm.current ? null : arm.spec);
    setPicked((p) => ({ ...p, [name]: arm.id }));
    setLast(`${name}:${arm.id}`);
    play(name);
  };

  return (
    <div style={{ minHeight: "100%", padding: "14px 14px calc(28px + env(safe-area-inset-bottom))", background: "var(--bg)" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <button
          className="btn ghost"
          style={{ minHeight: 40, padding: "0 12px" }}
          // Back to the TABLE, not to the home screen. Most people arrive here
          // from a hand they are in the middle of, and the seat is still
          // theirs — the socket relinks on the device token. Falls through to
          // home only for somebody who opened this URL cold, where there is no
          // history to go back into.
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else location.hash = "";
          }}
        >
          ‹
        </button>
        <strong style={{ fontSize: 18 }}>Sounds</strong>
        <span style={{ flex: 1 }} />
        <button
          className="btn ghost"
          style={{ minHeight: 40 }}
          onClick={() => {
            clearOverrides();
            setPicked({});
            setLast("");
          }}
        >
          Reset all
        </button>
      </header>

      <p style={{ color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.5, margin: "0 0 14px" }}>
        Tap any sound to hear it <em>and</em> keep it. It plays through the real
        table audio, so what you hear here is exactly what a hand will sound
        like. Picks are saved on this device.
      </p>

      {STRIPS.map((strip) => {
        const chosen = picked[strip.name] ?? strip.arms.find((a) => a.current)?.id;
        return (
          <section key={strip.name} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 7 }}>
              <strong style={{ fontSize: 15 }}>{strip.label}</strong>
              <span style={{ color: "var(--ink-dim)", fontSize: 12 }}>{strip.when}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {strip.arms.map((arm) => {
                const on = arm.id === chosen;
                return (
                  <button
                    key={arm.id}
                    className={on ? "btn primary" : "btn ghost"}
                    style={{
                      minHeight: 52,
                      flex: "1 1 150px",
                      // The strip WRAPS. A row whose length is the number of
                      // candidates is the exact shape that clipped fifteen of
                      // twenty games off the ellaz leaderboards.
                      maxWidth: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 2,
                      padding: "8px 12px",
                      textAlign: "start",
                      animation: last === `${strip.name}:${arm.id}` ? "holdem-pop 240ms var(--ease) both" : undefined,
                    }}
                    onClick={() => choose(strip.name, arm)}
                  >
                    <span style={{ fontWeight: 800, fontSize: 13.5 }}>
                      {arm.name}
                      {arm.current && <span style={{ opacity: 0.65, fontWeight: 600 }}> · now</span>}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 500, lineHeight: 1.35, whiteSpace: "normal" }}>
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
        {muted ? "Sound is muted - tapping anything here unmutes it. " : ""}
        Every voice is level-matched, so a strip is a fair comparison rather than
        a loudness contest. Nothing here is uploaded; a pick lives on this device
        only.
      </p>
    </div>
  );
}
