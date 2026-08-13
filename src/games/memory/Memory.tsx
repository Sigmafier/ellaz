import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { textFor } from "@i18n/index";
import type { GameContext, SessionSpec } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, haptic } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
// Direct module paths, not the `@shared` barrel: pass-and-play is two games'
// worth of code and the barrel would pull it into every other game's chunk.
import {
  finish,
  leader,
  newVersus,
  nextMatch,
  pass,
  take,
  versusWords,
  type Seat,
  type VersusState,
} from "@shared/versus";
import { VersusBanner, VersusToggle } from "@shared/VersusBanner";
import { versusMatchEnd } from "@shared/versusMoment";
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
  { id: "easy", pairs: 6, cols: 4, he: "קל", en: "Easy", es: "Fácil" },
  { id: "medium", pairs: 8, cols: 4, he: "בינוני", en: "Med", es: "Media" },
  { id: "hard", pairs: 10, cols: 5, he: "קשה", en: "Hard", es: "Difícil" },
] as const;

type LevelId = (typeof LEVELS)[number]["id"];

const LEVEL_OPTIONS: DifficultyOption<LevelId>[] = LEVELS.map((lv) => ({
  id: lv.id,
  label: { he: lv.he, en: lv.en, es: lv.es },
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
  /**
   * PASS-AND-PLAY. `undefined` means one player, which is what this game has
   * always been; a state means two people are sitting here taking turns.
   *
   * NOT persisted, and that is deliberate rather than unfinished — see the
   * `useGameSession` call below.
   */
  const [versus, setVersus] = useState<VersusState | undefined>(undefined);
  /**
   * Which seat took each card, by card id.
   *
   * THE SCORING RULE IS THE BOARD ITSELF. A five-year-old is not told "you have
   * four pairs and she has three" — a taken pair turns that player's colour and
   * stays face-up, so the answer to "who is winning" is which colour covers more
   * of the table. It is the rule every family already plays by, and it needs no
   * number at all to read.
   *
   * State rather than a ref so the board stays a pure function of what is
   * rendered — and deliberately NOT part of `MemoryState`, because that shape is
   * the session snapshot's and widening it would invalidate every stored solo
   * board for the sake of a mode that is never stored.
   */
  const [owners, setOwners] = useState<Record<number, Seat>>({});
  // One payout per match, latched. The board's last pair is reachable from one
  // handler, but a latch costs nothing and a double payout is real money.
  const paidRef = useRef(false);
  /**
   * Which deal the pending mismatch timer belongs to.
   *
   * A mismatch is turned back over 850ms later by a `setTimeout` holding two
   * card INDICES. Deal a new board inside that window — restart, a new set, a
   * difficulty change, and now the two-player switch — and those indices point
   * at two cards on a deck that did not exist when the timer was set, so it
   * turns whatever is at those positions face down. Pre-existing; two-player
   * mode adds an easier door to it.
   */
  const dealRef = useRef(0);

  // `settle(state)`, not `state`. A flush can land inside the 850ms a mismatch
  // is shown for, and that state is only escapable by the timer that is about
  // to be thrown away — see settle() in logic.ts.
  /**
   * `settle(state)`, not `state`. A flush can land inside the 850ms a mismatch
   * is shown for, and that state is only escapable by the timer that is about
   * to be thrown away — see settle() in logic.ts.
   *
   * `live` also goes false the moment two people are playing, and that CLEARS
   * rather than freezes. Three reasons, and the third is the one that matters:
   *
   *  1. A match is two people who are in the room together. Restoring one into a
   *     room the second player has left is worse than a clean board.
   *  2. The board on screen already changed when they tapped "two players" —
   *     a fresh deck is dealt — so the stored position was gone from view either
   *     way. Clearing it makes the disk agree with the screen.
   *  3. IT REMOVES THE DOUBLE-PAY HOLE BY CONSTRUCTION. A snapshot must carry
   *     every latch recording a reward the run already collected, or walking out
   *     and coming back is a way to be paid twice
   *     (.claude/rules/session-snapshot-convention.md). Nothing about a match
   *     ever reaches the disk, so there is no latch to lose and no restore to
   *     pay for.
   */
  useGameSession(ctx, SESSION, () => ({ levelId, setIdx, state: settle(state) }), {
    live: !won && !versus,
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
      dealRef.current += 1;
      const si = opts?.set ?? setIdx;
      const li = opts?.level ?? levelIdx;
      setSetIdx(si);
      setLevelId(LEVELS[li].id);
      setState(deckFor(si, li));
      setWon(false);
      setBest(ctx.score?.best(LEVELS[li].id));
      setOwners({});
      paidRef.current = false;
      // In two-player mode the restart button is "deal again", and dealing again
      // is what hands the first move to whoever lost the last match.
      setVersus((v) => (v ? nextMatch(v) : v));
      ctx.analytics.levelStart(`set-${si + 1}-${LEVELS[li].id}`);
    },
    [ctx, setIdx, levelIdx, setLevelId],
  );

  /**
   * Invite somebody, or go back to playing alone.
   *
   * Two people start a game together with ONE TAP and nothing else: no code, no
   * pairing, no second device, and above all no name to type — both players are
   * DRAWN from the pool the moment this is tapped. Tapping it again ends the
   * match and returns to playing alone.
   */
  const toggleVersus = useCallback(() => {
    ctx.audio.unlock();
    ctx.audio.play("pop");
    setVersus((v) => (v ? undefined : newVersus()));
    reset();
  }, [ctx, reset]);

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

        // TWO PLAYERS. The rule is the one every family already plays: a pair
        // you find is YOURS and you go again; a miss hands the turn over; the
        // most cards at the end wins. Nothing about it has to be read.
        if (versus) {
          const mine = versus.turn;
          setOwners((o) => ({ ...o, [ns.cards[outcome.a].id]: mine, [ns.cards[outcome.b].id]: mine }));
          const scored = take(versus, mine);
          if (isWon(ns)) {
            setWon(true);
            setVersus(finish(scored, leader(scored)));
            if (!paidRef.current) {
              paidRef.current = true;
              // ONE payout per match, for FINISHING and not for winning — so it
              // lands on a draw too, and the child who lost watches the same
              // coin fly to the same wallet. No score is reported: see
              // versusWinOptions for why a match must not touch a personal best.
              versusMatchEnd(ctx, centre, `versus-${LEVELS[levelIdx].id}`);
            }
          } else {
            // A match keeps the turn. That is the whole reason memory is worth
            // playing against a person.
            setVersus(scored);
          }
          return;
        }

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
        const deal = dealRef.current;
        setTimeout(() => {
          // Those two indices belong to a deck that is no longer on the table.
          if (dealRef.current !== deal) return;
          setState((s) => resolveMismatch(s, a, b));
        }, 850);
        // The turn passes on a miss, and it passes NOW rather than when the
        // cards flip back — so the banner has already changed colour while the
        // two wrong cards are still up, which is what makes a four-year-old
        // look at the banner at all.
        if (versus) setVersus(pass(versus));
      }
    },
    [ctx, state, setIdx, levelIdx, versus],
  );

  const cols = LEVELS[levelIdx].cols;
  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    { he: { newSet: "ערכה חדשה" }, en: { newSet: "New set" }, es: { newSet: "Nuevas cartas" } },
    ctx.locale,
  );
  const nextSet = (setIdx + 1) % FACE_SETS.length;
  return (
    <GameChrome
      ctx={ctx}
      stats={
        versus
          ? // The personal best is a fact about the PROFILE and a match is not,
            // so it would be answering a question nobody asked. Pairs left and
            // matches played are the two numbers that are true of this sitting.
            [
              {
                icon: "cards",
                label: ctx.t("pairs"),
                value: `${state.matchedPairs}/${state.totalPairs}`,
                ltr: true,
              },
              { icon: "flag", label: versusWords(ctx.locale).matches, value: versus.matches },
            ]
          : [
              {
                icon: "cards",
                label: ctx.t("pairs"),
                value: `${state.matchedPairs}/${state.totalPairs}`,
                ltr: true,
              },
              { icon: "moves", label: ctx.t("moves"), value: state.moves },
              { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
            ]
      }
      levels={LEVEL_OPTIONS}
      level={LEVELS[levelIdx].id}
      onLevel={(id) => reset({ level: LEVEL_OPTIONS.findIndex((o) => o.id === id) })}
      onRestart={() => reset()}
      // The theme switcher, which used to be a bare 🎨 in the stat row where
      // nothing said what it did. It shows the faces it is about to deal, so a
      // child who cannot read still knows what the button gives them.
      footer={
        <div style={{ display: "grid", gap: 8 }}>
          {versus && (
            <VersusBanner
              v={versus}
              locale={ctx.locale}
              // The pile taken THIS match — the number that is changing while
              // they play, and the one the coloured cards on the table already
              // show. The sitting's tally lives in the stat row instead.
              counts={versus.taken}
              result={won ? leader(versus) : undefined}
            />
          )}
          {!versus && (
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
                {T.newSet}
              </span>
              <span style={{ fontSize: 26, letterSpacing: 2, lineHeight: 1 }}>
                {FACE_SETS[nextSet].slice(0, 3).join("")}
              </span>
            </button>
          )}
          <VersusToggle on={!!versus} locale={ctx.locale} onToggle={toggleVersus} />
        </div>
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
          // WHO TOOK IT — and this is memory's whole scoring rule, drawn rather
          // than counted. A taken pair wears the colour of the player who took
          // it, so "who is winning" is answered by looking at the table. In one-
          // player mode nothing owns anything and the board is exactly as it was.
          const owner = versus ? owners[card.id] : undefined;
          const takenFill =
            owner === undefined
              ? "linear-gradient(180deg,#55efc4,#00cec9)"
              : `linear-gradient(180deg, ${versus?.players[owner].color}, ${versus?.players[owner].color})`;
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
                    ? takenFill
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
