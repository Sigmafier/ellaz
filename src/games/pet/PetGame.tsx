import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameContext, RewardTier, SessionSpec } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { burst, haptic, popEl } from "@juice/index";
import { Prompt, useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import { PetArt } from "./PetArt";
import {
  CARE,
  CARE_KINDS,
  MAX_STAGE,
  PETS,
  PET_IDS,
  careFor,
  careOf,
  growth,
  isPetState,
  newPet,
  petById,
  reWish,
  sanitizeGrown,
  scoreReport,
  startOver,
  type CareKind,
  type PetState,
} from "./logic";

/**
 * The renderer. Every rule about what a tap DOES lives in logic.ts; this file
 * decides what a tap LOOKS and SOUNDS like, and what the outcomes it reports
 * are worth to the economy.
 *
 * TAP, NEVER DRAG. There is no drag path here to be the only way through, and
 * `logic.ts` has no gesture in it at all. Four big buttons and the creature
 * itself: a five-year-old on a phone, and anyone on assistive input, cannot
 * reliably hold a sustained pointer gesture.
 *
 * NO READING REQUIRED. The pet asks for things in a thought bubble with a face
 * in it, the matching button wears the same face and a ring, and the four
 * buttons are faces too. The sentence above the pet is there for whoever wants
 * it, with a speaker beside it, and nothing on this screen is unreachable
 * without it - which is the hard rule at the top of `src/sdk/speech.ts`.
 *
 * NO FAILURE. There is no refused tap, no wrong answer, no shake and no fail
 * sound anywhere in this file. The pet cannot get sick, sad or hungry, and it
 * cannot notice that a week went by.
 */

/* ------------------------------------------------------------------- words */

/**
 * This game's own words, as a locale RECORD rather than a `locale === "he" ?`
 * ternary - promoting a language reds this block by name instead of leaving the
 * game speaking English inside a page that is not.
 *
 * `wants` is a function because the sentence is not the same shape in all
 * three: Hebrew puts the name first, and a template assembled outside here
 * would have to know that.
 */
const WORDS: Record<
  Locale,
  {
    wants: (pet: string, thing: string) => string;
    /** Verbs for the buttons. Deliberately not the nouns `CARE` holds. */
    verbs: Record<CareKind, string>;
    care: string;
    size: string;
    /** The label on the creature itself, which cuddles it. */
    cuddleAria: (pet: string) => string;
  }
> = {
  he: {
    wants: (pet, thing) => `${pet} רוצה ${thing}`,
    verbs: { feed: "האכילו", wash: "רחצו", play: "שחקו", cuddle: "חבקו" },
    care: "אכפתיות",
    size: "גודל",
    cuddleAria: (pet) => `חבקו את ${pet}`,
  },
  en: {
    wants: (pet, thing) => `${pet} wants ${thing}`,
    verbs: { feed: "Feed", wash: "Wash", play: "Play", cuddle: "Cuddle" },
    care: "Care",
    size: "Size",
    cuddleAria: (pet) => `Cuddle ${pet}`,
  },
  es: {
    wants: (pet, thing) => `${pet} quiere ${thing}`,
    verbs: { feed: "Dar de comer", wash: "Bañar", play: "Jugar", cuddle: "Abrazar" },
    care: "Cariño",
    size: "Tamaño",
    cuddleAria: (pet) => `Abraza a ${pet}`,
  },
};

/** The chrome's level toggle picks WHICH CREATURE, the way coloring picks a picture. */
const PET_OPTIONS: ChromeLevel<string>[] = PETS.map((p) => ({ id: p.id, label: p.name }));

/**
 * What a growth is worth, derived from where the stage sits on the ladder
 * rather than written out per stage - so adding a stage to `logic.ts` re-prices
 * the whole thing instead of falling off the end of a lookup table.
 *
 * A tier here is a MAGNITUDE, not a difficulty: there is no difficulty in this
 * game, and growing all the way to the last stage is simply a bigger moment
 * than hatching out of the first.
 */
function tierForStage(stage: number): RewardTier {
  if (stage >= MAX_STAGE) return "hard";
  if (stage >= Math.ceil(MAX_STAGE / 2)) return "medium";
  return "easy";
}

/* ----------------------------------------------------------------- storage */

/**
 * The lifetime growth latch: the highest stage each creature has EVER reached.
 *
 * It is the thing that stops a growth being paid twice, and it deliberately
 * lives OUTSIDE the session snapshot even though the session rule says a
 * snapshot must carry every reward latch. The snapshot is cleared by a version
 * bump, by age and by the restart button - and a latch that can be cleared is
 * not a latch. Without this, "start over, raise the same pet again" is a way to
 * collect the same four stars once a minute, forever.
 */
const GROWN_KEY = "grown";

/**
 * A pet in progress. The whole state, because the whole state is the pet.
 *
 * There is no reward latch in here and no transient field either, and both are
 * facts about the game rather than omissions: the latches are derived from the
 * persisted care value (see `CareOutcome` in logic.ts), and every transient
 * reaction is renderer-local, so nothing a pending timeout must clear can ever
 * reach the disk. That is the memory `lock` trap in
 * session-snapshot-convention.md, avoided by construction.
 */
const SESSION: SessionSpec<PetState> = { version: 1, validate: isPetState };

/* -------------------------------------------------------------------- game */

export function PetGame({ ctx }: { ctx: GameContext }) {
  // Which creature is on screen, VALIDATED against this game's own list - an id
  // no longer in the list resolves to -1 in GameChrome's findIndex and the
  // toggle silently disappears, leaving a game with no way to switch pets.
  const [petId, setPetId] = useRememberedLevel(ctx, PET_IDS, PET_IDS[0]);
  const pet = petById(petId);

  // No guard on the way back in, unlike coloring's picture check. The snapshot
  // holds care for EVERY creature keyed by id, so a restored pet cannot be the
  // wrong one; the only field that belongs to whoever was on screen is the
  // wish, and a wish for a cuddle is a wish for a cuddle whichever pet holds it.
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  const [state, setState] = useState<PetState>(() => restored ?? newPet());

  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(petId));
  const [grown, setGrown] = useState<Record<string, number>>(() =>
    sanitizeGrown(ctx.storage.get<unknown>(GROWN_KEY, null)),
  );

  /**
   * The pet's reaction to the last tap, and the ONLY place it exists.
   *
   * It is cleared by a timeout, which is exactly why it is here and not in
   * `PetState`: a snapshot caught inside that window would restore a pet
   * permanently mid-blink with no timer behind it to finish the job.
   */
  const [react, setReact] = useState<{ kind: CareKind; granted: boolean; n: number } | null>(null);
  const reactSeq = useRef(0);
  const reactTimer = useRef(0);
  const stageRef = useRef<HTMLButtonElement>(null);
  const started = useRef(false);

  const T = WORDS[ctx.locale];
  const care = careOf(state, petId);
  const g = growth(care);

  // A pet is never finished, so there is never a moment to clear the snapshot -
  // the same answer coloring gives, and for the same reason: a drawing and a
  // creature are both things a child made rather than puzzles they solved.
  useGameSession(ctx, SESSION, () => state, { live: true });

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(petId);
    }
  }, [ctx, petId]);

  // The reaction's timeout outlives the component if nobody cancels it, and it
  // would then call setState on a game that has been unmounted.
  useEffect(() => () => window.clearTimeout(reactTimer.current), []);

  /**
   * Everything here runs in the HANDLER, never inside a setState updater:
   * React may run an updater twice, and a doubled `winMoment` is a doubled
   * grant - real coins, not a stray animation.
   */
  const onCare = useCallback(
    (kind: CareKind, el: HTMLElement | null) => {
      ctx.audio.unlock();
      ctx.speech.unlock();

      const { state: next, outcome } = careFor(state, petId, kind);
      setState(next);

      reactSeq.current += 1;
      setReact({ kind, granted: outcome.granted, n: reactSeq.current });
      window.clearTimeout(reactTimer.current);
      reactTimer.current = window.setTimeout(() => setReact(null), 900);
      if (stageRef.current) popEl(stageRef.current);

      // Coins fly from whatever was tapped - the button, or the creature.
      const r = (el ?? stageRef.current)?.getBoundingClientRect();
      const at = r
        ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        : { x: 0, y: 0 };

      // The record climbs WITH the pet. There is no ending here, so waiting for
      // one would mean a creature a child walks away from never counted at all.
      // `scoreReport` is logic.ts's own answer to what the record measures - the
      // renderer never invents a unit and never writes its own `best`.
      const scored = ctx.score?.report(scoreReport(next, petId));
      if (scored?.isPersonalBest) setBest(scored.best);

      const already = grown[petId] ?? 0;
      if (outcome.grew && outcome.stage > already) {
        // The one celebration this game gets, and it is latched for the pet's
        // whole lifetime - not for the run - so starting over and raising the
        // same creature again is a lovely thing to do and pays nothing twice.
        const nextGrown = { ...grown, [petId]: outcome.stage };
        setGrown(nextGrown);
        // Written through rather than in an effect: this fires from a tap
        // handler, and an effect that has not run yet is a latch that is not
        // there when the next tap reads it.
        ctx.storage.set(GROWN_KEY, nextGrown);
        winMoment(ctx, {
          reason: "personal_best",
          tier: tierForStage(outcome.stage),
          level: `${petId}-stage-${outcome.stage}`,
          at,
        });
      } else if (outcome.milestone) {
        // The drip. `confetti: false` because this fires every few taps and a
        // full-screen celebration that often stops being one.
        winMoment(ctx, {
          reason: "milestone",
          level: `${petId}-care-${outcome.care}`,
          at,
          confetti: false,
        });
      } else {
        // A plain, happy tap. There is no third branch for a wrong one.
        ctx.audio.play(outcome.granted ? "success" : "pop");
        if (outcome.granted) haptic.success();
        else haptic.tap();
      }

      if (outcome.granted) burst(at.x, at.y, { count: 8 });
      ctx.analytics.track("pet_care", { pet: petId, kind, granted: outcome.granted });
    },
    [ctx, state, petId, grown],
  );

  const choosePet = useCallback(
    (id: string) => {
      setPetId(id);
      // A fresh wish, so the new creature is visibly asking for something of its
      // own rather than inheriting the last one's.
      setState(reWish(state));
      setBest(ctx.score?.best(id));
      setReact(null);
      ctx.analytics.levelStart(id);
    },
    [ctx, state, setPetId],
  );

  const restart = useCallback(() => {
    // A new one to raise. The record and the lifetime growth latch both survive
    // on purpose: a restart here is a beginning, never an erasure.
    setState(startOver(state, petId));
    setReact(null);
    ctx.analytics.levelStart(petId);
  }, [ctx, state, petId]);

  const wish = CARE[state.wish];

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "heart", label: T.care, value: care },
        { icon: "layers", label: T.size, value: `${g.stage + 1}/${MAX_STAGE + 1}`, ltr: true },
        { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
      ]}
      levels={PET_OPTIONS}
      level={petId}
      onLevel={choosePet}
      onRestart={restart}
      footer={
        <div
          style={{
            display: "flex",
            gap: 8,
            // The item count is fixed at four and the WIDTH is not: four 76px
            // targets plus gaps is 328px inside 280px of usable room on a 320px
            // phone, and this container clips rather than scrolls. Wrapping
            // gives two rows of two - see a-row-that-grows-with-the-catalog.
            flexWrap: "wrap",
          }}
        >
          {CARE_KINDS.map((kind) => {
            const wanted = kind === state.wish;
            return (
              <button
                key={kind}
                type="button"
                aria-label={T.verbs[kind]}
                aria-pressed={wanted}
                onClick={(e) => onCare(kind, e.currentTarget)}
                style={{
                  // >= 2x2cm at 96dpi (75.6px), which is the floor a five-
                  // year-old's fingertip needs.
                  flex: "1 1 76px",
                  minWidth: 76,
                  height: 78,
                  border: "none",
                  borderRadius: "var(--radius-2)",
                  background: "var(--surface)",
                  boxShadow: "var(--shadow-1)",
                  color: "var(--text)",
                  fontFamily: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  cursor: "pointer",
                  // The ring is how a pre-reader matches the bubble to the
                  // button. An outline rather than a box shadow, so it cannot
                  // be clipped by a neighbour.
                  outline: wanted ? "3px solid var(--brand)" : "none",
                  outlineOffset: -3,
                  touchAction: "none",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 30, lineHeight: 1 }}>
                  {CARE[kind].emoji}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--text-dim)",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {T.verbs[kind]}
                </span>
              </button>
            );
          })}
        </div>
      }
    >
      <Prompt
        ctx={ctx}
        glyph={wish.emoji}
        text={T.wants(pet.name[ctx.locale], wish.name[ctx.locale])}
      />

      <button
        ref={stageRef}
        type="button"
        className="ellaz-play-surface"
        aria-label={T.cuddleAria(pet.name[ctx.locale])}
        onClick={(e) => onCare("cuddle", e.currentTarget)}
        style={{
          position: "relative",
          // Sized against the VIEWPORT, not this container, like every board
          // here. The 380px cap sits well under the 700px desktop panel, so
          // nothing grows a scrollbar inside it
          // (game-panel-clears-widest-board.test.ts).
          width: "min(88vw, 44vh, 380px)",
          aspectRatio: "1",
          boxSizing: "border-box",
          border: "none",
          padding: 0,
          borderRadius: 24,
          background: "var(--surface)",
          boxShadow: "var(--shadow-1)",
          cursor: "pointer",
          touchAction: "none",
        }}
      >
        <PetArt pet={pet} stage={g.stage} delighted={react !== null} />

        {/* What the pet is asking for, with no words in it at all. */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "6%",
            insetInlineEnd: "7%",
            display: "grid",
            placeItems: "center",
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: "var(--surface-2)",
            boxShadow: "var(--shadow-1)",
            fontSize: 28,
            lineHeight: 1,
          }}
        >
          {wish.emoji}
        </span>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "23%",
            insetInlineEnd: "20%",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "var(--surface-2)",
          }}
        />

        {/* The reaction. Keyed by a counter so a second tap restarts the
            animation instead of watching the first one finish. */}
        {react && (
          <span
            key={react.n}
            aria-hidden="true"
            className="ellaz-pop"
            style={{
              position: "absolute",
              left: "50%",
              top: "18%",
              transform: "translateX(-50%)",
              fontSize: react.granted ? 46 : 34,
              lineHeight: 1,
              pointerEvents: "none",
            }}
          >
            {react.granted ? "💖" : CARE[react.kind].emoji}
          </span>
        )}
      </button>

      {/* How close the next growth is. A bar rather than a number, because the
          number is already in the stat row for whoever reads. */}
      <div
        aria-hidden="true"
        style={{
          width: "min(88vw, 380px)",
          height: 12,
          borderRadius: 999,
          background: "var(--surface-2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.round(g.ratio * 100)}%`,
            height: "100%",
            borderRadius: 999,
            background: g.stage >= MAX_STAGE ? "var(--yellow)" : "var(--green)",
            transition: "width 0.35s var(--ease)",
          }}
        />
      </div>
    </GameChrome>
  );
}
