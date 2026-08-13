import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { PetGame } from "./PetGame";

export default reactGame(meta, (ctx) => createElement(PetGame, { ctx }));
