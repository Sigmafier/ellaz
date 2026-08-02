import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Shadows } from "./Shadows";

export default reactGame(meta, (ctx) => createElement(Shadows, { ctx }));
