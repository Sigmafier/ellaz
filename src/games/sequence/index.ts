import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Sequence } from "./Sequence";

export default reactGame(meta, (ctx) => createElement(Sequence, { ctx }));
