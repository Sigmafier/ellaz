import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@i18n/index";
import { makeT } from "@i18n/index";
import {
  boardStanding,
  formatScore,
  ownBest,
  parseRecordKey,
  readRecords,
  recordKey,
  renderName,
  standingView,
  youLine,
  wallet,
  type BoardStanding,
  type BoardWindow,
  type GameMeta,
  type ScoreUnit,
  type YouLine,
} from "@sdk/index";
import { IconButton } from "@ui/components";
import { DifficultySelector } from "@ui/DifficultySelector";
import { CATALOG } from "./catalog";

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
// WHICH BOARD, AND IN WHAT UNIT
// Both have to come from somewhere other than this file. A game scopes its
// record per difficulty inside its own renderer, which the portal can never
// import — so the boards a player HAS are read back out of their own record
// keys, and what the number MEASURES is read off the game's DOM-free meta,
// where `score-unit-declared.test.ts` pins it to the renderer. Guessing either
// one shows a fast time ranked as if slow were better.

const WINDOWS: { id: BoardWindow; label: { he: string; en: string } }[] = [
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
const BOARD_LABELS: Record<string, { he: string; en: string }> = {
  default: { he: "הכול", en: "All" },
  easy: { he: "קל", en: "Easy" },
  medium: { he: "בינוני", en: "Med" },
  hard: { he: "קשה", en: "Hard" },
  expert: { he: "מומחה", en: "Expert" },
  kids4: { he: "חיות 4×4", en: "Animals 4×4" },
  kids6: { he: "חיות 6×6", en: "Animals 6×6" },
};

function boardLabel(board: string): { he: string; en: string } {
  return BOARD_LABELS[board] ?? { he: board, en: board };
}

interface Playable {
  meta: GameMeta;
  unit: ScoreUnit;
  boards: string[];
}

/**
 * Games this player has opened that keep a record, newest first, each with the
 * boards they actually hold one on.
 *
 * A game opened but never won has no record key, so it falls back to the
 * default board: the reader can still look at it and see what there is to beat.
 */
function myGames(): Playable[] {
  const known = new Map(CATALOG.map((g) => [g.meta.id, g.meta]));

  const boardsByGame = new Map<string, string[]>();
  for (const key of Object.keys(readRecords())) {
    const parsed = parseRecordKey(key);
    if (!parsed) continue;
    const list = boardsByGame.get(parsed.game) ?? [];
    list.push(parsed.board);
    boardsByGame.set(parsed.game, list);
  }

  return wallet
    .recentlyPlayed()
    .map((id) => known.get(id))
    .filter((m): m is GameMeta => m !== undefined && m.scoreUnit !== undefined)
    .map((meta) => ({
      meta,
      unit: meta.scoreUnit as ScoreUnit,
      boards: (boardsByGame.get(meta.id) ?? ["default"]).slice().sort(),
    }));
}

export function Boards({ locale, onExit }: { locale: Locale; onExit: () => void }) {
  const t = makeT(locale);
  const [games] = useState(myGames);
  const [gameId, setGameId] = useState<string>(() => games[0]?.meta.id ?? "");
  const [window_, setWindow] = useState<BoardWindow>("d");

  const game = games.find((g) => g.meta.id === gameId);
  // Reset with the game rather than persisting: "hard" on one game is not the
  // same achievement as "hard" on another, and a board id that game does not
  // have would ask the network for a document nobody has ever written.
  const [board, setBoard] = useState<string>(() => games[0]?.boards[0] ?? "default");

  const pick = (id: string) => {
    const next = games.find((g) => g.meta.id === id);
    setGameId(id);
    setBoard(next?.boards[0] ?? "default");
  };

  return (
    <div className="ellaz-scroll" style={{ flex: 1 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 16px 32px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0 16px" }}>
          <IconButton ariaLabel={t("back")} onClick={onExit}>
            {locale === "he" ? "→" : "←"}
          </IconButton>
          {/* h2, not h1. The document this mounts into already carries an h1
              naming the page; a second one appears only once JavaScript has
              run, so it is invisible to every crawler and visible to exactly
              the screen-reader user who is worst served by two of them. The
              World header is the same shape and the same fix. */}
          <h2 style={{ flex: 1, fontSize: 26, lineHeight: 1, margin: 0 }}>{t("boards")}</h2>
        </header>

        {games.length === 0 ? (
          // Not an error and not an empty board — this player simply has not
          // played anything yet, and saying so is friendlier than a blank list.
          <p style={{ fontSize: 15, color: "var(--text-dim)" }}>{t("boardsNoGames")}</p>
        ) : (
          <>
            <DifficultySelector
              options={games.map((g) => ({ id: g.meta.id, label: g.meta.title }))}
              value={gameId}
              onChange={pick}
              locale={locale}
              kids
            />
            {game && game.boards.length > 1 ? (
              <>
                <div style={{ height: 10 }} />
                <DifficultySelector
                  options={game.boards.map((b) => ({ id: b, label: boardLabel(b) }))}
                  value={board}
                  onChange={setBoard}
                  locale={locale}
                />
              </>
            ) : null}
            <div style={{ height: 10 }} />
            <DifficultySelector
              options={WINDOWS.map((w) => ({ id: w.id, label: w.label }))}
              value={window_}
              onChange={(id) => setWindow(id as BoardWindow)}
              locale={locale}
            />

            {game ? (
              <Board
                gameId={game.meta.id}
                board={board}
                unit={game.unit}
                window={window_}
                locale={locale}
                t={t}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
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
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
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
