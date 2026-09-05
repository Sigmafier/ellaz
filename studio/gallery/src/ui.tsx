// The gallery's own small pieces, all built from shadcn primitives and the
// ellaz tokens. Anything a page needs twice lives here; a page that needs
// a primitive this file lacks adds it with `npx shadcn add <name>` from
// studio/ and never hand-rolls one.

import { useEffect, useRef, type ReactNode } from "react";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/** Mount a renderer's canvas (or any element) inside React without re-drawing it. */
export function CanvasView({ canvas, className }: { canvas: HTMLCanvasElement | HTMLElement; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.replaceChildren(canvas); }, [canvas]);
  return <div ref={ref} className={cn("[&>canvas]:block [&>canvas]:h-auto [&>canvas]:w-full [&>canvas]:bg-stage", className)} />;
}

export type BadgeKind = "full" | "card" | "pick" | "sample";

const BADGE: Record<BadgeKind, string> = {
  full: "bg-yellow text-foreground",
  card: "bg-border text-foreground",
  pick: "bg-green text-foreground",
  sample: "bg-yellow text-foreground",
};

export function Badge({ kind, children }: { kind: BadgeKind; children: ReactNode }) {
  return <span className={cn("ms-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide", BADGE[kind])}>{children}</span>;
}

/** A card with a picture on top and a caption under it. */
/** `id` becomes `data-tile`, so a beetle note that lands on this tile names the ITEM (`button[data-tile="mosaic"]`) rather than its position in the grid. */
export function Tile({ id, picture, title, sub, badge, onClick }: { id?: string; picture: HTMLCanvasElement | HTMLElement; title: string; sub?: string; badge?: { text: string; kind: BadgeKind }; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} data-tile={id} className={cn("overflow-hidden rounded-xl border-2 bg-card text-start shadow-[var(--shadow-card)]", onClick && "cursor-pointer hover:border-brand focus-visible:outline-2 focus-visible:outline-ring")}>
      <CanvasView canvas={picture} />
      <div className="px-3 py-2">
        <b className="block text-[15px]">{title}{badge && <Badge kind={badge.kind}>{badge.text}</Badge>}</b>
        {sub && <span className="text-[13px] text-muted-foreground">{sub}</span>}
      </div>
    </Tag>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">{children}</div>;
}

/** The framed area a big render or the player sits in. */
export function Stage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border-2 bg-card p-3 shadow-[var(--shadow-card)]", className)}>{children}</div>;
}

export function Lede({ children }: { children: ReactNode }) {
  return <p className="mb-4 max-w-[70ch] text-muted-foreground">{children}</p>;
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border-2 border-yellow bg-secondary px-3 py-2 text-sm">{children}</p>;
}

/** A radio-style picker in the sidebar rail: one item is on, picking another navigates. */
export function SideList<T extends string>({ label, options, current, onPick }: { label: string; options: { id: T; label: string }[]; current: T; onPick: (id: T) => void }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {options.map((o) => (
            <SidebarMenuItem key={o.id}>
              <SidebarMenuButton isActive={o.id === current} onClick={() => onPick(o.id)} className="font-bold" aria-pressed={o.id === current}>
                <span className={cn("size-2.5 rounded-full border-2 border-current", o.id === current && "bg-current")} />
                {o.label}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/** Split a recipe.md into H2 sections for rendering (headings kept, prose as paragraphs). */
export function recipeSections(md: string): { heading: string; body: string }[] {
  const out: { heading: string; body: string }[] = [];
  let cur: { heading: string; body: string } | null = null;
  for (const line of md.split("\n")) {
    const h = line.match(/^## (.+)/);
    if (h) { cur = { heading: h[1], body: "" }; out.push(cur); continue; }
    if (cur && !line.startsWith("#")) cur.body += line + "\n";
  }
  return out;
}
