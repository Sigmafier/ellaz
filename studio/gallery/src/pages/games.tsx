import { useMemo } from "react";
import { GAMES } from "../../../art/games";
import { STYLES } from "../../../art/styles/registry";
import { SCENES } from "../../../art/scenes";
import { CHARACTERS } from "../../../art/characters";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { characterTile } from "./characters";
import { go } from "../router";
import { Badge, CanvasView, Grid, Lede, Stage, Tile } from "../ui";
import type { PageProps } from ".";

export function GamesMain({ params }: PageProps) {
  return (
    <>
      <Lede>Per-game bindings from art/games/*.json: the style a game chose, the other styles you picked as candidates (switch to compare), its palette, technique and cast. A game engine reads the same file.</Lede>
      {GAMES.map((g) => <GameCard key={g.id} g={g} params={params} />)}
    </>
  );
}

function GameCard({ g, params }: { g: (typeof GAMES)[number]; params: URLSearchParams }) {
  const styleId = g.candidateStyles.includes(params.get(g.id) ?? "") ? params.get(g.id)! : g.style;
  const st = STYLES.find((s) => s.id === styleId)!;
  const scene = useMemo(() => st.render(SCENES[g.scene]), [st, g.scene]);
  const cast = useMemo(() => g.cast.map((id) => ({ id, name: CHARACTERS.find((c) => c.id === id)!.name, canvas: characterTile(id, styleId) })), [g.cast, styleId]);
  const pick = (id: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of params) next[k] = v;
    next[g.id] = id;
    go("games", next);
  };
  return (
    <section className="mb-8">
      <h2 className="mb-1 mt-2 text-lg font-bold">{g.name}<Badge kind="pick">{g.id}</Badge></h2>
      <Lede>{g.pitch}</Lede>
      <Tabs value={styleId} onValueChange={pick} className="mb-2">
        <TabsList>{g.candidateStyles.map((id) => <TabsTrigger key={id} value={id} className="font-bold">{STYLES.find((s) => s.id === id)!.name}</TabsTrigger>)}</TabsList>
      </Tabs>
      <Stage><CanvasView canvas={scene} className="[&>canvas]:mx-auto [&>canvas]:max-w-[900px] [&>canvas]:rounded-lg" /></Stage>
      <dl className="my-3 grid grid-cols-[max-content_1fr] gap-x-3.5 gap-y-1 text-sm">
        <dt className="font-bold text-muted-foreground">style</dt><dd>{st.name} ({styleId}){styleId === g.style ? " - the binding" : " - a candidate"}</dd>
        <dt className="font-bold text-muted-foreground">palette</dt><dd>{g.palette}</dd>
        <dt className="font-bold text-muted-foreground">technique</dt><dd>{g.technique}</dd>
        <dt className="font-bold text-muted-foreground">scale</dt><dd>{g.scale}</dd>
        <dt className="font-bold text-muted-foreground">decided</dt><dd>{g.decided}</dd>
      </dl>
      <Grid>{cast.map((c) => <Tile key={c.id} picture={c.canvas} title={c.name} sub={c.id} />)}</Grid>
    </section>
  );
}
