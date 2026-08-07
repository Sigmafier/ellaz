/**
 * How a game card shows itself: the drawn key art, or the old emoji.
 *
 * Shaped exactly after `themePort`, which is shaped after `audioPort`. A third
 * idiom for "a preference you can subscribe to" would be a third thing to
 * learn, and the shape already works.
 *
 * ONE REAL DIFFERENCE FROM THE THEME, and it is why there is no boot script
 * here. A theme paints in CSS, so it must be decided before the first paint or
 * the page visibly flashes the other one - hence the inline script in every
 * emitted document. A card style decides which ELEMENT React renders, so it
 * cannot paint until React runs anyway. There is nothing to flash, and adding a
 * boot script would be ceremony guarding a race that cannot happen.
 *
 * The emoji are kept rather than replaced on purpose. They are what shipped for
 * four days, some players will have learned the grid by them, and a preference
 * costs a few bytes against a redraw nobody asked for.
 */

export type CardStyle = "art" | "emoji";

export const CARD_STYLE_STORAGE_KEY = "ellaz:cards";

/** Drawn art is the default: it is the thing 21 scenes were drawn for. */
export const DEFAULT_CARD_STYLE: CardStyle = "art";

export function isCardStyle(value: unknown): value is CardStyle {
  return value === "art" || value === "emoji";
}

type Listener = (style: CardStyle) => void;

function readStored(): CardStyle {
  try {
    const raw = localStorage.getItem(CARD_STYLE_STORAGE_KEY);
    if (isCardStyle(raw)) return raw;
  } catch {
    // Incognito, or storage disabled. The default is a fine answer.
  }
  return DEFAULT_CARD_STYLE;
}

let current: CardStyle = DEFAULT_CARD_STYLE;
const listeners = new Set<Listener>();

export const cardStylePort = {
  get current(): CardStyle {
    return current;
  },

  set(style: CardStyle): void {
    if (style === current) return;
    current = style;
    try {
      localStorage.setItem(CARD_STYLE_STORAGE_KEY, style);
    } catch {
      // A refused write costs the player their choice on the NEXT visit, not
      // this one. Never let it cost them the switch they just made.
    }
    for (const l of listeners) l(style);
  },

  toggle(): void {
    cardStylePort.set(current === "art" ? "emoji" : "art");
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Adopt the stored choice. Called once at startup, beside `themePort.init`. */
  init(): void {
    current = readStored();
  },
};
