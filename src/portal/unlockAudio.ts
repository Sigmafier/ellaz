import { audioPort, speechPort } from "@sdk/index";

/**
 * iOS refuses the first sound and the first utterance outside a user gesture.
 *
 * On the app shell that gesture used to be the tap on a game card. A real
 * navigation means a game now mounts on a page nobody has touched yet, so
 * Hebrew speech would stay silently locked for the whole visit - and the player
 * most likely to hit that is the one who arrived from a shared link or a search
 * result, which is exactly the traffic the real pages exist to attract.
 *
 * One listener, first gesture of any kind, then it removes itself.
 *
 * It lives in its own module rather than in `PageApp.tsx` because `main.tsx`
 * needs it on BOTH branches, and `PageApp` is lazily imported - pulling it in
 * eagerly for this one function would drag the room and the game host back into
 * the first visit.
 */
export function unlockAudioOnFirstGesture(): void {
  const unlock = () => {
    audioPort.unlock();
    speechPort.unlock();
  };
  for (const type of ["pointerdown", "keydown", "touchstart"] as const) {
    window.addEventListener(type, unlock, { once: true, passive: true });
  }
}
