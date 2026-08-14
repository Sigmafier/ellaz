// The three looks, and which one this device is wearing.
//
// A theme is a swap of one palette block in tokens.css — nothing about the
// layout, the sizes or the components changes with it. That is deliberate: the
// operator is picking a LOOK, so the comparison has to hold everything else
// constant or it is not a comparison of looks.

export type ThemeId = "felt" | "daylight" | "slate";

export interface Theme {
  id: ThemeId;
  /** What it is, in the fewest words that distinguish it from the other two. */
  label: { he: string; en: string };
  /** A swatch for the picker: page, cloth, accent. */
  swatch: [string, string, string];
}

export const THEMES: Theme[] = [
  {
    id: "felt",
    label: { he: "לילה", en: "Card room" },
    swatch: ["#0d1512", "#1b4d3e", "#e8b64c"],
  },
  {
    id: "daylight",
    label: { he: "יום", en: "Daylight" },
    swatch: ["#fff6e9", "#12b5ad", "#ff4d8d"],
  },
  {
    id: "slate",
    label: { he: "צפחה", en: "Slate" },
    swatch: ["#0b0d10", "#171d24", "#6aa8ff"],
  },
];

export const DEFAULT_THEME: ThemeId = "felt";

const STORE_KEY = "holdem:theme:v1";

const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

export function loadTheme(): ThemeId {
  try {
    const v = localStorage.getItem(STORE_KEY);
    if (isThemeId(v)) return v;
  } catch {
    /* incognito */
  }
  return DEFAULT_THEME;
}

export function saveTheme(id: ThemeId): void {
  try {
    localStorage.setItem(STORE_KEY, id);
  } catch {
    /* incognito */
  }
}

/**
 * Paint it. The DEFAULT theme removes the attribute rather than setting it,
 * so the bare `:root` block in tokens.css is what a first-time visitor gets —
 * the same values whether or not this ever runs, which is the reason the
 * default lives at bare `:root` in the first place.
 */
export function applyTheme(id: ThemeId): void {
  const el = document.documentElement;
  if (id === DEFAULT_THEME) el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", id);
}
