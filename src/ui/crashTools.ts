/* A crash, handed from the GAME tree to the PLATFORM - chrome talking to
   chrome, exactly like `gameTools.ts`.
   ===========================================================================

   WHY A REGISTRY AND NOT AN IMPORT
   Every DOM game mounts its own React root (`games/reactHost.tsx`), and an
   error does NOT cross a root boundary - so the only place a boundary can catch
   a game's throw is INSIDE that nested root. But `src/games/**` may not import
   portal internals, and a boundary that imported the reporter would drag portal
   code into every game chunk.

   So the boundary lives in the game tree and calls this; the portal registers
   the handler at boot. Nothing in `src/games/` learns what happens next.

   NO HANDLER IS A NORMAL STATE, not a bug: a standalone bundle has no portal
   and must never phone home, so it registers nothing and `tellAboutCrash`
   returns false. The boundary reads that and offers no button, rather than
   offering one that does nothing. */

export interface Crash {
  message: string;
  stack?: string;
  gameId?: string;
}

type Handler = (crash: Crash) => void;

let handler: Handler | null = null;

/** The portal registers at boot. Returns an unsubscribe. */
export function setCrashHandler(fn: Handler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

/** Can this build offer to report a crash at all? */
export function canTellAboutCrash(): boolean {
  return handler !== null;
}

/** Hand a crash to whoever is listening. Never throws - this runs from inside
 *  an error path, and a throw here would replace a crash card with a blank. */
export function tellAboutCrash(crash: Crash): boolean {
  if (!handler) return false;
  try {
    handler(crash);
    return true;
  } catch {
    return false;
  }
}
