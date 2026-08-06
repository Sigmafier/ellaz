// Juice Lab - the blind tournament surface. Reachable only at #/lab; nothing
// links to it and it is not in the catalog, so no player can wander in.
//
// Blind by construction: the three pads in each bracket are shuffled from a
// session seed and reveal what they were only after you have ranked them. A
// labelled three-way forces an order even between arms that are actually level,
// which is exactly the mistake the engine tournament already made once.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@i18n/index";
import { audioPort } from "@sdk/index";
import { mulberry32, seedFrom, shuffle } from "@shared/index";
import { armToSlot, type WinTier } from "./specs";
import { ALL_SPECS, BRACKETS, label, type ArmContext, type Bracket } from "./brackets";
import { PALETTE, PALETTE_COUNT, PALETTE_EVENTS, type Character } from "./palette";
import type { JuiceEvent } from "./voices";
import { offlineEngine, offlineSupported, realtimeEngine, unlockLab } from "./engines";
import { ShellLab } from "./ShellLab";
// Relative on purpose: portal has no alias. Same single module-level ref
// winMoment() uses, so the lab's chip is a real flight target.
import { getWalletAnchor, registerWalletAnchor } from "../../portal/WalletChip";

const STORE_KEY = "ellaz:juicelab:v1";
const MEDALS = ["🥇", "🥈", "🥉"];

type Ranks = Record<string, number[]>;

interface Saved {
  seed: string;
  ranks: Ranks;
  /** event -> chosen character id. Stored by ID, so it survives a reshuffle. */
  picks: Record<string, string>;
}

const EVENT_TITLES: Record<JuiceEvent, { he: string; en: string }> = {
  tap: { he: "נגיעה", en: "Tap" },
  correct: { he: "תשובה נכונה", en: "Correct" },
  win: { he: "ניצחון", en: "Win" },
  coin: { he: "מטבע", en: "Coin" },
  wrong: { he: "טעות", en: "Wrong" },
  star: { he: "כוכב", en: "Star" },
};

/**
 * The guided path - the answer to "I don't understand what I'm looking at".
 *
 * The full page asks three different questions at once (does this FEEL good ·
 * how MUCH of it · which SOUND) with no signposting, which is exactly how a
 * judging surface stops getting judged. Guided mode shows ONE task at a time
 * with a plain sentence saying what to press and what to decide.
 *
 * It is deliberately SHORTER than the full page. Two rounds are left out
 * on purpose:
 *   - `tap` - the shell demo already runs its squash AND its ripple together,
 *     so ranking them separately re-asks a question that is already answered.
 *   - `engine` - a near-parity comparison worth running once, but not the thing
 *     to spend a first-time operator's attention on.
 * Both stay reachable via the "everything" toggle; nothing is deleted.
 */
interface Step {
  /** A bracket id, or a non-bracket pane. */
  kind: "shell" | "bracket" | "palette" | "verdict";
  id?: string;
  chip: { he: string; en: string };
  /** What to physically do. Imperative, one sentence, no jargon. */
  todo: { he: string; en: string };
}

const STEPS: Step[] = [
  {
    kind: "shell",
    chip: { he: "תחושה", en: "Feel" },
    todo: {
      he: "כלום להחליט כאן. שחקי: תלחצי על משחקים, תכבי את האפקטים ותדליקי שוב. כשמספיק - הבא.",
      en: "Nothing to decide here. Play: tap games, switch the effects off and back on. When you have had enough, hit Next.",
    },
  },
  {
    kind: "bracket",
    id: "win",
    chip: { he: "ניצחון", en: "Win" },
    todo: {
      he: "שלושה כפתורים, אותו ניצחון בשלוש גרסאות. לחצי על כל אחד לפחות פעמיים, ואז דרגי 🥇🥈🥉. רק אחרי הדירוג ייחשף מה היה מה.",
      en: "Three pads, the same win done three ways. Press each at least twice, then rank them 🥇🥈🥉. Only after you rank does it reveal what they were.",
    },
  },
  {
    kind: "bracket",
    id: "streak",
    chip: { he: "רצף", en: "Streak" },
    todo: {
      he: "כאן חשוב ללחוץ על אותו כפתור חמש פעמים ברצף - השאלה היא אם הרצף מטפס. אחר כך דרגי.",
      en: "Here it matters that you press the SAME pad five times in a row - the question is whether a streak builds. Then rank them.",
    },
  },
  {
    kind: "bracket",
    id: "coin",
    chip: { he: "מטבעות", en: "Coins" },
    todo: {
      he: "המטבעות עפים אל השבב למעלה. לחצי על כל אחד ותסתכלי על המסלול ועל הנחיתה, לא רק על הצליל. ואז דרגי.",
      en: "The coins fly to the chip at the top. Press each and watch the path and the landing, not just the sound. Then rank them.",
    },
  },
  {
    kind: "verdict",
    chip: { he: "לשלוח", en: "Send" },
    todo: {
      he: "זהו. תלחצי על הכפתור להעתקה ותשלחי לי את הטקסט.",
      en: "That is it. Press copy and send me the text.",
    },
  },
];

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Saved>;
      if (typeof parsed.seed === "string" && parsed.seed !== "") {
        return { seed: parsed.seed, ranks: parsed.ranks ?? {}, picks: parsed.picks ?? {} };
      }
    }
  } catch {
    /* a corrupt record just means a fresh session */
  }
  // Seeded once per session and PERSISTED: a refresh mid-judging must not
  // reshuffle the pads, or half-finished rankings would silently point at
  // different arms than the ones that were heard.
  return { seed: `${Date.now()}-${Math.random()}`, ranks: {}, picks: {} };
}

export interface JuiceLabProps {
  locale: Locale;
  onExit: () => void;
}

export function JuiceLab({ locale, onExit }: JuiceLabProps) {
  const [saved, setSaved] = useState<Saved>(loadSaved);
  const [engineName, setEngineName] = useState<"realtime" | "offline">("realtime");
  const [warm, setWarm] = useState<"cold" | "warming" | "ready">("cold");
  const [muted, setMuted] = useState(audioPort.muted);
  const [tier, setTier] = useState<WinTier>("medium");
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  // Guided by default. The full page stays one tap away and loses nothing.
  const [guided, setGuided] = useState(true);
  const [step, setStep] = useState(0);
  const chipRef = useRef<HTMLDivElement>(null);

  // Slot -> arm, one stable permutation per bracket per session.
  const perms = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const b of BRACKETS) {
      const rng = mulberry32(seedFrom(`${saved.seed}:${b.id}`));
      out[b.id] = shuffle(
        b.arms.map((_, i) => i),
        rng,
      );
    }
    return out;
  }, [saved.seed]);

  // Same treatment for the palette: the control character is shuffled in with
  // the rest, so today's sound has to win on its own merits here too.
  const palettePerms = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const e of PALETTE_EVENTS) {
      const rng = mulberry32(seedFrom(`${saved.seed}:palette:${e}`));
      out[e] = shuffle(
        PALETTE[e].map((_, i) => i),
        rng,
      );
    }
    return out;
  }, [saved.seed]);

  useEffect(() => {
    registerWalletAnchor(chipRef.current);
    const off = audioPort.onMuteChange(setMuted);
    return () => {
      off();
      registerWalletAnchor(null);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    } catch {
      /* ignore - the lab is a dev surface, losing a ranking is not fatal */
    }
  }, [saved]);

  // Audio can only start inside a gesture, so warming rides the first press.
  const ensureWarm = useCallback(() => {
    audioPort.unlock();
    unlockLab();
    setWarm((w) => {
      if (w !== "cold") return w;
      void Promise.all([realtimeEngine.warm(ALL_SPECS), offlineEngine.warm(ALL_SPECS)])
        .then(() => setWarm("ready"))
        .catch(() => setWarm("ready"));
      return "warming";
    });
  }, []);

  const engine = engineName === "offline" ? offlineEngine : realtimeEngine;

  const fire = useCallback(
    (bracket: Bracket, slot: number, el: HTMLElement, at: { x: number; y: number }) => {
      ensureWarm();
      const armIndex = perms[bracket.id][slot];
      const arm = bracket.arms[armIndex];
      const streak = streaks[`${bracket.id}:${slot}`] ?? 0;
      const ctx: ArmContext = {
        at,
        el,
        wallet: getWalletAnchor(),
        streak,
        tier,
        // The engine bracket is choosing between engines, so its arms pick their
        // own; everything else honours the header selector.
        engine: bracket.ownsEngine ? realtimeEngine : engine,
      };
      try {
        arm.fire(ctx);
      } catch (e) {
        console.error("[juice-lab] arm failed", arm.id, e);
      }
      setStreaks((s) => ({ ...s, [`${bracket.id}:${slot}`]: streak + 1 }));
    },
    [ensureWarm, perms, streaks, tier, engine],
  );

  const rankSlot = (bracketId: string, slot: number) => {
    setSaved((s) => {
      const current = s.ranks[bracketId] ?? [];
      if (current.includes(slot)) return s;
      const next = [...current, slot];
      return { ...s, ranks: { ...s.ranks, [bracketId]: next } };
    });
  };

  const resetBracket = (bracketId: string) => {
    setSaved((s) => {
      const ranks = { ...s.ranks };
      delete ranks[bracketId];
      return { ...s, ranks };
    });
    setStreaks((s) => {
      const next = { ...s };
      for (const key of Object.keys(next)) if (key.startsWith(`${bracketId}:`)) delete next[key];
      return next;
    });
  };

  const auditionChar = useCallback(
    (c: Character) => {
      ensureWarm();
      try {
        engine.play(c.spec);
      } catch (e) {
        console.error("[juice-lab] character failed", c.id, e);
      }
    },
    [ensureWarm, engine],
  );

  const pickChar = (event: JuiceEvent, id: string) => {
    setSaved((s) => ({ ...s, picks: { ...s.picks, [event]: s.picks[event] === id ? "" : id } }));
  };

  const verdict = useMemo(
    () => buildVerdict(saved.ranks, perms, saved.picks, engineName),
    [saved.ranks, perms, saved.picks, engineName],
  );
  const done = BRACKETS.filter((b) => (saved.ranks[b.id] ?? []).length === b.arms.length).length;

  const copyVerdict = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    try {
      void navigator.clipboard?.writeText(verdict);
    } catch {
      /* the textarea below is always readable as a fallback */
    }
  };

  const verdictSection = (
    <VerdictSection locale={locale} verdict={verdict} copied={copied} onCopy={copyVerdict} />
  );

  /** A step is "done" only when it has something to complete. The feel and
   *  send steps are always done - there is nothing to get wrong on them, and
   *  greying out Next on a step with no task would just look broken. */
  const isStepDone = useCallback(
    (s: Step) => {
      if (s.kind !== "bracket") return true;
      const b = BRACKETS.find((x) => x.id === s.id);
      return !!b && (saved.ranks[b.id] ?? []).length === b.arms.length;
    },
    [saved.ranks],
  );

  const renderGuidedStep = (s: Step) => {
    if (s.kind === "shell") return <ShellLab locale={locale} />;
    if (s.kind === "verdict") return verdictSection;
    if (s.kind === "bracket") {
      const bracket = BRACKETS.find((x) => x.id === s.id);
      // A step naming a bracket that no longer exists must not blank the page.
      if (!bracket) return null;
      return (
        <BracketCard
          bracket={bracket}
          locale={locale}
          perm={perms[bracket.id]}
          ranks={saved.ranks[bracket.id] ?? []}
          tier={tier}
          onTier={setTier}
          onFire={fire}
          onRank={rankSlot}
          onReset={resetBracket}
        />
      );
    }
    return null;
  };

  return (
    <div className="ellaz-scroll" style={{ flex: 1, minHeight: 0, padding: "var(--space-4)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          marginBottom: "var(--space-5)",
        }}
      >
        <button onClick={onExit} style={btn(false)}>
          {locale === "he" ? "חזרה" : "Back"}
        </button>
        <h1 style={{ fontSize: 22, margin: 0 }}>
          {locale === "he" ? "מעבדת התחושה" : "Juice Lab"}
        </h1>
        {/* Only in the full page. In guided mode this counted all six brackets
            while the flow only walks three, so it read as "you are 0/6 done"
            on a five-step path - the exact confusion the mode exists to end.
            The step chips carry progress there instead. */}
        {guided ? null : (
          <span style={{ opacity: 0.6, fontSize: 13 }} dir="ltr">
            {done}/{BRACKETS.length}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => audioPort.toggleMute()} style={btn(false)}>
          {muted ? "🔇" : "🔊"}
        </button>
        <div
          ref={chipRef}
          dir="ltr"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            minHeight: "var(--tap)",
            padding: "0 var(--space-4)",
            borderRadius: "var(--radius-pill)",
            background: "var(--surface-2)",
            fontWeight: 800,
          }}
        >
          <span aria-hidden="true">🪙</span>
          <span aria-hidden="true">⭐</span>
        </div>
      </header>

      {guided ? (
        <GuidedFlow
          locale={locale}
          step={step}
          onStep={setStep}
          isStepDone={isStepDone}
          onShowEverything={() => setGuided(false)}
          renderStep={renderGuidedStep}
        />
      ) : (
        <>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <button onClick={() => setGuided(true)} style={btn(false)}>
              {locale === "he" ? "↩ חזרה למצב מודרך" : "↩ Back to guided mode"}
            </button>
          </div>

      <section style={card()}>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          <strong style={{ fontSize: 14 }}>
            {locale === "he" ? "מנוע לשאר הקטגוריות:" : "Engine for the other brackets:"}
          </strong>
          <button onClick={() => setEngineName("realtime")} style={btn(engineName === "realtime")}>
            A
          </button>
          <button
            onClick={() => setEngineName("offline")}
            disabled={!offlineSupported()}
            style={btn(engineName === "offline")}
          >
            B
          </button>
          <span style={{ opacity: 0.6, fontSize: 13 }}>
            {warm === "ready"
              ? locale === "he"
                ? "מוכן"
                : "ready"
              : warm === "warming"
                ? locale === "he"
                  ? "מרנדר..."
                  : "rendering..."
                : locale === "he"
                  ? "לחצו כדי להתחיל"
                  : "press anything to start"}
          </span>
        </div>
        <p style={{ margin: "var(--space-3) 0 0", opacity: 0.65, fontSize: 13, lineHeight: 1.5 }}>
          {locale === "he"
            ? "הכפתורים מעורבבים ואינם מסומנים. דרגו קודם, ורק אז ייחשף מה היה מה. עוצמת הקול מותאמת בין כל הזרועות בכוונה - אחרת פשוט היה מנצח הרם ביותר."
            : "The pads are shuffled and unlabelled. Rank first, then it reveals what was what. Loudness is deliberately matched across arms - otherwise the loudest simply wins."}
        </p>
      </section>

      <section style={card()}>
        <h2 style={{ fontSize: 17 }}>
          {locale === "he" ? "המעטפת - שלב 1" : "The shell - Tier 1"}
        </h2>
        <p style={{ margin: "var(--space-2) 0 var(--space-4)", opacity: 0.7, fontSize: 14, lineHeight: 1.5 }}>
          {locale === "he"
            ? "מסך הבית לא השמיע צליל ולא זז - אף פעם. חמישה שינויים: כל נגיעה עונה, מספר עף מהמקום שבו הרווחת, לחיצה שוקעת, הקלפים נכנסים בגלים, ואחרי שקט אחד מהם מנדנד. הצליל כאן הוא הזוכה שבחרת."
            : "Home never made a sound and never moved. Five changes: every tap answers, a number flies from where you earned it, presses sink, cards cascade in, and after silence one nudges. The tap sound here is the winner you picked."}
        </p>
        <ShellLab locale={locale} />
      </section>

      {BRACKETS.map((bracket) => (
        <BracketCard
          key={bracket.id}
          bracket={bracket}
          locale={locale}
          perm={perms[bracket.id]}
          ranks={saved.ranks[bracket.id] ?? []}
          tier={tier}
          onTier={setTier}
          onFire={fire}
          onRank={rankSlot}
          onReset={resetBracket}
        />
      ))}

      <section style={card()}>
        <h2 style={{ fontSize: 17 }}>
          {locale === "he" ? "פלטת הצלילים" : "Sound palette"}{" "}
          <span dir="ltr" style={{ opacity: 0.5, fontSize: 14 }}>
            ({PALETTE_COUNT})
          </span>
        </h2>
        <p style={{ margin: "var(--space-2) 0 0", opacity: 0.7, fontSize: 14, lineHeight: 1.5 }}>
          {locale === "he"
            ? "הקטגוריות למעלה שואלות 'איזה טיפול'. כאן השאלה היא 'איזה אופי'. האזינו כמה שבא לכם ובחרו אחד לכל אירוע - אין דירוג, רק מועדף."
            : "The brackets above ask which treatment. This asks which character. Audition freely and pick one favourite per event - no ranking, just a favourite."}
        </p>
        <p style={{ margin: "var(--space-3) 0 0", opacity: 0.55, fontSize: 13, lineHeight: 1.5 }}>
          {locale === "he"
            ? "כל אופי נבנה מפיזיקה אמיתית: יחסי תדר של גוף מוכה, דעיכה מהירה יותר לשותפים הגבוהים, וחדר קטן. בכל אירוע הכפתור המסומן '-current' הוא הצליל הישן והיבש - כך שאפשר לשמוע בדיוק מה השתנה."
            : "Each character is built from real physics: struck-body frequency ratios, faster decay for the high partials, and a small room. In every event one option is the old dry sound, so the difference is audible rather than asserted."}
        </p>
      </section>

      {PALETTE_EVENTS.map((event) => (
        <PaletteCard
          key={event}
          event={event}
          locale={locale}
          perm={palettePerms[event]}
          picked={saved.picks[event] ?? ""}
          onAudition={auditionChar}
          onPick={pickChar}
        />
      ))}

      {verdictSection}
        </>
      )}
    </div>
  );
}

/**
 * One task on screen at a time, with a sentence saying what to do.
 *
 * The step chips are CLICKABLE and every step is always reachable - this is a
 * judging tool, not a funnel. Nothing is gated behind finishing the previous
 * step, because the first thing anyone wants to do is skip ahead and look.
 */
function GuidedFlow({
  locale,
  step,
  onStep,
  isStepDone,
  onShowEverything,
  renderStep,
}: {
  locale: Locale;
  step: number;
  onStep: (n: number) => void;
  isStepDone: (s: Step) => boolean;
  onShowEverything: () => void;
  renderStep: (s: Step) => React.ReactNode;
}) {
  const i = Math.max(0, Math.min(STEPS.length - 1, step));
  const s = STEPS[i];
  const doneHere = isStepDone(s);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "var(--space-4)",
        }}
      >
        {STEPS.map((st, n) => {
          const active = n === i;
          const ok = isStepDone(st) && st.kind === "bracket";
          return (
            <button
              key={st.chip.en}
              onClick={() => onStep(n)}
              style={{
                minHeight: 38,
                padding: "0 13px",
                borderRadius: "var(--radius-pill)",
                border: active ? "2px solid var(--brand)" : "2px solid transparent",
                background: active ? "var(--brand)" : "var(--surface-2)",
                color: "var(--text)",
                fontWeight: 800,
                fontSize: 13.5,
                opacity: active ? 1 : 0.75,
              }}
            >
              <span dir="ltr">{n + 1}</span> {locale === "he" ? st.chip.he : st.chip.en}
              {ok ? " ✓" : ""}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button onClick={onShowEverything} style={btn(false)}>
          {locale === "he" ? "הכול" : "Everything"}
        </button>
      </div>

      <section style={{ ...card(), borderInlineStart: "4px solid var(--brand)" }}>
        <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, fontWeight: 600 }}>
          {locale === "he" ? s.todo.he : s.todo.en}
        </p>
      </section>

      {renderStep(s)}

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          alignItems: "center",
          margin: "var(--space-4) 0 var(--space-6)",
        }}
      >
        <button onClick={() => onStep(i - 1)} disabled={i === 0} style={btn(false)}>
          {locale === "he" ? "הקודם" : "Back"}
        </button>
        <button
          onClick={() => onStep(i + 1)}
          disabled={i === STEPS.length - 1}
          // Filled once the step's task is done, so the eye is pulled onward
          // without ever BLOCKING someone who wants to move on regardless.
          style={btn(doneHere && i < STEPS.length - 1)}
        >
          {locale === "he" ? "הבא ›" : "Next ›"}
        </button>
        <span style={{ opacity: 0.55, fontSize: 13 }} dir="ltr">
          {i + 1} / {STEPS.length}
        </span>
      </div>
    </div>
  );
}

/** Pulled out of the render so the guided flow and the full page show the SAME
 *  block rather than two copies that can drift apart. */
function VerdictSection({
  locale,
  verdict,
  copied,
  onCopy,
}: {
  locale: Locale;
  verdict: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
      <section style={card()}>
        <h2 style={{ fontSize: 17, marginBottom: "var(--space-3)" }}>
          {locale === "he" ? "התוצאה" : "Verdict"}
        </h2>
        <textarea
          dir="ltr"
          readOnly
          value={verdict}
          rows={Math.min(20, verdict.split("\n").length + 1)}
          style={{
            width: "100%",
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            lineHeight: 1.6,
            background: "var(--surface-2)",
            color: "var(--text)",
            border: "1px solid var(--surface-2)",
            borderRadius: "var(--radius-2, 12px)",
            padding: "var(--space-3)",
          }}
        />
        <button onClick={onCopy} style={{ ...btn(true), marginTop: "var(--space-3)" }}>
          {copied
            ? locale === "he"
              ? "הועתק"
              : "Copied"
            : locale === "he"
              ? "העתיקו ושלחו לי"
              : "Copy and send to me"}
        </button>
      </section>
  );
}

// ---------------------------------------------------------------------------

interface CardProps {
  bracket: Bracket;
  locale: Locale;
  perm: number[];
  ranks: number[];
  tier: WinTier;
  onTier: (t: WinTier) => void;
  onFire: (b: Bracket, slot: number, el: HTMLElement, at: { x: number; y: number }) => void;
  onRank: (bracketId: string, slot: number) => void;
  onReset: (bracketId: string) => void;
}

function BracketCard({
  bracket,
  locale,
  perm,
  ranks,
  tier,
  onTier,
  onFire,
  onRank,
  onReset,
}: CardProps) {
  const complete = ranks.length === bracket.arms.length;
  const armSlots = armToSlot(perm);

  return (
    <section style={card()}>
      <h2 style={{ fontSize: 17 }}>{label(bracket.title, locale)}</h2>
      <p style={{ margin: "var(--space-2) 0 var(--space-4)", opacity: 0.7, fontSize: 14, lineHeight: 1.5 }}>
        {label(bracket.question, locale)}
      </p>

      {bracket.tiered ? (
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          {(["easy", "medium", "hard"] as const).map((t) => (
            <button key={t} onClick={() => onTier(t)} style={btn(tier === t)}>
              {locale === "he" ? { easy: "קל", medium: "בינוני", hard: "קשה" }[t] : t}
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)" }}>
        {perm.map((_, slot) => {
          const rank = ranks.indexOf(slot);
          return (
            <div key={slot} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <button
                onPointerDown={(e) => {
                  const el = e.currentTarget;
                  onFire(bracket, slot, el, { x: e.clientX, y: e.clientY });
                }}
                style={{
                  minHeight: 96,
                  borderRadius: "var(--radius-2, 14px)",
                  border: "2px solid var(--surface-2)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  fontSize: 30,
                  fontWeight: 800,
                  touchAction: "manipulation",
                }}
              >
                <span dir="ltr">{slot + 1}</span>
              </button>
              <span style={{ textAlign: "center", fontSize: 12, opacity: 0.6 }}>
                {label(bracket.action, locale)}
              </span>
              <button
                onClick={() => onRank(bracket.id, slot)}
                disabled={rank >= 0}
                style={btn(rank >= 0)}
              >
                {rank >= 0 ? MEDALS[rank] : locale === "he" ? "דרגו" : "rank"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "var(--space-3)" }}>
        <button onClick={() => onReset(bracket.id)} style={btn(false)}>
          {locale === "he" ? "איפוס" : "Reset"}
        </button>
      </div>

      {complete ? (
        <div
          style={{
            marginTop: "var(--space-4)",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--surface-2)",
          }}
        >
          {ranks.map((slot, i) => {
            const arm = bracket.arms[perm[slot]];
            return (
              <div key={arm.id} style={{ marginBottom: "var(--space-3)" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  <span dir="ltr">
                    {MEDALS[i]} #{slot + 1}
                  </span>{" "}
                  - {arm.name}
                </div>
                <div style={{ opacity: 0.65, fontSize: 13, lineHeight: 1.5 }}>
                  {label(arm.blurb, locale)}
                </div>
              </div>
            );
          })}
          <div style={{ opacity: 0.5, fontSize: 12 }} dir="ltr">
            control was pad #{armSlots[0] + 1}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------

function PaletteCard({
  event,
  locale,
  perm,
  picked,
  onAudition,
  onPick,
}: {
  event: JuiceEvent;
  locale: Locale;
  perm: number[];
  picked: string;
  onAudition: (c: Character) => void;
  onPick: (event: JuiceEvent, id: string) => void;
}) {
  const chars = PALETTE[event];
  const chosen = chars.find((c) => c.id === picked) ?? null;

  return (
    <section style={card()}>
      <h3 style={{ fontSize: 15, marginBottom: "var(--space-3)" }}>
        {EVENT_TITLES[event][locale]}
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
        {perm.map((charIndex, slot) => {
          const c = chars[charIndex];
          const isPick = c.id === picked;
          return (
            <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <button
                onPointerDown={() => onAudition(c)}
                style={{
                  minWidth: 64,
                  minHeight: 64,
                  borderRadius: "var(--radius-2, 14px)",
                  border: isPick ? "2px solid var(--yellow, #fdcb6e)" : "2px solid var(--surface-2)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  fontSize: 22,
                  fontWeight: 800,
                  touchAction: "manipulation",
                }}
              >
                <span dir="ltr">{slot + 1}</span>
              </button>
              <button onClick={() => onPick(event, c.id)} style={btn(isPick)}>
                {isPick ? "★" : locale === "he" ? "בחרו" : "pick"}
              </button>
            </div>
          );
        })}
      </div>

      {chosen ? (
        <div
          style={{
            marginTop: "var(--space-4)",
            paddingTop: "var(--space-3)",
            borderTop: "1px solid var(--surface-2)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>{chosen.name}</div>
          <div style={{ opacity: 0.65, fontSize: 13, lineHeight: 1.5 }}>
            {label(chosen.blurb, locale)}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------

function buildVerdict(
  ranks: Ranks,
  perms: Record<string, number[]>,
  picks: Record<string, string>,
  engineName: string,
): string {
  const lines: string[] = [
    "JUICE LAB VERDICT",
    `engine used for non-engine brackets: ${engineName}`,
    "",
    "== BRACKETS (ranked) ==",
  ];
  for (const bracket of BRACKETS) {
    const r = ranks[bracket.id] ?? [];
    if (r.length !== bracket.arms.length) {
      lines.push(`${bracket.id}: (not ranked yet)`);
      continue;
    }
    lines.push(`${bracket.id}:`);
    r.forEach((slot, i) => {
      lines.push(`  ${i + 1}. ${bracket.arms[perms[bracket.id][slot]].name}`);
    });
  }
  lines.push("", "== PALETTE (favourite per event) ==");
  for (const event of PALETTE_EVENTS) {
    const id = picks[event];
    const c = id ? PALETTE[event].find((x) => x.id === id) : null;
    lines.push(`${event}: ${c ? c.name : "(not picked yet)"}`);
  }
  return lines.join("\n");
}

function card(): React.CSSProperties {
  return {
    background: "var(--surface-2)",
    borderRadius: "var(--radius-3, 18px)",
    padding: "var(--space-4)",
    marginBottom: "var(--space-4)",
  };
}

function btn(active: boolean): React.CSSProperties {
  return {
    minHeight: 40,
    padding: "0 var(--space-4)",
    borderRadius: "var(--radius-pill)",
    border: "none",
    background: active ? "var(--brand)" : "var(--surface-2)",
    color: "var(--text)",
    fontWeight: 700,
    fontSize: 14,
  };
}
