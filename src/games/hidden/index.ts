import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Hidden } from "./Hidden";

export default reactGame(meta, (ctx) => createElement(Hidden, { ctx }));
