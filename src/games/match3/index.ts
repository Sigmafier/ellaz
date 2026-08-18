import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Match3Game } from "./Match3Game";

export default reactGame(meta, (ctx) => createElement(Match3Game, { ctx }));
