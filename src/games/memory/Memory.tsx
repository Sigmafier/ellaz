import { useCallback, useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";
import { Button, Stat } from "@ui/components";
import { DifficultySelector, type DifficultyOption } from "@ui/DifficultySelector";
import { burst, haptic } from "@juice/index";
import { winMoment } from "@shared/index";
import { newGame, flip, resolveMismatch, isWon, type MemoryState } from "./logic";

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

export function Memory({ ctx }: { ctx: GameContext }) {
  const [setIdx, setSetIdx] = useState(0);
  const [levelIdx, setLevelIdx] = useState(0);
  const [state, setState] = useState<MemoryState>(() => deckFor(0, 0));
  const [won, setWon] = useState(false);
  // Fewest moves, per DIFFICULTY. A board is scoped to LEVELS[i].id because
  // clearing 6 pairs and clearing 10 are not the same achievement, and one
  // shared record would mean a child's easy run permanently outranks every
  // hard one they will ever play.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(LEVELS[0].id));
  const gridRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(`set-1-${LEVELS[0].id}`);
    }
  }, [ctx]);

  const reset = useCallback(
    (opts?: { set?: number; level?: number }) => {
      const si = opts?.set ?? setIdx;
      const li = opts?.level ?? levelIdx;
      setSetIdx(si);
      setLevelIdx(li);
      setState(deckFor(si, li));
      setWon(false);
      setBest(ctx.score?.best(LEVELS[li].id));
      ctx.analytics.levelStart(`set-${si + 1}-${LEVELS[li].id}`);
    },
    [ctx, setIdx, levelIdx],
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
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Stat label={ctx.t("pairs")} value={`${state.matchedPairs}/${state.totalPairs}`} />
        <Stat label={ctx.t("moves")} value={state.moves} />
        <Stat label={ctx.t("best")} value={best ?? "-"} />
        <Button variant="ghost" kids onClick={() => reset()}>
          🔄
        </Button>
        <Button variant="ghost" kids ariaLabel="next set" onClick={() => reset({ set: (setIdx + 1) % FACE_SETS.length })}>
          🎨
        </Button>
      </div>

      <DifficultySelector
        options={LEVEL_OPTIONS}
        value={LEVELS[levelIdx].id}
        onChange={(id) => reset({ level: LEVEL_OPTIONS.findIndex((o) => o.id === id) })}
        locale={ctx.locale}
        kids
      />

      <div
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12,
          // cap by height too so the grid fits landscape without scrolling
          width: "min(92vw, 72vh, 460px)",
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

      {won && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44 }}>🎉</div>
          <h2>{ctx.t("youWon")}</h2>
          <Button kids onClick={() => reset({ set: (setIdx + 1) % FACE_SETS.length })}>
            ▶
          </Button>
        </div>
      )}
    </div>
  );
}
