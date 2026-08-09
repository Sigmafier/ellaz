import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, haptic } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import { newGame, flip, resolveMismatch, isWon, settle, type MemoryState } from "./logic";

// Big, colorful, icon-first faces — no reading required (age 5). Each themed set
// carries 12 distinct emojis so the hardest level (10 pairs) always has enough.
const FACE_SETS = [
  ["🐶", "🐱", "🦊", "🐰", "🐻", "🐼", "🐨", "🦁", "🐯", "🐮", "🐷", "🐸"], // animals
  ["🍎", "🍌", "🍓", "🍇", "🍊", "🍉", "🍒", "🍑", "🥝", "🍍", "🥭", "🍐"], // fruit
  ["🚗", "🚀", "⛵", "🚁", "🚜", "🚲", "🚂", "🚌", "🚑", "🚒", "✈️", "🚓"], // vehicles
  ["😀", "😍", "😎", "🤩", "😴", "🤖", "👻", "🤠", "🥳", "😜", "🤪", "😇"], // smileys
  ["🌵", "🌻", "🌈", "⭐", "🌙", "⚡", "❄️", "🔥", "🍄", "🌸", "🌴", "🌊"], // nature
];

// Difficulty = how many pairs. Grid stays 4 cols for easy/medium; hard (20 cards)
// goes to 5 cols so it keeps 4 rows and fits the height cap.
const LEVELS = [
  { id: "easy", pairs: 6, cols: 4, he: "קל", en: "Easy" },
  { id: "medium", pairs: 8, cols: 4, he: "בינוני", en: "Med" },
  { id: "hard", pairs: 10, cols: 5, he: "קשה", en: "Hard" },
] as const;

type LevelId = (typeof LEVELS)[number]["id"];

const LEVEL_OPTIONS: DifficultyOption<LevelId>[] = LEVELS.map((lv) => ({
  id: lv.id,
  label: { he: lv.he, en: lv.en },
}));

function deckFor(setIdx: number, levelIdx: number) {
  return newGame(FACE_SETS[setIdx].slice(0, LEVELS[levelIdx].pairs));
}

/**
 * A deal in progress — which face set, which difficulty, and the board.
 *
 * `setIdx` travels because the deck is dealt from it. Restoring the cards
 * without it would leave the "new set" button offering the wrong next theme,
 * and the emoji on the table belonging to a set the game no longer thinks it
 * is playing.
 *
 * The state is SETTLED on the way in (see `settle` in logic.ts): a snapshot
 * caught inside the 850ms mismatch window would otherwise restore a locked
 * board with no timer to unlock it, and every card would be refused.
 */
interface MemorySession {
  levelId: LevelId;
  setIdx: number;
  state: MemoryState;
}

const SESSION: SessionSpec<MemorySession> = {
  version: 1,
  validate: (value): value is MemorySession => {
    const s = value as Partial<MemorySession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.levelId !== "string") return false;
    const level = LEVELS.find((lv) => lv.id === s.levelId);
    if (!level) return false;
    if (typeof s.setIdx !== "number" || !FACE_SETS[s.setIdx]) return false;
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;
    // The deck must be the size this difficulty deals. `cols` comes from the
    // LEVEL, so a deck of some other length lays out as a grid with a ragged
    // last row rather than as anything obviously wrong.
    if (g.totalPairs !== level.pairs) return false;
    return (
      Array.isArray(g.cards) &&
      g.cards.length === level.pairs * 2 &&
      g.cards.every((c) => c && typeof c.face === "string" && typeof c.matched === "boolean") &&
      typeof g.moves === "number" &&
      typeof g.matchedPairs === "number"
    );
  },
};

export function Memory({ ctx }: { ctx: GameContext }) {
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  const [setIdx, setSetIdx] = useState(() => restored?.setIdx ?? 0);
  // The level is remembered by ID, then resolved to the index everything else
  // here works in. Storing the INDEX would be the smaller change and the wrong
  // one: an index means "whichever level is third", so inserting a difficulty
  // silently moves every returning player to a different board than the one
  // they left — and to a different record, since the board is scoped by id.
  const [levelId, setLevelId] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    LEVELS[0].id,
  );
  const levelIdx = Math.max(
    0,
    LEVELS.findIndex((lv) => lv.id === levelId),
  );
  // Adopted only for the difficulty this mount opened on, and never once it is
  // won — a completed board has nothing left to turn over.
  const resume =
    restored && restored.levelId === levelId && !isWon(restored.state) ? restored : undefined;
  const [state, setState] = useState<MemoryState>(() => resume?.state ?? deckFor(setIdx, levelIdx));
  const [won, setWon] = useState(false);
  // Fewest moves, per DIFFICULTY. A board is scoped to LEVELS[i].id because
  // clearing 6 pairs and clearing 10 are not the same achievement, and one
  // shared record would mean a child's easy run permanently outranks every
  // hard one they will ever play.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(levelId));
  const gridRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // `settle(state)`, not `state`. A flush can land inside the 850ms a mismatch
  // is shown for, and that state is only escapable by the timer that is about
  // to be thrown away — see settle() in logic.ts.
  useGameSession(ctx, SESSION, () => ({ levelId, setIdx, state: settle(state) }), {
    live: !won,
  });

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(`set-1-${levelId}`);
    }
  }, [ctx]);

  const reset = useCallback(
    (opts?: { set?: number; level?: number }) => {
      const si = opts?.set ?? setIdx;
      const li = opts?.level ?? levelIdx;
      setSetIdx(si);
      setLevelId(LEVELS[li].id);
      setState(deckFor(si, li));
      setWon(false);
      setBest(ctx.score?.best(LEVELS[li].id));
      ctx.analytics.levelStart(`set-${si + 1}-${LEVELS[li].id}`);
    },
    [ctx, setIdx, levelIdx, setLevelId],
  );

  const onCard = useCallback(
    (index: number) => {
      ctx.audio.unlock();
      ctx.speech.unlock();
      const { state: ns, outcome } = flip(state, index);
      if (outcome.kind === "ignored") return;
      setState(ns);
      if (outcome.kind === "revealed") {
        ctx.audio.play("flip");
        haptic.tap();
      } else if (outcome.kind === "matched") {
        ctx.audio.play("success");
        haptic.success();
        const el = gridRef.current;
        const r = el?.getBoundingClientRect();
        const centre = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
        if (centre) burst(centre.x, centre.y, { count: 10 });
        if (isWon(ns)) {
          setWon(true);
          // `ms` is deliberately absent. It used to carry `ns.moves`, which is
          // not a duration — it fed analytics.levelComplete() as one and would
          // have reported a 14-move game as a 14-millisecond game. Memory keeps
          // no clock, so the honest answer is "not measured"; the moves count
          // now goes where it means something, as the score.
          const result = winMoment(ctx, {
            reason: "level_complete",
            tier: LEVELS[levelIdx].id,
            level: `set-${setIdx + 1}-${LEVELS[levelIdx].id}`,
            at: centre,
            score: { value: ns.moves, unit: "moves", board: LEVELS[levelIdx].id },
          });
          if (result.score) setBest(result.score.best);
        }
      } else if (outcome.kind === "mismatch") {
        const { a, b } = outcome;
        setTimeout(() => setState((s) => resolveMismatch(s, a, b)), 850);
      }
    },
    [ctx, state, setIdx, levelIdx],
  );

  const cols = LEVELS[levelIdx].cols;
  const he = ctx.locale === "he";
  const nextSet = (setIdx + 1) % FACE_SETS.length;
  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "cards", label: ctx.t("pairs"), value: `${state.matchedPairs}/${state.totalPairs}`, ltr: true },
        { icon: "moves", label: ctx.t("moves"), value: state.moves },
        { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
      ]}
      levels={LEVEL_OPTIONS}
      level={LEVELS[levelIdx].id}
      onLevel={(id) => reset({ level: LEVEL_OPTIONS.findIndex((o) => o.id === id) })}
      onRestart={() => reset()}
      // The theme switcher, which used to be a bare 🎨 in the stat row where
      // nothing said what it did. It shows the faces it is about to deal, so a
      // child who cannot read still knows what the button gives them.
      footer={
        <button
          type="button"
          aria-label="next set"
          onClick={() => reset({ set: nextSet })}
          style={{
            width: "100%",
            border: "none",
            borderRadius: "var(--radius-2)",
            background: "var(--surface)",
            boxShadow: "var(--shadow-1)",
            color: "var(--text)",
            fontFamily: "inherit",
            padding: "12px 14px",
            minHeight: 68,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800 }}>
            {won ? `${ctx.t("youWon")} · ` : ""}
            {he ? "ערכה חדשה" : "New set"}
          </span>
          <span style={{ fontSize: 26, letterSpacing: 2, lineHeight: 1 }}>
            {FACE_SETS[nextSet].slice(0, 3).join("")}
          </span>
        </button>
      }
    >
      <div
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12,
          // cap by height too so the grid fits landscape without scrolling
          width: "min(92vw, 56vh, 460px)",
        }}
      >
        {state.cards.map((card, i) => {
          const faceUp = card.flipped || card.matched;
          return (
            <button
              key={card.id}
              className={faceUp ? "ellaz-flip" : undefined}
              aria-label={faceUp ? card.face : "card"}
              onClick={() => onCard(i)}
              style={{
                aspectRatio: "1",
                minHeight: 64,
                border: "none",
                borderRadius: 16,
                fontSize: "clamp(28px, 8vw, 52px)",
                display: "grid",
                placeItems: "center",
                background: faceUp
                  ? card.matched
                    ? "linear-gradient(180deg,#55efc4,#00cec9)"
                    : "#fff"
                  : "linear-gradient(180deg,var(--brand-2),var(--brand))",
                color: "#222",
                boxShadow: "var(--shadow-1)",
                transform: faceUp ? "rotateY(0deg)" : "rotateY(0deg)",
                transition: "background 0.15s ease, transform 0.15s ease",
                opacity: card.matched ? 0.92 : 1,
              }}
            >
              {faceUp ? card.face : "❓"}
            </button>
          );
        })}
      </div>
    </GameChrome>
  );
}
