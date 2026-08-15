// The lobby — a registry of tables you are allowed to walk up to.
//
// Durable Objects cannot be enumerated. `idFromName(code)` maps any string to
// an object, and there is no "list the objects that exist" call, by design. So
// a lobby cannot be derived; it has to be REPORTED into, and this is the thing
// that gets reported to.
//
// One object, addressed by a constant name, holding one row per table. That is
// a single-writer bottleneck by construction, which is the right trade here: a
// table reports on a join, a leave, a hand boundary and a reaper tick, so the
// write rate is a rounding error against the game traffic that produced it.
//
// The invariant that matters more than any of that: THE LOBBY MAY NEVER BREAK
// A TABLE. Every call into it from tableDO is fire-and-forget and swallowed.
// A game with no lobby is a game; a lobby with no games is a list.

import { shouldList, type ChipsMode } from "./reap";

/** What a table reports about itself. Everything a lobby row needs. */
export interface LobbyEntry {
  code: string;
  seated: number;
  maxSeats: number;
  sb: number;
  bb: number;
  /** A hand is being dealt right now — the lobby shows this as "playing". */
  playing: boolean;
  chipsMode: ChipsMode;
  createdAt: number;
  lastSeenAt: number;
  connected: number;
  /**
   * When the table said all this.
   *
   * The row outlives the report, and `connected` is only meaningful next to
   * its own age — see `presentNow` in reap.ts. Deliberately NOT in `LobbyRow`:
   * a client is told what a table looks like, not how we know.
   */
  reportedAt: number;
  handsPlayed: number;
  isPrivate: boolean;
  /**
   * A table that is allowed to be empty forever, and must stay on the list
   * while it is.
   *
   * The practice table sleeps when nobody is connected — no sockets, no
   * heartbeat, nothing to report — which is exactly the signature of a dead
   * room. Without this the one table anybody can always join would be the
   * first thing the lobby dropped.
   *
   * Set by the table itself at `/init` and by nothing else. Also NOT in
   * `LobbyRow`: a client is told what a table looks like, not why it is here.
   */
  evergreen?: boolean;
  /**
   * How many of this table's seats are held by the house.
   *
   * IS in `LobbyRow`, unlike the two above, and the difference is the point: a
   * client is told what a table looks like, and "the other players here are
   * not people" is the single most important thing about the look of one. The
   * alternative was for the client to hardcode the practice table's code,
   * which is a copy of a server constant kept in step by nothing.
   */
  bots?: number;
}

/** What a client is told. Deliberately less than the entry above. */
export interface LobbyRow {
  code: string;
  seated: number;
  maxSeats: number;
  sb: number;
  bb: number;
  playing: boolean;
  league: boolean;
  /** Seats held by the house. Absent or 0 means every player is a person. */
  bots?: number;
}

/**
 * A hard cap on the list, so one bad afternoon cannot turn the lobby into an
 * unbounded object. Well above any plausible real number for this site; it
 * exists so the failure mode is "the oldest quiet table drops off" rather than
 * "the lobby object grows until it stops loading".
 */
const MAX_ROWS = 200;

export class LobbyDO implements DurableObject {
  private rows = new Map<string, LobbyEntry>();

  constructor(private ctx: DurableObjectState) {
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<Record<string, LobbyEntry>>("rows");
      if (stored) this.rows = new Map(Object.entries(stored));
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/report" && request.method === "POST") {
      const entry = (await request.json().catch(() => null)) as LobbyEntry | null;
      if (!entry?.code) return new Response("bad report", { status: 400 });
      this.rows.set(entry.code, entry);
      this.prune();
      await this.save();
      return new Response("ok");
    }

    if (url.pathname === "/drop" && request.method === "POST") {
      const body = (await request.json().catch(() => null)) as { code?: string } | null;
      if (body?.code) {
        this.rows.delete(body.code);
        await this.save();
      }
      return new Response("ok");
    }

    if (url.pathname === "/list") {
      return new Response(JSON.stringify({ tables: this.list(Date.now()) }), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("not found", { status: 404 });
  }

  /**
   * The rows a client should see, freshest-looking first.
   *
   * Staleness is decided HERE, at read time, against `reap.ts` — never trusted
   * from the last report. A table that goes quiet stops reporting by
   * definition, so a lobby that believed its last message would advertise
   * every dead room forever. The reaper's own "unlist" tick is the tidy path;
   * this is the one that cannot be missed.
   */
  private list(now: number): LobbyRow[] {
    const out: { row: LobbyRow; e: LobbyEntry }[] = [];
    for (const e of this.rows.values()) {
      // Evergreen is checked HERE and not inside `shouldList`, for the same
      // reason the table checks it outside `verdict`: reap.ts answers "is
      // anybody there", and it should keep answering that honestly rather
      // than learning about a table for which the answer does not matter.
      if (!e.evergreen && !shouldList(e, now, e.isPrivate)) continue;
      if (e.evergreen && e.isPrivate) continue;
      out.push({
        e,
        row: {
          code: e.code,
          seated: e.seated,
          maxSeats: e.maxSeats,
          sb: e.sb,
          bb: e.bb,
          playing: e.playing,
          league: e.chipsMode === "league",
          bots: e.bots,
        },
      });
    }
    out.sort((a, b) => {
      // A game in progress is the most interesting thing to walk up to, then
      // the busiest, then the one somebody touched most recently. Never by
      // code: that would be a stable but meaningless order.
      if (a.e.playing !== b.e.playing) return a.e.playing ? -1 : 1;
      if (a.row.seated !== b.row.seated) return b.row.seated - a.row.seated;
      return b.e.lastSeenAt - a.e.lastSeenAt;
    });
    return out.map((x) => x.row);
  }

  /** Drop the least interesting rows once the map is over its cap. */
  private prune(): void {
    if (this.rows.size <= MAX_ROWS) return;
    const byAge = [...this.rows.values()].sort((a, b) => a.lastSeenAt - b.lastSeenAt);
    for (const e of byAge.slice(0, this.rows.size - MAX_ROWS)) this.rows.delete(e.code);
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put("rows", Object.fromEntries(this.rows));
  }
}

/** The one lobby. A constant, so every table and every reader agree on it. */
export const LOBBY_NAME = "v1";
