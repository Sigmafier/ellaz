import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { FitGame } from "./FitGame";

export default reactGame(meta, (ctx) => createElement(FitGame, { ctx }));
