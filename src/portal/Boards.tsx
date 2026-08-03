import { useEffect, useState } from "react";
import type { Locale } from "@i18n/index";
import { makeT } from "@i18n/index";
import {
  boardStanding,
  formatScore,
  renderName,
  standingView,
  wallet,
  type BoardStanding,
  type BoardWindow,
  type ScoreUnit,
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

const WINDOWS: { id: BoardWindow; label: { he: string; en: string } }[] = [
  { id: "d", label: { he: "היום", en: "Today" } },
  { id: "w", label: { he: "השבוע", en: "This week" } },
  { id: "m", label: { he: "החודש", en: "This month" } },
  { id: "all", label: { he: "תמיד", en: "All time" } },
];

/** Games the player has actually opened, newest first, filtered to the catalog. */
function myGames(): { id: string; title: { he: string; en: string }; emoji: string }[] {
  const known = new Map(CATALOG.map((g) => [g.meta.id, g.meta]));
  return wallet
    .recentlyPlayed()
    .map((id) => known.get(id))
    .filter((m): m is NonNullable<typeof m> => m !== undefined)
    .map((m) => ({ id: m.id, title: m.title, emoji: m.emoji }));
}

export function Boards({ locale, onExit }: { locale: Locale; onExit: () => void }) {
  const t = makeT(locale);
  const games = myGames();
  const [gameId, setGameId] = useState<string>(() => games[0]?.id ?? "");
  const [window_, setWindow] = useState<BoardWindow>("d");

  const game = games.find((g) => g.id === gameId);

  return (
    <div className="ellaz-scroll" style={{ flex: 1 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 16px 32px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0 16px" }}>
          <IconButton ariaLabel={t("back")} onClick={onExit}>
            {locale === "he" ? "→" : "←"}
          </IconButton>
          <h1 style={{ flex: 1, fontSize: 26, lineHeight: 1 }}>{t("boards")}</h1>
        </header>

        {games.length === 0 ? (
          // Not an error and not an empty board — this player simply has not
          // played anything yet, and saying so is friendlier than a blank list.
          <p style={{ fontSize: 15, color: "var(--text-dim)" }}>{t("boardsNoGames")}</p>
        ) : (
          <>
            <DifficultySelector
              options={games.map((g) => ({ id: g.id, label: g.title }))}
              value={gameId}
              onChange={setGameId}
              locale={locale}
              kids
            />
            <div style={{ height: 10 }} />
            <DifficultySelector
              options={WINDOWS.map((w) => ({ id: w.id, label: w.label }))}
              value={window_}
              onChange={(id) => setWindow(id as BoardWindow)}
              locale={locale}
            />

            {game ? <Board gameId={game.id} window={window_} locale={locale} t={t} /> : null}
          </>
        )}
      </div>
    </div>
  );
}

type Load =
  | { kind: "loading" }
  | { kind: "offline" }
  | { kind: "ready"; standing: BoardStanding };

function Board({
  gameId,
  window: win,
  locale,
  t,
}: {
  gameId: string;
  window: BoardWindow;
  locale: Locale;
  t: (key: string) => string;
}) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    setLoad({ kind: "loading" });
    void (async () => {
      // "default" is the board every game writes to unless it scopes per
      // difficulty. A per-difficulty picker is the obvious next thing here, and
      // deliberately not in this first version.
      const standing = await boardStanding(gameId, "default", win, "points");
      if (!alive) return;
      setLoad(standing ? { kind: "ready", standing } : { kind: "offline" });
    })();
    return () => {
      alive = false;
    };
  }, [gameId, win]);

  if (load.kind === "loading") {
    return <p style={{ marginTop: 18, color: "var(--text-dim)" }}>…</p>;
  }
  if (load.kind === "offline") {
    // Explicitly NOT an empty board. An empty list would claim nobody is
    // playing, which is a different and sadder thing than "we could not ask".
    return (
      <p style={{ marginTop: 18, fontSize: 14, color: "var(--text-dim)" }}>{t("boardsOffline")}</p>
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
                {formatScore(row.value, "points")}
              </span>
            </li>
          ))}
        </ol>
      )}

      <You view={view} mine={mine} t={t} />
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
  view,
  mine,
  t,
}: {
  view: ReturnType<typeof standingView>;
  mine: number | undefined;
  t: (key: string) => string;
}) {
  const line =
    view.kind === "rank"
      ? `${t("boardsYouAre")} #${view.rank}`
      : view.kind === "percentile"
        ? `${t("boardsTop")} ${view.top}%`
        : mine !== undefined
          ? `${t("boardsYourBest")} ${formatScore(mine, "points")}`
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

// Re-exported type only, so the unit passed above stays honest if it ever
// becomes per-game rather than hardcoded.
export type { ScoreUnit };
