import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Minesweeper } from "./Minesweeper";

export default reactGame(meta, (ctx) => createElement(Minesweeper, { ctx }));
