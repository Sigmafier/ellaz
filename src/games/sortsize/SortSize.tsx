import { textFor } from "@i18n/index";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GameContext } from "@sdk/index";
import { type DifficultyOption } from "@ui/index";
import { GameChrome } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import { Prompt, winMoment, useRememberedLevel } from "@shared/index";
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
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
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
  const [difficulty, setDifficulty] = useRememberedLevel(
    ctx,
    DIFF_OPTIONS.map((o) => o.id),
    "easy",
  );
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<RoundState>(() => newGame(difficulty));
  const [justWon, setJustWon] = useState(false);
  // Furthest level reached, per DIFFICULTY — the level counter resets to 1 on a
  // difficulty change, so a shared record would let an easy streak stand as the
  // record on hard, where the sizes are far closer together.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(difficulty));
  const surfaceRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: {
        biggest: "תגעו בגדול ביותר",
        smallest: "תגעו בקטן ביותר",
        asc: "תגעו לפי הסדר: מהקטן לגדול",
        desc: "תגעו לפי הסדר: מהגדול לקטן",
        sort: "בחרו אחד, ואז את הסל המתאים",
        cheer: "🎉 כל הכבוד! ממשיכים…",
        look: "תסתכלו טוב על הגדלים 👀",
        item: (name: string, i: number, n: number) => `${name} ${i} מתוך ${n}, מהקטן לגדול`,
        binBig: "סל גדולים",
        binSmall: "סל קטנים",
        big: "גדולים",
        small: "קטנים",
      },
      en: {
        biggest: "Tap the biggest one",
        smallest: "Tap the smallest one",
        asc: "Tap them in order: smallest to biggest",
        desc: "Tap them in order: biggest to smallest",
        sort: "Pick one, then its basket",
        cheer: "🎉 Nice! Next one…",
        look: "Look closely at the sizes 👀",
        item: (name: string, i: number, n: number) => `${name} ${i} of ${n}, smallest first`,
        binBig: "big basket",
        binSmall: "small basket",
        big: "Big",
        small: "Small",
      },
      es: {
        biggest: "Toca el más grande",
        smallest: "Toca el más pequeño",
        asc: "Tócalos en orden: del más pequeño al más grande",
        desc: "Tócalos en orden: del más grande al más pequeño",
        sort: "Elige uno y luego su cesta",
        cheer: "🎉 ¡Bien! El siguiente…",
        look: "Mira bien los tamaños 👀",
        item: (name: string, i: number, n: number) => `${name} ${i} de ${n}, del más pequeño primero`,
        binBig: "cesta grande",
        binSmall: "cesta pequeña",
        big: "Grande",
        small: "Pequeño",
      },
    },
    ctx.locale,
  );
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
      setBest(ctx.score?.best(d));
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
      const won = winMoment(ctx, {
        reason: "level_complete",
        tier: difficulty,
        // The round KIND, not the round NUMBER: an endless counter would be
        // unbounded-cardinality analytics for no gain. `tier` already carries
        // the difficulty, and economy.ts is what turns that into a payout.
        level: LEVELS[difficulty].kind,
        at,
        // The record is how far up the endless ladder this run got. `level` is
        // the level being COMPLETED right here — the bump happens below, in the
        // advance timer. No `ms`: this game keeps no clock, and `ms` is a real
        // duration on the analytics side, not a spare slot for a count.
        score: { value: level, unit: "points", board: difficulty },
      });
      if (won.score) setBest(won.score.best);
      advanceTimer.current = setTimeout(() => {
        setLevel((n) => n + 1);
        setState(newGame(difficulty));
        setJustWon(false);
        ctx.analytics.levelStart("sortsize");
      }, 1100);
    },
    // `level` is read for the score — the record is the level just completed.
    [ctx, difficulty, level],
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
      return round.target === "biggest" ? T.biggest : T.smallest;
    }
    if (round.kind === "order") {
      return round.direction === "asc" ? T.asc : T.desc;
    }
    return T.sort;
  })();

  const inBin = (bin: Bin) => round.items.filter((i) => state.placed[i.id] === bin);

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "layers", label: ctx.t("stage"), value: level },
        { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
      ]}
      levels={DIFF_OPTIONS}
      level={difficulty}
      onLevel={changeDifficulty}
      onRestart={reroll}
      footer={
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
            {justWon ? T.cheer : T.look}
          </b>
        </div>
      }
    >
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
              aria-label={T.item(textFor(item, ctx.locale), item.rank + 1, round.items.length)}
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

      {/* The baskets WRAP and GROW rather than sitting at a fixed 140px. Two
          140px baskets plus a gap is 292px of unshrinkable content, and a 320px
          phone gives this row less than that once the frame's gutters are paid -
          so each basket was shrunk below its own label and clipped the word
          inside it, while the row reported a perfectly normal width. See
          a-row-that-grows-with-the-catalog-must-wrap: the item COUNT is fixed
          here, but the available WIDTH is not, which fails the same way. */}
      {round.kind === "bucket" ? (
        <div
          dir="ltr"
          style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", width: "100%" }}
        >
          {(["small", "big"] as const).map((bin) => {
            const held = inBin(bin);
            return (
              <button
                key={bin}
                aria-label={bin === "big" ? T.binBig : T.binSmall}
                onPointerDown={(e) => onBin(bin, e)}
                style={{
                  flex: "1 1 130px",
                  minWidth: 0,
                  maxWidth: 220,
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
                  {bin === "big" ? T.big : T.small}
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
    </GameChrome>
  );
}
