// The sound lab, at #/lab.
//
// WHAT YOU HEAR IS WHAT THE GAME PLAYS. Tapping a candidate SAVES it and then
// plays it through the real `audioPort`, on the real mute state, at the real
// level-matched trim - it is not a preview of a sound the app might make. That
// removes the entire class of bug where the lab and the game disagree, and it
// is why there is no separate AudioContext here.
//
// One tap, one result, no confirm - the same shape as buying a thing in the
// shop, and for the same reason. A pick is free to change, so a dialog asking
// whether you meant it would only be in the way. "Back to the shipped one" sits
// on every card.
//
// A fragment route on purpose (`#/lab`): a fragment is never sent to the
// server, so this needs no emitted page, appears in no sitemap, is invisible to
// every crawler, and costs the SEO surface nothing.

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppLocale } from "@i18n/locales";
import type { SfxName } from "@sdk/types";
import { audioPort } from "@sdk/index";
import {
  clearVoicePicks,
  loadVoicePicks,
  saveVoicePick,
} from "@sdk/voiceOverride";
import {
  JUICE_SHIPPED,
  burst,
  celebrate,
  clearTuning,
  flyTo,
  haptic,
  popEl,
  prefersReducedMotion,
  saveTuning,
  shake,
  tuning,
  type JuiceTuning,
} from "@juice/index";
import {
  STREAK_FIRST,
  streakCapped,
  streakStep,
  streakTier,
} from "@sdk/streak";
// SVG, never emoji - the same hard rule the wallet chip follows. An emoji
// cannot be themed, sizes differently on every OS, and reads as a placeholder.
import { Icon, iconNode } from "@ui/icons";
import { Button } from "@ui/index";
import {
  EVENT_TITLES,
  EVENT_WHERE,
  GALLERY,
  GALLERY_ORDER,
  OVERRODE_BLIND,
  VERDICT,
  shippedCandidate,
  type Candidate,
} from "./voices";

/** Authored text here is he/en only, like every other authored string. */
type Lang = "he" | "en";
const langOf = (l: AppLocale): Lang => (l === "he" ? "he" : "en");

const T = {
  title: { he: "מעבדת הצליל", en: "Sound lab" },
  lede: {
    he: "כל צליל שהאפליקציה משמיעה, ליד האפשרויות. נגיעה בוחרת ומשמיעה - וזה בדיוק מה שהמשחק ישמיע.",
    en: "Every sound the app makes, beside the alternatives. A tap picks it and plays it - and that is exactly what the game will play.",
  },
  blindOn: { he: "בלי שמות", en: "Hide names" },
  blindOff: { he: "עם שמות", en: "Show names" },
  reset: { he: "חזרה למקורי", en: "Back to shipped" },
  home: { he: "הביתה", en: "Home" },
  shipped: { he: "המקורי", en: "shipped" },
  picked: { he: "נבחר", en: "picked" },
  never: { he: "מעולם לא נשפט", en: "never judged" },
  // "picked" and "blind" are different strengths of evidence, so the badge
  // says which. As of 2026-08-13 all nine were picked with the names showing -
  // and six of those overrode a blind-round winner, which the badge states
  // outright rather than letting the earlier result quietly disappear.
  pickedOnly: { he: "נבחר, לא בסבב עיוור", en: "picked, not a blind round" },
  pickedOver: {
    he: "נבחר על פני מנצח סבב עיוור",
    en: "picked over a blind winner",
  },
  sounds: { he: "צלילים", en: "Sounds" },
  moment: { he: "רגע הניצחון", en: "The win moment" },
  momentLede: {
    he: "הרצף המלא: אקורד, קונפטי, מטבעות שעפים, כוכב ב-450 מ״ש ומטבע ב-620.",
    en: "The whole sequence: the chord, confetti, the coin flight, a star at 450 ms and a coin at 620.",
  },
  effects: { he: "אפקטים", en: "Effects" },
  reduced: {
    he: "המכשיר מבקש פחות תנועה, אז האפקטים כאן מרוסנים.",
    en: "This device asks for reduced motion, so the effects here are restrained.",
  },
  muted: {
    he: "הקול כבוי - הפעילי אותו כדי לשמוע",
    en: "Sound is off - turn it on to hear anything",
  },
  wallet: { he: "לשם עפים המטבעות", en: "the coins fly here" },
} as const;

const say = (k: keyof typeof T, l: Lang) => T[k][l];

function useLang(locale: AppLocale): Lang {
  return langOf(locale);
}

/** A card per sound: what it is, where it is heard, and the strip of choices. */
function SoundCard({
  name,
  lang,
  blind,
  pickedId,
  onPick,
  onReset,
  children,
}: {
  name: SfxName;
  lang: Lang;
  blind: boolean;
  pickedId: string | null;
  onPick: (name: SfxName, c: Candidate) => void;
  onReset: (name: SfxName) => void;
  /** Extra controls for a sound that needs more than a strip. Only `streak` uses it. */
  children?: React.ReactNode;
}) {
  const list = GALLERY[name];
  const shipped = shippedCandidate(name);
  const current = pickedId
    ? (list.find((c) => c.id === pickedId) ?? shipped)
    : shipped;
  // Read off the VERDICT table rather than naming sounds inline. The inline
  // version said `name === "pop" || name === "flip"` and was correct for
  // exactly as long as those were the two undecided ones - it would have gone
  // on calling Cork unjudged the moment it was picked, and would have said
  // nothing at all about `streak`.
  const verdict = VERDICT[name];
  const badge =
    verdict === "never"
      ? "never"
      : OVERRODE_BLIND.includes(name)
        ? "pickedOver"
        : "pickedOnly";

  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-2)",
        padding: "var(--space-4)",
        marginBottom: "var(--space-4)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <header style={{ marginBottom: "var(--space-3)" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: "var(--space-2)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontFamily: "var(--font-display)",
            }}
          >
            {EVENT_TITLES[name][lang]}
          </h3>
          {verdict !== "blind" && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                background: "var(--yellow)",
                color: "var(--yellow-ink)",
              }}
            >
              {say(badge, lang)}
            </span>
          )}
        </div>
        <p
          style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-dim)" }}
        >
          {EVENT_WHERE[name][lang]}
        </p>
      </header>

      {/* WRAPS. The strip grows every time a candidate is added, and a
          non-wrapping flex row inside a fixed-width frame clips silently -
          see .claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
        {list.map((c, i) => {
          const isCurrent = c.id === current.id;
          return (
            <button
              key={c.id}
              onClick={() => onPick(name, c)}
              aria-pressed={isCurrent}
              style={{
                minHeight: "var(--tap)",
                flex: "0 1 auto",
                textAlign: "start",
                padding: "8px 14px",
                borderRadius: "var(--radius-2)",
                border: isCurrent
                  ? "2px solid var(--brand)"
                  : "1px solid var(--line)",
                background: isCurrent
                  ? "var(--brand-fill)"
                  : "var(--surface-2)",
                color: "var(--text)",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>
                {blind ? String.fromCharCode(65 + i) : c.name[lang]}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "var(--text-dim)",
                }}
              >
                {blind ? " " : c.blurb[lang]}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "var(--space-2)",
          marginTop: "var(--space-3)",
          fontSize: 13,
          color: "var(--text-dim)",
        }}
      >
        <span>
          {say("picked", lang)}:{" "}
          <b style={{ color: "var(--text)" }}>
            {blind ? "?" : current.name[lang]}
          </b>
          {current.shipped ? ` (${say("shipped", lang)})` : ""}
        </span>
        {!current.shipped && (
          <button
            onClick={() => onReset(name)}
            style={{
              minHeight: 36,
              padding: "0 12px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--text)",
              font: "inherit",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {say("reset", lang)}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function Lab({ locale }: { locale: AppLocale }) {
  const lang = useLang(locale);
  const [blind, setBlind] = useState(false);
  const [muted, setMuted] = useState(audioPort.muted);
  const [picks, setPicks] = useState<Partial<Record<SfxName, string>>>({});
  /** Bumped by "back to shipped", purely to remount the effect strips. */
  const [resetSeq, setResetSeq] = useState(0);
  const walletRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Which candidate each stored spec corresponds to. The store holds SPECS, not
  // ids - deliberately, so a child's device never needs the gallery - so the id
  // is recovered by matching the stored spec against the candidates here.
  useEffect(() => {
    const stored = loadVoicePicks();
    const next: Partial<Record<SfxName, string>> = {};
    for (const name of GALLERY_ORDER) {
      const spec = stored[name];
      if (!spec) continue;
      const found = GALLERY[name].find(
        (c) => JSON.stringify(c.spec) === JSON.stringify(spec),
      );
      if (found) next[name] = found.id;
    }
    setPicks(next);
  }, []);

  useEffect(() => audioPort.onMuteChange(setMuted), []);

  const pick = useCallback((name: SfxName, c: Candidate) => {
    // Order matters and it is the whole design: SAVE first, then unlock (which
    // re-reads the store), then play through the real port. So the sound you
    // hear is produced by exactly the code path a game will take.
    saveVoicePick(name, c.shipped ? undefined : c.spec);
    setPicks((p) => {
      const next = { ...p };
      if (c.shipped) delete next[name];
      else next[name] = c.id;
      return next;
    });
    audioPort.unlock();
    audioPort.play(name);
    haptic.tap();
  }, []);

  const reset = useCallback((name: SfxName) => {
    saveVoicePick(name, undefined);
    setPicks((p) => {
      const next = { ...p };
      delete next[name];
      return next;
    });
    audioPort.unlock();
    audioPort.play(name);
  }, []);

  const resetAll = useCallback(() => {
    clearVoicePicks();
    // The effects too, or "back to shipped" would be a half-truth: the sounds
    // would revert and the confetti would quietly stay at whatever it was last
    // set to, with the button claiming otherwise.
    clearTuning();
    setPicks({});
    // Remount the effect strips. Each one holds its own current value in local
    // state, so without this they would keep highlighting the value that was
    // just cleared - the store would be right and the screen would be lying.
    setResetSeq((s) => s + 1);
    audioPort.unlock();
  }, []);

  /** The win moment, driven directly rather than through `winMoment()` - this
   *  must never grant a coin or touch a score just because somebody opened the
   *  lab. Same order and the same two delays the real one uses. */
  const playWin = useCallback((coins: number, confetti: boolean) => {
    audioPort.unlock();
    audioPort.play("win");
    haptic.win();
    if (confetti) celebrate();
    const stage = stageRef.current;
    const box = stage?.getBoundingClientRect();
    const from = box
      ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (coins > 0) {
      flyTo(from, walletRef.current, {
        count: coins,
        particle: () => {
          const el = iconNode("coin");
          el.style.color = "var(--orange-ink)";
          return el;
        },
      });
    }
    window.setTimeout(() => audioPort.play("star"), 450);
    if (coins > 0) window.setTimeout(() => audioPort.play("coin"), 620);
  }, []);

  const reduced = prefersReducedMotion();

  return (
    // THE LAB OWNS ITS OWN SCROLL, and it has to.
    //
    // `body.app-shell` is `height: 100%; overflow: hidden` - correct for an app
    // that manages its own scroll regions, and it means a route rendering a tall
    // page gets CLIPPED with nothing to scroll rather than overflowing. `#root`
    // is then `height: 100dvh; display: flex; flex-direction: column`, so a
    // child that does not say `minHeight: 0` is floored at its content height
    // and cannot shrink to make room for a scrollbar - the documented flexbox
    // scroll trap, the same one `GameHost`'s mount solves the same way.
    //
    // Without all three of `flex`, `minHeight: 0` and `overflowY`, everything
    // below the first screenful is unreachable: no scrollbar, no error, no
    // clipped-looking edge. Just a page that appears to end early.
    <main
      style={{
        flex: "1 1 auto",
        minHeight: 0,
        overflowY: "auto",
        // The app shell disables overscroll globally; inside a real scroll
        // region that is wrong - it kills the rubber-band on iOS and makes the
        // list feel dead at both ends.
        overscrollBehavior: "contain",
        width: "100%",
        color: "var(--text)",
        fontFamily: "var(--font)",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "var(--space-4) var(--space-4) var(--space-8)",
        }}
      >
        <header style={{ marginBottom: "var(--space-4)" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-2)",
              alignItems: "center",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontFamily: "var(--font-display)",
                flex: "1 1 auto",
              }}
            >
              {say("title", lang)}
            </h1>
            <Button variant="ghost" onClick={() => setBlind((b) => !b)}>
              {blind ? say("blindOff", lang) : say("blindOn", lang)}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                audioPort.unlock();
                audioPort.toggleMute();
              }}
            >
              <Icon
                name={muted ? "muted" : "sound"}
                label={muted ? "sound off" : "sound on"}
              />
            </Button>
            <Button variant="ghost" onClick={resetAll}>
              {say("reset", lang)}
            </Button>
            <Button variant="ghost" onClick={() => (window.location.hash = "")}>
              {say("home", lang)}
            </Button>
          </div>
          <p
            style={{
              margin: "var(--space-2) 0 0",
              fontSize: 14,
              color: "var(--text-dim)",
            }}
          >
            {say("lede", lang)}
          </p>
          {muted && (
            <p
              style={{
                margin: "var(--space-2) 0 0",
                fontSize: 14,
                color: "var(--red-ink)",
                fontWeight: 700,
              }}
            >
              {say("muted", lang)}
            </p>
          )}
          {reduced && (
            <p
              style={{
                margin: "var(--space-2) 0 0",
                fontSize: 13,
                color: "var(--text-dim)",
              }}
            >
              {say("reduced", lang)}
            </p>
          )}
        </header>

        <h2
          style={{
            fontSize: 16,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--text-dim)",
          }}
        >
          {say("sounds", lang)}
        </h2>
        {GALLERY_ORDER.map((name) => (
          <SoundCard
            key={name}
            name={name}
            lang={lang}
            blind={blind}
            pickedId={picks[name] ?? null}
            onPick={pick}
            onReset={reset}
          >
            {/* The streak card is the one that needs more than a strip: a
                single rung says nothing about a voice heard up to 21 semitones
                higher, so its card carries the ladder itself. */}
            {name === "streak" && <StreakRow lang={lang} />}
          </SoundCard>
        ))}

        <h2
          style={{
            fontSize: 16,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--text-dim)",
          }}
        >
          {say("moment", lang)}
        </h2>
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-2)",
            padding: "var(--space-4)",
            marginBottom: "var(--space-4)",
          }}
        >
          <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-dim)" }}>
            {say("momentLede", lang)}
          </p>
          <div
            ref={stageRef}
            style={{
              height: 90,
              display: "grid",
              placeItems: "center",
              borderRadius: "var(--radius-2)",
              background: "var(--bg-soft)",
              marginBottom: "var(--space-3)",
            }}
          >
            <div
              ref={walletRef}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-pill)",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                fontSize: 13,
              }}
            >
              {say("wallet", lang)}
            </div>
          </div>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}
          >
            <Button onClick={() => playWin(3, true)}>
              <CoinLabel n={3} confetti lang={lang} />
            </Button>
            <Button onClick={() => playWin(8, true)}>
              <CoinLabel n={8} confetti lang={lang} />
            </Button>
            <Button variant="ghost" onClick={() => playWin(12, false)}>
              <CoinLabel n={12} lang={lang} />
            </Button>
            <Button variant="ghost" onClick={() => playWin(0, false)}>
              {lang === "he" ? "רק האקורד" : "chord only"}
            </Button>
          </div>
        </section>

        <h2
          style={{
            fontSize: 16,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--text-dim)",
          }}
        >
          {say("effects", lang)}
        </h2>
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-2)",
            padding: "var(--space-4)",
          }}
        >
          <EffectButtons key={resetSeq} lang={lang} stageRef={stageRef} />
        </section>
      </div>
    </main>
  );
}

/** "8 coins and confetti", drawn from the icon set rather than typed as emoji. */
function CoinLabel({
  n,
  confetti,
  lang,
}: {
  n: number;
  confetti?: boolean;
  lang: Lang;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {n}
      <Icon name="coin" label={lang === "he" ? "מטבעות" : "coins"} />
      {confetti && (
        <Icon name="star" label={lang === "he" ? "קונפטי" : "confetti"} />
      )}
    </span>
  );
}

/** Split out so the effect handlers stay readable and the parent stays short. */
function EffectButtons({
  lang,
  stageRef,
}: {
  lang: Lang;
  stageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const centre = () => {
    const box = targetRef.current?.getBoundingClientRect();
    return box
      ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };
  const L = (he: string, en: string) => (lang === "he" ? he : en);

  return (
    <>
      <div
        ref={targetRef}
        style={{
          height: 80,
          display: "grid",
          placeItems: "center",
          borderRadius: "var(--radius-2)",
          background: "var(--bg-soft)",
          marginBottom: "var(--space-3)",
          fontSize: 13,
          color: "var(--text-dim)",
        }}
      >
        {L("כאן זה קורה", "it happens here")}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <Button
          variant="ghost"
          onClick={() => {
            const c = centre();
            burst(c.x, c.y);
          }}
        >
          {L("ניצוצות", "burst")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const c = centre();
            burst(c.x, c.y, { count: 30, spread: 160 });
          }}
        >
          {L("ניצוצות גדולים", "big burst")}
        </Button>
        <Button variant="ghost" onClick={() => celebrate()}>
          {L("קונפטי", "confetti")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => targetRef.current && shake(targetRef.current)}
        >
          {L("רעידה", "shake")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => stageRef.current && popEl(stageRef.current)}
        >
          {L("קפיצה", "pop")}
        </Button>
        <Button variant="ghost" onClick={() => haptic.tap()}>
          {L("רטט קצר", "buzz: tap")}
        </Button>
        <Button variant="ghost" onClick={() => haptic.success()}>
          {L("רטט נכון", "buzz: correct")}
        </Button>
        <Button variant="ghost" onClick={() => haptic.fail()}>
          {L("רטט טעות", "buzz: wrong")}
        </Button>
        <Button variant="ghost" onClick={() => haptic.win()}>
          {L("רטט ניצחון", "buzz: win")}
        </Button>
      </div>

      {/* THE TOURNAMENT HALF. Everything above PLAYS an effect; everything
          below PICKS one, saves it, and then plays it - the same contract the
          sound strips have, so a tap here changes what a game does. */}
      <Tourney
        lang={lang}
        label={L("כמה קונפטי בניצחון", "Confetti on a win")}
        note={L(
          "מגיע לכל ניצחון בכל משחק - winMoment קורא לזה בלי מספר",
          "Reaches every win in every game - winMoment calls it with no count",
        )}
        field="confetti"
        options={[24, 40, 60, 90, 140]}
        preview={(v) => celebrate({ count: v })}
      />
      <Tourney
        lang={lang}
        label={L("עוצמת הרעידה", "Shake distance")}
        note={L(
          "התשובה של האפליקציה ל״לא״, ב-18 מקומות",
          "The app's answer to 'no', in 18 places",
        )}
        field="shakePx"
        options={[3, 4, 6, 9, 13]}
        preview={(v) => targetRef.current && shake(targetRef.current, v)}
      />
      <Tourney
        lang={lang}
        label={L("אורך הרעידה", "Shake length")}
        note={L("במילישניות", "In milliseconds")}
        field="shakeMs"
        options={[140, 190, 240, 320, 420]}
        preview={(v) =>
          targetRef.current && shake(targetRef.current, undefined, v)
        }
      />
      <Tourney
        lang={lang}
        label={L("פיזור הניצוצות", "Burst spread")}
        note={L(
          "רק הפיזור. את הכמות כל משחק כותב בעצמו (5 עד 16), וארגומנט מפורש גובר על ברירת מחדל",
          "Spread only. Each game hand-writes its own count (5 to 16), and an explicit argument beats a default",
        )}
        field="burstSpread"
        options={[50, 70, 90, 130, 190]}
        preview={(v) => {
          const p = centre();
          burst(p.x, p.y, { spread: v });
        }}
      />
    </>
  );
}

/**
 * One tunable, as a strip of choices. Tapping SAVES then previews, so what you
 * see is what a game will draw - the same order `pick()` uses for sounds, and
 * for the same reason.
 */
function Tourney({
  lang,
  label,
  note,
  field,
  options,
  preview,
}: {
  lang: Lang;
  label: string;
  note: string;
  field: keyof JuiceTuning;
  options: number[];
  preview: (v: number) => void;
}) {
  const [value, setValue] = useState(() => tuning()[field]);
  const shipped = JUICE_SHIPPED[field];

  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
      <p
        style={{
          margin: "2px 0 var(--space-2)",
          fontSize: 12,
          color: "var(--text-dim)",
        }}
      >
        {note}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
        {options.map((v) => {
          const on = v === value;
          return (
            <button
              key={v}
              aria-pressed={on}
              onClick={() => {
                saveTuning({ [field]: v });
                setValue(tuning()[field]);
                preview(v);
              }}
              style={{
                minHeight: "var(--tap)",
                minWidth: 62,
                padding: "6px 12px",
                borderRadius: "var(--radius-2)",
                border: on ? "2px solid var(--brand)" : "1px solid var(--line)",
                background: on ? "var(--brand-fill)" : "var(--surface-2)",
                color: "var(--text)",
                font: "inherit",
                fontWeight: on ? 700 : 400,
                cursor: "pointer",
              }}
            >
              {v}
              {v === shipped && (
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--text-dim)",
                  }}
                >
                  {lang === "he" ? "המקורי" : "shipped"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The streak ladder, climbed by tapping.
 *
 * The ONLY way to judge this is to climb it - a single rung tells you nothing
 * about a voice that is heard up to 21 semitones above its own base, and the
 * top is exactly where a bright timbre stops being bright and starts being
 * shrill. So the row counts up, shows which rung it is on, and says when the
 * ladder has stopped climbing.
 *
 * It calls `streakStep` rather than indexing the ladder itself, so what you
 * hear here is produced by the same arithmetic a game will run.
 */
function StreakRow({ lang }: { lang: Lang }) {
  const [n, setN] = useState(0);
  const L = (he: string, en: string) => (lang === "he" ? he : en);
  const step = streakStep(n);
  const tier = streakTier(n);
  const capped = streakCapped(n);

  const bump = () => {
    const next = n + 1;
    setN(next);
    audioPort.unlock();
    const s = streakStep(next);
    // `undefined` and 0 are different answers - 0 IS the bottom rung. A run
    // too short for the ladder plays the ordinary correct sound instead,
    // which is exactly what a game would do.
    if (s === undefined) audioPort.play("success");
    else audioPort.play("streak", { semitones: s });
    haptic.tap();
  };

  const TIER_WORDS = {
    good: { he: "יופי", en: "Nice" },
    great: { he: "מצוין", en: "Great" },
    amazing: { he: "מדהים", en: "Amazing" },
  } as const;

  return (
    <div style={{ marginTop: "var(--space-3)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-2)",
          alignItems: "center",
        }}
      >
        <Button onClick={bump}>
          {L("עוד אחת נכונה", "one more correct")} ({n})
        </Button>
        <Button variant="ghost" onClick={() => setN(0)}>
          {L("טעות - מתחילים מחדש", "a miss - start over")}
        </Button>
      </div>
      <p
        style={{
          margin: "var(--space-2) 0 0",
          fontSize: 13,
          color: "var(--text-dim)",
        }}
      >
        {step === undefined
          ? L(
              `עדיין לא רצף. מתחת ל-${STREAK_FIRST} נכונות זה פשוט הצליל הרגיל`,
              `Not a streak yet. Below ${STREAK_FIRST} correct this is just the ordinary sound`,
            )
          : L(
              `שלב ${step} חצאי-טונים${capped ? " - הסולם עצר כאן ולא חוזר להתחלה" : ""}`,
              `${step} semitones up${capped ? " - the ladder holds here, it never drops back" : ""}`,
            )}
      </p>
      {tier && (
        <p style={{ margin: "4px 0 0", fontSize: 13 }}>
          {L("המילה שמתאימה לשלב הזה: ", "The word for this tier: ")}
          <b>{TIER_WORDS[tier][lang]}</b>{" "}
          <span style={{ color: "var(--text-dim)" }}>
            {L("(אף אחד לא אומר אותה עדיין)", "(nothing says it yet)")}
          </span>
        </p>
      )}
    </div>
  );
}
