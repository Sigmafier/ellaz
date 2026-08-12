import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@i18n/index";
import { backArrow, makeT } from "@i18n/index";
import {
  audioPort,
  boardStanding,
  formatScore,
  ownBest,
  readRecords,
  recordKey,
  renderName,
  standingView,
  youLine,
  wallet,
  type BoardStanding,
  type BoardWindow,
  type ScoreUnit,
  type YouLine,
} from "@sdk/index";
import { IconButton } from "@ui/components";
import { DifficultySelector } from "@ui/DifficultySelector";
import { GameArt } from "@ui/gameArtView";
import { inkFor } from "@ui/ink";
import { CATALOG } from "./catalog";
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
  { id: "d", label: { he: "היום", en: "Today" } },
  { id: "w", label: { he: "השבוע", en: "This week" } },
  { id: "m", label: { he: "החודש", en: "This month" } },
  { id: "all", label: { he: "תמיד", en: "All time" } },
];

/**
 * Board ids are a game's own difficulty ids, so most of the catalog shares a
 * handful. An id with no entry renders as itself rather than as a blank — an
 * honest raw label beats a missing one, and it is also how a new difficulty
 * announces that it wants a translation.
 */
const BOARD_LABELS: Record<string, Record<Locale, string>> = {
  default: { he: "הכול", en: "All" },
  easy: { he: "קל", en: "Easy" },
  medium: { he: "בינוני", en: "Med" },
  hard: { he: "קשה", en: "Hard" },
  expert: { he: "מומחה", en: "Expert" },
  kids4: { he: "חיות 4×4", en: "Animals 4×4" },
  kids6: { he: "חיות 6×6", en: "Animals 6×6" },
};

function boardLabel(board: string): Record<Locale, string> {
  return BOARD_LABELS[board] ?? { he: board, en: board };
}

export function Boards({ locale, onExit }: { locale: Locale; onExit: () => void }) {
  const t = makeT(locale);
  // Read once per mount. The wallet and the record store both change only when
  // a game is played, and no game is playable from this screen.
  const [games] = useState(() => myGames(wallet.recentlyPlayed(), METAS, readRecords()));
  const [openId, setOpenId] = useState<string | null>(null);

  const game = games.find((g) => g.meta.id === openId);

  return (
    <div className="ellaz-scroll" style={{ flex: 1 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 16px 32px" }}>
        {game ? (
          <GameBoard game={game} locale={locale} t={t} onBack={() => setOpenId(null)} />
        ) : (
          <GameGrid games={games} locale={locale} t={t} onOpen={setOpenId} onExit={onExit} />
        )}
      </div>
    </div>
  );
}

/** Every game's DOM-free meta. The catalog holds loaders too; this needs neither. */
const METAS = CATALOG.map((e) => e.meta);

/**
 * The screen a player lands on: their games, each already showing their record.
 *
 * The back arrow leaves the boards entirely, which is the only place it can go
 * from here — the detail view has its own, pointing at this grid.
 */
function GameGrid({
  games,
  locale,
  t,
  onOpen,
  onExit,
}: {
  games: Playable[];
  locale: Locale;
  t: (key: string) => string;
  onOpen: (id: string) => void;
  onExit: () => void;
}) {
  const records = readRecords();
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
        <IconButton ariaLabel={t("back")} onClick={onExit}>
          {backArrow(locale)}
        </IconButton>
        {/* h2, not h1. The document this mounts into already carries an h1
            naming the page; a second one appears only once JavaScript has run,
            so it is invisible to every crawler and visible to exactly the
            screen-reader user who is worst served by two of them. The World
            header is the same shape and the same fix. */}
        <h2 style={{ flex: 1, fontSize: 26, lineHeight: 1, margin: 0 }}>{t("boards")}</h2>
      </header>

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
  locale: Locale;
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
      aria-label={`${meta.title[locale]}, ${label}`}
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
        {meta.title[locale]}
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
  locale: Locale;
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
        <h2 style={{ flex: 1, fontSize: 22, lineHeight: 1.1, margin: 0 }}>{meta.title[locale]}</h2>
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
        href={gameHref(meta.id, locale)}
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
        {`${t("boardsPlay")} ${meta.title[locale]}`}
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
  locale: Locale;
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
function nameOf(packed: string, locale: Locale): string | undefined {
  const [adj, noun] = packed.split("__");
  if (!adj || !noun) return undefined;
  return renderName({ adj, noun }, locale);
}
