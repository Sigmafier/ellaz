import { useEffect, useState } from "react";
import { cardStylePort, type CardStyle } from "./cardStyle";

/**
 * The React adapter over `cardStylePort`, and the only file in this pair that
 * imports React - same split as `useTheme.ts` over `themePort`, for the same
 * reason: the port stays plain so anything outside React can read it.
 */
export function useCardStyle(): [CardStyle, (s: CardStyle) => void] {
  const [style, setStyle] = useState<CardStyle>(cardStylePort.current);
  useEffect(() => cardStylePort.onChange(setStyle), []);
  return [style, (s) => cardStylePort.set(s)];
}
