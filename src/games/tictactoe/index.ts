import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { TicTacToe } from "./TicTacToe";

export default reactGame(meta, (ctx) => createElement(TicTacToe, { ctx }));
