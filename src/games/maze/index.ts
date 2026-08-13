import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { MazeGame } from "./MazeGame";

export default reactGame(meta, (ctx) => createElement(MazeGame, { ctx }));
