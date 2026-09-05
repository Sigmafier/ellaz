// The beetle: the operator's note button, on every page we build.
//
// It is NOT bundled. The widget lives in the Visual Hall's assets
// (`~/.claude/visual-hall/_assets/beetle.js`) and is loaded at runtime, so a
// fix to it reaches every surface at once and the gallery's single-file build
// stays free of it - the single-file plugin scans the emitted HTML for asset
// refs and this tag never appears there. Only on a loopback http origin: the
// file:// build the shots script drives has no hall to send to, and a beetle
// with nowhere to send is worse than none.
//
// The standard this implements: `~/.claude/rules/quality/every-surface-we-build-carries-the-beetle.md`.
import { useEffect, useState } from "react";
export const BEETLE_HALL = "http://localhost:8772";

/** What the widget exposes (v2): the hub calls toggle() from its own Notes entry. */
export interface BeetleApi { surface: string; hall: string; version: number; toggle(): boolean; open(): void; close(): void; isOpen(): boolean; refresh(): Promise<void>; counts(): { open: number; done: number; removed: number } }
export interface BeetleCount { surface: string; open: number; done: number; removed: number; on: boolean }
declare global {
  interface Window { __beetle?: BeetleApi }
  interface WindowEventMap { "beetle:count": CustomEvent<BeetleCount> }
}

/**
 * The count and the notes-mode state, for a hub's own "Notes" entry. `present`
 * is false until the widget has spoken once, so a build with no beetle (file://,
 * production) renders no entry rather than a dead one.
 */
export function useBeetle(): { present: boolean; count: number; shown: boolean } {
  const [st, setSt] = useState(() => {
    const b = window.__beetle;
    return b ? { present: true, count: b.counts().open, shown: b.isOpen() } : { present: false, count: 0, shown: false };
  });
  useEffect(() => {
    const on = (e: CustomEvent<BeetleCount>) => setSt({ present: true, count: e.detail.open, shown: e.detail.on });
    window.addEventListener("beetle:count", on);
    return () => window.removeEventListener("beetle:count", on);
  }, []);
  return st;
}

export function mountBeetle(surface: string): void {
  if (!/^https?:$/.test(location.protocol)) return;
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  if (document.querySelector("beetle-host, script[data-surface]")) return;
  const s = document.createElement("script");
  s.src = `${BEETLE_HALL}/_assets/beetle.js`;
  s.dataset.surface = surface;
  s.async = true;
  document.head.append(s);
}
