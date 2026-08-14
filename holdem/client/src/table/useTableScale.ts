import { useEffect, useState } from "react";
import { tableScale, type TableScale } from "./scale";

/**
 * Watch a felt element and report how big everything on it should be.
 *
 * A ResizeObserver rather than a window resize listener, because the felt is
 * not the window: a side rail appearing, the browser's own chrome collapsing on
 * scroll, and a phone rotating all change the felt's box without necessarily
 * firing a useful window event — and one of them (the rail) is our own doing.
 *
 * The arithmetic lives in scale.ts, which is pure and tested. This file only
 * connects it to a DOM box.
 */
export function useTableScale(el: HTMLElement | null): TableScale {
  const [s, setS] = useState<TableScale>(() => tableScale(0, 0));

  useEffect(() => {
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const next = tableScale(r.width, r.height);
      // Only re-render when a number actually moved. A ResizeObserver fires on
      // sub-pixel changes during an animation, and setState with an equal
      // object still re-renders every seat.
      setS((prev) => (prev.scale === next.scale && prev.shape === next.shape ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  return s;
}
