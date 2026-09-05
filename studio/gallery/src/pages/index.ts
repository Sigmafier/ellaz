import type { FC } from "react";
import type { PageId } from "../router";
import { StylesMain, StylesSide } from "./styles";
import { CharactersMain, CharactersSide } from "./characters";
import { SpritesMain, SpritesSide } from "./sprites";
import { PalettesMain } from "./palettes";
import { TechniquesMain, TechniquesSide } from "./techniques";
import { GamesMain } from "./games";

export interface PageProps { params: URLSearchParams }
export interface Page { label: string; Side?: FC<PageProps>; Main: FC<PageProps> }

export const PAGES: Record<PageId, Page> = {
  styles: { label: "Styles", Side: StylesSide, Main: StylesMain },
  characters: { label: "Characters", Side: CharactersSide, Main: CharactersMain },
  sprites: { label: "Sprites", Side: SpritesSide, Main: SpritesMain },
  palettes: { label: "Palettes", Main: PalettesMain },
  techniques: { label: "Techniques", Side: TechniquesSide, Main: TechniquesMain },
  games: { label: "Games", Main: GamesMain },
};
