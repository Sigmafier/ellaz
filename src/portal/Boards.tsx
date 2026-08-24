import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@i18n/index";
import type { AppLocale } from "@i18n/locales";
import { backArrow, makeT, pageLocaleFor, textFor } from "@i18n/index";
import {
  allScores,
  audioPort,
  betterThan,
  boardStanding,
  cloudIdentity,
  formatScore,
  myPlacings,
  ownBest,
  pooledPlayers,
  pooledTables,
  readRecords,
  recordKey,
  renderName,
  standingView,
  windowsFor,
  youLine,
  wallet,
  type BoardStanding,
  type BoardWindow,
  type Placing,
  type PooledRow,
  type ScoreUnit,
  type YouLine,
} from "@sdk/index";
import { IconButton } from "@ui/components";
import { DifficultySelector } from "@ui/DifficultySelector";
import { GameArt } from "@ui/gameArtView";
import { inkFor } from "@ui/ink";
import { catalog, ensureFullCatalog, subscribeCatalog } from "./catalog";
import { cardBest, firstBoard, myGames, type Playable } from "./boardsView";
import { gameHref } from "./paths";

// The boards — the one screen where a child sees that other people are here.
//
// It is built around a rule rather than around a ranking: NO CHILD IS EVER
// SHOWN AS LAST. `standingView` in the SDK decides what may be said about a
// player's position, and this screen renders whichever of the three answers it
// gives back. Nothing here recomputes a position, and nothing here may.
//
// The names are two words from a fixed list, so a public board carries nothing
// a child typed and nothing that identifies them. That is what makes it safe to
// show at all, and it is why the name pool has no free-text escape hatch.
//
// TWO SCREENS, AND WHY IT IS NOT ONE
// It opens on the player's own games as cards, each already carrying their
// best, and a tap opens that game's board. The single-page version it replaces
// laid every game out in one non-wrapping row: 1,410px of buttons inside a
// 390px phone, clipped by the frame's own `overflow: hidden`, with no scroll
// and no wrap — so 15 of 20 games were not merely awkward to reach, they were
// unreachable. Three identically-styled pill rows sat above it, none of them
// saying what they picked.
//
// The grid also earns the first screen: a control panel tells a player nothing
// until they operate it, while twenty cards with their own records on them are
// already an answer. And every board now has a way back INTO the game, which
// is the thing a leaderboard is for.
//
// WHICH BOARD, AND IN WHAT UNIT
// Both have to come from somewhere other than this file. A game scopes its
// record per difficulty inside its own renderer, which the portal can never
// import — so the boards a player HAS are read back out of their own record
// keys, and what the number MEASURES is read off the game's DOM-free meta,
// where `score-unit-declared.test.ts` pins it to the renderer. Guessing either
// one shows a fast time ranked as if slow were better.

const WINDOWS: { id: BoardWindow; label: Record<Locale, string> }[] = [
  { id: "d", label: { he: "היום", en: "Today", es: "Hoy" } },
  { id: "w", label: { he: "השבוע", en: "This week", es: "Esta semana" } },
  { id: "m", label: { he: "החודש", en: "This month", es: "Este mes" } },
  { id: "all", label: { he: "תמיד", en: "All time", es: "Siempre" } },
];

/**
 * Board ids are a game's own difficulty ids, so most of the catalog shares a
 * handful. An id with no entry renders as itself rather than as a blank — an
 * honest raw label beats a missing one, and it is also how a new difficulty
 * announces that it wants a translation.
 */
const BOARD_LABELS: Record<string, Record<Locale, string>> = {
  default: { he: "הכול", en: "All", es: "Todo" },
  easy: { he: "קל", en: "Easy", es: "Fácil" },
  medium: { he: "בינוני", en: "Med", es: "Media" },
  hard: { he: "קשה", en: "Hard", es: "Difícil" },
  expert: { he: "מומחה", en: "Expert", es: "Experto" },
  kids4: { he: "חיות 4×4", en: "Animals 4×4", es: "Animales 4×4" },
  kids6: { he: "חיות 6×6", en: "Animals 6×6", es: "Animales 6×6" },
};

function boardLabel(board: string): Record<Locale, string> {
  return BOARD_LABELS[board] ?? { he: board, en: board, es: board };
}

/** The three screens under the tab row. `games` is where the player lands. */
type BoardsTab = "games" | "standings" | "medals";

const TAB_LABELS: { id: BoardsTab; label: Record<Locale, string> }[] = [
  { id: "games", label: { he: "המשחקים שלי", en: "Your games", es: "Tus juegos" } },
  { id: "standings", label: { he: "דירוג", en: "Standings", es: "Posiciones" } },
  { id: "medals", label: { he: "מדליות", en: "Medals", es: "Medallas" } },
];

export function Boards({ locale }: { locale: AppLocale }) {
  const t = makeT(locale);
  // Read once per mount. The wallet and the record store both change only when
  // a game is played, and no game is playable from this screen.
  // Recomputed when the rest of the catalogue lands, never captured once. The
  // shell carries metadata for the games above the fold only, and a player's
  // records are spread across the WHOLE roster - so a one-shot `useState` here
  // would quietly show a player only the games that happen to be in the shell,
  // with no error and a screen that looks complete.
  const metas = () => catalog().map((e) => e.meta);
  const [games, setGames] = useState(() =>
    myGames(wallet.recentlyPlayed(), metas(), readRecords()),
  );
  const [allMetas, setAllMetas] = useState(metas);
  useEffect(() => {
    const stop = subscribeCatalog(() => {
      setGames(myGames(wallet.recentlyPlayed(), metas(), readRecords()));
      setAllMetas(metas());
    });
    void ensureFullCatalog();
    return stop;
  }, []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<BoardsTab>("games");
  // Fetched once, lazily - not until the reader actually asks to see it. Both
  // pooled screens rank from this SAME read (see pooled.ts), so switching
  // between them is free.
  //
  // The dependency is the BOOLEAN, never `tab` and never `pooled.kind`, and
  // both of those are traps that render an identical screen:
  //
  //   - on `pooled.kind`: `setPooled({kind:"loading"})` changes the dependency,
  //     so React re-runs the effect and fires the FIRST run's cleanup. `alive`
  //     goes false, the fetch resolves into a dead closure, and the screen sits
  //     on its loading dots forever - with the request having returned 200.
  //   - on `tab`: standings -> medals is a dependency change too, so a reader
  //     switching tabs mid-flight cancels the read they are waiting for.
  //
  // `wantsPooled` is true for BOTH pooled tabs, so it flips false -> true once
  // and stays put while the reader moves between them.
  const wantsPooled = tab !== "games";
  const [pooled, setPooled] = useState<PooledLoad>({ kind: "idle" });
  const [myUid, setMyUid] = useState<string | null>(null);
  useEffect(() => {
    if (!wantsPooled) return;
    setPooled({ kind: "loading" });
    let alive = true;
    void (async () => {
      const [identity, res] = await Promise.all([cloudIdentity(), allScores()]);
      if (!alive) return;
      setMyUid(identity?.uid ?? null);
      setPooled(res ? { kind: "ready", rows: res.rows, truncated: res.truncated } : { kind: "offline" });
    })();
    return () => {
      alive = false;
    };
  }, [wantsPooled]);

  const game = games.find((g) => g.meta.id === openId);

  return (
    <div className="ellaz-scroll" style={{ flex: 1 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 16px 32px" }}>
        {game ? (
          <GameBoard game={game} locale={locale} t={t} onBack={() => setOpenId(null)} />
        ) : (
          <>
            <DifficultySelector
              options={TAB_LABELS}
              value={tab}
              onChange={(id) => setTab(id as BoardsTab)}
              locale={locale}
            />
            {tab === "games" ? (
              <GameGrid games={games} locale={locale} t={t} onOpen={setOpenId} />
            ) : tab === "standings" ? (
              <Standings pooled={pooled} myUid={myUid} metasAll={allMetas} locale={locale} t={t} />
            ) : (
              <Medals pooled={pooled} myUid={myUid} metasAll={allMetas} locale={locale} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Standings + Medals - where a player sees themselves against everyone else.
//
// Both read the SAME collection-group fetch (`pooled.ts`), so opening one and
// then the other costs no extra request; only the ranking differs. Nothing
// here computes a rank by hand - `pooledTables`/`myPlacings`/`pooledPlayers`
// are the single source, exactly as `standingView` is for the per-game board.
//
// Small option/label sets here follow the file's existing convention (see
// WINDOWS/BOARD_LABELS above): a local `Record<Locale, string>` resolved with
// `textFor`, rather than the global dictionary - the same shape `DifficultySelector`
// already expects, so a fourth translation file never has to move for this.
// ---------------------------------------------------------------------------

type PooledLoad =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "offline" }
  | { kind: "ready"; rows: PooledRow[]; truncated: boolean };

const POOLED_WINDOWS: { id: BoardWindow; label: Record<Locale, string> }[] = [
  { id: "all", label: { he: "תמיד", en: "All time", es: "Siempre" } },
  { id: "m", label: { he: "החודש", en: "This month", es: "Este mes" } },
  { id: "w", label: { he: "השבוע", en: "This week", es: "Esta semana" } },
];

const COPY = {
  everyone: { he: "כל השחקנים", en: "Everyone playing", es: "Todos jugando" },
  aheadOf: { he: "לפני", en: "ahead of", es: "por delante de" },
  others: { he: "אחרים", en: "others", es: "otros" },
  points: { he: "נקודות", en: "points", es: "puntos" },
  more: { he: "עוד", en: "more", es: "más" },
  gold: { he: "זהב", en: "Gold", es: "Oro" },
  silver: { he: "כסף", en: "Silver", es: "Plata" },
  bronze: { he: "ארד", en: "Bronze", es: "Bronce" },
  boardsWord: { he: "לוחות", en: "boards", es: "tableros" },
} satisfies Record<string, Record<Locale, string>>;

function PooledStatus({
  pooled,
  t,
}: {
  pooled: PooledLoad;
  t: (key: string) => string;
}): import("react").ReactElement | null {
  if (pooled.kind === "loading" || pooled.kind === "idle") {
    return <p style={{ marginTop: 18, color: "var(--text-dim)" }}>…</p>;
  }
  if (pooled.kind === "offline") {
    return <p style={{ marginTop: 18, fontSize: 14, color: "var(--text-dim)" }}>{t("boardsOffline")}</p>;
  }
  return null;
}

function Standings({
  pooled,
  myUid,
  metasAll,
  locale,
  t,
}: {
  pooled: PooledLoad;
  myUid: string | null;
  metasAll: Playable["meta"][];
  locale: AppLocale;
  t: (key: string) => string;
}) {
  const [win, setWin] = useState<BoardWindow>("all");
  const status = <PooledStatus pooled={pooled} t={t} />;
  if (pooled.kind !== "ready") return status;

  const known = new Set(metasAll.map((m) => m.id));
  const unitFor = (id: string) => metasAll.find((m) => m.id === id)?.scoreUnit;
  const tables = pooledTables(pooled.rows, { window: win, now: windowsFor(Date.now()), known, unitFor });
  const placings = myUid ? myPlacings(tables, myUid) : [];
  const shown = placings.slice(0, 10);
  const totalBeat = placings.reduce((n, p) => n + p.beat, 0);
  const totalField = placings.reduce((n, p) => n + (p.total - 1), 0);

  return (
    <>
      <DifficultySelector
        options={POOLED_WINDOWS}
        value={win}
        onChange={setWin}
        locale={locale}
      />
      {placings.length === 0 ? (
        <p style={{ marginTop: 18, fontSize: 15, color: "var(--text-dim)" }}>{t("boardsPlayToJoin")}</p>
      ) : (
        <>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: "18px 0 0",
              display: "grid",
              gap: 8,
            }}
          >
            {shown.map((p) => (
              <StandingRow key={p.board} placing={p} metasAll={metasAll} locale={locale} t={t} />
            ))}
          </ol>
          {placings.length > 10 ? (
            <p style={{ marginTop: 8, fontSize: 12.5, color: "var(--text-dim)" }}>
              {placings.length - 10} {textFor(COPY.more, locale)}
            </p>
          ) : null}
          <p
            dir="auto"
            style={{
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: "var(--radius-2)",
              background: "var(--surface-2)",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {textFor(COPY.aheadOf, locale)} {totalBeat} / {totalField} {textFor(COPY.others, locale)}
          </p>
        </>
      )}
    </>
  );
}

/**
 * One of the reader's own boards, strongest first.
 *
 * No badge and no bar when `standingView` says `own` - the same no-last-place
 * floor the per-game board applies, applied here for the identical reason: a
 * board where the honest answer is "near the bottom" says nothing about
 * position rather than saying it kindly.
 */
function StandingRow({
  placing: p,
  metasAll,
  locale,
  t,
}: {
  placing: Placing;
  metasAll: Playable["meta"][];
  locale: AppLocale;
  t: (key: string) => string;
}) {
  const meta = metasAll.find((m) => m.id === p.game);
  // `better` is how many did BETTER — `rank - 1`. NOT `total - rank`, which is
  // `beat`, the count they are ahead of. Passing that inverts the board: a
  // first-of-four reads as "three people beat you", `standingView` answers
  // `own`, and every badge disappears from a screen that renders perfectly.
  // Measured on the live boards — a player with 8 golds showed none.
  const view = standingView({ total: p.total, better: p.rank - 1 });
  const badge =
    view.kind === "rank" ? `#${view.rank}` : view.kind === "percentile" ? `${t("boardsTop")} ${view.top}%` : null;
  const level = p.level === "default" ? "" : ` · ${textFor(boardLabel(p.level), locale)}`;

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: "var(--radius-2)",
        background: "var(--surface-2)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      {meta ? <GameArt id={meta.id} emoji={meta.emoji} height={40} /> : null}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 15,
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {meta ? textFor(meta.title, locale) : p.game}
          {level}
        </span>
        {/* No sub-line at all when there is no standing to report. The number
            is already in the right-hand column, so `boardsYourBest` — which is
            written to be FOLLOWED by a value ("Your best:") — would render as
            a dangling colon labelling nothing. Saying less is the honest
            option here, and it is what the no-last-place rule asks for. */}
        {badge ? (
          <span style={{ display: "block", fontSize: 12.5, color: "var(--text-dim)" }} dir="auto">
            {textFor(COPY.aheadOf, locale)} {p.beat} {textFor(COPY.others, locale)}
          </span>
        ) : null}
      </span>
      <span dir="ltr" style={{ fontSize: 14, fontWeight: 800, textAlign: "end" }}>
        {badge ? <span style={{ display: "block" }}>{badge}</span> : null}
        {formatScore(p.value, p.unit)}
      </span>
    </li>
  );
}

function Medals({
  pooled,
  myUid,
  metasAll,
  locale,
  t,
}: {
  pooled: PooledLoad;
  myUid: string | null;
  metasAll: Playable["meta"][];
  locale: AppLocale;
  t: (key: string) => string;
}) {
  const status = <PooledStatus pooled={pooled} t={t} />;
  if (pooled.kind !== "ready") return status;

  const known = new Set(metasAll.map((m) => m.id));
  const unitFor = (id: string) => metasAll.find((m) => m.id === id)?.scoreUnit;
  // All-time only - the medal board is deliberately the platform's single
  // pooled ranking, not one more thing that resets on a window.
  const tables = pooledTables(pooled.rows, { window: "all", now: windowsFor(Date.now()), known, unitFor });
  const players = pooledPlayers(tables);
  const mine = myUid ? players.find((p) => p.uid === myUid) : undefined;
  const myBoards = myUid ? myPlacings(tables, myUid).length : 0;
  const view = myUid
    ? standingView({ total: players.length, better: betterThan(players, myUid) })
    : { kind: "own" as const };
  const line =
    view.kind === "rank"
      ? `${t("boardsYouAre")} #${view.rank}`
      : view.kind === "percentile"
        ? `${t("boardsTop")} ${view.top}%`
        : `${mine?.points ?? 0} ${textFor(COPY.points, locale)}`;
  // The list is the top six, plus the reader's own row when they are outside
  // it. The append is gated on `view.kind === "rank"` and not on "am I in the
  // list", because a row IS a rank stated out loud - drawing one for a reader
  // standingView deliberately declined to rank would announce 38-of-53 in the
  // one place the no-last-place rule exists to keep quiet. The rank on that
  // row is `view.rank`, never the array index: ties share a rank, so the two
  // disagree exactly when somebody is tied, and the line below already
  // committed to `view.rank`.
  const rows = players.slice(0, 6).map((p, i) => ({ p, rank: i + 1 }));
  const myIndex = myUid ? players.findIndex((p) => p.uid === myUid) : -1;
  if (view.kind === "rank" && myIndex >= rows.length) {
    rows.push({ p: players[myIndex], rank: view.rank });
  }

  return (
    <>
      <div
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: "var(--radius-3)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Medal glyph="🥇" count={mine?.gold ?? 0} label={textFor(COPY.gold, locale)} />
          <Medal glyph="🥈" count={mine?.silver ?? 0} label={textFor(COPY.silver, locale)} />
          <Medal glyph="🥉" count={mine?.bronze ?? 0} label={textFor(COPY.bronze, locale)} />
          <Medal glyph="🎮" count={myBoards} label={textFor(COPY.boardsWord, locale)} />
        </div>
      </div>

      {players.length === 0 ? (
        <p style={{ marginTop: 18, fontSize: 15, color: "var(--text-dim)" }}>{t("boardsEmpty")}</p>
      ) : (
        <>
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "var(--text-dim)",
              margin: "16px 0 7px",
            }}
          >
            {textFor(COPY.everyone, locale)}
          </p>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 8,
            }}
          >
            {rows.map(({ p, rank }) => (
              <li
                key={p.uid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: "var(--radius-2)",
                  background: p.uid === myUid ? "var(--brand)" : "var(--surface-2)",
                  boxShadow: "var(--shadow-1)",
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 800, minWidth: 24 }} dir="ltr">
                  {rank}
                </span>
                <span dir="auto" style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>
                  {nameOf(p.name, locale) ?? "—"}
                </span>
                <span dir="ltr" style={{ fontSize: 15, fontWeight: 800 }}>
                  {p.points}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      <p
        dir="auto"
        style={{
          marginTop: 14,
          padding: "12px 14px",
          borderRadius: "var(--radius-2)",
          background: "var(--surface-2)",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        {line}
      </p>
    </>
  );
}

function Medal({ glyph, count, label }: { glyph: string; count: number; label: string }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 44 }}>
      <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>
        {glyph}
      </span>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{count}</span>
      <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{label}</span>
    </span>
  );
}

/**
 * The screen a player lands on: their games, each already showing their record.
 *
 * NO back arrow, and no heading. The way out is in the page header, where it
 * is on every screen - this drew its own, so leaving the boards and leaving a
 * game were two different-looking actions. The detail view below still has one
 * of its own, and that is a different control: it goes back to THIS grid, which
 * is a move inside the screen rather than out of it.
 */
function GameGrid({
  games,
  locale,
  t,
  onOpen,
}: {
  games: Playable[];
  locale: AppLocale;
  t: (key: string) => string;
  onOpen: (id: string) => void;
}) {
  const records = readRecords();
  return (
    <>
      {games.length === 0 ? (
        // Not an error and not an empty board — this player simply has not
        // played anything yet, and saying so is friendlier than a blank list.
        <p style={{ fontSize: 15, color: "var(--text-dim)" }}>{t("boardsNoGames")}</p>
      ) : (
        <>
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "var(--text-dim)",
              margin: "0 0 8px",
            }}
          >
            {t("boardsYourGames")}
          </p>
          <div
            style={{
              display: "grid",
              // Wraps by construction. The row this replaces was a flex line
              // with no wrap, so it ran 1,410px wide inside a 390px phone.
              gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))",
              gap: 10,
            }}
          >
            {games.map((g) => (
              <GameCard
                key={g.meta.id}
                game={g}
                best={cardBest(g, records)}
                locale={locale}
                t={t}
                onOpen={() => {
                  audioPort.play("tap");
                  onOpen(g.meta.id);
                }}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function GameCard({
  game,
  best,
  locale,
  t,
  onOpen,
}: {
  game: Playable;
  best: number | undefined;
  locale: AppLocale;
  t: (key: string) => string;
  onOpen: () => void;
}) {
  const { meta } = game;
  const label = best === undefined ? t("boardsNoRecord") : formatScore(best, game.unit);
  return (
    <button
      onClick={onOpen}
      // The record belongs in the spoken label too — a screen reader announcing
      // only the game name would lose the one fact the card exists to carry.
      aria-label={`${textFor(meta.title, locale)}, ${label}`}
      style={{
        border: "none",
        borderRadius: "var(--radius-3)",
        padding: 0,
        overflow: "hidden",
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        color: "inherit",
        minHeight: "var(--tap-kids)",
      }}
    >
      <GameArt id={meta.id} emoji={meta.emoji} height={72} />
      <span
        style={{
          // display:block matters: a button's children are inline by default,
          // so the label would size to its text and clip the longer Hebrew
          // names rather than ellipsing them.
          display: "block",
          width: "100%",
          padding: "6px 6px 3px",
          fontWeight: 800,
          fontSize: 13,
          background: meta.color,
          // Derived, not fixed — one ink cannot serve twenty-one accents.
          color: inkFor(meta.color),
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {textFor(meta.title, locale)}
      </span>
      <span
        dir="ltr"
        style={{
          display: "block",
          width: "100%",
          padding: "0 6px 6px",
          background: meta.color,
          color: inkFor(meta.color),
          fontSize: best === undefined ? 11 : 14,
          fontWeight: 800,
          opacity: best === undefined ? 0.75 : 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * One game's board, with the two pickers finally labelled and a way into
 * playing it.
 *
 * The difficulty resets with the game rather than persisting: "hard" on one
 * game is not the same achievement as "hard" on another, and a board id this
 * game does not have would ask the network for a document nobody has ever
 * written. It opens on `firstBoard`, which is also the board the card quoted —
 * one function, so the number the player tapped is the number they land on.
 */
function GameBoard({
  game,
  locale,
  t,
  onBack,
}: {
  game: Playable;
  locale: AppLocale;
  t: (key: string) => string;
  onBack: () => void;
}) {
  const [board, setBoard] = useState<string>(() => firstBoard(game));
  const [window_, setWindow] = useState<BoardWindow>("d");
  const { meta } = game;

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 0 16px",
        }}
      >
        <IconButton ariaLabel={t("back")} onClick={onBack}>
          {backArrow(locale)}
        </IconButton>
        <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>
          {meta.emoji}
        </span>
        <h2 style={{ flex: 1, fontSize: 22, lineHeight: 1.1, margin: 0 }}>{textFor(meta.title, locale)}</h2>
      </header>

      {game.boards.length > 1 ? (
        <>
          <Label>{t("boardsLevel")}</Label>
          <DifficultySelector
            options={game.boards.map((b) => ({ id: b, label: boardLabel(b) }))}
            value={board}
            onChange={setBoard}
            locale={locale}
          />
        </>
      ) : null}

      <Label>{t("boardsWhen")}</Label>
      <DifficultySelector
        options={WINDOWS.map((w) => ({ id: w.id, label: w.label }))}
        value={window_}
        onChange={(id) => setWindow(id as BoardWindow)}
        locale={locale}
      />

      <Board
        gameId={meta.id}
        board={board}
        unit={game.unit}
        window={window_}
        locale={locale}
        t={t}
      />

      {/* A real <a>, not a handler: the game lives at its own URL, so this gets
          middle-click, long-press and Back for nothing. */}
      <a
        href={gameHref(meta.id, pageLocaleFor(locale))}
        onClick={() => audioPort.play("tap")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 18,
          minHeight: "var(--tap-kids)",
          borderRadius: "var(--radius-3)",
          background: "var(--brand)",
          color: "var(--on-brand)",
          fontSize: 17,
          fontWeight: 800,
          textDecoration: "none",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <span aria-hidden="true">{meta.emoji}</span>
        {`${t("boardsPlay")} ${textFor(meta.title, locale)}`}
      </a>
    </>
  );
}

/** The one thing the old screen never did: say what a row of pills picks. */
function Label({ children }: { children: string }) {
  return (
    <p
      style={{
        fontSize: 13,
        fontWeight: 800,
        color: "var(--text-dim)",
        margin: "16px 0 7px",
      }}
    >
      {children}
    </p>
  );
}

type Load = { kind: "loading" } | { kind: "offline" } | { kind: "ready"; standing: BoardStanding };

function Board({
  gameId,
  board,
  unit,
  window: win,
  locale,
  t,
}: {
  gameId: string;
  board: string;
  unit: ScoreUnit;
  window: BoardWindow;
  locale: AppLocale;
  t: (key: string) => string;
}) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });

  // This device's own record for exactly this board. It is what makes the `own`
  // line reachable at all: the cloud copy is written on PUBLISH, so it is
  // stale-or-equal by construction and absent entirely until one lands.
  // See `ownBest` in the SDK.
  //
  // Keyed on the same pair the fetch is, so switching game or difficulty
  // re-reads. Holding it in state instead would pin the first board's record
  // and then show it under every other one.
  const localBest = useMemo(() => {
    const key = recordKey(gameId, board);
    return key ? readRecords()[key] : undefined;
  }, [gameId, board]);

  useEffect(() => {
    let alive = true;
    setLoad({ kind: "loading" });
    void (async () => {
      const standing = await boardStanding(gameId, board, win, unit);
      if (!alive) return;
      setLoad(standing ? { kind: "ready", standing } : { kind: "offline" });
    })();
    return () => {
      alive = false;
    };
  }, [gameId, board, unit, win]);

  if (load.kind === "loading") {
    return <p style={{ marginTop: 18, color: "var(--text-dim)" }}>…</p>;
  }
  if (load.kind === "offline") {
    // Explicitly NOT an empty board. An empty list would claim nobody is
    // playing, which is a different and sadder thing than "we could not ask".
    //
    // The player's own record still shows. It came off this device and owes the
    // network nothing, so a failed board read is no reason to withhold it — and
    // being offline is exactly when a child most needs the screen to say
    // something true rather than nothing.
    return (
      <div style={{ marginTop: 18 }}>
        <p style={{ fontSize: 14, color: "var(--text-dim)" }}>{t("boardsOffline")}</p>
        <You line={youLine({ kind: "own" }, ownBest(localBest, undefined))} unit={unit} t={t} />
      </div>
    );
  }

  const { rows, total, better, mine } = load.standing;
  const view = standingView({ total, better });

  return (
    <div style={{ marginTop: 18 }}>
      {rows.length === 0 ? (
        <p style={{ fontSize: 15, color: "var(--text-dim)" }}>{t("boardsEmpty")}</p>
      ) : (
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 8,
          }}
        >
          {rows.map((row, i) => (
            <li
              key={`${row.name}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: "var(--radius-2)",
                background: row.me ? "var(--brand)" : "var(--surface-2)",
                boxShadow: "var(--shadow-1)",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 800, minWidth: 24 }} dir="ltr">
                {i + 1}
              </span>
              <span dir="auto" style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>
                {nameOf(row.name, locale) ?? "—"}
              </span>
              <span dir="ltr" style={{ fontSize: 15, fontWeight: 800 }}>
                {formatScore(row.value, unit)}
              </span>
            </li>
          ))}
        </ol>
      )}

      <You line={youLine(view, ownBest(localBest, mine))} unit={unit} t={t} />
    </div>
  );
}

/**
 * Where the reader sits — or, most of the time, deliberately not.
 *
 * The three branches are the whole no-last-place rule made visible. `own` is
 * the common case and it is not a consolation prize: a child's own best, and
 * nothing about anybody else, is the honest thing to show most players.
 */
function You({
  line: shape,
  unit,
  t,
}: {
  line: YouLine;
  unit: ScoreUnit;
  t: (key: string) => string;
}) {
  const line =
    shape.kind === "rank"
      ? `${t("boardsYouAre")} #${shape.rank}`
      : shape.kind === "percentile"
        ? `${t("boardsTop")} ${shape.top}%`
        : shape.kind === "best"
          ? `${t("boardsYourBest")} ${formatScore(shape.value, unit)}`
          : t("boardsPlayToJoin");

  return (
    <p
      dir="auto"
      style={{
        marginTop: 14,
        padding: "12px 14px",
        borderRadius: "var(--radius-2)",
        background: "var(--surface-2)",
        fontSize: 15,
        fontWeight: 700,
      }}
    >
      {line}
    </p>
  );
}

/** `adj__noun` word ids back into a name in the reader's language. */
function nameOf(packed: string, locale: AppLocale): string | undefined {
  const [adj, noun] = packed.split("__");
  if (!adj || !noun) return undefined;
  return renderName({ adj, noun }, locale);
}
