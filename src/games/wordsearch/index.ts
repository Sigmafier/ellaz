import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { WordSearchGame } from "./WordSearchGame";

export default reactGame(meta, (ctx) => createElement(WordSearchGame, { ctx }));
