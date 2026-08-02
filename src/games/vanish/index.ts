import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Vanish } from "./Vanish";

export default reactGame(meta, (ctx) => createElement(Vanish, { ctx }));
