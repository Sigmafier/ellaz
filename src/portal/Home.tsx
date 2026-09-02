import { useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
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
import { openReport } from "./openReport";
import { inkFor } from "@ui/ink";
import { Icon } from "@ui/icons";
import { GameArt, showsArt } from "@ui/gameArtView";
import { useCardStyle } from "@ui/useCardStyle";
import type { CardStyle } from "@ui/cardStyle";
import { useTheme } from "@ui/useTheme";
import { themeById } from "@ui/themes";
import { attachShellJuice } from "@juice/index";
import { LanguagePicker } from "@ui/LanguagePicker";
import { HEADER_PILL } from "@ui/headerPill";
import { WalletChip } from "./WalletChip";
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
          {/* `0 1 auto`, not `1 1 auto` - operator pick, arm P, 2026-08-25.
              At `1 1 auto` this block GREW to hold a ~60px word: measured on
              the built page at 390px it claimed 310 of the 358 available, which
              is why removing controls from the bar changed its height by
              exactly zero. `minWidth: 0` stays, because a flex item's default
              `min-width: auto` refuses to shrink below its own content - which
              is what let the title push the controls off the screen instead of
              the row wrapping. The wrap above does nothing without it. */}
          <div style={{ flex: "0 1 auto", minWidth: 0 }}>
            {/* The size is a CLASS - 18px on a phone, 24px from 560px up - and
                an inline `fontSize` here would beat the media query that does
                it. The WORD ITSELF never goes: operator, 2026-08-25, "must
                keeop the elllaz logo and text". */}
            <h1 className="ellaz-wordmark">{t("appName")}</h1>
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
            {/* COINS AND STARS. Operator ruling 2026-08-25, reversing the
                stars-only ruling of the day before - and the width argument
                that had been recorded beside it was measured and found to
                blame the wrong control. Re-measured live at 390px, changing
                ONE variable at a time:

                    stars  0  ->  header  76px   ONE row
                    stars 24  ->  header 122px   TWO rows   <- coins not in it
                    stars  5  ->  header  76px   ONE row    (reverses cleanly)

                The wrap is the STAR count reaching two digits, not the coin
                half. With coins restored at 320px on a four-digit balance:
                nothing wider than the header, nothing clipped inside its own
                box, no horizontal overflow. The wrapper below is what absorbs
                it, and it was already doing that job.

                See .claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md -
                a measurement recorded without its one-variable control is a
                hypothesis that reads like a finding. */}
            <WalletChip coinsOnly />
            {/* NO STREAK CHIP HERE. Operator ruling 2026-08-25: "remove the
                streak fire icon from the header, we dont need it there."

                It stood beside the wallet and rendered only once there was a
                streak to show, so most visits never saw it - which is also why
                it is a DELETION FROM THIS BAR and not from the app. The daily
                card below still carries the streak, and the game page's own
                header still draws it `bare`; nothing about the feature, the
                storage or the rotation changed.

                The bar it left is the one-line bar of arm P, and every control
                in it is now something a player can ACT on: coins, the
                leaderboards, the language, the theme. A number that appears
                and disappears on its own was the odd one out. */}
            {/* The leaderboards, back in the bar. Operator ruling 2026-08-24,
                after the trophy had been removed from it earlier the same day:
                "i dont see the leaderbors icon in header".

                It is a LINK, not a button, so middle-click and long-press
                behave - the same reason the game cards are anchors. It is
                always-on by construction, which is exactly what the gated card
                below the room used to be for, so for a day the two overlapped
                and a player who had played something saw the leaderboards
                twice. Operator ruling 2026-08-25: "only icon in header". The
                card is gone; THIS is the way to /boards/ from the home screen.

                Which makes one thing load-bearing rather than incidental: the
                emitted home shell in `sitePages.ts` carries its own /boards/
                link, removed on mount, and that is now the ONLY inbound link a
                crawler or a no-JavaScript visitor can follow. Removing it
                orphans the screen. */}
            <a
              href={boardsHref(pageLocaleFor(locale))}
              onClick={tap}
              aria-label={t("boards")}
              // The same square the two pills beside it hold, so the row reads
              // as one set of controls rather than three sizes - and now
              // literally the same object, so it cannot stop being true.
              style={HEADER_PILL}
            >
              <Icon name="trophy" />
            </a>
            <LanguagePicker locale={locale} onPick={onPickLocale} onTap={tap} />
            <ThemeToggle locale={locale} onTap={tap} />
          </div>
        </header>

        {/* THE ROOM FIRST, then today's puzzle, then the games. Operator
            ruling 2026-08-24: "then my world then games". The boards card
            follows, on its own gate - see the comment on it below. */}
        <WorldHero profile={profile} locale={locale} onTap={tap} />

        <DailyCard locale={locale} onTap={tap} />

        {/* SHARING LEFT THIS SCREEN. Operator ruling 2026-08-25: "the share
            card in homepage shouldmove from here. we should add per game share
            options instead."

            What stood here was a DAILY DIGEST - it shared the site root with a
            list of what had been played today, which is a thing about the
            player rather than a thing about a game. The share is now one button
            on each game's own utility row (`gamePage.ts` emits it, `wireShare`
            in `PageApp.tsx` opens the sheet), and what it sends is an invite to
            THAT game at THAT game's URL. */}

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
        {/* The reporter's home-screen door.
            IN THE TRAILING SHELF, not the header. It is platform chrome and it
            is on every screen, but this screen's header belongs to a child -
            coins, trophies, language, theme - and a fifth pill there is one
            more thing to tap for somebody who cannot read yet. The person who
            reports a bug is an adult, and adults read the bottom of a page.
            The three emitted screens carry the same door on their utility row,
            which is where their adult chrome already lives.

            A real <button>, because it asks: see
            .claude/rules/a-control-that-carries-an-imperative-must-be-a-control.md */}
        <p style={{ textAlign: "center", marginTop: 4 }}>
          <button
            type="button"
            onClick={() => void openReport({ locale })}
            style={{
              background: "none",
              border: 0,
              padding: "0 8px",
              minHeight: "var(--tap)",
              color: "var(--text-dim)",
              font: "600 13px var(--font)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              cursor: "pointer",
            }}
          >
            {t("reportHome")}
          </button>
        </p>
      </div>
    </div>
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
 * icon is a button label rather than a status readout. Its `aria-label` says
 * so in words, since a sun on its own is ambiguous either way.
 *
 * It draws from `@ui/icons` like every other control in this bar. It used to
 * render `next.glyph` - the characters U+2600 and U+263E - so the machine's
 * font decided the weight, and the result sat beside a 2.1 round-capped star
 * and globe looking like it came from somewhere else. It did.
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
      // THE SHARED PILL, and this button is why it exists. Hand-written, this
      // block omitted display/alignItems/justifyContent, so the moon rendered
      // 15px LEFT of centre on every screen size while its two neighbours were
      // centred. See @ui/headerPill.
      style={HEADER_PILL}
    >
      <Icon name={next.icon} />
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

/**
 * "This game is still being built", on the card, before the player taps it.
 *
 * ONE WORD, AND THE PAGE CARRIES THE SENTENCE. The badge on the game's own
 * page reads "Beta" with the whole translated note beside it for a screen
 * reader, and that costs a first visit NOTHING because `src/build` ships to
 * nobody. Here, every character is in the shell chunk every child downloads
 * before choosing anything - so this one says the word and stops, and the
 * explanation waits for the page the tap leads to. Measured: the sentence in
 * three languages plus a title, an aria-label and a role was 293 B gz; the
 * word alone is a fraction of it, on a budget with about five games of room.
 *
 * The word is INLINE rather than an i18n key for the same reason: `makeT` keys
 * ride in all eleven lazy locale chunks, `textFor` reads three strings once.
 *
 * It is on the GRID card and nowhere else among the three. The daily card and
 * the keep-playing rail are both about a game the player has already met - and
 * the game's own PAGE carries the badge whatever route they arrived by, which
 * is the guarantee that actually matters. This one is the courtesy of saying
 * so before they spend a tap.
 *
 * No `dir` here, unlike the star badge beside it: that one pins LTR because it
 * holds a DIGIT next to a glyph and the pair reorders, while this is one word
 * with no digits, which renders the same either way - and pinning LTR would be
 * pinning the wrong direction for the Hebrew word.
 */
function BetaPill({ locale }: { locale: AppLocale }) {
  return (
    <span className="ellaz-beta">{textFor({ en: "Beta", he: "בטא", es: "Beta" }, locale)}</span>
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
        style={{
          position: "absolute",
          top: 7,
          // A logical inset that DOES NOT FLIP, and the reason is the `dir` on
          // this same element ten lines down. An element's logical insets
          // resolve against its OWN direction, so `dir="ltr"` pins this badge
          // physically LEFT in every locale - Hebrew included.
          //
          // The comment that stood here said the opposite, twice, in the same
          // declaration: that the logical inset kept the badge on the leading
          // edge in both directions. Measured on the artifact at 390px, the
          // Hebrew card puts this at [270,290] and the card at [263,374] - the
          // LEFT corner, which is Hebrew's trailing edge. It has behaved that
          // way since the `dir` was added; the comment was describing the
          // intention.
          //
          // Left in place rather than "fixed", because moving it is a visual
          // change to 34 cards that nobody asked for and the digit still needs
          // its `dir`. What it forces is that the BETA badge beside it is
          // pinned PHYSICALLY right (see .ellaz-beta in global.css): a logical
          // inset there flips under Hebrew and lands both badges in this one
          // corner, which is exactly what shipped for the length of one build.
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
      {meta.beta ? <BetaPill locale={locale} /> : null}
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
