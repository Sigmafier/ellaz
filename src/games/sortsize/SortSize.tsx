import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GameContext } from "@sdk/index";
import { Button, DifficultySelector, Stat, type DifficultyOption } from "@ui/index";
import { burst, haptic, shake } from "@juice/index";
import { Prompt, winMoment } from "@shared/index";
import {
  LEVELS,
  newGame,
  tapBin,
  tapItem,
  type Bin,
  type Difficulty,
  type RoundState,
  type SizedItem,
} from "./logic";

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy" } },
  { id: "medium", label: { he: "בינוני", en: "Med" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
];

/**
 * THE ACCESSIBILITY FLOOR WINS OVER "make it smaller".
 *
 * This game's whole difficulty lever is drawing things small, which fights
 * directly with the ≥2cm touch target every kids game owes a five-year-old. The
 * resolution is that only the GLYPH shrinks: the tappable box never goes below
 * this, so a 20px elephant still has a 64px button around it. A child who can
 * SEE the difference must always be able to TAP the answer.
 */
const MIN_TAP = 64;

function hitSize(item: SizedItem): number {
  return Math.max(MIN_TAP, item.size + 18);
}

export function SortSize({ ctx }: { ctx: GameContext }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<RoundState>(() => newGame("easy"));
  const [justWon, setJustWon] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const he = ctx.locale === "he";
  const { round } = state;

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart("sortsize");
    }
  }, [ctx]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  // A fresh round at the same difficulty. Also the "another one" button.
  const reroll = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setState(newGame(difficulty));
    setJustWon(false);
    ctx.analytics.levelStart("sortsize");
  }, [ctx, difficulty]);

  // Switching difficulty restarts the ladder at level 1.
  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      if (d === difficulty) return;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      setDifficulty(d);
      setLevel(1);
      setState(newGame(d));
      setJustWon(false);
      ctx.analytics.levelStart("sortsize");
    },
    [ctx, difficulty],
  );

  const miss = useCallback(() => {
    // Gentle: a wobble and a soft tap. No score loss, no "you lost" - this
    // platform has no losing.
    ctx.audio.play("tap");
    // `tap`, not `fail`: a 90ms buzz reads as a scolding to a four-year-old.
    haptic.tap();
    if (surfaceRef.current) shake(surfaceRef.current, 3, 130);
  }, [ctx]);

  // The win, fired from the EVENT HANDLER. Never from a setState updater:
  // React may run an updater twice, which would double-grant the coins.
  const win = useCallback(
    (at: { x: number; y: number }) => {
      setJustWon(true);
      winMoment(ctx, {
        reason: "level_complete",
        tier: difficulty,
        // The round KIND, not the round NUMBER: an endless counter would be
        // unbounded-cardinality analytics for no gain. `tier` already carries
        // the difficulty, and economy.ts is what turns that into a payout.
        level: LEVELS[difficulty].kind,
        at,
      });
      advanceTimer.current = setTimeout(() => {
        setLevel((n) => n + 1);
        setState(newGame(difficulty));
        setJustWon(false);
        ctx.analytics.levelStart("sortsize");
      }, 1100);
    },
    [ctx, difficulty],
  );

  const onItem = useCallback(
    (id: string, e: ReactPointerEvent) => {
      ctx.audio.unlock();
      ctx.speech.unlock();
      const at = { x: e.clientX, y: e.clientY };
      const out = tapItem(state, id);
      if (out.kind === "wrong") return miss();
      if (out.kind === "ignored") return;

      setState(out.state);
      if (out.kind === "selected") {
        ctx.audio.play("tap");
        return;
      }
      ctx.audio.play("success");
      haptic.success();
      burst(at.x, at.y, { count: 10 });
      if (out.done) win(at);
    },
    [ctx, state, miss, win],
  );

  const onBin = useCallback(
    (bin: Bin, e: ReactPointerEvent) => {
      ctx.audio.unlock();
      const at = { x: e.clientX, y: e.clientY };
      const out = tapBin(state, bin);
      if (out.kind === "wrong") return miss();
      if (out.kind === "ignored") return;

      setState(out.state);
      ctx.audio.play("success");
      haptic.success();
      burst(at.x, at.y, { count: 8 });
      if (out.done) win(at);
    },
    [ctx, state, miss, win],
  );

  const prompt = (() => {
    if (round.kind === "pick") {
      return round.target === "biggest"
        ? he
          ? "תגעו בגדול ביותר"
          : "Tap the biggest one"
        : he
          ? "תגעו בקטן ביותר"
          : "Tap the smallest one";
    }
    if (round.kind === "order") {
      return round.direction === "asc"
        ? he
          ? "תגעו לפי הסדר: מהקטן לגדול"
          : "Tap them in order: smallest to biggest"
        : he
          ? "תגעו לפי הסדר: מהגדול לקטן"
          : "Tap them in order: biggest to smallest";
    }
    return he ? "בחרו אחד, ואז את הסל המתאים" : "Pick one, then its basket";
  })();

  const inBin = (bin: Bin) => round.items.filter((i) => state.placed[i.id] === bin);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Stat label={he ? "שלב" : "Level"} value={level} />
        <DifficultySelector
          options={DIFF_OPTIONS}
          value={difficulty}
          onChange={changeDifficulty}
          locale={ctx.locale}
          kids
        />
        <Button variant="ghost" kids ariaLabel="new round" onClick={reroll}>
          🔄
        </Button>
      </div>

      <Prompt ctx={ctx} glyph={round.items[0].emoji} text={prompt} />

      {/*
        dir="ltr" on the play surface: this row is SPATIAL, and the app is
        Hebrew-RTL by default, so without this the items mirror and "first" is
        drawn on the far side from where the ordering reads.
      */}
      <div
        ref={surfaceRef}
        dir="ltr"
        className="ellaz-play-surface"
        style={{
          width: "min(94vw, 560px)",
          minHeight: "min(40vh, 220px)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 10,
          padding: 10,
          borderRadius: 18,
          background: "var(--surface)",
          boxShadow: "var(--shadow-1)",
          touchAction: "none",
        }}
      >
        {round.items.map((item) => {
          const banked = state.progress.includes(item.id);
          const selected = state.selected === item.id;
          const placed = Boolean(state.placed[item.id]);
          const step = state.progress.indexOf(item.id) + 1;
          const box = hitSize(item);
          return (
            <button
              key={item.id}
              // The label carries the SIZE RANK on purpose. Sighted play is a
              // pure visual judgement, so a screen reader that announced only
              // the name would leave the game unplayable rather than merely
              // harder. Exposing "3 of 4, smallest first" is the accessible
              // answer, not a leak.
              aria-label={
                he
                  ? `${item.he} ${item.rank + 1} מתוך ${round.items.length}, מהקטן לגדול`
                  : `${item.en} ${item.rank + 1} of ${round.items.length}, smallest first`
              }
              onPointerDown={(e) => onItem(item.id, e)}
              style={{
                position: "relative",
                width: box,
                height: box,
                display: "grid",
                placeItems: "center",
                border: selected ? "3px solid var(--brand)" : "3px solid transparent",
                borderRadius: 16,
                background: selected ? "var(--surface-2)" : "transparent",
                // A banked item stays in place so the row never reflows under a
                // child's finger mid-round; it just steps back visually.
                opacity: placed ? 0.2 : banked ? 0.45 : 1,
                padding: 0,
                lineHeight: 1,
                touchAction: "none",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: item.size, lineHeight: 1 }}>
                {item.emoji}
              </span>
              {banked && round.kind === "order" ? (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    insetInlineEnd: 2,
                    top: 2,
                    fontSize: 14,
                    fontWeight: 800,
                    background: "var(--brand)",
                    color: "var(--text)",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {step}
                </span>
              ) : null}
              {banked && round.kind === "pick" ? (
                <span aria-hidden="true" style={{ position: "absolute", right: 2, top: 0, fontSize: 18 }}>
                  ✅
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {round.kind === "bucket" ? (
        <div dir="ltr" style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {(["small", "big"] as const).map((bin) => {
            const held = inBin(bin);
            return (
              <button
                key={bin}
                aria-label={bin === "big" ? (he ? "סל גדולים" : "big basket") : he ? "סל קטנים" : "small basket"}
                onPointerDown={(e) => onBin(bin, e)}
                style={{
                  minWidth: 140,
                  minHeight: 96,
                  padding: "8px 12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  border: state.selected ? "3px dashed var(--brand)" : "3px dashed transparent",
                  borderRadius: 18,
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  boxShadow: "var(--shadow-1)",
                  touchAction: "none",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 800 }}>
                  {bin === "big" ? (he ? "גדולים" : "Big") : he ? "קטנים" : "Small"}
                </span>
                <span aria-hidden="true" style={{ fontSize: bin === "big" ? 30 : 18, lineHeight: 1 }}>
                  {round.items[0].emoji}
                </span>
                <span aria-hidden="true" style={{ fontSize: 14, color: "var(--text-dim)" }}>
                  {held.length > 0 ? "•".repeat(held.length) : " "}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {justWon ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
            {he ? `כל הכבוד! ממשיכים…` : `Nice! Next one…`}
          </div>
        </div>
      ) : (
        <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
          {he ? "תסתכלו טוב על הגדלים 👀" : "Look closely at the sizes 👀"}
        </div>
      )}
    </div>
  );
}
