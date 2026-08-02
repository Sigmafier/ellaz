import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { BeesGame } from "./BeesGame";

export default reactGame(meta, (ctx) => createElement(BeesGame, { ctx }));
