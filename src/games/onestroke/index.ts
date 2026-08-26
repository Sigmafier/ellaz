import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { OneStrokeGame } from "./OneStrokeGame";

export default reactGame(meta, (ctx) => createElement(OneStrokeGame, { ctx }));
