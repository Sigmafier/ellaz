import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { textFor, AUTONYM, dirOf, type Locale } from "@i18n/index";
import type { GameContext } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { Button, IconButton } from "@ui/index";
import { burst, haptic, popEl, shake } from "@juice/index";
import { Prompt, winMoment, useRememberedLevel } from "@shared/index";
import {
  LEVELS,
  type Level,
  type LevelId,
  type SpellState,
  buildPuzzle,
  contentLangOptions,
  hint as hintState,
  isMilestoneRound,
  levelById,
  place,
  poolFor,
  refillBag,
  startPuzzle,
  usedTileIds,
} from "./logic";

/**
 * The content language - which alphabet the child is spelling in - is
 * remembered separately from the level, under the game's own namespace. It is
 * NOT the interface language: a Hebrew-speaking child can practise spelling in
 * English without the whole app changing around them.
 */
const LANG_KEY = "lang";

/** How long the finished word stays on screen before the next picture. */
const CELEBRATE_MS = 950;

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
      ariaLabel={textFor(
        { he: "השמע את המילה", en: "say the word", es: "di la palabra" },
        ctx.locale,
      )}
      onClick={() => {
        ctx.speech.unlock();
        void ctx.speech.speak(word, { locale: lang });
      }}
    >
      🔊
    </IconButton>
  );
}

export function Spell({ ctx }: { ctx: GameContext }): ReactElement {
  const T = textFor(
    {
      he: { prompt: "מרכיבים את המילה", hint: "רמז", hints: "רמזים" },
      en: { prompt: "Build the word", hint: "Hint", hints: "Hints" },
      es: { prompt: "Forma la palabra", hint: "Pista", hints: "Pistas" },
    },
    ctx.locale,
  );

  const [levelId, setLevelId] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    "easy",
  );
  const level = levelById(levelId);

  // Games always receive the app locale narrowed to a shipped locale (he/en/es),
  // so "the interface is Hebrew" is exactly `ctx.locale === "he"` - decided
  // inside `contentLangOptions` as data rather than as a branch here.
  const langOptions = contentLangOptions(ctx.locale);
  const [contentLang, setContentLang] = useState<Locale>(() => {
    const stored = ctx.storage.get<unknown>(LANG_KEY, null);
    return typeof stored === "string" && (langOptions as readonly string[]).includes(stored)
      ? (stored as Locale)
      : langOptions[0];
  });

  // The shuffle bag: the level's whole pool, shuffled once and dealt through in
  // order, so no picture repeats until every one has been shown. Held in refs
  // because it advances from a tap handler and must not re-render on its own.
  const bagRef = useRef<ReturnType<typeof refillBag>>([]);
  const posRef = useRef(0);
  const lastEmojiRef = useRef<string | undefined>(undefined);

  const drawNext = useCallback((lvl: Level, lang: Locale): SpellState => {
    if (posRef.current >= bagRef.current.length) {
      bagRef.current = refillBag(poolFor(lvl, lang), Math.random, lastEmojiRef.current);
      posRef.current = 0;
    }
    const item = bagRef.current[posRef.current];
    posRef.current += 1;
    lastEmojiRef.current = item.emoji;
    return startPuzzle(buildPuzzle(lang, item, lvl));
  }, []);

  const board = `${contentLang}:${levelId}`;
  const [best, setBest] = useState(() => ctx.score?.best(board) ?? 0);
  /** Words finished this run. The thing the score counts. */
  const [round, setRound] = useState(0);
  /** Hints spent this run, shown to a grown-up and reported to nobody. */
  const [hintsUsed, setHintsUsed] = useState(0);
  const [state, setState] = useState<SpellState>(() => drawNext(level, contentLang));
  /** True while the finished word is on screen, before the next picture. */
  const [solved, setSolved] = useState(false);

  const wordRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  // One personal-best moment per run: the score port answers "was that a
  // record?" on every word, and without this a first-timer beats their 0 on
  // literally every word. See rewards-economy-convention.md.
  const bestFiredRef = useRef(false);
  // The between-words timer, cleared on unmount and on every restart. A pending
  // timeout that fires into an unmounted tree is the one way this game could
  // deal a picture nobody asked for.
  const nextTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(levelId);
    }
  }, [ctx, levelId]);

  useEffect(() => () => clearTimeout(nextTimer.current), []);

  // Start a clean run at a level + content language. Both a difficulty change
  // and a language change are a fresh run with a freshly shuffled bag: the
  // score board changes with the language, so an English spelling record and a
  // Hebrew one never mix.
  const startFresh = useCallback(
    (id: LevelId, lang: Locale) => {
      clearTimeout(nextTimer.current);
      const lvl = levelById(id);
      bagRef.current = [];
      posRef.current = 0;
      lastEmojiRef.current = undefined;
      bestFiredRef.current = false;
      setRound(0);
      setHintsUsed(0);
      setSolved(false);
      setState(drawNext(lvl, lang));
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

  /**
   * A word is finished. Runs in the HANDLER flow, never inside a setState
   * updater: React may run an updater twice, and for `winMoment` that is a
   * double grant.
   *
   * The word itself gets a burst rather than a `winMoment` - this is an endless
   * game, so a completion star per word would mint dozens a session and make a
   * star mean nothing. The economy rides on top: a milestone coin every fifth
   * word, and one latched personal best per run. See
   * rewards-economy-convention.md.
   */
  const finishWord = useCallback(
    (finished: SpellState) => {
      const nextRound = round + 1;
      setRound(nextRound);
      setSolved(true);

      ctx.audio.play("win");
      haptic.success();

      const el = wordRef.current;
      const r = el?.getBoundingClientRect();
      const at = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
      if (el) popEl(el);
      if (at) burst(at.x, at.y, { count: 12 });

      if (isMilestoneRound(nextRound)) {
        winMoment(ctx, { reason: "milestone", level: `word-${nextRound}`, at, confetti: false });
      }
      if (ctx.score?.report({ value: nextRound, unit: "points", board }).isPersonalBest) {
        setBest(nextRound);
        if (!bestFiredRef.current) {
          bestFiredRef.current = true;
          winMoment(ctx, {
            reason: "personal_best",
            tier: levelId,
            level: `word-${nextRound}`,
            at,
            confetti: false,
          });
        }
      }

      ctx.analytics.levelComplete(`${levelId}-${finished.puzzle.word}`, 0);

      clearTimeout(nextTimer.current);
      nextTimer.current = setTimeout(() => {
        setSolved(false);
        setState(drawNext(level, contentLang));
      }, CELEBRATE_MS);
    },
    [ctx, round, board, levelId, level, contentLang, drawNext],
  );

  const onTile = useCallback(
    (tileId: number) => {
      if (solved) return;
      ctx.audio.unlock();
      ctx.speech.unlock();

      const result = place(state, tileId);
      if (result.outcome === "ignored") return;

      if (result.outcome === "wrong") {
        // Gentle: no buzzer, no "wrong". A soft sound, a shake of the word so
        // far, and that tile dims so the child can see what they ruled out.
        // The picture never changes and nothing is lost.
        ctx.audio.play("fail");
        haptic.tap();
        if (wordRef.current) shake(wordRef.current);
        setState(result.state);
        return;
      }

      ctx.audio.play("success");
      haptic.tap();
      setState(result.state);
      if (result.complete) finishWord(result.state);
    },
    [ctx, state, solved, finishWord],
  );

  const onHint = useCallback(() => {
    if (solved) return;
    ctx.audio.unlock();
    const result = hintState(state);
    if (result.tileId === undefined) return;

    ctx.audio.play("pop");
    haptic.tap();
    setHintsUsed((n) => n + 1);
    setState(result.state);
    if (result.complete) finishWord(result.state);
  }, [ctx, state, solved, finishWord]);

  const spent = usedTileIds(state);
  const { puzzle, slots, ruledOut } = state;
  // The slot row is TEXT, so it reads in the direction of the language being
  // spelled - the first letter of a Hebrew word belongs on the right. That is
  // the opposite call from the tray below, and from every other spatial grid in
  // this app: see .claude/rules/rtl-spatial-grid-dir-ltr.md. The row is pinned
  // to the CONTENT language rather than to `ctx.locale`, because a Hebrew
  // speaker spelling `dog` must see D-O-G left to right.
  const wordDir = dirOf(contentLang);

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "layers", label: ctx.t("stage"), value: round, compact: true, record: best },
        // `bolt` rather than `star`: a star is this platform's trophy currency,
        // and putting one over a hint counter would read as a reward for asking
        // for help. It counts, it does not judge.
        { icon: "bolt", label: T.hints, value: hintsUsed, compact: true },
      ]}
      levels={LEVEL_OPTIONS}
      level={levelId}
      onLevel={chooseLevel}
      onRestart={() => startFresh(levelId, contentLang)}
      footer={
        // The content-language toggle, labelled with each language's own
        // autonym so it reads the same whatever the interface language is.
        <div
          dir="ltr"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
        >
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
      <Prompt ctx={ctx} glyph="✏️" text={T.prompt} />

      {/* The picture is the question. The word is never written out - that
          would be copying rather than spelling - and the speaker is an optional
          aid that says it aloud. Nothing here needs sound to be playable. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          aria-label={puzzle.item[ctx.locale]}
          style={{ fontSize: "clamp(56px, 20vw, 104px)", lineHeight: 1 }}
        >
          {puzzle.item.emoji}
        </span>
        <WordSpeaker ctx={ctx} word={puzzle.word} lang={contentLang} />
      </div>

      {/* The word so far. One box per letter, so the length of the word is
          visible from the start - a child can see they need four letters
          before they have found one. */}
      <div
        ref={wordRef}
        dir={wordDir}
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          width: "min(92vw, 560px)",
        }}
      >
        {slots.map((slot, i) => {
          const letter = slot ? puzzle.tray.find((t) => t.id === slot.tileId)?.letter : undefined;
          return (
            <span
              key={i}
              style={{
                minWidth: "clamp(38px, 11vw, 58px)",
                height: "clamp(48px, 14vw, 72px)",
                display: "grid",
                placeItems: "center",
                padding: "0 4px",
                borderRadius: 14,
                // A hinted letter is drawn softer than one the child found. It
                // is not a penalty and it is never taken away - it is simply
                // honest about which letters were given.
                background: slot ? (slot.hinted ? "var(--surface-2)" : "var(--brand)") : "transparent",
                color: slot ? (slot.hinted ? "var(--text)" : "#fff") : "var(--text)",
                border: slot ? "3px solid transparent" : "3px dashed var(--surface-2)",
                fontFamily: "Fredoka, inherit",
                fontWeight: 800,
                fontSize: "clamp(26px, 8vw, 40px)",
                lineHeight: 1,
                transition: "background 0.15s linear, color 0.15s linear",
              }}
            >
              {letter ?? ""}
            </span>
          );
        })}
      </div>

      {/* dir="ltr": the tray is a spatial grid whose order carries no meaning,
          so it must not mirror in the Hebrew RTL app - the tile a child sees on
          the left has to be the tile under their finger. The letters themselves
          render correctly in either script regardless. */}
      <div
        dir="ltr"
        className="ellaz-play-surface"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
          width: "min(92vw, 560px)",
          touchAction: "none",
        }}
      >
        {puzzle.tray.map((tile) => {
          const used = spent.has(tile.id);
          const out = ruledOut.includes(tile.id);
          return (
            <button
              key={tile.id}
              type="button"
              aria-label={tile.letter}
              disabled={used || out || solved}
              onPointerDown={() => onTile(tile.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTile(tile.id);
                }
              }}
              style={{
                width: "clamp(52px, 15vw, 72px)",
                height: "clamp(52px, 15vw, 72px)",
                border: "none",
                borderRadius: 18,
                background: used ? "transparent" : out ? "var(--surface-2)" : "var(--surface)",
                color: "var(--text)",
                fontFamily: "Fredoka, inherit",
                fontWeight: 800,
                fontSize: "clamp(26px, 8vw, 40px)",
                lineHeight: 1,
                display: "grid",
                placeItems: "center",
                boxShadow: used ? "none" : "var(--shadow-1)",
                // A spent tile keeps its space rather than leaving the row, so
                // the tray never reflows under a child's finger mid-word.
                opacity: used ? 0.12 : out ? 0.4 : 1,
                cursor: used || out ? "default" : "pointer",
                touchAction: "none",
                transition: "opacity 0.15s linear",
              }}
            >
              {tile.letter}
            </button>
          );
        })}
      </div>

      {/* The hint fills the first letter still unknown, and it can always be
          pressed - a rationed hint is one a stuck four-year-old cannot reach.
          It is a big labelled button rather than a small icon because it is the
          way out of being stuck, which is the moment somebody needs the largest
          target on the screen. */}
      <Button variant="ghost" kids onClick={onHint} ariaLabel={T.hint}>
        💡 {T.hint}
      </Button>
    </GameChrome>
  );
}
