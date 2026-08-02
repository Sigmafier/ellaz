import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Game2048 } from "./Game2048";

export default reactGame(meta, (ctx) => createElement(Game2048, { ctx }));
