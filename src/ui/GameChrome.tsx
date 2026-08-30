import { useEffect, useRef, useState, type ReactNode } from "react";
import type { GameContext } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { Icon, type IconName } from "./icons";
import { pageOwnsRestart, setPause, setRestart } from "./gameTools";

/**
 * The one screen shape every game wears.
 *
 * Chosen by the operator on 2026-08-08 after four rounds of rendered options.
 * Three things about it are decisions, not defaults, and each cost a round:
 *
 * 1. THE CONTROLS ARE ON TOP. Never at the bottom.
 *
 * 2. THE DIFFICULTY IS A TOGGLE THAT NEVER GETS A ROW OF ITS OWN. One card
 *    showing the CURRENT level; each tap advances to the next. It shares the
 *    button row and absorbs that row's leftover width, so the row has no slack
 *    to show. A full-width difficulty band was measured, seen, and rejected.
 *
 * 3. THE BOTTOM REGION IS REAL, NOT PADDING. On a 390px phone a square board is
 *    WIDTH-bound at 366px, so ~350px of vertical space exists that no board can
 *    ever occupy - and shrinking the chrome makes that hole BIGGER, not smaller.
 *    `footer` is where a game's own secondary controls belong: sudoku's number
 *    pad, sequence's choice row. A game with nothing to put there says something
 *    useful instead (whose turn it is). Measured: 176px of dead band before,
 *    122px after.
 *
 * And one measurement worth keeping, because every size check passed while the
 * screen looked wrong: a control's problem was not its SIZE, it was how much of
 * it was INK. A 118x62 slab holding a 22px glyph is 6.7% icon and 93% empty
 * button. The square 56px buttons here sit at ~27%, where a standard 24px icon
 * in a 48px button lands. If you widen a nav button, grow the glyph with it.
 */

export type ChromeStat = {
  icon: IconName;
  /** Already localised - this component does no translation. */
  label: string;
  value: string | number;
  /**
   * Pin the VALUE to left-to-right inside the Hebrew app. Set it for anything
   * that is notation rather than words - a clock ("1:30"), a fraction ("3/8"),
   * a score with a separator. Without it, RTL reorders the parts around the
   * separator and 1:30 reads as 30:1.
   *
   * It is a flag rather than a ReactNode value on purpose: a node would let a
   * game put anything at all in the stat row, and the row looking identical in
   * all 21 games is the point of this component.
   */
  ltr?: boolean;
  /**
   * The RECORD for this same number, drawn under it.
   *
   * A value and its record are one fact, so they are one cell: `Score 0` beside
   * `Best 0` spent two thirds of a row saying one thing, and it is the row a
   * six-figure score has to fit in. Attach it to the stat it is the record OF -
   * sudoku's best is a time, not a count of filled cells.
   */
  record?: string | number;
  /**
   * Size this cell to its CONTENT instead of an equal share of the row.
   *
   * For a short number that would otherwise take a third of the width and leave
   * none for the difficulty, which is the only cell carrying a word: a stage
   * counter, a fraction, a lives count. Measured at 390px, a compact stage cell
   * is 77px where an equal share is 105.
   */
  compact?: boolean;
};

export type ChromeLevel<T extends string> = {
  id: T;
  /**
   * A locale RECORD, matching `DifficultyOption`. Written as `{ he, en }` it
   * compiles under a promoted language and renders the toggle in English over
   * a page that is not - the one failure this whole type exists to prevent.
   */
  label: Record<Locale, string>;
  /** The dot colour for this level. Defaults walk green -> yellow -> pink. */
  color?: string;
};

const DEFAULT_COLORS = ["var(--green)", "var(--yellow)", "var(--brand)"];

const TAP = 56; // >= the 44px WCAG floor, and the size the ink ratio was tuned at

/**
 * The same number, as a CSS length the Design Bench can turn.
 *
 * Every size in this file is a decision somebody made once and nobody can see
 * any more, which is how an approved layout drifts into a different one. These
 * read a token whose FALLBACK is the shipped literal, so the rendering is
 * byte-identical with no token set and the bench at `?design` can dial it over
 * the real component rather than over a drawing of it.
 * `src/lab/design/variant-is-shipped.test.ts` pins each fallback to the
 * variant that claims to be shipped.
 */
const TAP_CSS = `var(--gc-tap, ${TAP}px)`;
/** Glyph ratio as CSS, so the icon grows with the cell instead of pinning at 29px. */
const TAP_GLYPH = `calc(${TAP_CSS} * 0.52)`;
/** Past this many levels the dots become a "3/12" counter. See the toggle. */
const DOT_MAX = 5;
const SURFACE_RADIUS = "var(--gc-radius, var(--radius-3))";

/**
 * The panel row, as CSS the Design Bench can turn.
 *
 * Same shape as TAP_CSS above and for the same reason: every number here is a
 * decision somebody made once, and a decision nobody can look at drifts into a
 * different one. Each reads a token whose FALLBACK is the shipped literal, so
 * with no token set the render is byte-identical - `?design` is what sets them.
 * `src/lab/design/panel-tokens-are-shipped.test.ts` pins every fallback.
 *
 * The class names beside them are the OTHER half. A token can change a size; it
 * cannot move a label under its number or turn three cards into one strip, and
 * those are shape decisions a style has to be able to make. So each part of a
 * cell is addressable, and a candidate style is a stylesheet the bench injects
 * rather than a second copy of this component.
 */
const GAP = "var(--gc-gap, 8px)";
const CELL_RADIUS = "var(--gc-cell-radius, var(--radius-2))";
const CELL_BG = "var(--gc-cell-bg, var(--surface))";
const CELL_SHADOW = "var(--gc-cell-shadow, var(--shadow-1))";
const LABEL_SIZE = "var(--gc-label, 10px)";
const VALUE_SIZE = "var(--gc-value, 18px)";
const RECORD_SIZE = "var(--gc-record, 10.5px)";
const STAT_ICON = "var(--gc-stat-icon, 18px)";
const LEVEL_SIZE = "var(--gc-level-value, 16px)";
/**
 * SAME SLOTS IN EVERY GAME - off by default, and both halves are tokens.
 *
 * The operator's call, 2026-08-21: every game shows difficulty, a main number
 * and a second number, with a dash where a game has nothing, so the row is the
 * same shape before you open any of it. That cannot be a stylesheet - CSS
 * cannot invent a cell that was never rendered - so the empty slots are ALWAYS
 * in the DOM and a token decides whether they are drawn.
 *
 * `display` reads a var, so the bench turns this on with no `!important` and no
 * second copy of the component; with nothing set the row is byte-identical to
 * what shipped before. The grid columns that make the cells LINE UP across
 * games ride the same switch, in the stylesheet, since a grid needs the
 * container to be a grid.
 */
/**
 * THREE FIXED TRACKS, and this is what makes every game's row the same row.
 *
 * Flex sized each cell from its own content, so "Time" in sudoku and "Score"
 * in snake landed at different widths and the two rows did not line up -
 * measured 2026-08-21, 25 different row shapes across 33 games. Tracks fix
 * that by construction rather than by tuning.
 *
 * It also retires the FLOORS. A `min-width` on a grid item overflows its track
 * instead of wrapping the row, so `--gc-level-min` and `--gc-stat-min` are
 * gone and every cell is `minWidth: 0`. The row cannot wrap now because there
 * is nothing to wrap: three tracks, always, whatever is in them.
 *
 * The ratio is 1.8 / 1 / 0.9 because the difficulty is the only cell carrying
 * a WORD and the third is usually a short counter.
 *
 * IT WAS 1.25 / 1 / 0.85, AND 1.25 WAS NEVER REACHING THE DIFFICULTY. The nav
 * buttons were the row's first children, so each one took a whole track - see
 * the note by the flex wrapper below. Once they moved out, track one is the
 * difficulty's for the first time and the ratio could be argued from what the
 * cell actually needs.
 *
 * MEASURED 2026-08-30, on the built artifacts at 390px, all 42 games plus the
 * three standalone bundles:
 *
 *   snake, standalone, one nav   "Normal"   needs 128px  <- the binding case
 *     1.25 -> 111  CLIPPED "Nor..."     1.6 -> 126  CLIPPED
 *     1.5  -> 124  CLIPPED             1.8 -> 134  clear, by 6px
 *   2048,  standalone, one nav   "Classic"  needs 121px
 *     1.25 -> 117  CLIPPED "Cla..."     1.8 -> 141  clear
 *   all 42 in the APP            rowW 355, no navs in the row at all
 *     1.25 -> nothing clipped anywhere   1.8 -> nothing clipped anywhere
 *
 * SIX PIXELS IS THIN, and the bound is narrower than it looks: the standalone
 * is hardcoded `lang="en"`, so only English labels are ever measured against
 * it, and the app - where Hebrew labels live - has 355px and no navs, which is
 * slack of a different order. Re-measure before adding a level label longer
 * than "Normal" to a game that ships standalone.
 *
 * WHAT NO RATIO CAN FIX, and what does: snake WHILE PLAYING carries a second
 * nav, leaving the grid 227px. "Normal" alone wants 128 of it, and two numbers
 * want the rest. Measured at 1.8, 2.2 and 2.6 - every one clips. FIXED
 * 2026-08-30 by wrapping instead of shrinking: the flex wrapper below wraps
 * and `.gc-row` carries a measured basis, so the row takes its own line rather
 * than losing letters. The ratio here is unchanged and still does the work
 * whenever the row does fit on one line.
 * See .claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md
 */
const COLS = "var(--gc-cols, minmax(0,1.8fr) minmax(0,1fr) minmax(0,0.9fr))";
/** The dash slots are DRAWN now - the operator's call, 2026-08-21. */
const EMPTY_DISPLAY = "var(--gc-empty-display, flex)";
/**
 * The glyph is OFF.
 *
 * Measured on the artifact across all 33 games: with it, sudoku's `42/81`
 * ellipsises inside its own card - nothing overflows, nothing is wider than
 * its frame, and the number is simply unreadable. Without it, nothing clips
 * anywhere. It is a token rather than a deleted element so the bench can put
 * it back and look at the trade rather than argue about it.
 */
const ICON_DISPLAY = "var(--gc-icon-display, none)";
/**
 * Three cells in the row: the difficulty and two numbers. Measured across the
 * roster - 23 games pass two numbers, 6 pass one, and none passes three.
 */
const CELLS = 3;

/**
 * `stats`, extended with nulls until the ROW holds `CELLS`.
 *
 * It counts the difficulty, because the row is what has to be the same shape
 * and the difficulty is one of its cells. Keying on the stats alone left
 * finddiff - two numbers and no difficulty - at two cells in a three-track
 * grid, which does not wrap, does not clip, and is simply a different row from
 * the other 31. Measured on the artifact; it was the only game to differ, and
 * it turned up only because the shape count was checked rather than assumed.
 *
 * Never truncates: a game passing more numbers than the standard keeps them
 * all, because dropping a number a game chose to show is worse than a row one
 * cell wider than the standard.
 */
function padSlots(stats: ChromeStat[], hasLevel: boolean): (ChromeStat | null)[] {
  const out: (ChromeStat | null)[] = [...stats];
  while (out.length + (hasLevel ? 1 : 0) < CELLS) out.push(null);
  return out;
}

export function GameChrome<T extends string>({
  ctx,
  stats,
  levels,
  level,
  onLevel,
  onRestart,
  paused,
  onPaused,
  footer,
  children,
}: {
  ctx: GameContext;
  /** Up to three. Four wrap and the row stops reading as one line. */
  stats: ChromeStat[];
  levels?: ChromeLevel<T>[];
  level?: T;
  /** Called with the NEXT level. The toggle owns the cycling, not the game. */
  onLevel?: (next: T) => void;
  onRestart: () => void;
  /**
   * Opt into the pause control. Only a game that KEEPS RUNNING while nobody is
   * playing it needs one — a falling piece, a moving snake, a countdown. A
   * turn-based game already pauses itself the moment a hand leaves the screen,
   * and a button there is a control that does nothing.
   *
   * Pass BOTH or neither. `paused` is the game's own state, not this
   * component's: the game is what stops, so the game owns the flag and this
   * only draws it. Omitting `onPaused` while passing `paused` would render a
   * button that cannot be pressed, so the two are one optional pair.
   *
   * Hide it (pass `undefined`) once the run is over. A pause button on a dead
   * board is offering to stop something that already stopped.
   */
  paused?: boolean;
  onPaused?: (next: boolean) => void;
  /** The game's own secondary area, under the board. */
  footer?: ReactNode;
  /** The board. */
  children: ReactNode;
}) {
  // Chrome, not game words: every one of these already had a key in the
  // eleven-language dictionary, so a hand-written he/en pair was strictly
  // less translated than the shared bar it sits in.
  const t = ctx.t;
  const i = levels && level ? levels.findIndex((l) => l.id === level) : -1;
  const current = i >= 0 && levels ? levels[i] : undefined;

  // Restart is a GAME control and it is NOT drawn here - it is drawn by the
  // page, in the utility row above the board, and this hands it the handler.
  //
  // It lived in this row for a day and the row could not hold it: the row is
  // 350px inside the panel on a 390px phone, and difficulty + two stats + gaps
  // already spends 344 of that - a fourth 56px cell takes it to 408. Measured
  // on the built artifact: 25 of 33 games wrapped onto two lines and snake's
  // difficulty label read "Nor...". With restart out of the row it is 1 of 33
  // - SUDOKU as of 2026-08-21, by one pixel: 132 + 88 + a 100px content-sized
  // compact cell + two 8px gaps is 336 against a 335px row. See CLAUDE.md.
  // (Historically:)
  // and that one is blocks, the only game carrying a pause button as well.
  //
  // A ref so the slot is filled ONCE per mount: `onRestart` is an inline arrow
  // in nearly every game, so a fresh identity on every render would re-announce
  // the slot on every state change.
  // See .claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md
  const restartRef = useRef(onRestart);
  restartRef.current = onRestart;
  useEffect(() => {
    setRestart(() => restartRef.current());
    return () => setRestart(null);
  }, []);

  // Unless nobody drew one. The standalone single-game bundle mounts this from
  // its own entry, on a page with no emitted chrome at all, and a published
  // artifact quietly missing its restart button is exactly the class of defect
  // no gate in this repo can see - nothing here fetches an itch upload back.
  // Read once at mount: the page claims the slot before React ever mounts.
  const [ownRestart] = useState(() => !pageOwnsRestart());

  // PAUSE goes to the same place and for the same reason. blocks is the only
  // game carrying pause AND two numbers, so it was the one game still wrapping
  // with restart already out: 56 + 132 + 88 + 88 + gaps is 388 against 350.
  //
  // It carries STATE as well as a handler, so the slot is re-announced when
  // `paused` flips - a button stuck on the pause glyph is how a player loses
  // track of which state they are in. Refs for the same reason as restart: the
  // click listener is attached once and must read the CURRENT values.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onPausedRef = useRef(onPaused);
  onPausedRef.current = onPaused;
  const hasPause = onPaused !== undefined;
  useEffect(() => {
    setPause(
      hasPause
        ? { paused: Boolean(paused), toggle: () => onPausedRef.current?.(!pausedRef.current) }
        : null,
    );
    return () => setPause(null);
  }, [hasPause, paused]);

  const navBtn = (name: IconName, ariaLabel: string, onClick: () => void) => (
    <button
      type="button"
      className="gc-nav"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        width: TAP_CSS,
        height: TAP_CSS,
        flex: "0 0 auto",
        border: "none",
        borderRadius: "var(--radius-2)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
        color: "var(--text)",
        display: "grid",
        placeItems: "center",
        // 0.52 of the button, not 0.36. See the ink note above.
        fontSize: TAP_GLYPH,
        cursor: "pointer",
      }}
    >
      <Icon name={name} />
    </button>
  );

  return (
    <div
      // The desktop cap lives in global.css as `.ellaz-game-panel`, NOT in the
      // inline style below, because it is a media query and an inline style
      // cannot carry one. Everything in this component is `flex: 1 1 0` with no
      // ceiling - exactly right on the 390px phone it was judged at, and on a
      // 1440px desktop the same rule produced a 1193px button reading "Level:
      // Classic", three 456px cards each holding one digit, and a 420px board
      // adrift in 1409px. Measured on the built artifact, all three.
      className="ellaz-game-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "var(--surface-2)",
        // NO horizontal padding. Measured on the artifact at 390px: this 8 plus
        // the head's 12 spent 40px - 10.3% of a phone - before a card started,
        // and the panel is edge-to-edge on a phone anyway (`.box` drops its
        // radius under 720px). The head's own padding is the only gutter now.
        padding: "8px 0",
        // WIDTH + BORDER-BOX, both load-bearing. Without them this is a flex
        // item sized by its content: the board inside asks for `min(94vw, …)`,
        // which is nearly the whole frame, and then this padding ADDS 16px on
        // top - so the panel came out 407px wide inside a 390px frame, centred,
        // hanging 8px off each side. #game-frame clips, so the result was a
        // framed panel with its left and right band sliced off. Measured on the
        // built artifact at both widths.
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        className="gc-head"
        style={{
          flex: "0 0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--gc-head-gap, 9px)",
          padding: "var(--gc-head-pad, 10px 10px 8px)",
          background: "var(--bg)",
          borderRadius: `${SURFACE_RADIUS} ${SURFACE_RADIUS} 0 0`,
        }}
      >
        {/* ONE row, and everything in it is a GAME control: pause, the
            difficulty and the game's own numbers. Restart is a game control
            too and is in the utility row above, for width rather than for
            family - see the note by `setRestart`. Home, sound, full screen and
            the wallet are PLATFORM chrome and live in the page header.
            See .claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md

            flexWrap because the cell count is fixed per game but the WIDTH is
            not, and this container clips rather than scrolls. See
            a-row-that-grows-with-the-catalog-must-wrap. */}
        {/* THE NAVS SIT BESIDE THE GRID, NOT IN IT, and that is a fix rather
            than a tidy-up. They used to be the row's first children, so each
            one CONSUMED a flexible track: measured on the built 2048 bundle at
            390px, the restart icon is 56px wide and was sitting in the 1.25fr
            track at 142.9px, wasting 87 of them, while the difficulty was
            pushed into the 1fr track at 114.3px and rendered "Cla...". The
            value needed 52px and had 45.

            The ratio above says in its own words that 1.25 exists "because the
            difficulty is the only cell carrying a WORD" - which was true when
            it was written and stopped being true the moment a nav button
            joined the row. Snake in play carries TWO navs and lost two tracks.

            An `auto` track per nav does not work: the count varies from 0 to 2,
            and the cells wrap, so row two would start in a nav-sized track.
            A flex wrapper leaves the grid exactly three tracks whatever the
            navs do. `.gc-row` stays the grid, so `panelRead.ts`, the design
            bench's `.ellaz-game-panel .gc-row` selector and every `--gc-*`
            token still land on the same element. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: GAP,
            // WRAP, and this is the half no column ratio could do.
            //
            // The navs are siblings of the grid, so every nav takes width the
            // three cells never see. Snake in play carries two of them and
            // leaves the grid 227px of a 355px wrapper - measured on the built
            // standalone at 390px, where "Normal" rendered "N..." at 1.8, at
            // 2.2 and at 2.6 alike. Shrinking is the wrong response to not
            // fitting; the row takes its own line instead.
            flexWrap: "wrap",
          }}
        >
          {ownRestart &&
            onPaused &&
            navBtn(paused ? "play" : "pause", paused ? t("resume") : t("pause"), () =>
              onPaused(!paused),
            )}
          {ownRestart && navBtn("redo", t("restart"), onRestart)}
        <div
          className="gc-row"
          style={{
            // The BASIS is the wrap trigger, and it is measured rather than
            // chosen. Swept on the built snake standalone at 390px, playing,
            // two navs, widening the frame until the ellipsis stopped:
            //
            //   rowW 257 -> "Normal" short by 11px
            //   rowW 277 -> clear
            //
            // So the row needs about 270 and the floor is 280, which clears
            // the binding case with margin and still sits under the 291 that
            // the one-nav ready state gets - so a game only takes a second
            // line when a second nav actually appears.
            //
            // WHICH WAY TO ERR: a floor that wraps too eagerly costs a line of
            // height; one that wraps too late eats letters, and a clipped word
            // looks like a bug while a wrapped row looks like a layout. If the
            // window between the two states ever closes, wrap.
            //
            // The APP never reaches this: it puts restart in the page header,
            // so `ownRestart` is false, the row has no navs and gets the whole
            // 355. Only the standalone bundles wrap, and only while playing.
            flex: "1 1 var(--gc-row-min, 280px)",
            minWidth: 0,
            display: "grid",
            gridTemplateColumns: COLS,
            alignItems: "center",
            gap: GAP,
          }}
        >
          {levels && current && onLevel && (
            <button
              type="button"
              className="gc-cell gc-level"
              aria-label={`${t("difficulty")}: ${current.label[ctx.locale]}`}
              onClick={() => onLevel(levels[(i + 1) % levels.length].id)}
              style={{
                height: TAP_CSS,
                // GRID TRACK, not flex. See COLS above - the basis and the
                // floor that used to live here are both retired, because a
                // track already decides this cell's width and a floor would
                // overflow it rather than wrap the row. Kept verbatim below,
                // because it is the measurement the ratio came from:
                // BASIS 0, not auto. On `auto` this card's basis is its own
                // CONTENT - an emoji, a word and three dots - so it grows to
                // fit that and takes the row's slack with it: measured on the
                // built artifact, snake's difficulty took 184px and left the
                // score cell 60, which rendered its record as "Be...". The
                // floor below is what makes the row wrap rather than shrink;
                // the basis has never been what did that.
                minWidth: 0,
                // A FLOOR, not zero, and it is what makes the row's `flexWrap`
                // do anything. At `minWidth: 0` a flex item shrinks instead of
                // wrapping, so this toggle is left 94px on a 390px phone and
                // "Classic" is clipped INSIDE the card - no element wider than
                // its frame, no overflow anywhere, and the only symptom a
                // missing glyph. 132 is what the widest shipped label plus its
                // dots actually needs, so past that the toggle takes its own
                // row rather than losing letters.
                //
                // DO NOT RAISE IT TO FIT SNAKE. Measured on the artifact at
                // 390px: snake's "🙂 Normal" is the one label carrying an emoji
                // and needs 146, where the next widest (wordguess, "4 letters")
                // needs 128. Raising the floor to 152 fixed snake and WRAPPED
                // sudoku, whose two flexible cells plus a 99px compact one
                // leave this a ceiling of 147. The honest window is [146, 147]
                // - one pixel, in English only, with Hebrew labels a different
                // width entirely. Snake's 14px is a snake problem (its own
                // labels) and not this constant's.
                // See .claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md
                // and .claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md
                border: "none",
                borderRadius: CELL_RADIUS,
                background: CELL_BG,
                boxShadow: CELL_SHADOW,
                color: "var(--text)",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: GAP,
                padding: "0 12px",
                cursor: "pointer",
              }}
            >
              <span className="gc-text" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.12, minWidth: 0, maxWidth: "100%" }}>
                <span className="gc-label" style={{ fontSize: LABEL_SIZE, fontWeight: 800, color: "var(--text-dim)" }}>
                  {t("difficulty")}
                </span>
                {/* nowrap + ellipsis, and both are load-bearing. A long label
                    (sudoku's "Animals 4x4") does not clip and does not overflow
                    - it WRAPS, which passes a clip check, an overflow check and
                    a right-edge check while quietly making this card taller than
                    the cells beside it. Measured on the mock; three instruments
                    said clean. */}
                <span className="gc-value" style={{ fontSize: LEVEL_SIZE, fontWeight: 800, fontFamily: "Fredoka, inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                  {current.label[ctx.locale]}
                </span>
              </span>
              {/* The dots are the whole affordance: without them a toggle reads
                  as a label and never gets pressed. They say how many levels
                  exist AND which one you are on, in the width of three dots.
                  Past DOT_MAX they stop doing that - twelve 6px dots are 130px
                  of row that nobody can count at a glance - so the same two
                  facts become "3/12", which is legible at any length. */}
              <span
                dir="ltr"
                className="gc-dots"
                style={{ display: "flex", gap: 4, alignItems: "center", marginInlineStart: 8, flex: "0 0 auto" }}
              >
                {levels.length <= DOT_MAX ? (
                  levels.map((l, k) => (
                    <span
                      key={l.id}
                      style={{
                        width: k === i ? 9 : 6,
                        height: k === i ? 9 : 6,
                        borderRadius: "50%",
                        background:
                          k === i ? (current.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]) : "var(--line)",
                      }}
                    />
                  ))
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-dim)" }}>
                    {i + 1}/{levels.length}
                  </span>
                )}
              </span>
            </button>
          )}

          {/* Padded whenever the row has ANYTHING in it. The one game with
              neither a difficulty nor a number is coloring, which keeps no
              score on purpose - three dashes there would be the opposite of
              the point. */}
          {((levels && current) || stats.length
            ? padSlots(stats, Boolean(levels && current))
            : stats
          ).map((s, slot) =>
            s === null ? (
              <div
                key={`empty-${slot}`}
                className="gc-cell gc-stat gc-slot-empty"
                aria-hidden="true"
                style={{
                  display: EMPTY_DISPLAY,
                  minWidth: 0,
                  height: TAP_CSS,
                  background: CELL_BG,
                  borderRadius: CELL_RADIUS,
                  boxShadow: CELL_SHADOW,
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-dim)",
                  fontSize: VALUE_SIZE,
                  fontWeight: 800,
                  opacity: 0.45,
                }}
              >
                -
              </div>
            ) : (
            <div
              key={s.label}
              className={s.compact ? "gc-cell gc-stat gc-compact" : "gc-cell gc-stat"}
              style={{
                // Every cell takes its track. `compact` no longer sizes a cell
                // to its own number - that is exactly what made 25 different
                // rows - so the flag now only decides nothing at all here.
                minWidth: 0,
                height: TAP_CSS,
                background: CELL_BG,
                borderRadius: CELL_RADIUS,
                boxShadow: CELL_SHADOW,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: GAP,
                padding: "0 8px",
              }}
            >
              <span className="gc-icon" style={{ color: "var(--text-dim)", fontSize: STAT_ICON, display: ICON_DISPLAY, flex: "0 0 auto" }}>
                <Icon name={s.icon} />
              </span>
              <span className="gc-text" style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", lineHeight: 1.05, maxWidth: "100%" }}>
                <span className="gc-label" style={{ fontSize: LABEL_SIZE, fontWeight: 800, color: "var(--text-dim)" }}>
                  {s.label}
                </span>
                <span
                  dir={s.ltr ? "ltr" : undefined}
                  className="gc-value"
                  style={{ display: "block", fontSize: VALUE_SIZE, fontWeight: 800, fontFamily: "Fredoka, inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}
                >
                  {s.value}
                </span>
                {s.record !== undefined && (
                  <span
                    dir={s.ltr ? "ltr" : undefined}
                    className="gc-record"
                    style={{ fontSize: RECORD_SIZE, fontWeight: 700, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}
                  >
                    {t("best")} {s.record}
                  </span>
                )}
              </span>
            </div>
            ),
          )}
        </div>
        </div>
      </div>

      <div
        className="ellaz-play-surface"
        style={{
          flex: 1,
          minHeight: 0,
          // The anchor for the pause cover below. Harmless when nothing is
          // paused, and the cover has to live INSIDE this box rather than over
          // the whole panel: the header must stay reachable, because the button
          // that ends the pause is in it.
          position: "relative",
          display: "flex",
          // COLUMN, not row. Most games pass one board, but the kids games pass
          // a <Prompt> above it, and a row would sit the question BESIDE the
          // question it is about. A column with one child centers identically,
          // so this costs the single-child games nothing.
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          overflow: "auto",
          // NO horizontal padding. The frame's own 8px is the gutter, and every
          // game sizes its board against the VIEWPORT (`min(94vw, …)`) rather
          // than against this box - so a second 12px each side is 24px the
          // board never budgeted for, and it is the board that loses.
          padding: "9px 0 12px",
          background: "var(--bg)",
          borderRadius: footer ? undefined : `0 0 ${SURFACE_RADIUS} ${SURFACE_RADIUS}`,
        }}
      >
        {children}

        {/* The cover. It HIDES the board rather than dimming it, and that is
            the decision: a see-through pause is a way to study a falling stack
            for as long as you like, which turns the one control meant for
            putting the tablet down into the cheapest strategy in the game.
            It also swallows every pointer event aimed at the board, so a
            paused game cannot be played through its own cover.

            One tap anywhere on it resumes. The whole surface is the target
            because that is what a four-year-old aims at, and the button inside
            is what says so - it is drawn, not wired, and the click it would
            handle is caught by this parent either way. */}
        {paused && onPaused && (
          <button
            type="button"
            aria-label={t("resume")}
            onClick={() => onPaused(false)}
            style={{
              position: "absolute",
              inset: 0,
              border: "none",
              // Opaque in BOTH themes, and explicitly coloured rather than
              // inheriting: `--text` is near-black on the light theme, so an
              // inherited colour paints this heading black on near-black - the
              // exact thing blocks' game-over sheet has a comment about.
              background: "var(--bg)",
              color: "var(--text)",
              fontFamily: "inherit",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "var(--surface)",
                boxShadow: "var(--shadow-1)",
                color: "var(--brand)",
                display: "grid",
                placeItems: "center",
                fontSize: 46,
              }}
            >
              <Icon name="play" />
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "Fredoka, inherit" }}>
              {t("resume")}
            </span>
          </button>
        )}
      </div>

      {footer && (
        <div
          /* The one hook anything outside this component has on a game's own
             secondary controls. Without it the footer is an anonymous div and
             a question like "how big are this game's buttons" cannot even be
             asked - which is why 31 different sizes went unnoticed across 21
             games. `GameChrome` is in the `page` chunk, so the class costs a
             first visit nothing. */
          className="ellaz-game-footer"
          style={{
            flex: "0 0 auto",
            padding: "0 12px 14px",
            background: "var(--bg)",
            borderRadius: `0 0 ${SURFACE_RADIUS} ${SURFACE_RADIUS}`,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
