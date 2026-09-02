import { createRoot, type Root } from "react-dom/client";
import type { AppLocale } from "@i18n/locales";
import { setCrashHandler } from "@ui/crashTools";

/* Opening the reporter - ONE implementation, called from three places.
   ===========================================================================

   Home calls it, the emitted screens' utility button calls it, and the crash
   card calls it. A second copy would drift, and the one that drifts first is
   always the one nobody opens - which here would be the crash path, the single
   most valuable of the three.

   THIS FILE IS IN THE SHELL AND THE SHEET IS NOT. That is the whole point: the
   shell pays for a function and a click handler, and the sheet, its capture and
   its transport arrive only when somebody actually taps. `report-*` is a named
   chunk with a matching `globIgnores` entry - see
   `.claude/rules/precache-glob-sweeps-new-chunks.md`, which is three changes,
   not one.

   Its own root on `document.body`, never inside `#game-frame`: a nested root
   torn down during the portal's own unmount is how
   `removeChild: node is not a child` happens here. */

/** What threw recently, so a report can carry it.
 *
 *  This ARMS a report; it never sends one. Nothing leaves the device that a
 *  person did not press a button to send, which is why this is a three-deep
 *  ring rather than a beacon. Three because the first throw is the cause and
 *  the rest are usually its echoes. */
const ERRORS: { message: string; stack?: string }[] = [];

export function recentErrors(): { message: string; stack?: string }[] {
  return ERRORS.slice(-3);
}

export function noteError(message: string, stack?: string): void {
  ERRORS.push({ message: message.slice(0, 300), stack: stack?.slice(0, 2000) });
  if (ERRORS.length > 3) ERRORS.shift();
}

/** Listen once, from wherever the app boots. */
export function watchErrors(): void {
  window.addEventListener("error", (e) => noteError(String(e.message), e.error?.stack));
  window.addEventListener("unhandledrejection", (e) => {
    const r: unknown = e.reason;
    noteError(r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined);
  });
}

let root: Root | null = null;
let host: HTMLElement | null = null;

function close(): void {
  // Deferred out of React's own commit, exactly as `reactHost.tsx` defers a
  // nested root's teardown.
  const dying = root;
  const node = host;
  root = null;
  host = null;
  queueMicrotask(() => {
    dying?.unmount();
    node?.remove();
  });
}

export interface OpenReportOptions {
  locale: AppLocale;
  /** Absent on home, the room and the boards. */
  gameId?: string;
  /** The play surface, so a canvas game can offer its pixels. */
  frame?: ParentNode | null;
}

export async function openReport(opts: OpenReportOptions): Promise<void> {
  if (root) return;
  let mod: typeof import("../report/ReportSheet");
  try {
    mod = await import("../report/ReportSheet");
  } catch {
    // A failed chunk fetch - an open tab meeting a new deploy is the usual
    // cause - costs the report and nothing else.
    return;
  }
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  root.render(
    <mod.ReportSheet
      locale={opts.locale}
      gameId={opts.gameId}
      frame={opts.frame ?? document.body}
      errors={recentErrors()}
      onClose={close}
    />,
  );
}

/**
 * Let a crashed game open this sheet.
 *
 * Registered by whichever entry booted the app. A standalone bundle registers
 * nothing, so `canTellAboutCrash()` is false there and the crash card offers no
 * button rather than a dead one.
 */
export function armCrashReporting(locale: AppLocale): () => void {
  return setCrashHandler((crash) => {
    noteError(crash.message, crash.stack);
    // No frame: the game's DOM is gone, and a picture of the crash card is a
    // picture of this component rather than of the bug.
    void openReport({ locale, gameId: crash.gameId, frame: null });
  });
}
