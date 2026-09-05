import { useMemo } from "react";
import { STYLES } from "../../../art/styles/registry";
import { SCENES } from "../../../art/scenes";
import { GAMES } from "../../../art/games";
import LEDGER from "../../../art/styles/ledger.json";
import { go } from "../router";
import { Badge, Grid, Lede, Note, Tile } from "../ui";
import type { PageProps } from ".";

// The same three lists as docs/styles-ledger.md, from the same two sources:
// registry.ts is IN, ledger.json is OUT and BACKLOG. Nothing here is a third
// copy - the doc is rendered from these files by scripts/styles-ledger.mjs
// and its gate refuses a hand edit, so what this page shows and what the doc
// says cannot disagree.

interface OutRow { id: string; name: string; family: string; removed: string; commit: string; note: string }
interface BacklogRow { id: string; name: string; family: string; audience: string; look: string; seenIn: string; status: string; adjacentTo?: string }
const OUT = (LEDGER as { out: OutRow[] }).out;
const BACKLOG = (LEDGER as { backlog: BacklogRow[] }).backlog;
const FAMILIES = ["pixel", "vector", "craft", "paint", "ink", "print"];

const pickedFor = (id: string) =>
  GAMES.filter((g) => g.candidateStyles.includes(id)).map((g) => (g.style === id ? `${g.name} (default)` : g.name));

export function LedgerMain(_: PageProps) {
  const scene = SCENES.reference;
  const tiles = useMemo(() => STYLES.map((s) => ({ s, canvas: s.render(scene) })), [scene]);
  return (
    <>
      <Lede>What is in, what was removed for good and why, and what has been proposed but not built. The doc twin is <code>docs/styles-ledger.md</code>, rendered from the same two files; a removed style is one <code>git show</code> away but never a restore.</Lede>

      <h2 className="mb-2 mt-2 text-lg font-bold">In the registry <Badge kind="full">{tiles.length}</Badge></h2>
      <Grid>
        {tiles.map(({ s, canvas }) => (
          <Tile key={s.id} id={s.id} picture={canvas} title={s.name} sub={pickedFor(s.id).join(" · ") || "picked for no game yet"} badge={{ text: s.tier, kind: s.tier === "full" ? "full" : "card" }} onClick={() => go("styles", { open: s.id })} />
        ))}
      </Grid>

      <h2 className="mb-2 mt-8 text-lg font-bold">Removed for good <Badge kind="card">{OUT.length}</Badge></h2>
      <Note>Each row was one of the operator's own beetle notes on this gallery. The taste ledger holds it as rejected, so no session re-proposes it under another name.</Note>
      <div className="mt-3 overflow-x-auto rounded-xl border-2 bg-card">
        <table className="w-full text-[13px]" data-ledger="out">
          <thead className="text-left text-muted-foreground"><tr><th className="px-3 py-2">style</th><th className="px-3 py-2">family</th><th className="px-3 py-2">removed</th><th className="px-3 py-2">the note</th><th className="px-3 py-2">commit</th></tr></thead>
          <tbody>
            {OUT.map((r) => (
              <tr key={r.id} className="border-t" data-out={r.id}>
                <td className="px-3 py-2 font-bold">{r.name} <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span></td>
                <td className="px-3 py-2">{r.family}</td>
                <td className="px-3 py-2">{r.removed}</td>
                <td className="px-3 py-2 italic">“{r.note}”</td>
                <td className="px-3 py-2 font-mono">{r.commit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 mt-8 text-lg font-bold">Backlog <Badge kind="sample">{BACKLOG.length}</Badge> <span className="text-sm font-normal text-muted-foreground">researched 2026-09-05, none built</span></h2>
      <Note>Grouped by family. Audience is who the style suits. A row marked adjacent-to-rejected sits beside a removed style and needs an explicit yes.</Note>
      {FAMILIES.map((fam) => {
        const rows = BACKLOG.filter((b) => b.family === fam);
        if (!rows.length) return null;
        return (
          <section key={fam} className="mt-4" data-backlog-family={fam}>
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-brand-ink">{fam} <span className="text-muted-foreground">{rows.length}</span></h3>
            <div className="overflow-x-auto rounded-xl border-2 bg-card">
              <table className="w-full text-[13px]">
                <thead className="text-left text-muted-foreground"><tr><th className="px-3 py-2">style</th><th className="px-3 py-2">audience</th><th className="px-3 py-2">the look</th><th className="px-3 py-2">seen in</th><th className="px-3 py-2">status</th></tr></thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id} className="border-t" data-backlog={b.id}>
                      <td className="px-3 py-2 font-bold">{b.name} <span className="font-mono text-[11px] text-muted-foreground">{b.id}</span></td>
                      <td className="px-3 py-2">{b.audience}</td>
                      <td className="px-3 py-2">{b.look}</td>
                      <td className="px-3 py-2 text-muted-foreground">{b.seenIn}</td>
                      <td className="px-3 py-2">{b.status === "adjacent-to-rejected" ? <span className="rounded-full bg-yellow px-2 py-0.5 text-[11px] font-extrabold">next to removed {b.adjacentTo}</span> : b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}
