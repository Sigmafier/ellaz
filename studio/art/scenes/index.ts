import type { Scene } from "../scene-ops";
import { brawlRoom } from "./brawl-room";
import { emberField } from "./ember-field";
import { reference } from "./reference";

/** Every reference scene, keyed by id. The gallery and the gates read this list. */
export const SCENES: Record<string, Scene> = {
  [brawlRoom.id]: brawlRoom,
  [emberField.id]: emberField,
  [reference.id]: reference,
};

export const SCENE_IDS = Object.keys(SCENES);
export { brawlRoom, emberField, reference };
