import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { NonogramGame } from "./NonogramGame";

export default reactGame(meta, (ctx) => createElement(NonogramGame, { ctx }));
