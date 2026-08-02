import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { BubblesGame } from "./BubblesGame";

export default reactGame(meta, (ctx) => createElement(BubblesGame, { ctx }));
