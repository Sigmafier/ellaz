// A palette is the canonical colour truth for a style or a game. JSON in
// this directory is the source; .gpl and .hex are EXPORTS of it, never edited
// by hand. Roles are the art bible's vocabulary (docs/art-bible.md).

export type PaletteRole = "player" | "enemy" | "interactable" | "warning" | "disabled" | "ground" | "text";

export interface PaletteColor {
  /** stable name, camelCase; never renamed once a game binds to it */
  name: string;
  /** "#RRGGBB", uppercase hex digits */
  hex: string;
  role?: PaletteRole;
}

export interface Palette {
  id: string;
  name: string;
  note: string;
  colors: PaletteColor[];
}

export const ROLES: readonly PaletteRole[] = ["player", "enemy", "interactable", "warning", "disabled", "ground", "text"];
