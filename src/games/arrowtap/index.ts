import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { ArrowTapGame } from "./ArrowTapGame";

export default reactGame(meta, (ctx) => createElement(ArrowTapGame, { ctx }));
