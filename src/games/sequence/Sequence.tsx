import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import type { GameContext } from "@sdk/index";
import { Stat, DifficultySelector, type DifficultyOption } from "@ui/index";
import { burst, haptic, shake } from "@juice/index";
import { Prompt, shapePath, winMoment } from "@shared/index";
import { colorHex, isCorrect, itemKey, newRound, type Difficulty, type Round, type SeqItem } from "./logic";

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy" } },
  { id: "medium", label: { he: "בינוני", en: "Med" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
];

// Every box is sized with min()/max() in CSS rather than a measured pixel value,
// so one set of numbers fits portrait, landscape and tablet with no resize
// listener. The choice row's `max(72px, ...)` floor is the load-bearing one: it
// is the kids touch target, and it must not shrink below it on a small phone.
const SLOT = "min(11.5vw, 58px)";
const CHOICE = "max(72px, min(20vw, 96px))";

const FONT = {
  row: { big: "min(8.5vw, 42px)", small: "min(5vw, 24px)", number: "min(6vw, 30px)" },
  choice: { big: "min(13vw, 60px)", small: "min(7.5vw, 34px)", number: "min(9vw, 42px)" },
} as const;

/** Draws one pattern element. Purely presentational — identity lives in logic.ts. */
function ItemView({ item, variant }: { item: SeqItem; variant: "row" | "choice" }): ReactElement | null {
  const font = FONT[variant];
  switch (item.kind) {
    case "color":
      return (
        <div
          aria-hidden="true"
          style={{
            width: "76%",
            height: "76%",
            borderRadius: "50%",
            background: colorHex(item.color),
            boxShadow: "inset 0 -5px 0 rgba(0,0,0,0.16)",
          }}
        />
      );
    case "shape":
      return (
        <svg viewBox="0 0 100 100" width="82%" height="82%" aria-hidden="true">
          <path d={shapePath(item.shape)} fill={colorHex(item.color)} />
        </svg>
      );
    case "glyph":
      return (
        <span aria-hidden="true" style={{ fontSize: item.scale === "big" ? font.big : font.small, lineHeight: 1 }}>
          {item.emoji}
        </span>
      );
    case "number":
      // Standard notation reads left-to-right whatever the app locale is.
      return (
        <span dir="ltr" style={{ fontSize: font.number, fontWeight: 800, lineHeight: 1 }}>
          {item.value}
        </span>
      );
    default:
      return null;
  }
}

export function Sequence({ ctx }: { ctx: GameContext }): ReactElement {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState<Round>(() => newRound("easy"));
  const [solved, setSolved] = useState(false);
  // Furthest level reached, per DIFFICULTY — the level counter resets to 1 on a
  // difficulty change, so a shared record would let an easy streak stand as the
  // record on hard, where the patterns are longer.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best("easy"));
  // The latch is a REF, not the `solved` state: two fast taps land in the same
  // React batch, so a state read would still be false on the second one and the
  // win would be granted twice.
  const solvedRef = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    ctx.lifecycle.gameplayStart();
    ctx.analytics.levelStart("pattern");
  }, [ctx]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const dealRound = useCallback(
    (d: Difficulty) => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      solvedRef.current = false;
      setSolved(false);
      setRound(newRound(d));
      ctx.analytics.levelStart("pattern");
    },
    [ctx],
  );

  // Switching level starts a clean run at that level.
  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      if (d === difficulty) return;
      setDifficulty(d);
      setLevel(1);
      setBest(ctx.score?.best(d));
      dealRound(d);
    },
    [ctx, difficulty, dealRound],
  );

  const onChoice = useCallback(
    (index: number, e: ReactPointerEvent<HTMLButtonElement>) => {
      ctx.audio.unlock();
      ctx.speech.unlock();
      if (solvedRef.current) return;

      if (!isCorrect(round, index)) {
        // A wrong answer costs nothing. Gentle shake, tap sound, try again —
        // there is no losing on this platform.
        ctx.audio.play("tap");
        haptic.tap();
        shake(e.currentTarget, 5, 200);
        return;
      }

      solvedRef.current = true;
      setSolved(true);
      ctx.audio.play("success");
      haptic.success();
      burst(e.clientX, e.clientY, { count: 12 });
      // Fired from the handler, never from a setState updater: an updater may run
      // twice, and this one banks coins.
      // `level` here is the level being COMPLETED — the bump happens below, in
      // the advance timer. No `ms`: this game keeps no clock, and that field is
      // a genuine duration.
      const won = winMoment(ctx, {
        reason: "level_complete",
        tier: difficulty,
        level: `${difficulty}-${round.family}`,
        at: { x: e.clientX, y: e.clientY },
        score: { value: level, unit: "points", board: difficulty },
      });
      if (won.score) setBest(won.score.best);
      advanceTimer.current = setTimeout(() => {
        setLevel((n) => n + 1);
        dealRound(difficulty);
      }, 1100);
    },
    // `level` is read for the score, so it belongs in here: without it the
    // handler would only refresh because `round` happens to change every deal,
    // which is luck rather than correctness.
    [ctx, round, difficulty, level, dealRound],
  );

  const promptText = ctx.locale === "he" ? "מה בא אחר כך?" : "What comes next?";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: 12 }}>
      <Prompt ctx={ctx} glyph="🔗" text={promptText} />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <Stat label={ctx.locale === "he" ? "שלב" : "Level"} value={level} />
        <Stat label={ctx.t("best")} value={best ?? "-"} />
        <DifficultySelector
          options={DIFF_OPTIONS}
          value={difficulty}
          onChange={changeDifficulty}
          locale={ctx.locale}
          kids
        />
      </div>

      {/* The pattern row is SPATIAL, so it is pinned LTR: in the Hebrew RTL app a
          plain flex row would mirror and put the blank slot at the far left, which
          reads as "what came BEFORE". See .claude/rules/rtl-spatial-grid-dir-ltr.md */}
      <div
        dir="ltr"
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "nowrap",
          maxWidth: "min(96vw, 560px)",
          padding: "10px 8px",
          background: "var(--surface)",
          borderRadius: "var(--radius-3)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        {round.shown.map((item, i) => (
          <div
            key={`${i}-${itemKey(item)}`}
            style={{
              flex: "0 0 auto",
              width: SLOT,
              height: SLOT,
              display: "grid",
              placeItems: "center",
              borderRadius: "var(--radius-2)",
              background: "var(--surface-2)",
            }}
          >
            <ItemView item={item} variant="row" />
          </div>
        ))}
        <div
          style={{
            flex: "0 0 auto",
            width: SLOT,
            height: SLOT,
            display: "grid",
            placeItems: "center",
            borderRadius: "var(--radius-2)",
            border: "3px dashed var(--brand)",
            fontSize: "min(7vw, 30px)",
            fontWeight: 800,
            color: "var(--brand)",
          }}
        >
          {solved ? <ItemView item={round.answer} variant="row" /> : "?"}
        </div>
      </div>

      {/* The play surface: the tap targets. */}
      <div
        className="ellaz-play-surface"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "min(96vw, 560px)",
          touchAction: "none",
        }}
      >
        {round.choices.map((item, i) => (
          <button
            key={`${i}-${itemKey(item)}`}
            aria-label={ctx.locale === "he" ? `אפשרות ${i + 1}` : `option ${i + 1}`}
            disabled={solved}
            onPointerDown={(e) => onChoice(i, e)}
            style={{
              width: CHOICE,
              height: CHOICE,
              display: "grid",
              placeItems: "center",
              border: "none",
              borderRadius: "var(--radius-3)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-1)",
              opacity: solved ? 0.5 : 1,
              touchAction: "none",
            }}
          >
            <ItemView item={item} variant="choice" />
          </button>
        ))}
      </div>

      {solved ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
            {ctx.locale === "he" ? `כל הכבוד! ממשיכים…` : `Nice! Next one…`}
          </div>
        </div>
      ) : (
        <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
          {ctx.locale === "he" ? "מה חסר במשבצת? 🤔" : "What fills the blank? 🤔"}
        </div>
      )}
    </div>
  );
}
