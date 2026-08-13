// Haptics — navigator.vibrate is Android-Chrome only (~77% support); treat as
// progressive enhancement. No-ops silently everywhere else (iOS, Firefox).
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

export const haptic = {
  tap: () => vibrate(10),
  success: () => vibrate([12, 30, 12]),
  win: () => vibrate([20, 40, 20, 40, 60]),
  fail: () => vibrate(90),
};
