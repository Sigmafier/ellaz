import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { textFor, type Locale } from "@i18n/index";
import type { GameContext } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { DifficultySelector, type DifficultyOption } from "@ui/DifficultySelector";
import { BOARD_CLASS, boardVars, isPcArena } from "@ui/boardSize";
import { burst, shake, haptic } from "@juice/index";
import { winMoment, useRememberedLevel } from "@shared/index";
import { generateProblem, isCorrect, LEVELS, type MathLevel, type OpMode, type Problem } from "./logic";

// Two rows, because the seven levels are two different games for two different
// ages. The pre-arithmetic row asks nothing a four-year-old cannot answer by
// counting pictures; the number row needs numerals. Both rows are the shared
// <DifficultySelector> and both drive the same `level` state, so whichever row
// does not hold the current level simply shows no highlighted button.
// ONE ordered ramp: the three pre-number modes a child plays before they can
// read a numeral, then the four arithmetic levels. This was two
// <DifficultySelector> rows, seven pills, because seven do not fit a phone.
// The chrome's toggle shows only the current one, so the split is gone - and
// the order is now the actual teaching order rather than two unranked groups.
const LEVEL_OPTIONS: DifficultyOption<MathLevel>[] = [
  { id: "count", label: { he: "ספירה", en: "Count", es: "Contar" } },
  { id: "match", label: { he: "התאמה", en: "Match", es: "Parejas" } },
  { id: "visual", label: { he: "תמונות", en: "Pictures", es: "Dibujos" } },
  { id: "up5", label: { he: "עד 5", en: "Up to 5", es: "Hasta 5" } },
  { id: "up10", label: { he: "עד 10", en: "Up to 10", es: "Hasta 10" } },
  { id: "up20", label: { he: "עד 20", en: "Up to 20", es: "Hasta 20" } },
  { id: "mult", label: { he: "כפל", en: "Times ×", es: "Por ×" } },
];

// The operation filter for the arithmetic levels, shown as three labels to pick
// from rather than one button that cycles. Emoji ride the words so a pre-reader
// can tell them apart. "mixed" is the default and matches the game's old coin-flip.
const OP_OPTIONS: DifficultyOption<OpMode>[] = [
  { id: "add", label: { he: "חיבור ➕", en: "Add ➕", es: "Sumar ➕" } },
  { id: "sub", label: { he: "חיסור ➖", en: "Subtract ➖", es: "Restar ➖" } },
  { id: "mixed", label: { he: "מעורב ➕➖", en: "Mixed ➕➖", es: "Mixto ➕➖" } },
];
const OP_IDS = OP_OPTIONS.map((o) => o.id);

// Bottom-of-screen hint, per mode.
const HINTS: Record<Problem["mode"], Record<Locale, string>> = {
  arith: { he: "בחרו את התשובה הנכונה", en: "Tap the right answer", es: "Toca la respuesta correcta" },
  count: { he: "כמה יש? בחרו את המספר", en: "How many? Tap the number", es: "¿Cuántos hay? Toca el número" },
  match: { he: "בחרו את הקבוצה עם המספר הזה", en: "Tap the group with that many", es: "Toca el grupo que tenga esa cantidad" },
  visual: { he: "ספרו את התמונות ובחרו את המספר", en: "Count the pictures, tap the number", es: "Cuenta los dibujos y toca el número" },
};

/**
 * A group of `n` glyphs, wrapped at five per row so a child can count it at a
 * glance instead of scanning one long line. Pinned `dir="ltr"` like every other
 * spatial arrangement in this RTL app.
 */
function GlyphGroup({ n, glyph, size }: { n: number; glyph?: string; size: string }) {
  if (!glyph || n <= 0) return null;
  return (
    <div
      dir="ltr"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(n, 5)}, auto)`,
        gap: "0.12em",
        justifyContent: "center",
        fontSize: size,
        lineHeight: 1.15,
      }}
    >
      {Array.from({ length: n }, (_, i) => (
        <span key={i} aria-hidden="true">
          {glyph}
        </span>
      ))}
    </div>
  );
}

/*
 * THE PC BOARD (2026-09-14): one fixed landscape shape for every mode, the
 * question card across the top and the three answers in one row under it.
 * Every length is a share of the board's width (`cqw`), in board-widths:
 *
 *   the card     100 wide, 27 tall, 2 padding a side  -> 96 x 23 to draw in
 *   between      3
 *   the answers  3 of 30 wide x 20 tall, 2 gaps of 5  -> 100 wide, 20 tall
 *
 * 27 + 3 + 20 = 50 tall for 100 wide, so the ratio is 2 in every mode. What
 * varies - a long sum, ten pictures, two groups side by side - never changes
 * the box; its glyph size is worked out from its own item count instead.
 *
 * Emoji advance widths differ by platform font, so a glyph column is budgeted
 * at 1.4em (glyph + the group's 0.12em gap + slack) and a row at 1.27em. A
 * numeral is budgeted at 0.65em. These are budgets, not measurements.
 *
 * At 1536x639 (chrome 111, an ESTIMATE: the head row plus the play surface's
 * padding, nothing else sits in this column) the board is
 * min(1119, (639 - 120 - 111 - 24) x 2) = 768 wide, so an answer button is
 * 230 x 154px - past the 72px kids floor on both axes.
 */
const PC_RATIO = 2;
const PC_CHROME = 111;
const PC_CARD = 27;
const PC_CARD_PAD = 2;
const PC_GAP = 3;
const PC_ANSWER = { w: 30, h: 20, gap: 5, pad: 1.5 } as const;
const EM_COL = 1.4;
const EM_ROW = 1.27;
/** Room to draw in, inside the card, less a 2cqw margin on the width. */
const DRAW_W = 100 - 2 * PC_CARD_PAD - 4;
const DRAW_H = PC_CARD - 2 * PC_CARD_PAD;

const cols = (n: number) => Math.min(Math.max(n, 1), 5);
const rows = (n: number) => Math.max(1, Math.ceil(n / 5));
const cq = (n: number) => `${Math.round(n * 100) / 100}cqw`;

/** The equation's numeral size, from its own length. */
function pcEquationSize(text: string): number {
  return Math.min(16, DRAW_W / (text.length * 0.65), DRAW_H / 1.1);
}
/** One group of `n` pictures filling the card. */
function pcCountSize(n: number): number {
  return Math.min(14, DRAW_W / (cols(n) * EM_COL), DRAW_H / (rows(n) * EM_ROW));
}
/** Two groups and three signs on ONE line; the signs are 1.2x a picture. */
function pcVisualSize(a: number, b: number): number {
  const w = (cols(a) + cols(b)) * EM_COL + 4;
  return Math.min(12, DRAW_W / w, DRAW_H / (Math.max(rows(a), rows(b)) * EM_ROW));
}
/** Every answer group drawn at ONE size - the largest group's - so sizes stay comparable. */
function pcChoiceSize(choices: number[]): number {
  const n = Math.max(...choices);
  const w = PC_ANSWER.w - 2 * PC_ANSWER.pad;
  const h = PC_ANSWER.h - 2 * PC_ANSWER.pad;
  return Math.min(9, w / (cols(n) * EM_COL), h / (rows(n) * EM_ROW));
}

export function MathGame({ ctx }: { ctx: GameContext }) {
  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    { he: { streak: "רצף" }, en: { streak: "Streak" }, es: { streak: "Racha" } },
    ctx.locale,
  );
  const [level, setLevel] = useRememberedLevel(ctx, LEVEL_OPTIONS.map((o) => o.id), "up10");
  // Read ONCE at mount: a PC run draws the fixed board below; a phone run is
  // exactly as it was.
  const [pc] = useState(isPcArena);
  // The chosen operation filter, remembered across mounts and validated on read
  // (an unknown stored value falls back to "mixed"), mirroring useRememberedLevel.
  const [opMode, setOpModeState] = useState<OpMode>(() => {
    const stored = ctx.storage.get<unknown>("opMode", null);
    return typeof stored === "string" && OP_IDS.includes(stored as OpMode) ? (stored as OpMode) : "mixed";
  });
  const [problem, setProblem] = useState<Problem>(() => generateProblem(level, undefined, opMode));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => ctx.score?.best() ?? 0);
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const streakRef = useRef(0); // authoritative streak for side-effects (no stale closure)
  // A once-per-run latch over the score port's verdict. Without it a first-time
  // player sets a "new best" on every single answer (1 > 0, 2 > 1, …) and mints
  // a personal-best reward each time; one record per run is the honest reading
  // of "beat your own record".
  const bestFiredRef = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart("addsub10");
    }
  }, [ctx]);

  const next = useCallback(() => {
    setProblem(generateProblem(level, undefined, opMode));
    setWrongChoice(null);
  }, [level, opMode]);

  // Both a difficulty change and an operation change start a clean run - the
  // problems are a different shape, so carrying a streak across them is dishonest.
  const startRun = useCallback((lvl: MathLevel, op: OpMode) => {
    streakRef.current = 0;
    bestFiredRef.current = false;
    setScore(0);
    setStreak(0);
    setWrongChoice(null);
    setProblem(generateProblem(lvl, undefined, op));
  }, []);

  const chooseLevel = useCallback((lvl: MathLevel) => {
    setLevel(lvl);
    startRun(lvl, opMode);
  }, [setLevel, opMode, startRun]);

  const chooseOp = useCallback((op: OpMode) => {
    setOpModeState(op);
    // Write through from the tap handler, not an effect - the same reason
    // useRememberedLevel persists inline.
    ctx.storage.set("opMode", op);
    startRun(level, op);
  }, [ctx, level, startRun]);

  const answer = useCallback(
    (choice: number, e: ReactPointerEvent) => {
      ctx.audio.unlock();
      ctx.speech.unlock();
      if (isCorrect(problem, choice)) {
        const ns = streakRef.current + 1;
        streakRef.current = ns;
        ctx.audio.play("success");
        haptic.success();
        burst(e.clientX, e.clientY, { count: 12 });
        setScore((s) => s + 1);
        setStreak(ns);
        const at = { x: e.clientX, y: e.clientY };
        if (ctx.score?.report({ value: ns, unit: "points" }).isPersonalBest) {
          setBest(ns);
          if (!bestFiredRef.current) {
            bestFiredRef.current = true;
            winMoment(ctx, { reason: "personal_best", level: `streak-${ns}`, at, confetti: false });
          }
        }
        // Reward side-effects live in the handler (not a state updater) so they
        // fire once, reliably, on every 5-in-a-row.
        if (ns % 5 === 0) {
          winMoment(ctx, { reason: "milestone", level: `streak-${ns}`, at, confetti: false });
        }
        // The per-answer analytics event is NOT the reward trigger — see above.
        ctx.analytics.levelComplete("addsub10", 0);
        next();
      } else {
        // Gentle: shake the wrong answer, reset streak, let them try again.
        streakRef.current = 0;
        ctx.audio.play("fail");
        haptic.fail();
        setStreak(0);
        setWrongChoice(choice);
        if (cardRef.current) shake(cardRef.current, 5, 200);
        ctx.analytics.levelFail("addsub10", "wrong");
      }
    },
    [ctx, problem, next],
  );

  // The question and the answers. A phone run draws them exactly as it always
  // did; a PC run draws the same elements at the fixed board's `cqw` sizes, and
  // every PC-only property is spread in so the phone's markup cannot move.
  const visualPc = pcVisualSize(problem.a, problem.b);
  const card = (
    <div
      ref={cardRef}
      style={{
        background: "linear-gradient(180deg,#2b3170,#1c2150)",
        borderRadius: 24,
        ...(pc
          ? { boxSizing: "border-box" as const, height: cq(PC_CARD), display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }
          : {}),
        padding: pc ? cq(PC_CARD_PAD) : "28px 24px",
        ...(pc ? {} : { minWidth: "min(88vw, 360px)" }),
        textAlign: "center",
        boxShadow: "var(--shadow-2)",
      }}
    >
      {/*
        Every question is pinned dir="ltr". For the equation that is standard
        notation in an RTL app; for the two-group visual sum it is load-bearing
        in the same way - otherwise RTL mirrors the row and 3 + 2 is drawn as
        2 + 3, which is a different (and for subtraction, unanswerable) sum.
      */}
      {problem.mode === "arith" && (
        <div
          dir="ltr"
          style={{
            fontSize: pc ? cq(pcEquationSize(`${problem.a} ${problem.op} ${problem.b} = ?`)) : "clamp(44px, 15vw, 84px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: pc ? "0.03em" : 2,
            ...(pc ? { whiteSpace: "nowrap" as const } : {}),
            // The card ground is a hard navy gradient, so pin the numerals to
            // white rather than inheriting the app's dark ink (dark-on-dark).
            color: "#fff",
          }}
        >
          {problem.a} {problem.op} {problem.b} = <span style={{ color: "var(--yellow)" }}>?</span>
        </div>
      )}

      {problem.mode === "count" && (
        <GlyphGroup
          n={problem.groups[0]}
          glyph={problem.glyph}
          size={pc ? cq(pcCountSize(problem.groups[0])) : "clamp(30px, 9vw, 52px)"}
        />
      )}

      {/* Matching: the numeral IS the question, and the groups are the buttons. */}
      {problem.mode === "match" && (
        <div
          dir="ltr"
          style={{
            fontSize: pc ? cq(20) : "clamp(56px, 20vw, 104px)",
            fontWeight: 800,
            lineHeight: 1.1,
            color: "var(--yellow)",
          }}
        >
          {problem.answer}
        </div>
      )}

      {/* On a PC the two groups stay on ONE line: the box is fixed, so the
          pictures shrink to fit rather than wrapping into a taller card. */}
      {problem.mode === "visual" && (
        <div
          dir="ltr"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: pc ? "nowrap" : "wrap",
            gap: pc ? cq(visualPc * 0.2) : 10,
            fontSize: pc ? cq(visualPc * 1.2) : "clamp(28px, 9vw, 46px)",
            fontWeight: 800,
            lineHeight: 1.1,
            // Same navy card - keep the + / - / = signs light, not dark ink.
            color: "#fff",
          }}
        >
          <GlyphGroup n={problem.a} glyph={problem.glyph} size={pc ? cq(visualPc) : "clamp(24px, 7vw, 40px)"} />
          <span>{problem.op}</span>
          <GlyphGroup n={problem.b} glyph={problem.glyph} size={pc ? cq(visualPc) : "clamp(24px, 7vw, 40px)"} />
          <span>=</span>
          <span style={{ color: "var(--yellow)" }}>?</span>
        </div>
      )}
    </div>
  );

  const answers = (
    <div
      style={{
        display: "flex",
        gap: pc ? cq(PC_ANSWER.gap) : 14,
        flexWrap: pc ? "nowrap" : "wrap",
        justifyContent: "center",
        ...(pc ? { marginTop: cq(PC_GAP) } : {}),
      }}
    >
      {problem.choices.map((c) => {
        const isWrong = wrongChoice === c;
        // In matching mode the buttons ARE the groups, so they need room for
        // up to six glyphs. Both shapes stay well past the 64px kids target.
        const isGroup = problem.choiceKind === "group";
        return (
          <button
            key={c}
            aria-label={`answer ${c}`}
            onPointerDown={(e) => answer(c, e)}
            style={{
              ...(pc ? { flex: "0 0 auto", boxSizing: "border-box" as const } : {}),
              width: pc ? cq(PC_ANSWER.w) : isGroup ? "auto" : "var(--tap-kids)",
              height: pc ? cq(PC_ANSWER.h) : isGroup ? "auto" : "var(--tap-kids)",
              ...(pc ? {} : { minWidth: isGroup ? 96 : 72 }),
              minHeight: 72,
              padding: pc ? cq(PC_ANSWER.pad) : isGroup ? "12px 14px" : 0,
              ...(pc ? { display: "grid", placeItems: "center" } : {}),
              border: "none",
              borderRadius: 20,
              background: isWrong ? "var(--red)" : "linear-gradient(180deg,var(--brand-2),var(--brand))",
              color: "#fff",
              fontSize: pc ? cq(11) : 34,
              fontWeight: 800,
              boxShadow: "var(--shadow-1)",
            }}
          >
            {isGroup ? (
              <GlyphGroup
                n={c}
                glyph={problem.glyph}
                size={pc ? cq(pcChoiceSize(problem.choices)) : "clamp(18px, 5vw, 26px)"}
              />
            ) : (
              c
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "bolt", label: ctx.t("score"), value: score },
        { icon: "check", label: T.streak, value: `${streak} 🔥`, record: best, compact: true },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={chooseLevel}
      onRestart={() => chooseLevel(level)}
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* The +/- filter, only where there is a choice to make: the addsub
              levels. count/match are addition, mult is ×, and the picture level
              keeps its own mix. Three labels to pick, not one cycling button. */}
          {LEVELS[level].kind === "addsub" && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <DifficultySelector
                options={OP_OPTIONS}
                value={opMode}
                onChange={chooseOp}
                locale={ctx.locale}
                kids
              />
            </div>
          )}
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-2)",
              boxShadow: "var(--shadow-1)",
              padding: "13px 12px",
              minHeight: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <b style={{ fontSize: 17, fontFamily: "Fredoka, inherit" }}>
              {HINTS[problem.mode][ctx.locale]}{" "}
              {problem.mode === "arith"
                ? level === "mult"
                  ? "✖️"
                  : opMode === "add"
                    ? "➕"
                    : opMode === "sub"
                      ? "➖"
                      : "➕➖"
                : problem.glyph}
            </b>
          </div>
        </div>
      }
    >
      {pc ? (
        <div
          className={BOARD_CLASS}
          style={{
            ...boardVars({ vw: 94, vh: 60, cap: 560, chrome: PC_CHROME, ratio: PC_RATIO }),
            containerType: "inline-size",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {card}
          {answers}
        </div>
      ) : (
        <>
          {card}
          {answers}
        </>
      )}
    </GameChrome>
  );
}
