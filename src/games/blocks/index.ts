import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { BlocksGame } from "./BlocksGame";

export default reactGame(meta, (ctx) => createElement(BlocksGame, { ctx }));
