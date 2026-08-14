import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Letters } from "./Letters";

export default reactGame(meta, (ctx) => createElement(Letters, { ctx }));
