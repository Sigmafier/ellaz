import { useEffect, useState } from "react";
import type { Locale } from "@i18n/index";
import { makeT } from "@i18n/index";
import { CATALOG, CATEGORY_ORDER, findEntry, type CatalogEntry } from "./catalog";
import { audioPort, speechPort, wallet, type Category, type ProfileV1 } from "@sdk/index";
import { boardsHref, gameHref, worldHref } from "./paths";
import { WalletChip } from "./WalletChip";
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

export function Home({
  locale,
  onToggleLocale,
}: {
  locale: Locale;
  onToggleLocale: () => void;
}) {
  const t = makeT(locale);
  const [profile, setProfile] = useState<ProfileV1>(() => wallet.snapshot());
  const [filter, setFilter] = useState<Filter>(ALL);

  // The wallet is the source of truth for stars, coins, the equipped room AND
  // what was played last, so one subscription feeds every part of this screen.
  useEffect(() => wallet.subscribe(setProfile), []);

  const shown = filter === ALL ? CATALOG : CATALOG.filter((e) => e.meta.category === filter);

  // Only categories that actually have a game are offered. A chip that filters
  // to an empty grid is a dead end, and an empty grid gives a child no way back.
  const chips = CATEGORY_ORDER.filter((c) => CATALOG.some((e) => e.meta.category === c.category));

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

  return (
    <div className="ellaz-scroll" style={{ flex: 1 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "8px 16px 32px" }}>
        <header
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px 16px" }}
        >
          <div style={{ fontSize: 40 }} aria-hidden="true">
            🎮
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 30, lineHeight: 1 }}>{t("appName")}</h1>
            <div style={{ color: "var(--text-dim)", fontSize: 14 }}>{t("tagline")}</div>
          </div>
          <WalletChip />
          <button
            aria-label={t("language")}
            onClick={onToggleLocale}
            style={{
              minHeight: "var(--tap)",
              padding: "0 16px",
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {locale === "he" ? "EN" : "עב"}
          </button>
          {/* Dev-only door to the Juice Lab. `import.meta.env.DEV` is statically
              false in a production build, so Rollup drops this whole block and
              no player ever sees it - the same dev-bypass idiom the PWA config
              uses. It exists because a route you can only reach by typing the
              hash has no way to tell you when it failed to load. */}
          {import.meta.env.DEV ? (
            <a
              href="#/lab"
              style={{
                minHeight: "var(--tap)",
                display: "inline-flex",
                alignItems: "center",
                padding: "0 16px",
                borderRadius: "var(--radius-pill)",
                background: "var(--surface-2)",
                color: "var(--text)",
                fontWeight: 800,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              🎛
            </a>
          ) : null}
        </header>

        <WorldHero profile={profile} locale={locale} onTap={tap} />

        {/* The boards, and only once there is something to be on.
            A first visit is for games. A leaderboard link on a home screen
            nobody has played yet leads to "play a game and you'll show up
            here", which is honest and is still clutter in front of a child
            choosing their first game. It appears the moment it means
            something. Deliberately NOT nested inside the room card above:
            an <a> inside an <a> is invalid and browsers close the outer one
            mid-DOM, which would take the room card apart. */}
        {recent.length > 0 && (
          <a
            href={boardsHref(locale)}
            onClick={tap}
            style={{
              display: "block",
              width: "calc(100% - 8px)",
              margin: "0 4px 20px",
              padding: "11px 14px",
              borderRadius: "var(--radius-3)",
              background: "var(--surface-2)",
              boxShadow: "var(--shadow-1)",
              color: "var(--text)",
              textDecoration: "none",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            <span aria-hidden="true">🏆</span> {t("boards")}
          </a>
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

        <CategoryRail
          chips={chips}
          value={filter}
          onChange={setFilter}
          locale={locale}
          allLabel={t("allCategories")}
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

/** The world, showing the child's REAL room rather than a generic illustration. */
function WorldHero({
  profile,
  locale,
  onTap,
}: {
  profile: ProfileV1;
  locale: Locale;
  onTap: () => void;
}) {
  const t = makeT(locale);
  return (
    <a
      href={worldHref(locale)}
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
              "0 coins" to a child who has not played yet reads as a debt. */}
          {profile.coins > 0
            ? `${t("coins")}: ${profile.coins} · ${t("stars")}: ${profile.stars}`
            : t("worldInvite")}
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
}: {
  chips: typeof CATEGORY_ORDER;
  value: Filter;
  onChange: (f: Filter) => void;
  locale: Locale;
  allLabel: string;
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
        <span style={{ fontSize: 11, fontWeight: 700, color: on ? "#fff" : "var(--text-dim)" }}>
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
    </div>
  );
}

function RecentCard({
  entry,
  locale,
  onTap,
}: {
  entry: CatalogEntry;
  locale: Locale;
  onTap: () => void;
}) {
  const { meta } = entry;
  return (
    <a
      href={gameHref(meta.id, locale)}
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
      <span style={{ display: "block", fontSize: 46, padding: "14px 0 6px" }} aria-hidden="true">
        {meta.emoji}
      </span>
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
          color: "#1b1b2b",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {meta.title[locale]}
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
  locale: Locale;
  stars: number;
  onTap: () => void;
  t: (k: string) => string;
}) {
  const { meta } = entry;
  const prefetch = () => void entry.load().catch(() => {});
  return (
    <a
      href={gameHref(meta.id, locale)}
      onPointerEnter={prefetch}
      onTouchStart={prefetch}
      onClick={onTap}
      // The star count belongs in the label, not just the picture: a screen
      // reader announcing only the game name would lose the progress entirely.
      aria-label={
        stars > 0
          ? `${meta.title[locale]}, ${stars} ${t(stars === 1 ? "starEarnedOne" : "starsEarned")}`
          : `${meta.title[locale]}, ${t("noStarsYet")}`
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
          background: stars > 0 ? "rgba(6, 8, 20, 0.72)" : "transparent",
          borderRadius: "var(--radius-pill)",
          padding: stars > 0 ? "2px 8px" : "2px 4px",
          fontSize: 12,
          fontWeight: stars > 0 ? 800 : 600,
          opacity: stars > 0 ? 1 : 0.3,
          textShadow: stars > 0 ? "none" : "0 1px 2px rgba(0,0,0,.7)",
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          zIndex: 1,
        }}
        aria-hidden="true"
        dir="ltr"
      >
        {stars > 0 ? `⭐${stars}` : "☆"}
      </span>
      <span
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          fontSize: 42,
          background: `radial-gradient(120px 90px at 50% 30%, ${meta.color}33, transparent), var(--surface)`,
        }}
        aria-hidden="true"
      >
        {meta.emoji}
      </span>
      <span
        style={{
          padding: "7px 4px",
          fontWeight: 800,
          fontSize: 13.5,
          background: meta.color,
          color: "#1b1b2b",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {meta.title[locale]}
      </span>
    </a>
  );
}
