import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Echo } from "./Echo";

export default reactGame(meta, (ctx) => createElement(Echo, { ctx }));
