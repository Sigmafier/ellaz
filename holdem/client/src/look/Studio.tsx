// The studio — one screen for everything about how this table looks, sounds
// and who you are at it.
//
// It replaces two separate labs. They were separate because they were built a
// day apart, which is not a reason: LOOK, SOUND and NAME are the same errand
// ("make this table mine") and they are all judged against the same thing — a
// felt that is dealing a real hand. Splitting them meant the sound lab played
// its candidates into silence, with no cards moving and no chips landing, which
// is exactly the context a poker sound has to work in.
//
// THE RULE, in all three tabs: tapping a candidate APPLIES IT, immediately, to
// the table above — through the shipping code path, never a preview that could
// disagree. The felt is <Table>, fed by the real store, fed by the real pacer,
// fed by real engine events (demoHand.ts). The sounds play through the real
// audio port. The name goes through a real `room` message.

import { useEffect, useRef, useState } from "react";
import { pickName, type PlayerName } from "@shared/names";
import { Table } from "../table/Table";
import type { Locale } from "../i18n";
import { audioState, isMuted, play, refreshSamplePicks, setMuted, unlock, warmSampleArm } from "../audio/audio";
import type { SfxName } from "../audio/pokerVoices";
import { clearSamplePicks, loadSamplePicks, setSamplePick } from "../audio/samplePick";
import { NO_RECORDING } from "../audio/samples";
import { clearOverrides, loadOverrides, setOverride } from "../audio/voiceOverride";
import { type Candidate, SOUND_COUNT, STRIPS } from "../lab/candidates";
import { recordedFor, type SampleCandidate } from "../lab/sampleStrips";
import { attachJuice } from "../juice/moments";
import { savedName, saveName } from "../net/nameStore";
import { ARM_COUNT, AXES, type Arm } from "./axes";
import { runDemo } from "./demoHand";
import { type LockKey, loadLocks, setLocked, unlockAll } from "./lockStore";
import { clearLook, loadLook, type LookKey, type LookPicks, setLook } from "./lookStore";
import { NamePicker } from "./NamePicker";

export type StudioTab = "look" | "sound" | "name";

/** Axes whose whole point is motion — worth a nudge to press Deal. */
const MOVING = new Set<LookKey>(["deal", "fold", "award", "pace", "turn"]);

/** Every lock key on a tab, in the order that tab lists its decisions. */
const LOCK_KEYS: Record<StudioTab, LockKey[]> = {
  look: AXES.map((a) => `look:${a.key}`),
  sound: STRIPS.map((s) => `sound:${s.name}`),
  name: [],
};

/** Which sound is picked for each strip, by arm id. */
function pickedSounds(): Partial<Record<SfxName, string>> {
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

export function Studio({ locale, tab: initialTab = "look" }: { locale: Locale; tab?: StudioTab }) {
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [picks, setPicks] = useState<LookPicks>({});
  const [sounds, setSounds] = useState<Partial<Record<SfxName, string>>>({});
  const [recs, setRecs] = useState<Partial<Record<SfxName, string>>>({});
  const [name, setName] = useState<PlayerName>(() => savedName() ?? pickName());
  const [dealKey, setDealKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [locks, setLocks] = useState<Record<LockKey, boolean>>({});
  const demo = useRef<ReturnType<typeof runDemo> | null>(null);

  useEffect(() => {
    setPicks(loadLook());
    setSounds(pickedSounds());
    setRecs(loadSamplePicks());
    setLocks(loadLocks([...LOCK_KEYS.look, ...LOCK_KEYS.sound]));
    if (isMuted()) setMuted(false);
  }, []);

  const toggleLock = (key: LockKey) => {
    const next = !locks[key];
    setLocked(key, next);
    setLocks((p) => ({ ...p, [key]: next }));
  };

  const openAll = () => {
    const keys = LOCK_KEYS[tab];
    unlockAll(keys);
    setLocks((p) => ({ ...p, ...Object.fromEntries(keys.map((k) => [k, false])) }));
  };

  // The juice layer, attached exactly as RoomScreen attaches it — so the demo's
  // chips fly, its felt shakes on an all-in, and its sounds are the ones being
  // judged one tab over.
  useEffect(() => attachJuice(), []);

  useEffect(() => {
    const d = runDemo({ seed: `studio${dealKey}`, name: savedName() ?? undefined });
    demo.current = d;
    return () => {
      demo.current = null;
      d.stop();
    };
  }, [dealKey]);

  useEffect(() => demo.current?.setPaused(paused), [paused]);

  const chooseLook = (key: LookKey, arm: Arm) => {
    unlock();
    setPicks(setLook(key, arm.current ? null : arm.id));
  };

  const chooseSound = (sfx: SfxName, arm: Candidate) => {
    // Inside the tap, because on iOS this may be the gesture that unlocks
    // audio at all — and the first sound of a session is the one somebody
    // judges the whole palette by.
    unlock();
    setOverride(sfx, arm.current ? null : arm.spec);
    // A recorded pick WINS at playback time, so picking a synthesised arm has
    // to clear it. Without this the highlight moves and the recording keeps
    // playing — a screen disagreeing with the speakers, which is the exact
    // class of bug the arm lock exists to prevent.
    setSamplePick(sfx, null);
    refreshSamplePicks();
    setRecs((p) => {
      const n = { ...p };
      delete n[sfx];
      return n;
    });
    setSounds((p) => ({ ...p, [sfx]: arm.id }));
    play(sfx);
  };

  const chooseRecorded = (sfx: SfxName, cand: SampleCandidate) => {
    unlock();
    setSamplePick(sfx, cand.id);
    refreshSamplePicks();
    setRecs((p) => ({ ...p, [sfx]: cand.id }));
    // The FIRST tap of a recorded arm has nothing decoded yet, so `play` falls
    // through to the synth voice for that one hit. Fetch, then play again once
    // a variant is in — otherwise auditioning a recording plays the thing it
    // is meant to replace, which is the worst possible first impression.
    warmSampleArm(cand.id);
    play(sfx);
    window.setTimeout(() => play(sfx), 420);
  };

  // The name lives in a REF as well as in state, and the ref is what the merge
  // reads. Two taps inside one React render — an adjective and then an animal,
  // which is exactly how somebody uses this screen — both see the same stale
  // prop otherwise, and the first choice is silently thrown away.
  const nameRef = useRef(name);

  const chooseName = (half: Partial<PlayerName>) => {
    unlock();
    const next = { ...nameRef.current, ...half };
    nameRef.current = next;
    setName(next);
    // Saved on every tap rather than behind a confirm button. There is nothing
    // to validate and nothing to lose — the last thing tapped is the answer —
    // and a "save" step is one more thing to forget on the way out of a screen
    // whose whole point is browsing.
    saveName(next);
    demo.current?.rename(next);
  };

  const resetTab = () => {
    if (tab === "look") {
      clearLook();
      setPicks({});
    } else if (tab === "sound") {
      clearOverrides();
      clearSamplePicks();
      refreshSamplePicks();
      setSounds({});
      setRecs({});
    } else {
      chooseName(pickName());
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* The felt. A fixed share of the screen rather than a share of the
          content, so it does not shrink as the strips below it scroll. */}
      <div
        style={{
          height: "42vh",
          minHeight: 230,
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
          padding: "0 14px calc(28px + env(safe-area-inset-bottom))",
        }}
      >
        {/* Sticky, because there are up to fourteen strips below it and Deal is
            the control you want most while you are near the bottom of them —
            the axes at the end (folding, winning, speed) are exactly the ones
            that need a fresh hand to judge. */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "var(--bg)",
            padding: "10px 0 8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            <span style={{ flex: 1 }} />
            <button
              className="btn ghost"
              style={{ minHeight: 40, padding: "0 12px" }}
              aria-label={paused ? "Play" : "Pause"}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? "▶" : "❙❙"}
            </button>
            <button className="btn ghost" style={{ minHeight: 40 }} onClick={() => setDealKey((k) => k + 1)}>
              Deal
            </button>
            <button className="btn ghost" style={{ minHeight: 40 }} onClick={resetTab}>
              Reset
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {(
              [
                ["look", `Look · ${ARM_COUNT}`],
                ["sound", `Sounds · ${SOUND_COUNT}`],
                ["name", "Your name"],
              ] as [StudioTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                className={tab === id ? "btn primary" : "btn ghost"}
                style={{ minHeight: 42, flex: 1, fontSize: 14, padding: "0 8px" }}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {tab === "look" && (
          <>
            <Lede>
              {AXES.length} decisions, {ARM_COUNT} options, over a real hand. Tap
              anything to change the table above and keep it — this is the table
              you will play on. <strong>Deal</strong> starts a fresh hand;{" "}
              <strong>❙❙</strong> holds it still so you can stare at one card.
            </Lede>
            <Decisions
              locks={locks}
              onToggle={toggleLock}
              onOpenAll={openAll}
              items={AXES.map((axis) => {
                const chosen = picks[axis.key] ?? axis.arms.find((a) => a.current)?.id;
                return {
                  lockKey: `look:${axis.key}`,
                  label: axis.label,
                  when: axis.when + (MOVING.has(axis.key) ? " · press Deal" : ""),
                  chosenName: axis.arms.find((a) => a.id === chosen)?.name ?? "—",
                  arms: axis.arms.map((arm) => ({
                    id: arm.id,
                    name: arm.name,
                    blurb: arm.blurb,
                    current: arm.current,
                    on: arm.id === chosen,
                    pick: () => chooseLook(axis.key, arm),
                  })),
                };
              })}
            />
          </>
        )}

        {tab === "sound" && (
          <>
            <Lede>
              Tap any sound to hear it <em>and</em> keep it. It plays through the
              real table audio over a hand that is being dealt, which is the only
              place a poker sound has to work. Every voice is level-matched, so a
              strip is a fair comparison rather than a loudness contest.
            </Lede>
            <p style={{ color: "var(--ink-dim)", fontSize: 12, lineHeight: 1.5, margin: "-6px 0 14px" }}>
              🎙️ The <strong style={{ color: "var(--gold)" }}>RECORDED</strong> options at the top of each
              strip are real chips and real cards, not models of them — every shipped card game does it
              this way. They download only if you pick one.{" "}
              <a href="https://kenney.nl" target="_blank" rel="noreferrer noopener" style={{ color: "var(--ink-dim)" }}>
                Casino Audio by Kenney
              </a>
              , public domain.
            </p>
            <AudioStatus />
            <Decisions
              locks={locks}
              onToggle={toggleLock}
              onOpenAll={openAll}
              items={STRIPS.map((strip) => {
                const rec = recs[strip.name];
                const recorded = recordedFor(strip.name);
                // A recorded pick WINS at playback, so it wins in the UI too.
                // Reading the synth highlight while a recording plays is the
                // bug, not a cosmetic difference.
                const chosen = rec ?? sounds[strip.name] ?? strip.arms.find((a) => a.current)?.id;
                const chosenName =
                  recorded.find((r) => r.id === chosen)?.name ??
                  strip.arms.find((a) => a.id === chosen)?.name ??
                  "—";
                return {
                  lockKey: `sound:${strip.name}`,
                  label: strip.label,
                  when: strip.when,
                  chosenName,
                  note: NO_RECORDING.includes(strip.name)
                    ? "No recording for this one — it is a hand on a table, not a card or a chip, so a casino foley pack does not have it. The synthesised options below are the right primitive for it."
                    : undefined,
                  recorded: recorded.map((r) => ({
                    id: r.id,
                    name: r.name,
                    blurb: r.blurb,
                    takes: r.takes,
                    on: r.id === chosen,
                    pick: () => chooseRecorded(strip.name, r),
                  })),
                  arms: strip.arms.map((arm) => ({
                    id: arm.id,
                    name: arm.name,
                    blurb: arm.blurb,
                    current: arm.current,
                    on: arm.id === chosen,
                    pick: () => chooseSound(strip.name, arm),
                  })),
                };
              })}
            />
          </>
        )}

        {tab === "name" && (
          <>
            <Lede>
              Pick both halves. Your seat on the felt above changes as you tap —
              it is the third one, marked <strong>(You)</strong>.
            </Lede>
            <NamePicker name={name} onPick={chooseName} />
          </>
        )}

        <p style={{ color: "var(--ink-dim)", fontSize: 12, lineHeight: 1.5, marginTop: 20 }}>
          Everything here is saved on this device and nothing is uploaded.{" "}
          <strong>🔒 Settle</strong> folds a decision you have made down to one
          line so you stop scrolling past it — it never stops you changing it.{" "}
          <strong>Reset</strong> puts this tab back to what ships.
        </p>
      </div>
    </div>
  );
}

function Lede({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.5, margin: "0 0 14px" }}>
      {children}
    </p>
  );
}

/**
 * What the audio layer is doing, said out loud.
 *
 * "I don't hear sounds on my phone" is a report nobody here can reproduce: the
 * device is not in this room and the two likeliest causes leave NO trace in
 * JavaScript. A suspended context is knowable and is shown; the iOS ringer
 * switch is not knowable at all, and is named instead, because a person
 * holding the phone can check it in a second and no amount of code can.
 *
 * It is on this tab and nowhere else. A player never needs it; the one person
 * trying to work out why their phone is quiet is already looking at sounds.
 */
function AudioStatus() {
  const [s, setS] = useState(audioState);
  useEffect(() => {
    const id = setInterval(() => setS(audioState()), 500);
    return () => clearInterval(id);
  }, []);

  const bad = s.muted || s.ctx !== "running";
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        marginBottom: 14,
        fontSize: 12,
        lineHeight: 1.5,
        color: "var(--ink-dim)",
        background: "var(--surface)",
        border: `1px solid ${bad ? "var(--danger)" : "var(--line)"}`,
        borderRadius: "var(--radius-2)",
      }}
    >
      <code dir="ltr" style={{ fontWeight: 800, color: bad ? "var(--danger)" : "var(--gold)" }}>
        audio: {s.ctx}
        {s.muted ? " · MUTED" : ""}
        {s.unsilenced ? " · media" : " · ringer"}
      </code>
      <span>
        {s.muted
          ? "Sound is off in the menu — nothing will play."
          : s.ctx !== "running"
            ? "The browser has not let audio start yet. Tap anything on this page."
            : s.unsilenced
              ? "Running. If this phone is still silent, it is the volume — an iPhone plays this through the RINGER volume, and the side switch mutes it."
              : "Running, but on the ringer channel. On an iPhone the side switch will silence it."}
      </span>
    </div>
  );
}

interface Decision {
  lockKey: LockKey;
  label: string;
  when: string;
  /** The name of whatever is picked, for the one-line settled row. */
  chosenName: string;
  arms: { id: string; name: string; blurb: string; current?: boolean; on: boolean; pick: () => void }[];
  /**
   * The RECORDED options, rendered as their own group above the synthesised
   * ones rather than mixed in among them.
   *
   * Two reasons, and the second is the one that would be easy to get wrong.
   * They are a different KIND of thing - a recording of an object versus a
   * model of one - and a strip that hides that difference is asking for a
   * comparison nobody can interpret. And the synthesised arms keep their
   * existing order among themselves, because the operator navigates this
   * screen by where a button was; a new labelled row above them adds a place
   * to look without moving anything that was already there.
   */
  recorded?: { id: string; name: string; blurb: string; on: boolean; takes: number; pick: () => void }[];
  /** Shown instead of an empty recorded group. */
  note?: string;
}

/**
 * The open decisions, then the settled ones.
 *
 * THE ORDER IS THE FEATURE. Twenty-five strips is a lot to scroll past to reach
 * the three you have not made up your mind about, and every one you HAVE
 * decided is a small invitation to re-litigate it. Settled decisions still
 * render — hiding them would make a pick unreachable — but as one line each,
 * below a divider, in the order they were listed.
 *
 * A lock is a view preference and nothing else: it never blocks a change, and
 * tapping a settled row opens it again. See lockStore.ts for why that
 * separation is load-bearing rather than modest.
 */
function Decisions({
  items,
  locks,
  onToggle,
  onOpenAll,
}: {
  items: Decision[];
  locks: Record<LockKey, boolean>;
  onToggle: (k: LockKey) => void;
  onOpenAll: () => void;
}) {
  const open = items.filter((i) => !locks[i.lockKey]);
  const settled = items.filter((i) => locks[i.lockKey]);

  return (
    <>
      {open.map((d) => (
        <Strip
          key={d.lockKey}
          label={d.label}
          when={d.when}
          arms={d.arms}
          recorded={d.recorded}
          note={d.note}
          onLock={() => onToggle(d.lockKey)}
        />
      ))}

      {open.length === 0 && (
        <p style={{ color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.5, margin: "4px 0 18px" }}>
          Every decision on this tab is settled. Tap one below to open it again.
        </p>
      )}

      {settled.length > 0 && (
        <section style={{ marginTop: 26 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
              paddingTop: 14,
              borderTop: "1px solid var(--line)",
            }}
          >
            <strong style={{ fontSize: 13, color: "var(--ink-dim)" }}>
              Settled · {settled.length}
            </strong>
            <span style={{ flex: 1 }} />
            <button className="btn ghost" style={{ minHeight: 34, fontSize: 12, padding: "0 10px" }} onClick={onOpenAll}>
              Open all
            </button>
          </div>
          {settled.map((d) => (
            <button
              key={d.lockKey}
              className="btn ghost"
              style={{
                display: "flex",
                width: "100%",
                minHeight: 44,
                alignItems: "center",
                gap: 10,
                padding: "0 12px",
                marginBottom: 6,
                textAlign: "start",
                opacity: 0.78,
              }}
              onClick={() => onToggle(d.lockKey)}
            >
              <span aria-hidden>🔒</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{d.label}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12.5, color: "var(--gold)", fontWeight: 700 }}>{d.chosenName}</span>
            </button>
          ))}
        </section>
      )}
    </>
  );
}

/**
 * One decision, and every option for it.
 *
 * Shared by all three tabs rather than written twice, so a look option and a
 * sound option cannot drift into looking like different kinds of thing — they
 * are the same kind of thing, which is the whole argument for one screen.
 */
function Strip({
  label,
  when,
  arms,
  recorded,
  note,
  onLock,
}: {
  label: string;
  when: string;
  onLock: () => void;
  // `current?: boolean`, not `?: true` — the look registry spells the shipped
  // default `current: true` and the sound registry spells it `current: boolean`.
  // Widening here rather than narrowing either registry: they are two lists
  // with two histories and neither is wrong.
  arms: { id: string; name: string; blurb: string; current?: boolean; on: boolean; pick: () => void }[];
  /**
   * The RECORDED options, rendered as their own group above the synthesised
   * ones rather than mixed in among them.
   *
   * Two reasons, and the second is the one that would be easy to get wrong.
   * They are a different KIND of thing - a recording of an object versus a
   * model of one - and a strip that hides that difference is asking for a
   * comparison nobody can interpret. And the synthesised arms keep their
   * existing order among themselves, because the operator navigates this
   * screen by where a button was; a new labelled row above them adds a place
   * to look without moving anything that was already there.
   */
  recorded?: { id: string; name: string; blurb: string; on: boolean; takes: number; pick: () => void }[];
  /** Shown instead of an empty recorded group. */
  note?: string;
}) {
  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15 }}>{label}</strong>
        <span style={{ color: "var(--ink-dim)", fontSize: 12, flex: 1 }}>{when}</span>
        <button
          className="btn ghost"
          style={{ minHeight: 32, fontSize: 11.5, padding: "0 10px", alignSelf: "center" }}
          aria-label={`Settle ${label}`}
          onClick={onLock}
        >
          🔒 Settle
        </button>
      </div>
      {/* RECORDED FIRST, in its own labelled group.
          Real foley and a synthesised model are different kinds of thing, and
          a strip that mixes them is asking for a comparison nobody can read.
          The synthesised row below keeps its own order untouched. */}
      {recorded && recorded.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span aria-hidden>🎙️</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.3, color: "var(--gold)" }}>RECORDED</span>
            <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>real chips and cards, not modelled</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {recorded.map((r) => (
              <button
                key={r.id}
                className={r.on ? "btn primary" : "btn ghost"}
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
                onClick={r.pick}
              >
                <span style={{ fontWeight: 800, fontSize: 13.5 }}>
                  {r.name}
                  {/* The take count is the honest headline. One recording
                      played five times a hand is repetition fatigue; six is
                      why this group exists at all. */}
                  <span style={{ opacity: 0.65, fontWeight: 600 }}> · {r.takes} take{r.takes === 1 ? "" : "s"}</span>
                </span>
                <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 500, lineHeight: 1.35, whiteSpace: "normal" }}>
                  {r.blurb}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {note && (
        <p style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.45, margin: "0 0 10px" }}>{note}</p>
      )}

      {/* The strip WRAPS. A row whose length is the number of options is the
          exact shape that clipped fifteen of twenty games off the ellaz
          leaderboards. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {arms.map((arm) => (
          <button
            key={arm.id}
            className={arm.on ? "btn primary" : "btn ghost"}
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
            onClick={arm.pick}
          >
            <span style={{ fontWeight: 800, fontSize: 13.5 }}>
              {arm.name}
              {arm.current && <span style={{ opacity: 0.65, fontWeight: 600 }}> · now</span>}
            </span>
            <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 500, lineHeight: 1.35, whiteSpace: "normal" }}>
              {arm.blurb}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
