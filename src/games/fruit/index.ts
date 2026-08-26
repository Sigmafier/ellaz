import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { FruitGame } from "./FruitGame";

export default reactGame(meta, (ctx) => createElement(FruitGame, { ctx }));
