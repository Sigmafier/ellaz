import { useEffect, useState } from "react";
import { themePort } from "./theme";
import type { ThemeId } from "./themes";

/**
 * The React adapter over `themePort`, and the only file in the theme layer
 * that imports React.
 *
 * Split out so `juice/effects.ts` and any Phaser scene can read the theme
 * without pulling React into the juice layer - the port is plain, this is the
 * glue, and the two never merge.
 */
export function useTheme(): [ThemeId, (t: ThemeId) => void] {
  const [theme, setTheme] = useState<ThemeId>(themePort.current);
  useEffect(() => themePort.onChange(setTheme), []);
  return [theme, (t) => themePort.set(t)];
}
