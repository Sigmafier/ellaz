import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Sudoku } from "./Sudoku";

export default reactGame(meta, (ctx) => createElement(Sudoku, { ctx }));
