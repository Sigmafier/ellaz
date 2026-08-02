import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { MathGame } from "./MathGame";

export default reactGame(meta, (ctx) => createElement(MathGame, { ctx }));
