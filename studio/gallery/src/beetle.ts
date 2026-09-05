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
export const BEETLE_HALL = "http://localhost:8772";

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
