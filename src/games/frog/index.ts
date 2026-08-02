import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { FrogGame } from "./FrogGame";

export default reactGame(meta, (ctx) => createElement(FrogGame, { ctx }));
