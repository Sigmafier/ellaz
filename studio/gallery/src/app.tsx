// The shell: a shadcn Sidebar holding the page list and the current page's
// own pickers, and the page. Every page is a pair - Side (its pickers, or
// nothing) and Main - both pure functions of the route, so the rail and the
// page can never disagree about what is selected.

import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { PAGES } from "./pages";
import { useBeetle } from "./beetle";
import { go, hashFor, parseRoute, type PageId, type Route } from "./router";

declare global {
  interface Window { __galleryReady?: string; __galleryError?: string }
}

function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    // "/" and "#/styles" are the same page; make the address say so, so a
    // beetle note left on the bare URL records the page it was really on
    if (!location.hash) history.replaceState(null, "", hashFor(route.id));
    const on = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

/** A page that throws must say so on the page AND to the shots script; a blank main is not a verdict. */
class PageBoundary extends Component<{ id: PageId; children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { error: String(e) }; }
  componentDidCatch(e: unknown, info: ErrorInfo) { window.__galleryError = String(e); console.error(e, info.componentStack); }
  componentDidUpdate(prev: { id: PageId }) { if (prev.id !== this.props.id && this.state.error) this.setState({ error: null }); }
  render() {
    if (this.state.error) return <p className="rounded-lg border-2 border-destructive bg-secondary px-3 py-2 text-sm">this page failed to render: {this.state.error}</p>;
    return this.props.children;
  }
}

export function App() {
  const route = useRoute();
  const page = PAGES[route.id];
  const beetle = useBeetle();
  useEffect(() => {
    document.title = `Ellaz Studio · ${page.label}`;
    window.__galleryReady = route.id;
  }, [route, page.label]);
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-4">
          <div className="flex items-center gap-3 font-heading text-xl font-extrabold leading-tight">
            <span className="size-[18px] shrink-0 rounded-full bg-brand shadow-[var(--shadow-card)]" />
            <span>Ellaz Studio<small className="block text-xs font-medium text-muted-foreground">art bible · sprites · gallery</small></span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Pages</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {(Object.keys(PAGES) as PageId[]).map((id) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton isActive={id === route.id} onClick={() => go(id)} className="font-bold" aria-current={id === route.id ? "page" : undefined}>{PAGES[id].label}</SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {page.Side && <page.Side params={route.params} />}
          {beetle.present && (
            <SidebarGroup>
              <SidebarGroupLabel>Feedback</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    {/* the hub's own door to the beetle's notes: pins on the page and the drawer, from the same widget */}
                    <SidebarMenuButton onClick={() => window.__beetle?.toggle()} isActive={beetle.shown} aria-pressed={beetle.shown} className="font-bold" data-beetle-nav>
                      Notes
                      <span className={cn("ms-auto rounded-full px-2 py-0.5 text-[11px] font-extrabold", beetle.count ? "bg-yellow text-foreground" : "bg-border text-muted-foreground")}>{beetle.count}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-transparent">
        <header className="flex h-14 items-center gap-2 px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-2xl font-extrabold">{page.label}</h1>
        </header>
        <main className="flex max-w-[1400px] flex-col px-6 pb-6">
          <PageBoundary id={route.id}><page.Main params={route.params} /></PageBoundary>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
