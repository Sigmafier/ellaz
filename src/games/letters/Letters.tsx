import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { textFor, AUTONYM, type Locale } from "@i18n/index";
import type { GameContext } from "@sdk/index";
import type { CastItem } from "@shared/cast";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { IconButton } from "@ui/index";
import { haptic, shake } from "@juice/index";
import { Prompt, winMoment, useRememberedLevel } from "@shared/index";
import {
  LEVELS,
  type Level,
  type LevelId,
  type Round,
  buildRound,
  contentLangOptions,
  isMilestoneRound,
  levelById,
  poolFor,
  refillBag,
} from "./logic";

// The content language (which alphabet the child is practising) is remembered
// separately from the level, under the game's own namespace. It is NOT the app
// UI language: a Hebrew-speaking child can practise English letters without the
// whole interface changing.
const LANG_KEY = "lang";

interface Challenge extends Round {
  item: CastItem;
}

const LEVEL_LABELS: Record<LevelId, Record<Locale, string>> = {
  easy: { he: "קל", en: "Easy", es: "Fácil" },
  medium: { he: "בינוני", en: "Med", es: "Media" },
  hard: { he: "קשה", en: "Hard", es: "Difícil" },
};

// Derived from LEVELS rather than re-typed, so the row can never drift from the
// levels the logic actually knows about.
const LEVEL_OPTIONS: DifficultyOption<LevelId>[] = LEVELS.map((l) => ({
  id: l.id,
  label: LEVEL_LABELS[l.id],
}));

/** A speaker that says the WORD aloud, in the CONTENT language (not the UI's). */
function WordSpeaker({
  ctx,
  word,
  lang,
}: {
  ctx: GameContext;
  word: string;
  lang: Locale;
}): ReactElement | null {
  const [canSpeak, setCanSpeak] = useState(false);
  useEffect(() => {
    // Voices load async: seed with a read (which also tells the port WHICH
    // locale we care about) and then subscribe. See Prompt.tsx / speech.ts.
    setCanSpeak(ctx.speech.available(lang));
    return ctx.speech.onAvailabilityChange(setCanSpeak);
  }, [ctx, lang]);

  if (!canSpeak) return null;
  return (
    <IconButton
      ariaLabel={textFor({ he: "השמע את המילה", en: "say the word", es: "di la palabra" }, ctx.locale)}
      onClick={() => {
        ctx.speech.unlock();
        void ctx.speech.speak(word, { locale: lang });
      }}
    >
      🔊
    </IconButton>
  );
}

export function Letters({ ctx }: { ctx: GameContext }): ReactElement {
  const T = textFor(
    {
      he: { prompt: "איזו אות פותחת?" },
      en: { prompt: "Which letter does it start with?" },
      es: { prompt: "¿Con qué letra empieza?" },
    },
    ctx.locale,
  );

  const [levelId, setLevelId] = useRememberedLevel(ctx, LEVEL_OPTIONS.map((o) => o.id), "easy");
  const level = levelById(levelId);

  // Games always receive the app locale narrowed to a page locale (he/en/es), so
  // "the interface is Hebrew" is exactly `ctx.locale === "he"`, decided inside
  // `contentLangOptions` as data rather than a branch here.
  const langOptions = contentLangOptions(ctx.locale);
  const [contentLang, setContentLang] = useState<Locale>(() => {
    const stored = ctx.storage.get<unknown>(LANG_KEY, null);
    return typeof stored === "string" && (langOptions as readonly string[]).includes(stored)
      ? (stored as Locale)
      : langOptions[0];
  });

  // The shuffle bag: the level's whole pool, shuffled once and dealt through in
  // order, so no picture repeats until every one has been shown. Refilled (a
  // fresh shuffle) when it runs out, and rebuilt from scratch on a new session
  // or a level/language change. Held in refs because it advances from the tap
  // handler and must not trigger a re-render on its own.
  const bagRef = useRef<CastItem[]>([]);
  const posRef = useRef(0);
  const lastEmojiRef = useRef<string | undefined>(undefined);

  const drawNext = useCallback((lvl: Level, lang: Locale): Challenge => {
    if (posRef.current >= bagRef.current.length) {
      bagRef.current = refillBag(poolFor(lvl), Math.random, lastEmojiRef.current);
      posRef.current = 0;
    }
    const item = bagRef.current[posRef.current];
    posRef.current += 1;
    lastEmojiRef.current = item.emoji;
    return { item, ...buildRound(lang, item, lvl.choices) };
  }, []);

  const board = `${contentLang}:${levelId}`;
  const [best, setBest] = useState(() => ctx.score?.best(board) ?? 0);
  const [round, setRound] = useState(0);
  const [challenge, setChallenge] = useState<Challenge>(() => drawNext(level, contentLang));
  /** Letters already tried on THIS picture - dimmed, so a child sees what they ruled out. */
  const [tried, setTried] = useState<string[]>([]);

  const pictureRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  // One personal-best moment per run: the score port answers "was that a record?"
  // on every correct answer, and without this a first-timer beats their 0 on
  // literally every tap. See rewards-economy-convention.md.
  const bestFiredRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(levelId);
    }
  }, [ctx, levelId]);

  // Start a clean run at a level + content language. Both a difficulty change
  // and a language change are a fresh run with a freshly shuffled bag: the score
  // board changes with the language, so an English-letter best and a
  // Hebrew-letter best never mix.
  const startFresh = useCallback(
    (id: LevelId, lang: Locale) => {
      const lvl = levelById(id);
      bagRef.current = [];
      posRef.current = 0;
      lastEmojiRef.current = undefined;
      bestFiredRef.current = false;
      setRound(0);
      setTried([]);
      setChallenge(drawNext(lvl, lang));
      setBest(ctx.score?.best(`${lang}:${id}`) ?? 0);
      ctx.analytics.levelStart(id);
    },
    [ctx, drawNext],
  );

  const chooseLevel = useCallback(
    (id: LevelId) => {
      setLevelId(id);
      startFresh(id, contentLang);
    },
    [setLevelId, startFresh, contentLang],
  );

  const chooseLang = useCallback(
    (lang: Locale) => {
      setContentLang(lang);
      ctx.storage.set(LANG_KEY, lang);
      startFresh(levelId, lang);
    },
    [ctx, startFresh, levelId],
  );

  // The play action. Runs in the HANDLER flow, never inside a setState updater:
  // React may run an updater twice, and for winMoment that is a double grant.
  const onPick = useCallback(
    (letter: string) => {
      if (tried.includes(letter)) return;
      ctx.audio.unlock();
      ctx.speech.unlock();

      if (letter !== challenge.correct) {
        // Gentle: no buzzer, no "wrong". A soft sound, a shake, and the letter
        // dims so it is clearly ruled out - the same picture stays up to retry.
        ctx.audio.play("fail");
        haptic.tap();
        const el = pictureRef.current;
        if (el) shake(el);
        setTried((t) => [...t, letter]);
        return;
      }

      ctx.audio.play("success");
      haptic.tap();

      const nextRound = round + 1;
      setRound(nextRound);
      setTried([]);

      const r = pictureRef.current?.getBoundingClientRect();
      const at = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;

      // Endless: a milestone coin every few, and one latched personal best. No
      // completion star - there is nothing to complete.
      if (isMilestoneRound(nextRound)) {
        winMoment(ctx, { reason: "milestone", level: `round-${nextRound}`, at, confetti: false });
      }
      if (ctx.score?.report({ value: nextRound, unit: "points", board }).isPersonalBest) {
        setBest(nextRound);
        if (!bestFiredRef.current) {
          bestFiredRef.current = true;
          winMoment(ctx, {
            reason: "personal_best",
            tier: levelId,
            level: `round-${nextRound}`,
            at,
            confetti: false,
          });
        }
      }

      setChallenge(drawNext(level, contentLang));
    },
    [ctx, tried, challenge, round, board, levelId, level, contentLang, drawNext],
  );

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "layers", label: ctx.t("stage"), value: round, record: best, compact: true },
      ]}
      levels={LEVEL_OPTIONS}
      level={levelId}
      onLevel={chooseLevel}
      onRestart={() => startFresh(levelId, contentLang)}
      footer={
        // The content-language toggle. Always visible (there are always at least
        // two options), labelled with each language's own autonym so it reads the
        // same regardless of the interface language.
        <div dir="ltr" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {langOptions.map((lang) => {
            const on = lang === contentLang;
            return (
              <button
                key={lang}
                type="button"
                aria-pressed={on}
                onClick={() => chooseLang(lang)}
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  minHeight: 48,
                  border: on ? "3px solid var(--brand)" : "3px solid transparent",
                  borderRadius: "var(--radius-2)",
                  background: on ? "var(--brand)" : "var(--surface)",
                  color: on ? "#fff" : "var(--text)",
                  boxShadow: "var(--shadow-1)",
                  fontFamily: "Fredoka, inherit",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                  padding: "0 10px",
                }}
              >
                {AUTONYM[lang]}
              </button>
            );
          })}
        </div>
      }
    >
      <Prompt ctx={ctx} glyph="🔠" text={T.prompt} />

      {/* The picture IS the question - the word is never shown as text, or its
          first letter would be there to read. The speaker is an optional aid
          that says the word aloud; nothing here needs the sound to be playable. */}
      <div
        ref={pictureRef}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          width: "min(70vw, 34vh, 300px)",
          padding: "14px 14px 18px",
          background: "var(--surface)",
          borderRadius: "var(--radius-3)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <span aria-label={challenge.item[ctx.locale]} style={{ fontSize: "clamp(72px, 26vw, 132px)", lineHeight: 1 }}>
          {challenge.item.emoji}
        </span>
        <WordSpeaker ctx={ctx} word={challenge.item[contentLang]} lang={contentLang} />
      </div>

      {/* dir="ltr": a spatial row must not mirror in the Hebrew RTL app, so the
          letter the child sees on the left is the letter under their finger. The
          letters themselves render correctly in either script regardless. */}
      <div
        dir="ltr"
        className="ellaz-play-surface"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${challenge.options.length}, 1fr)`,
          gap: 12,
          width: "min(90vw, 400px)",
          touchAction: "none",
        }}
      >
        {challenge.options.map((letter) => {
          const ruledOut = tried.includes(letter);
          return (
            <button
              key={letter}
              type="button"
              aria-label={letter}
              disabled={ruledOut}
              onPointerDown={() => onPick(letter)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPick(letter);
                }
              }}
              style={{
                aspectRatio: "1",
                minHeight: 72,
                border: "none",
                borderRadius: 20,
                background: ruledOut ? "var(--surface-2)" : "var(--surface)",
                color: "var(--text)",
                fontFamily: "Fredoka, inherit",
                fontWeight: 800,
                fontSize: "clamp(36px, 12vw, 64px)",
                lineHeight: 1,
                display: "grid",
                placeItems: "center",
                boxShadow: "var(--shadow-1)",
                cursor: ruledOut ? "default" : "pointer",
                opacity: ruledOut ? 0.35 : 1,
                touchAction: "none",
                transition: "opacity 0.15s linear, transform 0.08s linear",
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </GameChrome>
  );
}
