// Per-game bindings: which style, palette, technique, scene and cast a game
// chose. JSON so a game engine outside this repo can read it too; the test
// beside this file checks every id points at something that exists.

import toyboxBrawl from "./toybox-brawl.json";
import emberHollow from "./ember-hollow.json";

export interface GameBinding {
  id: string;
  name: string;
  pitch: string;
  style: string;
  candidateStyles: string[];
  palette: string;
  technique: string;
  scene: string;
  cast: string[];
  scale: number;
  decided: string;
}

export const GAMES: GameBinding[] = [toyboxBrawl, emberHollow];
export const gameById = (id: string): GameBinding | undefined => GAMES.find((g) => g.id === id);
