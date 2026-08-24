import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from "react";
import type { AppLocale } from "@i18n/locales";
import { makeT, textFor, pageLocaleFor } from "@i18n/index";
import {
  catalog,
  CATEGORY_ORDER,
  ensureFullCatalog,
  findEntry,
  subscribeCatalog,
  type CatalogEntry,
} from "./catalog";
import { ROSTER_CATEGORY, ROSTER_IDS } from "./shellRoster";
import {
  audioPort,
  dailyStreak,
  speechPort,
  wallet,
  type Category,
  type DailyStateV1,
  type ProfileV1,
} from "@sdk/index";
import { boardsHref, gameHref, worldHref } from "./paths";
import { inkFor } from "@ui/ink";
import { Icon } from "@ui/icons";
import { GameArt, showsArt } from "@ui/gameArtView";
import { useCardStyle } from "@ui/useCardStyle";
import type { CardStyle } from "@ui/cardStyle";
import { useTheme } from "@ui/useTheme";
import { themeById } from "@ui/themes";
import { attachShellJuice } from "@juice/index";
import { LanguagePicker } from "@ui/LanguagePicker";
import { WalletChip } from "./WalletChip";
// TYPE-ONLY, and that matters: `@sdk/share` is pinned to the lazy `share-*`
// chunk, and a value import here would put the whole payload policy in the
// shell. A type import is erased before Rollup ever sees it.
import type { ShareDay } from "@sdk/share";
import type { ShareSheetProps } from "./ShareSheet";
// The runtime half that IS shell-side, and the only reason it is a separate
// module: this screen has to know whether anything was played today before it
// can decide whether the button belongs on the page at all.
import { localDay, playedOn } from "@sdk/shareDay";
import { DailyChip } from "./DailyChip";
import { todayKey, todaysGame } from "./dailyRotation";
import { Scene } from "./world/Scene";

// Home screen. Four moving parts, all of them there because a four-year-old is
// the user:
//
//   1. An ICON filter rail instead of stacked text sections. A pre-reader cannot
//      read "חשיבה", and at the full catalog the stacked-section layout ran to
//      about five phone screens of scrolling - measured, not guessed. Tapping a
//      picture cuts that to roughly one.
//   2. STARS on every card, so the grid doubles as a collection board. Progress
//      and collecting are what bring a child of this age back.
//   3. A KEEP PLAYING row, so returning needs no reading at all.
//   4. The WORLD as a hero card showing the real room, rather than a 48px button
//      in the corner. It is the reason to earn coins; it should look like it.

/** "no category chosen" - a distinct value, never a Category. */
const ALL = "all" as const;
type Filter = typeof ALL | Category;

/** How many games the keep-playing row shows before it starts scrolling. */
const RECENT_LIMIT = 4;

// `GameArt` and `showsArt` moved to `@ui/gameArtView` when the boards screen
// started showing the same games: two copies would be two answers to "what does
// this game look like".

export function Home({
  locale,
  onPickLocale,
}: {
  locale: AppLocale;
  onPickLocale: (next: AppLocale) => void;
}) {
  const t = makeT(locale);
  const [profile, setProfile] = useState<ProfileV1>(() => wallet.snapshot());
  const [filter, setFilter] = useState<Filter>(ALL);

  // The wallet is the source of truth for stars, coins, the equipped room AND
  // what was played last, so one subscription feeds every part of this screen.
  useEffect(() => wallet.subscribe(setProfile), []);

  // The shell carries full metadata for only the games above the fold. Pull in
  // the rest and re-render when they land - the cards below the fold fill in
  // their label and colour, the same beat the card art has had since 2026-08-13.
  // Their SPACE is already reserved (`pending` below), so nothing reflows.
  const [, catalogArrived] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const stop = subscribeCatalog(catalogArrived);
    void ensureFullCatalog();
    return stop;
  }, []);

  const shown = filter === ALL ? catalog() : catalog().filter((e) => e.meta.category === filter);

  // How many cards are still on their way, in THIS filter. The grid draws an
  // empty slot for each, so the page height is right from the first paint -
  // which is the whole reason the shell still carries every id.
  const loaded = new Set(catalog().map((e) => e.meta.id));
  const pending = ROSTER_IDS.filter(
    (id) => !loaded.has(id) && (filter === ALL || ROSTER_CATEGORY[id] === filter),
  );

  // Only categories that actually have a game are offered. A chip that filters
  // to an empty grid is a dead end, and an empty grid gives a child no way back.
  // From `ROSTER_CATEGORY`, never from the loaded catalogue: `learn`, `speed`
  // and `create` have ALL of their games below the fold, so deriving these from
  // what has ARRIVED would pop three chips into the nav row a beat after paint.
  const chips = CATEGORY_ORDER.filter((c) =>
    ROSTER_IDS.some((id) => ROSTER_CATEGORY[id] === c.category),
  );

  // Filter FIRST, slice second. The wallet is below the portal in the module
  // graph, so it cannot know the catalog and happily returns ids for games that
  // have since been deleted. Slicing before dropping those would quietly return
  // a short row - four stamps, one dead, three cards - with nothing to show for
  // the missing one.
  const recent = wallet
    .recentlyPlayed()
    .map((id) => findEntry(id))
    .filter((e): e is CatalogEntry => Boolean(e))
    .slice(0, RECENT_LIMIT);

  // WHAT HAPPENED TODAY, and nothing else. `sdk/share.ts` takes one day and has
  // no field a streak, a lifetime total or a history could live in.
  //
  // `lastPlayedAt` is the only day-scoped fact this screen holds. `stars` and
  // `coins` sitting next to it are LIFETIME totals, so neither may travel as
  // "today" - which is the whole reason this is derived here rather than handed
  // the profile.
  //
  // Memoised on the profile and the locale: a fresh object every render would
  // restart the card rasterisation inside the sheet on every unrelated
  // re-render, and the sheet's effect keys on this object.
  const today = useMemo<ShareDay>(() => {
    const now = new Date();
    return {
      date: localDay(now),
      plays: catalog().filter((e) => playedOn(profile.games[e.meta.id]?.lastPlayedAt, now)).map(
        (e) => ({ gameId: e.meta.id, title: textFor(e.meta.title, locale), emoji: e.meta.emoji }),
      ),
    };
  }, [profile, locale]);

  // Where the reader actually is, base and all. Read at runtime rather than
  // hardcoded so it is right on ellaz.fun, on the Pages copy under /ellaz/, and
  // on a phone pointed at a dev server.
  const shareUrl =
    typeof location === "undefined" ? "" : `${location.origin}${import.meta.env.BASE_URL}`;

  const [Sheet, setSheet] = useState<React.ComponentType<ShareSheetProps> | null>(null);

  /**
   * The sheet's chunk is fetched INSIDE the handler, never at module scope.
   *
   * A module-scope `lazy(() => import(...))` keeps the chunk in the production
   * module graph, so Vite writes a `<link rel="modulepreload">` for it into
   * index.html and every child downloads it on first paint - with the dynamic
   * import, the named `manualChunks` branch and the `globIgnores` entry all
   * correctly in place, and nothing failing. That shipped live once already.
   * See `.claude/rules/precache-glob-sweeps-new-chunks.md`.
   */
  const openShare = async () => {
    tap();
    try {
      const mod = await import("./ShareSheet");
      // The updater form: React calls a bare function argument, so
      // `setSheet(mod.ShareSheet)` would invoke the component instead of
      // storing it.
      setSheet(() => mod.ShareSheet);
    } catch {
      // A failed chunk fetch - an open tab meeting a new deploy is the usual
      // cause - costs the share and nothing else.
    }
  };

  const juiceRef = useRef<HTMLDivElement>(null);

  // Every card is a real <a> now, so opening a game is a navigation and this
  // only has to make the tap FEEL like something. The audio unlock that used to
  // live here moved to a first-gesture listener in `PageApp.tsx`, because a
  // player arriving from a shared link or a search result never taps a card at
  // all and would otherwise have Hebrew speech silently locked all visit.
  const tap = () => {
    audioPort.unlock();
    speechPort.unlock();
    audioPort.play("tap");
  };

  // The shell answers a touch: press depth, a ripple at the finger, a haptic.
  // Home had the SOUND already (`tap` above) and none of the feel - the World
  // shakes and bursts, every game is full of it, and the one screen every
  // session starts on was visually inert.
  //
  // NO `playTap` HERE, deliberately. `attachShellJuice` can own the tap sound,
  // and in a shell that did not already have one it should. This one does:
  // `tap` is threaded to every card and toggle as `onTap`. Passing `playTap`
  // as well would fire on pointerdown AND on click - two shutter clicks per
  // press, which reads as a stutter rather than as a doubled sound. Collapsing
  // the threaded props into the delegated listener is the right end state and
  // is a separate change; doing it here would mean the first tap of a session
  // plays before `audioPort.unlock()` has run, because pointerdown precedes
  // click and the context is still suspended.
  useEffect(() => {
    const root = juiceRef.current;
    if (!root) return;
    return attachShellJuice(root);
  }, []);

  return (
    <div className="ellaz-scroll" style={{ flex: 1 }} ref={juiceRef}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "8px 16px 32px" }}>
        <header
          // IT WRAPS, and that is the fix rather than a tidy-up.
          //
          // This row's width grows with the LANGUAGE LIST, which only ever gets
          // longer - the same shape as
          // .claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md, whose
          // two earlier instances grew with the catalog. Measured at 390px
          // before this: 447px of demand in Hebrew, 489 in English, 509 in
          // Indonesian, against a 350px box. All eleven languages overflowed at
          // 320, 360 and 390.
          //
          // The symptom was SIDEWAYS SCROLL rather than clipping, and that is
          // why both checks that rule recommends reported clean. `body.app-shell`
          // is overflow:hidden so the document never widened -
          // documentElement.scrollWidth was exactly innerWidth in all 33 cells -
          // and the overflow landed in `.ellaz-scroll` (overflow-x:auto) one
          // level in, 76px of travel in Hebrew and 139 in Indonesian. The
          // per-item check found nothing either, because these children were
          // never squeezed: they were pushed bodily outside the box. In Hebrew
          // the language pill sat at x=-76, half off the left edge, on the
          // DEFAULT locale.
          //
          // Trimming was measured before being rejected: deleting the language
          // control outright still leaves English and Indonesian 17px over.
          // Wrapping is the only answer that needs no re-deriving when the
          // twelfth language, a longer app name or a four-digit coin count
          // arrives.
          //
          // gap stays 8 rather than going back to 12: with the row wrapped the
          // header no longer needs what that recovers, and two rows on a phone
          // should read as one block rather than as two unrelated bars.
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            rowGap: 8,
            padding: "12px 4px 16px",
          }}
        >
          {/* 26 rather than 40, and the tagline below is hidden on a phone -
              together they are the 73px that gets this bar onto ONE row.
              Measured on the built page at 390px: the identity block alone
              claimed 342 of the 350 available, which is why removing controls
              changed the height by exactly zero and shrinking the identity is
              the only lever that moves it.

              The controller stays, on the operator's ruling (they were shown
              the same bar with and without it and picked with). It is
              aria-hidden decoration, so it costs a crawler and a screen reader
              nothing. */}
          <div style={{ fontSize: 26 }} aria-hidden="true">
            🎮
          </div>
          {/* `minWidth: 0` because a flex item's default `min-width: auto`
              refuses to shrink below its own content - which is what let the
              title push the controls off the screen instead of the row
              wrapping. The wrap above does nothing without it. */}
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <h1 style={{ fontSize: 24, lineHeight: 1 }}>{t("appName")}</h1>
            {/* HIDDEN on a phone, never removed. A media query rather than a
                conditional render, for the reason the emitted screen name
                already carries: responsive hiding is not cloaking, and not
                rendering it at all is a different thing - a crawler and a
                screen reader still get the line. */}
            <div className="ellaz-tagline" style={{ color: "var(--text-dim)", fontSize: 14 }}>
              {t("tagline")}
            </div>
          </div>
          {/* The four controls travel together. Without this wrapper the row
              wraps one control at a time, and a phone gets the language pill
              alone on a second line under its three siblings; with it, the
              group drops as a unit and returns to one line the moment there is
              room. It wraps internally too, so no autonym and no coin count can
              overflow it either - the same guarantee, one level down. */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
              rowGap: 8,
              // `0 1 auto` with `minWidth: 0`, and the SHRINK half is
              // load-bearing rather than defensive. At `0 0 auto` this group
              // keeps its max-content width - 431px in Indonesian once the
              // autonym is back - so it never gets squeezed, so its own
              // `flexWrap` above never fires, so it overflows instead of
              // wrapping. Measured at exactly 430px, the width where the label
              // returns: 21px of sideways travel and three controls outside the
              // viewport, i.e. the original bug reproduced in a 1px-wide band.
              // A wrap that cannot be reached is not a wrap.
              flex: "0 1 auto",
              minWidth: 0,
              marginInlineStart: "auto",
            }}
          >
            {/* STARS, not coins and stars. Operator ruling 2026-08-24. The My
                world card sits directly under this bar now and prints both
                numbers, so the coin count here was the duplicate - and coins
                are what a child spends in that room. It is also what makes
                four controls fit: measured, coins+stars wraps this header to
                two rows at 320, 360, 390 and 430 alike. */}
            <WalletChip starsOnly />
            {/* Beside the wallet, and only once there is a streak to show. It
                is the same currency-shaped readout: something you have, not
                something you owe. */}
            <DailyChip locale={locale} />
            <BoardsButton locale={locale} onTap={tap} />
            <LanguagePicker locale={locale} onPick={onPickLocale} onTap={tap} />
            <ThemeToggle locale={locale} onTap={tap} />
          </div>
        </header>

        {/* THE ROOM FIRST, then today's puzzle, then the games. Operator
            ruling 2026-08-24: "then my world then games".

            The boards CARD that used to sit here is gone - it is the trophy
            in the bar now, and two doors to one room is the thing this whole
            pass is undoing. One consequence is worth stating rather than
            leaving to be found: that card appeared only once you had played
            ("a first visit is for games"), and a bar icon is always there. So
            a first-time visitor now sees a leaderboards control that leads to
            an empty board. That is a real reversal of a stated decision, and
            it is the operator's, not mine - `BoardsButton` carries the note. */}
        <WorldHero profile={profile} locale={locale} onTap={tap} />

        <DailyCard locale={locale} onTap={tap} />

        {/* Sharing, and only once there is something that happened TODAY.
            A button whose card would say "today I played nothing" is worse
            than no button, so the gate is the payload's own emptiness rule
            (`buildShare` returns undefined) expressed one layer up, where it
            can keep the control off the screen instead of opening an empty
            sheet. */}
        {today.plays.length > 0 && shareUrl !== "" && (
          <button
            onClick={() => void openShare()}
            style={{
              display: "block",
              width: "calc(100% - 8px)",
              margin: "0 4px 20px",
              minHeight: "var(--tap)",
              padding: "11px 14px",
              border: "none",
              borderRadius: "var(--radius-3)",
              background: "var(--surface-2)",
              boxShadow: "var(--shadow-1)",
              color: "var(--text)",
              textAlign: "start",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            <span aria-hidden="true">💌</span> {t("share")}
          </button>
        )}

        {Sheet && (
          <Sheet
            locale={locale}
            day={today}
            url={shareUrl}
            onTap={tap}
            onClose={() => setSheet(null)}
          />
        )}

        {recent.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, margin: "0 4px 12px", color: "var(--text-dim)" }}>
              {t("keepPlaying")}
            </h2>
            <div
              className="ellaz-rail"
              style={{ display: "flex", gap: 12, overflowX: "auto", padding: "2px 4px 4px" }}
            >
              {recent.map((e) => (
                <RecentCard key={e.meta.id} entry={e} locale={locale} onTap={tap} />
              ))}
            </div>
          </section>
        )}

        {/* The grid's own controls, in one strip above the grid: WHICH games,
            and HOW they are drawn.

            The card-style toggle used to sit in the header. It left when the
            operator named that bar's four controls on 2026-08-24 and it was
            not among them, and it does not fit anyway - stars plus four 48px
            icons is 299px of controls beside a 110px identity in a 350px box.
            It lands here rather than being deleted because this is its actual
            subject: it restyles the cards below it and nothing else on the
            screen. That keeps the header platform-level and this strip
            grid-level, which is the split the whole pass is about. */}
        <CategoryRail
          chips={chips}
          value={filter}
          onChange={setFilter}
          locale={locale}
          allLabel={t("allCategories")}
          trailing={<CardStyleToggle locale={locale} onTap={tap} />}
        />

        <div
          style={{
            display: "grid",
            // 96px, not 104px. A 360px phone (very common on Android) leaves
            // (360 - 32 padding - 24 gaps) / 3 = 101px per column, so a 104px
            // minimum silently drops to TWO columns there - losing the density
            // win on the narrowest screens, which are the ones that need it.
            // Verified by measuring at 360 and 430, not by arithmetic alone.
            // The whole card is the tap target, so 96px still clears the 64px
            // kids floor comfortably.
            gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
            gap: 12,
          }}
        >
          {pending.map((id) => (
            // Deliberately empty and unlabelled: a placeholder TITLE would flash
            // the wrong text, and a spinner on a card nobody has scrolled to is
            // noise. It holds the space and nothing else.
            <div
              key={`pending-${id}`}
              aria-hidden
              style={{ aspectRatio: "1 / 1", borderRadius: "var(--radius-3)" }}
            />
          ))}
          {shown.map((e) => (
            <GameCard
              key={e.meta.id}
              entry={e}
              locale={locale}
              stars={profile.games[e.meta.id]?.stars ?? 0}
              onTap={tap}
              t={t}
            />
          ))}
        </div>

        <p
          style={{
            color: "var(--text-dim)",
            fontSize: 13,
            textAlign: "center",
            marginTop: 28,
          }}
        >
          📲 {t("installHint")}
        </p>
      </div>
    </div>
  );
}

/**
 * The leaderboards, as an icon in the bar. Operator ruling 2026-08-24: "also
 * add leaderboards icon there".
 *
 * It replaces the full-width card that used to sit under the room, and the
 * swap is not neutral. That card was gated on `recent.length > 0` on purpose -
 * "a first visit is for games", and a leaderboard link for somebody who has
 * played nothing leads to a screen that says so. A bar icon is always there,
 * so that gate is gone. Ungating it was the ruling; recording that it WAS a
 * decision is this comment's job, so the next reader does not restore the
 * gate thinking it was dropped by accident.
 *
 * An `<a>`, not a button, because it navigates: middle-click, long-press and
 * "open in new tab" all have to keep working, which is the same reason the
 * home grid's cards are real links.
 */
function BoardsButton({ locale, onTap }: { locale: AppLocale; onTap: () => void }) {
  const t = makeT(locale);
  return (
    <a
      href={boardsHref(pageLocaleFor(locale))}
      onClick={onTap}
      aria-label={t("boards")}
      style={{
        // The same box the theme toggle holds, so the three icons in this bar
        // are one row of one shape rather than three sizes that nearly match.
        minHeight: "var(--tap)",
        minWidth: "var(--tap)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-pill)",
        background: "var(--surface-2)",
        color: "var(--text)",
        textDecoration: "none",
      }}
    >
      <Icon name="trophy" />
    </a>
  );
}

/**
 * Day / night, as one pill beside the language toggle.
 *
 * One tap, one result - the same language the rest of this app speaks. There
 * is deliberately no settings screen: a screen for two switches is a screen a
 * five-year-old has to learn to leave.
 *
 * It shows the theme it will switch TO, not the one you are in, because the
 * glyph is a button label rather than a status readout. Its `aria-label` says
 * so in words, since a sun on its own is ambiguous either way.
 */
function ThemeToggle({ locale, onTap }: { locale: AppLocale; onTap: () => void }) {
  const [theme, setTheme] = useTheme();
  const next = themeById(theme === "night" ? "market" : "night");
  return (
    <button
      aria-label={`${textFor({ he: "ערכת נושא", en: "Theme", es: "Tema" }, locale)}: ${textFor(next.label, locale)}`}
      onClick={() => {
        onTap();
        setTheme(next.id);
      }}
      style={{
        // No horizontal padding: minWidth already holds the 48px tap target,
        // and on a narrow header every pixel here comes out of the title.
        minHeight: "var(--tap)",
        minWidth: "var(--tap)",
        padding: 0,
        flexShrink: 0,
        borderRadius: "var(--radius-pill)",
        border: "none",
        background: "var(--surface-2)",
        color: "var(--text)",
        fontSize: 18,
        lineHeight: 1,
      }}
    >
      <span aria-hidden="true">{next.glyph}</span>
    </button>
  );
}

/**
 * Drawn art, or the old emoji. Shows the style it will switch TO, same as the
 * theme pill beside it - a toggle that shows its current state leaves you
 * guessing what pressing it does.
 */
function CardStyleToggle({ locale, onTap }: { locale: AppLocale; onTap: () => void }) {
  const [style, setStyle] = useCardStyle();
  const t = makeT(locale);
  const next: CardStyle = style === "art" ? "emoji" : "art";
  // These three were a he/en ternary on a screen that already speaks eleven
  // languages, so an Arabic or Russian reader got two English words in the
  // middle of their own home screen. Chrome belongs in the dictionary.
  const label = next === "art" ? t("cardsPictures") : t("cardsIcons");
  return (
    <button
      aria-label={`${t("cards")}: ${label}`}
      onClick={() => {
        onTap();
        setStyle(next);
      }}
      // The RAIL item's shape, not the header pill's - it lives in that strip
      // now, and a 48px round pill among 64px two-line cards reads as a stray
      // control rather than as the last item in a row.
      style={{
        flex: "0 0 auto",
        minWidth: "var(--tap-kids)",
        minHeight: "var(--tap-kids)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: "6px 10px",
        border: "none",
        borderRadius: "var(--radius-2)",
        background: "var(--surface)",
        color: "var(--text)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      {/* The glyph is the destination too: a palette means "switch to the
          drawings", a smiley means "switch back to the icons". */}
      <span style={{ fontSize: 26, lineHeight: 1 }} aria-hidden="true">
        {next === "art" ? "🎨" : "🙂"}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)" }}>{label}</span>
    </button>
  );
}

/**
 * Today's puzzle - one game, chosen by the date, the same on every device.
 *
 * A REAL LINK to that game's own page, like every other card here, so it is
 * shareable, middle-clickable and reachable with Back. There is nothing special
 * about the destination: the game is itself, and `ctx.daily` inside it knows it
 * is today's puzzle. The alternative - a `?daily=1` route - would give one game
 * two behaviours and every game a branch to get wrong.
 *
 * It shows the game's own ART and its own name rather than hiding them behind a
 * mystery box. A four-year-old decides whether to tap by looking at the picture,
 * and "find out what today's game is" is a reading-age idea.
 */
function DailyCard({ locale, onTap }: { locale: AppLocale; onTap: () => void }) {
  const t = makeT(locale);
  const [daily, setDaily] = useState<DailyStateV1>(() => dailyStreak.read());
  useEffect(() => dailyStreak.subscribe(setDaily), []);

  // After the hooks, never before them.
  const meta = todaysGame();
  if (!meta) return null;

  const done = daily.last === todayKey();
  const title = textFor(meta.title, locale);

  return (
    <a
      href={gameHref(meta.id, pageLocaleFor(locale))}
      onClick={onTap}
      aria-label={`${t("dailyPuzzle")}: ${title}${done ? `, ${t("dailyDone")}` : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "calc(100% - 8px)",
        margin: "0 4px 12px",
        padding: 10,
        border: "none",
        borderRadius: "var(--radius-3)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
        color: "var(--text)",
        textAlign: "start",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          flex: "0 0 68px",
          width: 68,
          height: 68,
          borderRadius: "var(--radius-2)",
          overflow: "hidden",
          display: "block",
        }}
        aria-hidden="true"
      >
        <GameArt id={meta.id} emoji={meta.emoji} height="100%" />
      </span>
      {/* `minWidth: 0` so a long game name ellipses instead of pushing the pill
          off the card - the same flex trap the header carries a note about. */}
      <span style={{ flex: 1, minWidth: 0, display: "block" }}>
        <strong
          style={{ display: "block", color: "var(--text-dim)", fontSize: 13, fontWeight: 800 }}
        >
          <span aria-hidden="true">🔥</span> {t("dailyPuzzle")}
        </strong>
        <span
          style={{
            display: "block",
            fontFamily: '"Fredoka", var(--font)',
            fontSize: 20,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </span>
      </span>
      <span
        style={{
          flex: "0 0 auto",
          background: done ? "var(--surface-2)" : "var(--brand)",
          color: done ? "var(--text-dim)" : undefined,
          borderRadius: "var(--radius-pill)",
          padding: "9px 15px",
          fontWeight: 800,
          fontSize: 14,
        }}
      >
        {/* Finished today reads as a receipt, not a lock. The card still opens
            the game - a child who wants to play it again may. */}
        {done ? t("dailyDone") : t("play")}
      </span>
    </a>
  );
}

/** The world, showing the child's REAL room rather than a generic illustration. */
function WorldHero({
  profile,
  locale,
  onTap,
}: {
  profile: ProfileV1;
  locale: AppLocale;
  onTap: () => void;
}) {
  const t = makeT(locale);
  return (
    <a
      href={worldHref(pageLocaleFor(locale))}
      onClick={onTap}
      aria-label={t("world")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "calc(100% - 8px)",
        margin: "0 4px 20px",
        padding: 14,
        border: "none",
        borderRadius: "var(--radius-3)",
        background: "linear-gradient(135deg, var(--surface-2), var(--surface) 65%)",
        boxShadow: "var(--shadow-1)",
        color: "var(--text)",
        textAlign: "start",
        textDecoration: "none",
      }}
    >
      <div style={{ flex: "0 0 92px", width: 92 }}>
        <Scene equipped={profile.equipped} size="92px" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontFamily: '"Fredoka", var(--font)', fontSize: 21, display: "block" }}>
          {t("world")}
        </strong>
        <span style={{ color: "var(--text-dim)", fontSize: 13.5 }} dir="auto">
          {/* Before the first coin this is an INVITATION, not a balance. Showing
              "0 coins" to a child who has not played yet reads as a debt.

              COINS ONLY, since 2026-08-24. The bar directly above this card
              prints the star count, so a star total here was the same number
              twice on one screen, about 90px apart.

              Coins are this card's own subject: `RewardsPort` has no `spend()`
              at all, by design, so the World screen is the ONE place in the
              whole app where a coin is spent. This line is that room's price
              tag.

              Stars are NOT irrelevant to the room - outfit_space, hat_crown
              and pet_dragon gate on 5, 10 and 20 of them - so the tidy story
              ("the room has nothing to do with stars") would be false. They
              are simply not needed on the DOOR: `/world/` mounts
              `<WalletChip bare />`, which draws coins AND stars, and a locked
              item draws its own star requirement beside itself. The count is
              one tap away, on the screen where it decides something, next to
              the thing it decides. */}
          {profile.coins > 0 ? `${t("coins")}: ${profile.coins}` : t("worldInvite")}
        </span>
      </div>
      <span
        style={{
          background: "var(--brand)",
          borderRadius: "var(--radius-pill)",
          padding: "9px 15px",
          fontWeight: 800,
          fontSize: 14,
          flex: "0 0 auto",
        }}
      >
        {t("enterWorld")}
      </span>
    </a>
  );
}

function CategoryRail({
  chips,
  value,
  onChange,
  locale,
  allLabel,
  trailing,
}: {
  chips: typeof CATEGORY_ORDER;
  value: Filter;
  onChange: (f: Filter) => void;
  locale: AppLocale;
  allLabel: string;
  trailing?: React.ReactNode;
}) {
  const t = makeT(locale);
  const btn = (id: Filter, glyph: string, label: string) => {
    const on = value === id;
    return (
      <button
        key={id}
        aria-pressed={on}
        aria-label={label}
        onClick={() => {
          audioPort.play("tap");
          onChange(id);
        }}
        style={{
          flex: "0 0 auto",
          minWidth: "var(--tap-kids)",
          minHeight: "var(--tap-kids)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          padding: "6px 10px",
          border: "none",
          borderRadius: "var(--radius-2)",
          background: on ? "var(--brand)" : "var(--surface)",
          color: "var(--text)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <span style={{ fontSize: 26, lineHeight: 1 }} aria-hidden="true">
          {glyph}
        </span>
        <span
          style={{ fontSize: 11, fontWeight: 700, color: on ? "var(--on-brand)" : "var(--text-dim)" }}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div
      className="ellaz-rail"
      style={{ display: "flex", gap: 9, overflowX: "auto", padding: "2px 4px 14px" }}
    >
      {btn(ALL, "🎲", allLabel)}
      {chips.map((c) => btn(c.category, c.glyph, t(c.titleKey)))}
      {/* INSIDE the scroller, not beside it. Sitting it next to the rail as a
          flex sibling narrows the scroll region and parks a 48px pill over the
          rail's own scrolling edge - measured on the artifact at 390px, the
          last chip renders half-hidden behind it with nothing overflowing
          anywhere for a width check to find. In here it is one more item in a
          strip of grid controls: which games, then how they are drawn. */}
      {trailing}
    </div>
  );
}

function RecentCard({
  entry,
  locale,
  onTap,
}: {
  entry: CatalogEntry;
  locale: AppLocale;
  onTap: () => void;
}) {
  const { meta } = entry;
  return (
    <a
      href={gameHref(meta.id, pageLocaleFor(locale))}
      onPointerEnter={() => void entry.load().catch(() => {})}
      onClick={onTap}
      style={{
        flex: "0 0 auto",
        width: 132,
        border: "none",
        borderRadius: "var(--radius-3)",
        padding: 0,
        overflow: "hidden",
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
        textAlign: "center",
        display: "block",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <GameArt id={meta.id} emoji={meta.emoji} height={92} />
      <span
        style={{
          // display:block matters: a button's children are inline by default, so
          // the label would size to its text and clip the longer Hebrew names.
          display: "block",
          width: "100%",
          padding: "8px 6px",
          fontWeight: 800,
          fontSize: 14,
          background: meta.color,
          // Derived, not fixed: one ink cannot serve twenty-one accents. See
          // ui/ink.ts - a hardcoded dark ink here read at 3.23:1 on
          // minesweeper's slate and 3.49:1 on sequence's violet.
          color: inkFor(meta.color),
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {textFor(meta.title, locale)}
      </span>
    </a>
  );
}

function GameCard({
  entry,
  locale,
  stars,
  onTap,
  t,
}: {
  entry: CatalogEntry;
  locale: AppLocale;
  stars: number;
  onTap: () => void;
  t: (k: string) => string;
}) {
  const { meta } = entry;
  const [cardStyle] = useCardStyle();
  const prefetch = () => void entry.load().catch(() => {});
  return (
    <a
      href={gameHref(meta.id, pageLocaleFor(locale))}
      onPointerEnter={prefetch}
      onTouchStart={prefetch}
      onClick={onTap}
      // The star count belongs in the label, not just the picture: a screen
      // reader announcing only the game name would lose the progress entirely.
      aria-label={
        stars > 0
          ? `${textFor(meta.title, locale)}, ${stars} ${t(stars === 1 ? "starEarnedOne" : "starsEarned")}`
          : `${textFor(meta.title, locale)}, ${t("noStarsYet")}`
      }
      style={{
        border: "none",
        borderRadius: "var(--radius-3)",
        padding: 0,
        overflow: "hidden",
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
        textAlign: "center",
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <span
        // Logical inset, so the badge sits on the leading edge in both Hebrew
        // RTL and English LTR rather than jumping corners between locales.
        style={{
          position: "absolute",
          top: 7,
          // Logical inset, so the badge sits on the leading edge in both Hebrew
          // RTL and English LTR rather than jumping corners between locales.
          insetInlineStart: 7,
          // The dark pill is EARNED. An unearned slot is a bare outline star,
          // because a filled disc on all sixteen cards reads to a new player as
          // smudges on the screen rather than as empty slots to collect.
          background: stars > 0 ? "var(--badge-fill)" : "transparent",
          borderRadius: "var(--radius-pill)",
          padding: stars > 0 ? "2px 8px" : "2px 4px",
          fontSize: 12,
          fontWeight: stars > 0 ? 800 : 600,
          opacity: stars > 0 ? 1 : 0.3,
          textShadow: stars > 0 ? "none" : "var(--badge-glow)",
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          zIndex: 1,
        }}
        aria-hidden="true"
        dir="ltr"
      >
        {/* Solid when earned, hollow when not - the same distinction the
            emoji pair carried, now in one drawing that renders identically on
            every device instead of two characters the OS picks for itself. */}
        <Icon name="star" filled={stars > 0} />
        {stars > 0 ? stars : null}
      </span>
      {/* The art carries its own ground, so the `.ellaz-tint` wash that used to
          sit behind the emoji is gone here - two backgrounds fighting under one
          picture is just mud. A game with no art still gets the wash, because
          an emoji on bare card stock is what the tint existed to rescue. */}
      {showsArt(meta.id, cardStyle) ? (
        <span style={{ flex: 1, minHeight: 0, overflow: "hidden" }} aria-hidden="true">
          <GameArt id={meta.id} emoji={meta.emoji} height="100%" />
        </span>
      ) : (
        <span
          className="ellaz-tint"
          // `--game` is set HERE and the recipe lives in the theme (.ellaz-tint
          // in global.css). It cannot be the other way round: a var() inside a
          // custom property resolves where it is declared, and --game does not
          // exist at :root.
          style={
            {
              flex: 1,
              display: "grid",
              placeItems: "center",
              fontSize: 42,
              "--game": meta.color,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          {meta.emoji}
        </span>
      )}
      <span
        style={{
          padding: "7px 4px",
          fontWeight: 800,
          fontSize: 13.5,
          background: meta.color,
          color: inkFor(meta.color),
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {textFor(meta.title, locale)}
      </span>
    </a>
  );
}
